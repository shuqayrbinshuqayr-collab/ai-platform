import { z } from "zod";
import fs from "fs";
import type { Response } from "express";
import { getDb } from "./db";
import { blueprints } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { getUserByEmail, upsertUser } from "./db";
import bcrypt from "bcryptjs";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { CONCEPT_TITLES } from "./bsp";
import { generateDXF } from "./dxfGenerator";
import { SBC_SETBACKS, SBC_COVERAGE, SBC_HEIGHT } from "./core/saudiCode";
import { findBestTemplate, scaleTemplate } from "./core/villaTemplates";
import { canGenerateBlueprint, canCreateProject } from "./db";
import { notifyOwner } from "./_core/notification";
import { transcribeAudio } from "./_core/voiceTranscription";
import {
  createProject, getProjectsByUser, getProjectById, updateProject, deleteProject,
  createBlueprint, getBlueprintsByProject, getBlueprintsByUser, getBlueprintById,
  updateUserProfile, getAllProjectsCount, getAllUsersCount,
  getOrCreateSubscription, updateSubscription,
  selectBlueprint, getBlueprintsByBatch,
} from "./db";

// ─── Saudi Building Code Checker ───────────────────────────────────────────
function checkSaudiBuildingCode(project: {
  landArea?: number | null;
  buildingRatio?: number | null;
  floorAreaRatio?: number | null;
  maxFloors?: number | null;
  frontSetback?: number | null;
  backSetback?: number | null;
  sideSetback?: number | null;
  buildingType?: string | null;
  numberOfFloors?: number | null;
}) {
  const warnings: string[] = [];
  const warningsAr: string[] = [];

  const landArea = project.landArea ?? 0;
  const buildingRatio = project.buildingRatio ?? 60;
  const maxFloors = project.maxFloors ?? 4;
  const frontSetback = project.frontSetback ?? 4;
  const backSetback = project.backSetback ?? 3;
  const sideSetback = project.sideSetback ?? 2;
  const requestedFloors = project.numberOfFloors ?? 2;

  // SBC 1101 national minimums — uniform across all Saudi cities (saudiCode.ts)
  if (frontSetback < SBC_SETBACKS.frontMin) {
    warnings.push(`Front setback is below SBC 1101 national minimum of ${SBC_SETBACKS.frontMin}m`);
    warningsAr.push(`الإرتداد الأمامي أقل من الحد الأدنى الوطني (${SBC_SETBACKS.frontMin}م) وفق الكود السعودي SBC 1101`);
  }
  if (backSetback < SBC_SETBACKS.backMin) {
    warnings.push(`Back setback is below SBC 1101 national minimum of ${SBC_SETBACKS.backMin}m`);
    warningsAr.push(`الإرتداد الخلفي أقل من الحد الأدنى الوطني (${SBC_SETBACKS.backMin}م) وفق الكود السعودي SBC 1101`);
  }
  if (sideSetback < SBC_SETBACKS.sideMin) {
    warnings.push(`Side setback is below SBC 1101 national minimum of ${SBC_SETBACKS.sideMin}m`);
    warningsAr.push(`الإرتداد الجانبي أقل من الحد الأدنى الوطني (${SBC_SETBACKS.sideMin}م) وفق الكود السعودي SBC 1101`);
  }
  const maxCoveragePercent = Math.round(SBC_COVERAGE.absoluteMax * 100);
  if (buildingRatio > maxCoveragePercent) {
    warnings.push(`Building coverage ratio exceeds SBC 1101 national maximum of ${maxCoveragePercent}%`);
    warningsAr.push(`نسبة البناء تتجاوز الحد الأقصى الوطني (${maxCoveragePercent}%) وفق الكود السعودي SBC 1101`);
  }
  if (requestedFloors > maxFloors) {
    warnings.push(`Requested ${requestedFloors} floors exceeds allowed ${maxFloors} floors`);
    warningsAr.push(`الطوابق المطلوبة (${requestedFloors}) تتجاوز الحد المسموح (${maxFloors})`);
  }
  if (landArea > 0 && landArea < 100) {
    warnings.push("Land area is very small for a residential project (< 100m²)");
    warningsAr.push("مساحة الأرض صغيرة جداً للمشروع السكني (أقل من 100م²)");
  }

  // Auto-correct setbacks to SBC 1101 national minimums
  const corrected = {
    frontSetback: Math.max(frontSetback, SBC_SETBACKS.frontMin),
    backSetback: Math.max(backSetback, SBC_SETBACKS.backMin),
    sideSetback: Math.max(sideSetback, SBC_SETBACKS.sideMin),
    buildingRatio: Math.min(buildingRatio, maxCoveragePercent),
    numberOfFloors: Math.min(requestedFloors, maxFloors),
  };

  return { warnings, warningsAr, corrected, isCompliant: warnings.length === 0 };
}

// ─── Safe JSON parser (handles "Unexpected token" errors from GPT) ──────────
const AI_FALLBACK = {
  title: "مخطط معماري", titleAr: "مخطط معماري",
  description: "فيلا سكنية سعودية", descriptionAr: "فيلا سكنية سعودية",
  highlights: [], highlightsAr: [],
};

function safeParseJSON(text: string, fallback: Record<string, unknown> = {}) {
  try {
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start === -1 || end === -1) return fallback;
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    console.error("JSON parse failed, first 200 chars:", text?.slice(0, 200));
    return fallback;
  }
}

// ─── Build Enhanced AI prompt using Saudi Arch Rules + RAG ─────────────────
function buildConceptPrompt(project: any, conceptIndex: number) {
  const styles = [
    { en: "Modern Minimalist",          ar: "عصري مينيمالي" },
    { en: "Traditional Saudi Heritage", ar: "تراثي سعودي" },
    { en: "Contemporary Luxury",        ar: "معاصر فاخر" },
    { en: "Functional Compact",         ar: "وظيفي مدمج" },
    { en: "Mediterranean",              ar: "متوسطي" },
    { en: "Smart Home Ready",           ar: "جاهز للمنزل الذكي" },
  ];
  const style = styles[conceptIndex - 1] ?? styles[0];
  const buildingType = project.buildingType ?? "villa";
  return `You are a Saudi architect. Generate concept ${conceptIndex} for a ${buildingType}.
Style: ${style.en}
Respond in JSON only:
{
  "title": "short title in English",
  "titleAr": "عنوان قصير بالعربي",
  "description": "2 sentence description in English",
  "descriptionAr": "وصف جملتين بالعربي",
  "highlights": ["point 1", "point 2", "point 3"],
  "highlightsAr": ["نقطة 1", "نقطة 2", "نقطة 3"]
}`;
}

// ─── 3-Phase Floor Plan Generator ────────────────────────────────────────────
// PHASE 1: Zone blocks (strict boundaries, no overlap)
// PHASE 2: Circulation (corridor first, staircase at intersection)
// PHASE 3: Rooms within zones (fill each zone, no cross-zone rooms)
// RULE: Ground floor = NO bedrooms. Bedrooms → upper floors only.
function placeRoomsInZones(rooms: any[], bW: number, bD: number): any[] {
  const snap = (v: number) => Math.round(v / 0.5) * 0.5;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
  const tp = (r: any) => (r.type ?? "").toLowerCase().replace(/[\s-]/g, "_");
  const is = (r: any, ...kw: string[]) => kw.some(k => tp(r).includes(k));
  const floorNum = rooms[0]?.floor ?? 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — ZONE BLOCKS (strict, non-overlapping boundaries)
  // ═══════════════════════════════════════════════════════════════════════════
  const CORR_W = 1.2;   // vertical corridor width
  const CROSS_W = 1.2;  // horizontal cross corridor width
  const corrX     = snap(bW * 0.44);   // vertical corridor x-start
  const guestEndY = snap(bD * 0.40);   // horizontal zone divide

  // Non-overlapping quadrant zones:
  const Z = {
    guest:    { x0: 0,              x1: corrX,          y0: 0,           y1: guestEndY },       // NW
    parkArea: { x0: corrX + CORR_W, x1: bW,             y0: 0,           y1: guestEndY },       // NE (parking outside → maid/storage here)
    family:   { x0: 0,              x1: corrX,          y0: guestEndY,   y1: bD },              // SW
    service:  { x0: corrX + CORR_W, x1: bW,             y0: guestEndY,   y1: bD },              // SE
  };

  // ─ Ground floor rule: remove bedrooms (go to upper floors only) ─────────
  const groundRooms = rooms.filter(r => !is(r, "bedroom", "master_bedroom") || (r.floor ?? 0) > 0);

  // ─ Per-type minimums ────────────────────────────────────────────────────
  const norm = (r: any): any => {
    const t = tp(r);
    let minW = 2.5, minH = 2.5;
    if (t === "wc" || t === "toilet")  { minW = 1.2; minH = 2.0; }
    else if (t.includes("majlis"))     { minW = 4.0; minH = 5.0; }
    else if (t.includes("master"))     { minW = 4.0; minH = 4.5; }
    else if (t.includes("bedroom"))    { minW = 3.0; minH = 3.5; }
    else if (t.includes("kitchen"))    { minW = 2.5; minH = 4.0; }
    else if (t.includes("bath"))       { minW = 2.0; minH = 2.5; }
    let w = snap(Math.max(r.width  ?? minW, minW));
    let h = snap(Math.max(r.height ?? minH, minH));
    if (w / h > 2.5) h = snap(w / 2.5);
    if (h / w > 2.5) w = snap(h / 2.5);
    return { ...r, width: w, height: h };
  };

  const result: any[] = [];

  // ─ Strip packer within a zone ───────────────────────────────────────────
  const pack = (rms: any[], x0: number, y0: number, maxW: number, maxH: number) => {
    let cx = x0, cy = y0, rowH = 0;
    for (const r of [...rms].sort((a, b) => b.width * b.height - a.width * a.height)) {
      if (cx - x0 + r.width > maxW + 0.01) { cx = x0; cy += rowH; rowH = 0; }
      if (cy - y0 >= maxH - 0.5) break;
      const w = clamp(r.width,  1.0, x0 + maxW - cx);
      const h = clamp(r.height, 1.0, y0 + maxH - cy);
      if (w < 1.0 || h < 1.0) continue;
      result.push({ ...r, x: cx, y: cy, width: w, height: h });
      cx += w; rowH = Math.max(rowH, h);
    }
  };

  // ─ Parking OUTSIDE building footprint ──────────────────────────────────
  let extParkW = 0;
  rooms.filter(r => is(r, "parking", "garage")).forEach(r => {
    const w = snap(clamp(r.width ?? 3.0, 3.0, 6.5));
    const h = snap(clamp(Math.min(r.height ?? 6.0, 18 / w), 3.0, bD * 0.35));
    result.push({ ...r, x: bW + 0.2 + extParkW, y: 0, width: w, height: h, _outsideBuilding: true });
    extParkW += w + 0.2;
  });

  const noParking = groundRooms.filter(r => !is(r, "parking", "garage"));

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — CIRCULATION (corridors + staircase drawn before rooms)
  // ═══════════════════════════════════════════════════════════════════════════
  // Main vertical corridor (full building height)
  result.push({ type: "corridor", nameAr: "ممر رئيسي", name: "Main Corridor",
    x: corrX, y: 0, width: CORR_W, height: bD,
    area: parseFloat((CORR_W * bD).toFixed(1)), floor: floorNum });

  // Cross corridor (horizontal at zone divide)
  result.push({ type: "corridor", nameAr: "ممر أفقي", name: "Cross Corridor",
    x: 0, y: guestEndY, width: bW, height: CROSS_W,
    area: parseFloat((bW * CROSS_W).toFixed(1)), floor: floorNum });

  // Staircase at corridor intersection (touching corridor, inside service zone)
  const stairSrc = noParking.find(r => is(r, "stair"));
  const stairW2 = 2.5, stairH2 = 3.5;
  result.push({ ...(stairSrc ?? {}), type: "staircase", nameAr: "درج", name: "Staircase",
    x: corrX, y: guestEndY + CROSS_W, width: stairW2, height: stairH2,
    area: stairW2 * stairH2, floor: floorNum, hasDoor: true, doorWall: "west" });

  const noStair = noParking.filter(r => !is(r, "stair"));

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — ROOMS within zones (cannot cross zone boundaries)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── NW: GUEST ZONE ───────────────────────────────────────────────────────
  {
    const { x0, x1, y0, y1 } = Z.guest;
    const zW = x1 - x0, zH = y1 - y0;

    // Majlis: NW corner, min 4×5m
    let majlisW = 0, majlisH = 0;
    const majlis = noStair.find(r => is(r, "majlis", "reception"));
    if (majlis) {
      const m = norm(majlis);
      const w = clamp(m.width, 4.0, zW); const h = clamp(m.height, 5.0, zH);
      result.push({ ...m, x: x0, y: y0, width: w, height: h });
      majlisW = w; majlisH = h;
    }

    // Foyer (2×3m) injected between majlis and entrance
    const entrance = noStair.find(r => is(r, "entrance", "foyer", "lobby"));
    let afterMajlisX = x0 + majlisW;
    if (majlis && entrance) {
      const fw = snap(Math.min(2.0, zW - majlisW)), fh = snap(Math.min(3.0, zH));
      if (fw >= 1.5) {
        result.push({ type: "foyer", nameAr: "فناء استقبال", name: "Foyer",
          x: afterMajlisX, y: y0, width: fw, height: fh,
          area: fw * fh, floor: floorNum, hasDoor: true, doorWall: "south" });
        afterMajlisX += fw;
      }
    }

    // Entrance: next to foyer
    if (entrance) {
      const e = norm(entrance);
      const w = clamp(e.width, 2.5, x1 - afterMajlisX);
      const h = clamp(e.height, 2.5, zH);
      if (w >= 2.0) result.push({ ...e, x: afterMajlisX, y: y0, width: w, height: h });
    }

    // Guest WC: below majlis
    const gWCs = noStair.filter(r => tp(r) === "wc" || tp(r) === "toilet").map(norm);
    pack(gWCs, x0, y0 + majlisH, zW, zH - majlisH);
  }

  // ── NE: PARK AREA (maid/storage since parking is outside) ───────────────
  {
    const { x0, x1, y0, y1 } = Z.parkArea;
    if (x1 - x0 > 0.5) {
      const srvHere = noStair.filter(r => is(r, "maid", "storage", "laundry", "utility")).map(norm);
      pack(srvHere, x0, y0, x1 - x0, y1 - y0);
    }
  }

  // ── SW: FAMILY ZONE ─────────────────────────────────────────────────────
  {
    const { x0, x1, y0: zy0, y1 } = Z.family;
    const zW = x1 - x0;
    const y0 = zy0 + CROSS_W; // below cross corridor

    // Kitchen: left exterior wall (x=x0)
    let kitW = 0, kitH = 0;
    const kitchen = noStair.find(r => is(r, "kitchen"));
    if (kitchen) {
      const k = norm(kitchen);
      const w = clamp(k.width, 2.5, zW * 0.45); const h = clamp(k.height, 4.0, y1 - y0);
      result.push({ ...k, x: x0, y: y0, width: w, height: h });
      kitW = w; kitH = h;
    }

    // Dining: adjacent to kitchen (shared wall)
    const dining = noStair.find(r => is(r, "dining"));
    if (dining) {
      const d = norm(dining);
      const w = clamp(d.width, 2.5, zW - kitW); const h = clamp(d.height, 2.5, y1 - y0);
      if (w >= 2.0) result.push({ ...d, x: x0 + kitW, y: y0, width: w, height: h });
    }

    // Remaining: living, family_living
    const famOthers = noStair
      .filter(r => !is(r, "kitchen", "dining", "majlis", "reception", "entrance", "foyer", "lobby", "maid", "laundry", "storage", "bathroom", "bath") && tp(r) !== "wc" && tp(r) !== "toilet")
      .map(norm);
    pack(famOthers, x0, y0 + kitH, zW, y1 - y0 - kitH);
  }

  // ── SE: SERVICE ZONE ────────────────────────────────────────────────────
  {
    const { x0, x1, y0: zy0, y1 } = Z.service;
    const zW = x1 - x0;
    const y0 = zy0 + CROSS_W + stairH2; // below cross corridor + staircase

    const baths = noStair.filter(r => is(r, "bathroom", "bath") || tp(r) === "wc" || tp(r) === "toilet").map(norm);
    let bathY = zy0 + CROSS_W;
    baths.forEach(r => {
      const w = snap(Math.min(r.width, zW)); const h = clamp(r.height, 2.0, y1 - bathY);
      if (h >= 1.5 && w >= 1.0 && bathY < y1) { result.push({ ...r, x: x0, y: bathY, width: w, height: h }); bathY += h; }
    });

    const srvOthers = noStair.filter(r => is(r, "laundry", "storage", "driver") && !is(r, "maid")).map(norm);
    pack(srvOthers, x0, bathY, zW, y1 - bathY);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION — Fill voids ≥ 2m², log coverage
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const gW = Math.ceil(bW), gH = Math.ceil(bD);
    const occupied = new Uint8Array(gW * gH);
    const idx = (gx: number, gy: number) => gy * gW + gx;
    for (const r of result) {
      if (r._outsideBuilding) continue;
      const x0 = Math.max(0, Math.floor(r.x)); const y0 = Math.max(0, Math.floor(r.y));
      const x1 = Math.min(gW, Math.ceil(r.x + r.width)); const y1 = Math.min(gH, Math.ceil(r.y + r.height));
      for (let gy = y0; gy < y1; gy++) for (let gx = x0; gx < x1; gx++) occupied[idx(gx, gy)] = 1;
    }
    for (let gy = 0; gy < gH; gy++) {
      for (let gx = 0; gx < gW; gx++) {
        if (occupied[idx(gx, gy)]) continue;
        let ex = gx; while (ex + 1 < gW && !occupied[idx(ex+1, gy)]) ex++;
        let ey = gy;
        outer3: while (ey + 1 < gH) { for (let x = gx; x <= ex; x++) { if (occupied[idx(x, ey+1)]) break outer3; } ey++; }
        const vW = snap(ex - gx + 1), vH = snap(ey - gy + 1), area = vW * vH;
        if (area >= 2.0) {
          const cx2 = gx + vW / 2;
          const type = area > 8 ? "family_living" : cx2 > bW * 0.7 ? "storage" : "corridor";
          const nameAr = area > 8 ? "غرفة متعددة" : cx2 > bW * 0.7 ? "مخزن" : "ممر";
          result.push({ type, nameAr, name: type, x: gx, y: gy, width: vW, height: vH,
            area: parseFloat(area.toFixed(1)), floor: floorNum, hasDoor: true, doorWall: "east" });
        }
        for (let y2 = gy; y2 <= ey; y2++) for (let x2 = gx; x2 <= ex; x2++) occupied[idx(x2, y2)] = 1;
      }
    }
    const covered = result.filter(r => !r._outsideBuilding).reduce((s, r) => s + r.width * r.height, 0);
    const pct = (covered / (bW * bD) * 100).toFixed(1);
    if (parseFloat(pct) < 90) console.error(`COVERAGE: ${pct}% < 90% (bW=${bW}, bD=${bD})`);
    else console.error(`COVERAGE: ${pct}% ✓`);
  }

  return result;
}

// ─── Simple snap + clamp for upper floors (bedrooms / bathrooms only) ─────────
function snapUpperFloor(rooms: any[], bW: number, bD: number): any[] {
  const G = 0.5;
  const snap = (v: number) => Math.round(v / G) * G;
  let cx = 0, cy = 0, rowH = 0;
  const result: any[] = [];
  for (const r of [...rooms].sort((a, b) => b.width * b.height - a.width * a.height)) {
    const w = Math.max(snap(r.width ?? 3.0), 2.5);
    const h = Math.max(snap(r.height ?? 3.0), 2.0);
    if (cx + w > bW + 0.01) { cx = 0; cy += rowH; rowH = 0; }
    if (cy + h > bD) break;
    result.push({ ...r, x: Math.min(cx, bW - w), y: Math.min(cy, bD - h), width: Math.min(w, bW - cx), height: Math.min(h, bD - cy) });
    cx += w; rowH = Math.max(rowH, h);
  }
  return result;
}

export const appRouter = router({
  debug: router({
    getLastResponse: publicProcedure.query(() => {
      const readFile = (path: string) => {
        try { return fs.readFileSync(path, "utf-8"); } catch { return null; }
      };
      return {
        gptResponse: readFile("/tmp/gpt-response.json"),
        spacesSource: readFile("/tmp/spaces-source.txt"),
      };
    }),
  }),
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const openId = `email:${input.email}`;
        await upsertUser({
          openId,
          email: input.email,
          name: input.name,
          passwordHash,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        (ctx.res as Response).cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        }
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        (ctx.res as Response).cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as Response).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        officeName: z.string().optional(),
        officePhone: z.string().optional(),
        preferredLang: z.enum(["ar", "en"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getProjectsByUser(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await getProjectById(input.id, ctx.user.id);
        if (!project) throw new Error("Project not found");
        return project;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        landArea: z.number().optional(),
        landWidth: z.number().optional(),
        landLength: z.number().optional(),
        landCoordinates: z.string().optional(),
        landShape: z.enum(["rectangular", "square", "irregular", "L-shape", "T-shape"]).optional(),
        buildingRatio: z.number().optional(),
        floorAreaRatio: z.number().optional(),
        maxFloors: z.number().optional(),
        frontSetback: z.number().optional(),
        backSetback: z.number().optional(),
        sideSetback: z.number().optional(),
        buildingType: z.enum(["residential", "villa"]).optional(),
        numberOfRooms: z.number().optional(),
        numberOfFloors: z.number().optional(),
        parkingSpaces: z.number().optional(),
        additionalRequirements: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        majlis: z.number().optional(),
        garages: z.number().optional(),
        maidRooms: z.number().optional(),
        balconies: z.number().optional(),
        zoningCode: z.string().optional(),
        deedNumber: z.string().optional(),
        plotNumber: z.string().optional(),
        blockNumber: z.string().optional(),
        neighborhoodName: z.string().optional(),
        deedFileUrl: z.string().optional(),
        buildingCodeFileUrl: z.string().optional(),
        extractedDeedData: z.any().optional(),
        extractedBuildingCodeData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check project limit for free plan
        const userProjects = await getProjectsByUser(ctx.user.id);
        const canCreate = await canCreateProject(ctx.user.id, userProjects.length);
        if (!canCreate.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: canCreate.reason ?? "Project limit reached. Please upgrade your plan." });
        }
        const isLarge = (input.landArea ?? 0) > 5000 || (input.numberOfFloors ?? 0) > 10;
        const id = await createProject({
          ...input,
          userId: ctx.user.id,
          status: "draft",
          isLargeProject: isLarge,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        landArea: z.number().optional(),
        landWidth: z.number().optional(),
        landLength: z.number().optional(),
        landCoordinates: z.string().optional(),
        landShape: z.enum(["rectangular", "square", "irregular", "L-shape", "T-shape"]).optional(),
        buildingRatio: z.number().optional(),
        floorAreaRatio: z.number().optional(),
        maxFloors: z.number().optional(),
        frontSetback: z.number().optional(),
        backSetback: z.number().optional(),
        sideSetback: z.number().optional(),
        buildingType: z.enum(["residential", "villa"]).optional(),
        numberOfRooms: z.number().optional(),
        numberOfFloors: z.number().optional(),
        parkingSpaces: z.number().optional(),
        additionalRequirements: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        majlis: z.number().optional(),
        garages: z.number().optional(),
        maidRooms: z.number().optional(),
        balconies: z.number().optional(),
        zoningCode: z.string().optional(),
        deedNumber: z.string().optional(),
        plotNumber: z.string().optional(),
        blockNumber: z.string().optional(),
        neighborhoodName: z.string().optional(),
        deedFileUrl: z.string().optional(),
        buildingCodeFileUrl: z.string().optional(),
        extractedDeedData: z.any().optional(),
        extractedBuildingCodeData: z.any().optional(),
        status: z.enum(["draft", "processing", "completed", "archived"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateProject(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  blueprints: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getBlueprintsByProject(input.projectId, ctx.user.id);
      }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      return getBlueprintsByUser(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const bp = await getBlueprintById(input.id, ctx.user.id);
        if (!bp) throw new Error("Blueprint not found");
        return bp;
      }),
    listByBatch: protectedProcedure
      .input(z.object({ batchId: z.string() }))
      .query(async ({ ctx, input }) => {
        return getBlueprintsByBatch(input.batchId, ctx.user.id);
      }),
    select: protectedProcedure
      .input(z.object({ blueprintId: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await selectBlueprint(input.blueprintId, input.projectId, ctx.user.id);
        await updateProject(input.projectId, ctx.user.id, { status: "completed" });
        return { success: true };
      }),

    // ─── Export DXF ──────────────────────────────────────────────────────────────────────
    exportDXF: protectedProcedure
      .input(z.object({
        blueprintId: z.number(),
        floor: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const bp = await getBlueprintById(input.blueprintId, ctx.user.id);
        if (!bp) throw new Error("Blueprint not found");
        const data = bp.structuredData as any ?? {};
        const spaces = data.spaces ?? [];
        const bspLayout = data.bspLayout;
        const projectName = (bp as any).projectName ?? data.titleAr ?? data.title ?? "مخطط";
        const dxfContent = generateDXF(spaces, bspLayout, projectName, input.floor);
        return { dxfContent, fileName: `blueprint-floor${input.floor}.dxf` };
      }),

    // ─── Save Engineer Edits ───────────────────────────────────────────────────
    saveEdits: protectedProcedure
      .input(z.object({
        blueprintId: z.number(),
        editedSpaces: z.array(z.object({
          id: z.string(),
          name: z.string(),
          nameAr: z.string().optional(),
          type: z.string(),
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          floor: z.number().default(0),
        })),
        editorFeedback: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const bp = await getBlueprintById(input.blueprintId, ctx.user.id);
        if (!bp) throw new Error("Blueprint not found");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.update(blueprints)
          .set({
            editedSpaces: input.editedSpaces,
            editorFeedback: input.editorFeedback ?? null,
            isEditedByEngineer: true,
            updatedAt: new Date(),
          })
          .where(eq(blueprints.id, input.blueprintId));
        return { success: true };
      }),

    // ─── Submit Feedback & Add to RAG ───────────────────────────────────────────
    submitFeedback: protectedProcedure
      .input(z.object({
        blueprintId: z.number(),
        feedback: z.string(),
        addToRAG: z.boolean().default(false),
        ragLabel: z.string().optional(), // e.g. "فيلا 300م² - حي الريان"
      }))
      .mutation(async ({ ctx, input }) => {
        const bp = await getBlueprintById(input.blueprintId, ctx.user.id);
        if (!bp) throw new Error("Blueprint not found");
        const updates: any = {
          editorFeedback: input.feedback,
          updatedAt: new Date(),
        };
        if (input.addToRAG) {
          updates.addedToRAG = true;
          // Build RAG entry from edited or original spaces
          const spaces = (bp.editedSpaces as any[]) ?? ((bp.structuredData as any)?.spaces ?? []);
          const project = await getProjectById((bp as any).projectId, ctx.user.id);
          if (project && spaces.length > 0) {
            const ragEntry = {
              id: `user_edit_${bp.id}`,
              label: input.ragLabel ?? `مخطط معدّل - ${project.name}`,
              buildingType: project.buildingType ?? "villa",
              totalArea: project.landArea ?? 0,
              floors: project.numberOfFloors ?? 1,
              rooms: spaces.map((s: any) => ({
                name: s.nameAr ?? s.name,
                type: s.type,
                width: s.width,
                length: s.height,
                area: Math.round(s.width * s.height),
                floor: s.floor ?? 0,
                position: s.x < 33 ? "left" : s.x > 66 ? "right" : "center",
              })),
            };
            // Store in DB for future RAG queries (as JSON in editorFeedback metadata)
            updates.editorFeedback = JSON.stringify({ feedback: input.feedback, ragEntry });
          }
        }
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.update(blueprints)
          .set(updates)
          .where(eq(blueprints.id, input.blueprintId));
        return { success: true, addedToRAG: input.addToRAG };
      }),

    // ─── Get Edited Spaces ───────────────────────────────────────────────────────
    getEdits: protectedProcedure
      .input(z.object({ blueprintId: z.number() }))
      .query(async ({ ctx, input }) => {
        const bp = await getBlueprintById(input.blueprintId, ctx.user.id);
        if (!bp) throw new Error("Blueprint not found");
        return {
          editedSpaces: bp.editedSpaces as any[] ?? null,
          editorFeedback: bp.editorFeedback,
          isEditedByEngineer: bp.isEditedByEngineer,
          addedToRAG: bp.addedToRAG,
        };
      }),

    // ─── Analyze uploaded blueprint image ───────────────────────────────
    analyze: publicProcedure
      .input(z.object({
        imageUrl: z.string().url(),
        lang: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = input.lang === "ar"
          ? `أنت خبير معماري ومهندس متخصص في الكود السعودي للبناء. مهمتك تحليل المخططات المعمارية المرفوعة وتقديم تقرير شامل يتضمن:
1. **وصف المخطط**: نوع المبنى، عدد الغرف، التوزيع العام
2. **نقاط القوة**: ما هو جيد في المخطط
3. **النواقص المعمارية**: ما ينقص من ناحية التصميم المعماري (إضاءة، تهوية، توزيع الفراغات، مداخل، خصوصية)
4. **التعارضات مع الكود السعودي**: مخالفات كود البناء السعودي (نظام BCSA) مثل: الارتدادات، الارتفاعات، نسب البناء، متطلبات الإطفاء، المداخل، مواقف السيارات
5. **التوصيات**: اقتراحات عملية للتحسين مرتبة حسب الأولوية
قدم التقرير بشكل منظم ومفصل باللغة العربية.`
          : `You are an architectural expert and engineer specializing in Saudi Building Code. Your task is to analyze uploaded architectural blueprints and provide a comprehensive report including:
1. **Blueprint Description**: Building type, room count, general layout
2. **Strengths**: What is good about the blueprint
3. **Architectural Deficiencies**: What is missing architecturally (lighting, ventilation, space distribution, entrances, privacy)
4. **Saudi Building Code Conflicts**: Violations of Saudi Building Code (BCSA) such as: setbacks, heights, FAR ratios, fire safety requirements, entrances, parking
5. **Recommendations**: Practical improvement suggestions ordered by priority
Provide the report in a structured and detailed format.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: input.imageUrl, detail: "high" } },
                { type: "text", text: input.lang === "ar" ? "حلل هذا المخطط المعماري وقدم تقريراً شاملاً." : "Analyze this architectural blueprint and provide a comprehensive report." },
              ],
            },
          ],
        });
        const content = response.choices?.[0]?.message?.content ?? "";
        return { report: content };
      }),
    // ─── Generate 6 concepts at once ───────────────────────────────────
    generate6: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        lang: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ ctx, input }) => {
        console.error("=== GENERATE6 CALLED ===");
        // Check daily blueprint limit for free plan
        const canGenerate = await canGenerateBlueprint(ctx.user.id);
        if (!canGenerate.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: canGenerate.reason ?? "Blueprint limit reached. Please upgrade your plan." });
        }
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        console.error("LAND INPUT:", project.landWidth, project.landLength, project.landArea);
        // Step 1: Auto-check Saudi Building Codee
        const codeCheck = checkSaudiBuildingCode(project);

        // Step 2: Apply auto-corrections and collect explicit warnings per field
        const correctionWarnings: string[] = [];
        const correctionWarningsAr: string[] = [];
        if (!codeCheck.isCompliant) {
          if (project.frontSetback !== undefined && project.frontSetback !== null && project.frontSetback !== codeCheck.corrected.frontSetback) {
            correctionWarnings.push(`Front setback raised from ${project.frontSetback}m to ${codeCheck.corrected.frontSetback}m (SBC 1101 national minimum)`);
            correctionWarningsAr.push(`تم رفع الإرتداد الأمامي من ${project.frontSetback}م إلى ${codeCheck.corrected.frontSetback}م (الحد الأدنى الوطني SBC 1101)`);
          }
          if (project.backSetback !== undefined && project.backSetback !== null && project.backSetback !== codeCheck.corrected.backSetback) {
            correctionWarnings.push(`Back setback raised from ${project.backSetback}m to ${codeCheck.corrected.backSetback}m (SBC 1101 national minimum)`);
            correctionWarningsAr.push(`تم رفع الإرتداد الخلفي من ${project.backSetback}م إلى ${codeCheck.corrected.backSetback}م (الحد الأدنى الوطني SBC 1101)`);
          }
          if (project.sideSetback !== undefined && project.sideSetback !== null && project.sideSetback !== codeCheck.corrected.sideSetback) {
            correctionWarnings.push(`Side setback raised from ${project.sideSetback}m to ${codeCheck.corrected.sideSetback}m (SBC 1101 national minimum)`);
            correctionWarningsAr.push(`تم رفع الإرتداد الجانبي من ${project.sideSetback}م إلى ${codeCheck.corrected.sideSetback}م (الحد الأدنى الوطني SBC 1101)`);
          }
          if (project.numberOfFloors !== undefined && project.numberOfFloors !== null && project.numberOfFloors !== codeCheck.corrected.numberOfFloors) {
            correctionWarnings.push(`Number of floors reduced from ${project.numberOfFloors} to ${codeCheck.corrected.numberOfFloors} (exceeds permitted maximum)`);
            correctionWarningsAr.push(`تم تخفيض عدد الأدوار من ${project.numberOfFloors} إلى ${codeCheck.corrected.numberOfFloors} (يتجاوز الحد المسموح به)`);
          }
          await updateProject(input.projectId, ctx.user.id, {
            frontSetback: codeCheck.corrected.frontSetback,
            backSetback: codeCheck.corrected.backSetback,
            sideSetback: codeCheck.corrected.sideSetback,
            buildingRatio: codeCheck.corrected.buildingRatio,
            numberOfFloors: codeCheck.corrected.numberOfFloors,
          });
        }

         await updateProject(input.projectId, ctx.user.id, { status: "processing" });
        // Step 3: Generate batch ID
        const batchId = `batch_${Date.now()}_${ctx.user.id}`;
        const startTime = Date.now();
        // Step 4: Generate 6 concepts in parallel (BSP + AI)
        const conceptPromises = Array.from({ length: 6 }, (_, i) => {
          const conceptIndex = i + 1;
          // 4a: Generate BSP layout (deterministic, instant)t)
          // Compute building footprint from user's actual land dimensions
          const correctedSetbacks = {
            front: codeCheck.corrected.frontSetback,
            back: codeCheck.corrected.backSetback,
            side: codeCheck.corrected.sideSetback,
          };
          const userBuildingWidth = project.landWidth
            ? parseFloat((project.landWidth - correctedSetbacks.side * 2).toFixed(2))
            : undefined;
          const userBuildingDepth = project.landLength
            ? parseFloat((project.landLength - correctedSetbacks.front - correctedSetbacks.back).toFixed(2))
            : undefined;

          let lW = userBuildingWidth ?? Math.sqrt((project.landArea ?? 300) * 0.6);
          let lD = userBuildingDepth ?? (project.landArea ?? 300) / lW;

          // Fix 1: Reduce setbacks if resulting building footprint is too small
          if (lW < 8 && project.landWidth) {
            correctedSetbacks.side = 1.5;
            lW = parseFloat((project.landWidth - 1.5 * 2).toFixed(2));
            console.error(`SETBACK REDUCED: side → 1.5m, new bW=${lW}`);
          }
          if (lD < 10 && project.landLength) {
            correctedSetbacks.back = 2;
            lD = parseFloat((project.landLength - correctedSetbacks.front - 2).toFixed(2));
            console.error(`SETBACK REDUCED: back → 2m, new bD=${lD}`);
          }

          // Template-based layout: scale real DXF villa geometry to fit this land
          const template = findBestTemplate(
            project.landWidth  ?? lW + correctedSetbacks.side * 2,
            project.landLength ?? lD + correctedSetbacks.front + correctedSetbacks.back,
          );
          let scaledRooms = scaleTemplate(
            template, lW, lD,
            correctedSetbacks.side, correctedSetbacks.back,
            codeCheck.corrected.numberOfFloors + 1,
          );

          // Pad sparse upper floors (< 3 rooms) with basic zone rooms
          const numFloors = codeCheck.corrected.numberOfFloors;
          const bedsPerFloor = Math.ceil((project.bedrooms ?? 3) / Math.max(numFloors, 1));
          for (let f = 1; f <= numFloors; f++) {
            const floorRooms = scaledRooms.filter(r => r.floor === f);
            if (floorRooms.length < 3) {
              const sX = correctedSetbacks.side, sY = correctedSetbacks.back;
              const bedCount = Math.min(bedsPerFloor, 3);
              const bedW = parseFloat((lW / bedCount).toFixed(2));
              const padRooms: any[] = [
                { type: "corridor",       nameAr: "ممر",             nameEn: "Corridor",       x: sX,           y: sY,            w: lW,          h: parseFloat((lD * 0.12).toFixed(2)), area: 0, floor: f },
                { type: "staircase",      nameAr: "درج",             nameEn: "Staircase",      x: sX,           y: sY + lD*0.12,  w: lW*0.20,     h: parseFloat((lD * 0.35).toFixed(2)), area: 0, floor: f },
                { type: "master_bedroom", nameAr: "غرفة نوم ماستر", nameEn: "Master Bedroom", x: sX + lW*0.20, y: sY + lD*0.12,  w: lW*0.40,     h: parseFloat((lD * 0.35).toFixed(2)), area: 0, floor: f },
                { type: "bathroom",       nameAr: "حمام",            nameEn: "Bathroom",       x: sX + lW*0.60, y: sY + lD*0.12,  w: lW*0.40,     h: parseFloat((lD * 0.35).toFixed(2)), area: 0, floor: f },
                ...Array.from({ length: bedCount }, (_, b) => ({
                  type: "bedroom", nameAr: `غرفة نوم ${b+1}`, nameEn: `Bedroom ${b+1}`,
                  x: sX + b * bedW, y: sY + lD * 0.47, w: bedW, h: parseFloat((lD * 0.53).toFixed(2)), area: 0, floor: f,
                })),
              ];
              // Remove area=0 placeholder, compute real areas
              padRooms.forEach(r => { r.area = parseFloat((r.w * r.h).toFixed(1)); });
              scaledRooms = [...scaledRooms.filter(r => r.floor !== f), ...padRooms];
            }
          }

          const bAreaT  = parseFloat((lW * lD).toFixed(1));
          const totalAreaT = parseFloat((bAreaT * (codeCheck.corrected.numberOfFloors + 1)).toFixed(1));
          const zoneLayout = {
            buildingWidth: lW,
            buildingDepth: lD,
            buildingArea:  bAreaT,
            setbacks: correctedSetbacks,
            rooms: scaledRooms,
            summary: {
              totalFloors:   codeCheck.corrected.numberOfFloors + 1,
              totalRooms:    scaledRooms.length,
              totalArea:     totalAreaT,
              bedrooms:      project.bedrooms  ?? 3,
              bathrooms:     project.bathrooms ?? 2,
              buildingWidth: lW,
              buildingDepth: lD,
              buildingArea:  bAreaT,
              // estimatedCost: `SAR ${Math.round(totalAreaT * 1800).toLocaleString()} – ${Math.round(totalAreaT * 2500).toLocaleString()}`,
              landWidth:     parseFloat((project.landWidth  ?? (lW + correctedSetbacks.side * 2)).toFixed(2)),
              landDepth:     parseFloat((project.landLength ?? (lD + correctedSetbacks.front + correctedSetbacks.back)).toFixed(2)),
              frontSetback:  correctedSetbacks.front,
              backSetback:   correctedSetbacks.back,
              sideSetback:   correctedSetbacks.side,
            },
          };
          console.error("TEMPLATE:", template.id, "bW=", lW, "bD=", lD, "rooms=", scaledRooms.length);

          // 4b: AI enrichment (titles, descriptions, highlights) — slim prompt, 300 tokens max
          const prompt = buildConceptPrompt(project, conceptIndex);
          const callLLM = () => invokeLLM({
            messages: [
              { role: "system", content: "Respond with valid JSON only." },
              { role: "user", content: prompt },
            ],
            maxTokens: 300,
          });
          return (async () => {
            let response;
            try {
              response = await callLLM();
            } catch (err: any) {
              // Retry once on 429 rate-limit error
              if (err?.message?.includes("429") || err?.code === "rate_limit_exceeded") {
                await new Promise(r => setTimeout(r, 2500));
                response = await callLLM();
              } else {
                throw err;
              }
            }
            const rawContent = response.choices[0]?.message?.content;
            const content = typeof rawContent === "string" ? rawContent : "{}";
            const parsed = safeParseJSON(content, AI_FALLBACK);
            let aiData: any = (parsed && !parsed.error) ? parsed : { ...AI_FALLBACK };
            // Map slim response keys to expected keys
            if (aiData.description && !aiData.conceptDescription) aiData.conceptDescription = aiData.description;
            if (aiData.descriptionAr && !aiData.conceptDescriptionAr) aiData.conceptDescriptionAr = aiData.descriptionAr;

            // ── Room placement: 100% deterministic zone engine ──────────────
            const conceptTitle = CONCEPT_TITLES[i];
            const { buildingWidth: bW, buildingDepth: bD } = zoneLayout;

            // Convert absolute meter coords → percentage (0-100) for client renderer
            const finalSpaces = zoneLayout.rooms.map(r => ({
              name:    r.nameEn,
              nameAr:  r.nameAr,
              floor:   r.floor,
              width:   r.w,
              length:  r.h,
              area:    r.area,
              type:    r.type,
              x: parseFloat(((r.x - correctedSetbacks.side)  / bW * 100).toFixed(2)),
              y: parseFloat(((r.y - correctedSetbacks.back)  / bD * 100).toFixed(2)),
              w: parseFloat((r.w / bW * 100).toFixed(2)),
              h: parseFloat((r.h / bD * 100).toFixed(2)),
            }));
            console.error(`CONCEPT${conceptIndex} FINAL SPACES (${finalSpaces.length}):`,
              JSON.stringify(finalSpaces.map(s => `${s.name}(f${s.floor}): x=${s.x} y=${s.y} w=${s.w} h=${s.h}`))
            );

            const structuredData = {
              ...aiData,
              title:   aiData.title   ?? `Concept ${conceptIndex}: ${conceptTitle.en}`,
              titleAr: aiData.titleAr ?? `المفهوم ${conceptIndex}: ${conceptTitle.ar}`,
              spaces: finalSpaces,
              summary: zoneLayout.summary,
              regulatoryCompliance: {
                isCompliant: codeCheck.isCompliant,
                buildingFootprint: zoneLayout.buildingArea,
                actualCoverageRatio: Math.round((zoneLayout.buildingArea / (project.landArea ?? 300)) * 100),
                setbacks: correctedSetbacks,
                complianceNotes: aiData.complianceNotes ?? ["Saudi Building Code verified", "Setbacks applied"],
                complianceNotesAr: aiData.complianceNotesAr ?? ["تم التحقق من الكود السعودي", "تم تطبيق الإرتدادات"],
              },
              svgData: null,
            };

            const blueprintId = await createBlueprint({
              projectId: input.projectId,
              userId: ctx.user.id,
              title: structuredData.title,
              version: 1,
              conceptIndex,
              batchId,
              conceptDescription: structuredData.conceptDescription ?? "",
              conceptDescriptionAr: structuredData.conceptDescriptionAr ?? "",
              structuredData,
              regulatoryCompliance: structuredData.regulatoryCompliance,
              aiModel: "bsp+llm",
              generationTime: Date.now() - startTime,
            });
            return { blueprintId, conceptIndex, structuredData };
          })();
        });

        const results = await Promise.all(conceptPromises);

        await updateProject(input.projectId, ctx.user.id, { status: "completed" });

        if (project.isLargeProject) {
          await notifyOwner({
            title: `Large Project — 6 Blueprints Generated: ${project.name}`,
            content: `6 blueprint concepts generated for "${project.name}" (User ID: ${ctx.user.id}). Batch: ${batchId}`,
          });
        }

        return {
          batchId,
          blueprints: results,
          codeWarnings: codeCheck.warningsAr,
          codeWarningsEn: codeCheck.warnings,
          autoCorrections: !codeCheck.isCompliant ? codeCheck.corrected : null,
          correctionWarnings,
          correctionWarningsAr,
        };
      }),

    // Keep legacy single generate for backward compat
    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        lang: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        await updateProject(input.projectId, ctx.user.id, { status: "processing" });
        const startTime = Date.now();
        const codeCheck = checkSaudiBuildingCode(project);
        const prompt = buildConceptPrompt(project, 1);
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert Saudi architectural AI. Always respond with valid JSON only, no markdown." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let structuredData: any = safeParseJSON(content, { error: "Failed to parse AI response" });
        const generationTime = Date.now() - startTime;
        const blueprintId = await createBlueprint({
          projectId: input.projectId,
          userId: ctx.user.id,
          title: structuredData.title ?? project.name,
          version: 1,
          conceptIndex: 1,
          conceptDescription: structuredData.conceptDescription ?? "",
          conceptDescriptionAr: structuredData.conceptDescriptionAr ?? "",
          structuredData,
          regulatoryCompliance: structuredData.regulatoryCompliance ?? {},
          aiModel: "built-in",
          generationTime,
        });
        await updateProject(input.projectId, ctx.user.id, { status: "completed" });
        return { blueprintId, structuredData };
      }),
  }),

  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.enum(["ar", "en"]).default("ar"),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language === "ar" ? "ar" : "en",
          prompt: input.language === "ar"
            ? "هذا تسجيل صوتي لمتطلبات مشروع معماري من مكتب هندسي"
            : "This is a voice recording of architectural project requirements from an engineering office",
        });
        const text = "text" in result ? result.text : "";
        const lang = "language" in result ? (result as any).language : input.language;
        return { text, language: lang };
      }),
    parseRequirements: protectedProcedure
      .input(z.object({ text: z.string(), lang: z.enum(["ar", "en"]).default("ar") }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert at extracting structured architectural project data from natural language text. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: `Extract structured project data from this text and return JSON with these fields (use null for missing values):
{
  "name": string,
  "buildingType": "residential"|"villa"|null,
  "landArea": number|null,
  "landWidth": number|null,
  "landLength": number|null,
  "buildingRatio": number|null,
  "maxFloors": number|null,
  "frontSetback": number|null,
  "backSetback": number|null,
  "sideSetback": number|null,
  "numberOfRooms": number|null,
  "numberOfFloors": number|null,
  "parkingSpaces": number|null,
  "additionalRequirements": string|null
}

Text: "${input.text}"`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "project_requirements",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  buildingType: { type: "string" },
                  landArea: { type: "number" },
                  landWidth: { type: "number" },
                  landLength: { type: "number" },
                  buildingRatio: { type: "number" },
                  maxFloors: { type: "number" },
                  frontSetback: { type: "number" },
                  backSetback: { type: "number" },
                  sideSetback: { type: "number" },
                  numberOfRooms: { type: "number" },
                  numberOfFloors: { type: "number" },
                  parkingSpaces: { type: "number" },
                  additionalRequirements: { type: "string" },
                },
                required: ["name", "buildingType", "landArea", "landWidth", "landLength", "buildingRatio", "maxFloors", "frontSetback", "backSetback", "sideSetback", "numberOfRooms", "numberOfFloors", "parkingSpaces", "additionalRequirements"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent2 = response.choices[0]?.message?.content;
        const content2 = typeof rawContent2 === "string" ? rawContent2 : "{}";
        return safeParseJSON(content2, {});
      }),
  }),

  stats: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      const [projects, blueprints] = await Promise.all([
        getProjectsByUser(ctx.user.id),
        getBlueprintsByUser(ctx.user.id),
      ]);
      return {
        totalProjects: projects.length,
        totalBlueprints: blueprints.length,
        completedProjects: projects.filter((p) => p.status === "completed").length,
        draftProjects: projects.filter((p) => p.status === "draft").length,
      };
    }),
  }),

  documents: router({
    // Extract data from deed PDF (صك الأرض)
    extractDeed: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert at reading Saudi real estate deed documents issued by the Ministry of Justice (وزارة العدل) and the Real Estate Market (البورصة العقارية). These documents are titled 'وثيقة تملك عقار' or 'صك ملكية'. Extract all land data from the document tables and text. Key fields: رقم الوثيقة، المدينة، الحي، رقم المخطط، رقم القطعة، مساحة العقار، نوع العقار، الحدود والأبعاد (شمالاً/جنوباً/شرقاً/غرباً with lengths), الارتدادات (mentioned as 'ارتداد عرض X.00م' in boundary descriptions). Always respond with valid JSON only, no markdown.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text" as const,
                  text: `Extract all data from this Saudi real estate deed (وثيقة تملك عقار / صك ملكية) and return JSON:
{
  "deedNumber": string|null,
  "plotNumber": string|null,
  "blockNumber": string|null,
  "planNumber": string|null,
  "neighborhoodName": string|null,
  "districtName": string|null,
  "cityName": string|null,
  "landArea": number|null,
  "propertyType": "أرض"|"شقة"|"فيلا"|"عمارة"|"دور"|"محل"|string|null,
  "landWidth": number|null,
  "landLength": number|null,
  "northLength": number|null,
  "southLength": number|null,
  "eastLength": number|null,
  "westLength": number|null,
  "northSetback": number|null,
  "southSetback": number|null,
  "eastSetback": number|null,
  "westSetback": number|null,
  "landShape": "rectangular"|"square"|"irregular"|"L-shape"|"T-shape"|null,
  "coordinates": string|null,
  "ownerName": string|null,
  "deedDate": string|null,
  "notes": string|null
}
For setbacks: look in boundary description for 'ارتداد عرض X.00م' — extract X as a number.
For lengths: look in boundary table column 'الطول م'.
Return ONLY valid JSON, no extra text.`,
                },
                {
                  type: "image_url" as const,
                  image_url: { url: input.fileUrl, detail: "high" as const },
                },
              ],
            },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let extracted: any = safeParseJSON(content, { error: "Could not parse deed" });
        // Auto-update project if provided
        if (input.projectId && !extracted.error) {
          await updateProject(input.projectId, ctx.user.id, {
            deedFileUrl: input.fileUrl,
            extractedDeedData: extracted,
            deedNumber: extracted.deedNumber ?? undefined,
            plotNumber: extracted.plotNumber ?? undefined,
            blockNumber: extracted.blockNumber ?? undefined,
            planNumber: extracted.planNumber ?? undefined,
            neighborhoodName: extracted.neighborhoodName ?? extracted.districtName ?? undefined,
            propertyType: extracted.propertyType ?? undefined,
            landArea: extracted.landArea ?? undefined,
            landWidth: extracted.landWidth ?? undefined,
            landLength: extracted.landLength ?? undefined,
            landShape: extracted.landShape ?? undefined,
            landCoordinates: extracted.coordinates ?? undefined,
            northLength: extracted.northLength ?? undefined,
            southLength: extracted.southLength ?? undefined,
            eastLength: extracted.eastLength ?? undefined,
            westLength: extracted.westLength ?? undefined,
            northSetback: extracted.northSetback ?? undefined,
            southSetback: extracted.southSetback ?? undefined,
            eastSetback: extracted.eastSetback ?? undefined,
            westSetback: extracted.westSetback ?? undefined,
          });
        }
        return { extracted, success: !extracted.error };
      }),

    // Extract data from building code PDF (نظام البناء من أمانة الرياض)
    extractBuildingCode: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert at reading Saudi municipal building code documents (نظام البناء من أمانة الرياض). Extract all building regulations accurately. Always respond with valid JSON only, no markdown.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text" as const,
                  text: `Extract all building regulations from this Saudi building code document (نظام البناء) and return JSON:
{
  "zoningCode": string|null,
  "allowedUses": string|null,
  "buildingRatio": number|null,
  "floorAreaRatio": number|null,
  "maxFloors": number|null,
  "maxHeight": number|null,
  "frontSetback": number|null,
  "backSetback": number|null,
  "sideSetback": number|null,
  "parkingRequirements": string|null,
  "specialConditions": string|null,
  "neighborhoodName": string|null,
  "municipalityName": string|null,
  "plotNumber": string|null,
  "blockNumber": string|null,
  "planNumber": string|null
}
Return ONLY valid JSON, no extra text.`,
                },
                {
                  type: "image_url" as const,
                  image_url: { url: input.fileUrl, detail: "high" as const },
                },
              ],
            },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let extracted: any = safeParseJSON(content, { error: "Could not parse building code" });
        // Auto-update project if provided
        if (input.projectId && !extracted.error) {
          await updateProject(input.projectId, ctx.user.id, {
            buildingCodeFileUrl: input.fileUrl,
            extractedBuildingCodeData: extracted,
            zoningCode: extracted.zoningCode ?? undefined,
            buildingRatio: extracted.buildingRatio ?? undefined,
            floorAreaRatio: extracted.floorAreaRatio ?? undefined,
            maxFloors: extracted.maxFloors ?? undefined,
            frontSetback: extracted.frontSetback ?? undefined,
            backSetback: extracted.backSetback ?? undefined,
            sideSetback: extracted.sideSetback ?? undefined,
            neighborhoodName: extracted.neighborhoodName ?? undefined,
            plotNumber: extracted.plotNumber ?? undefined,
            blockNumber: extracted.blockNumber ?? undefined,
          });
        }
        return { extracted, success: !extracted.error };
      }),
  }),

  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateSubscription(ctx.user.id);
    }),
    upgrade: protectedProcedure
      .input(z.object({ plan: z.enum(["student", "solo", "office"]) }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getOrCreateSubscription(ctx.user.id);
        // student: 1 project/day (20 SAR) | solo/office: unlimited
        const blueprintLimit = input.plan === "student" ? 1 : -1;
        const projLimit = -1; // all plans have unlimited projects
        const price = input.plan === "student" ? 20 : input.plan === "solo" ? 500 : 2000;
        const seats = input.plan === "office" ? 3 : 1;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await updateSubscription(sub.id, {
          plan: input.plan,
          blueprintsLimit: blueprintLimit,
          projectsLimit: projLimit,
          pricePerMonth: price,
          seats,
          expiresAt,
        });
        const planNames: Record<string, string> = { student: "طلاب (20 ريال)", solo: "احترافي (500 ريال)", office: "مختص (2000 ريال)" };
        await notifyOwner({
          title: `اشتراك جديد: ${planNames[input.plan]}`,
          content: `المستخدم ${ctx.user.name} (${ctx.user.email}) اشترك في خطة ${planNames[input.plan]}.`,
        });
        return { success: true, plan: input.plan };
      }),
  }),
});

export type AppRouter = typeof appRouter;
