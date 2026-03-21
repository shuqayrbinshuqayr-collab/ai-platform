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
import { generateBSPLayout, generateSVG, CONCEPT_TITLES } from "./bsp";
import { generateDXF } from "./dxfGenerator";
import { buildEnhancedArchPrompt } from "./saudiArchRules";
import { SBC_SETBACKS, SBC_COVERAGE, SBC_HEIGHT } from "./core/saudiCode";
import { generateRAGContext, generateLearnedContext } from "./blueprintRAG";
import { getLearnedBlueprints, canGenerateBlueprint, canCreateProject } from "./db";
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

// ─── Build Enhanced AI prompt using Saudi Arch Rules + RAG ─────────────────
function buildConceptPrompt(project: any, conceptIndex: number, corrected: any, learnedContext = "") {
  const conceptStyles = [
    { en: "Modern Minimalist", ar: "عصري مينيمالي", focus: "open spaces, clean lines, maximum natural light, minimal walls" },
    { en: "Traditional Saudi Heritage", ar: "تراثي سعودي", focus: "mashrabiya elements, central courtyard, Arabic arches, ornamental details" },
    { en: "Contemporary Luxury", ar: "معاصر فاخر", focus: "double-height spaces, premium finishes, panoramic views, grand entrance" },
    { en: "Functional Compact", ar: "وظيفي مدمج", focus: "efficient space utilization, smart storage, practical layout, no wasted space" },
    { en: "Mediterranean", ar: "متوسطي", focus: "arched windows, terracotta tones, garden integration, outdoor living" },
    { en: "Smart Home Ready", ar: "جاهز للمنزل الذكي", focus: "integrated tech spaces, home office, flexible multi-purpose rooms" },
  ];
  const concept = conceptStyles[conceptIndex - 1] ?? conceptStyles[0];

  // Generate RAG context from similar real blueprints
  const ragContext = generateRAGContext({
    landArea: project.landArea ?? 300,
    landWidth: project.landWidth ?? undefined,
    landLength: project.landLength ?? undefined,
    floors: corrected.numberOfFloors,
    bedrooms: project.bedrooms ?? 4,
    bathrooms: project.bathrooms ?? 3,
    hasMajlis: (project.majlis ?? 1) > 0,
    hasParking: (project.garages ?? 1) > 0,
  });

  // Parse facadeStyle from additionalRequirements (e.g. "facadeStyle:arabic|...")
  const additionalReqs = project.additionalRequirements ?? "";
  const facadeMatch = additionalReqs.match(/facadeStyle:([^|]+)/);
  const facadeStyle = facadeMatch?.[1]?.trim();

  // Use the enhanced prompt builder with Saudi rules
  return buildEnhancedArchPrompt({
    buildingType: project.buildingType === "villa" ? "villa" : "residential",
    landArea: project.landArea ?? 300,
    landWidth: project.landWidth ?? undefined,
    landLength: project.landLength ?? undefined,
    landShape: project.landShape ?? "rectangular",
    numberOfFloors: corrected.numberOfFloors,
    bedrooms: project.bedrooms ?? 4,
    bathrooms: project.bathrooms ?? 3,
    majlis: project.majlis ?? 1,
    maidRooms: project.maidRooms ?? 0,
    balconies: project.balconies ?? 1,
    garages: project.garages ?? 1,
    additionalRequirements: additionalReqs,
    setbacks: {
      front: corrected.frontSetback,
      back: corrected.backSetback,
      side: corrected.sideSetback,
    },
    buildingRatio: corrected.buildingRatio,
    conceptIndex,
    conceptStyle: concept,
    facadeStyle,
  }) + ragContext + learnedContext;
}

// ─── Zone-based architectural room placement (ground floor) ──────────────────
// Ignores GPT-4o x/y coordinates entirely. Uses only room type + size.
function placeRoomsInZones(rooms: any[], bW: number, bD: number): any[] {
  const G = 0.5; // grid step
  const snap = (v: number) => Math.round(v / G) * G;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

  // ── Type helpers ────────────────────────────────────────────────────────────
  const tp = (r: any) => (r.type ?? "").toLowerCase().replace(/[\s-]/g, "_");
  const is = (r: any, ...kw: string[]) => kw.some(k => tp(r).includes(k));

  // ── Zone y-boundaries ────────────────────────────────────────────────────────
  const guestEnd   = snap(bD * 0.38);   // guest/reception zone: top 38%
  const familyEnd  = snap(bD * 0.70);   // family/living zone:   38–70%
  // service zone: 70–100%

  // ── Classify each room into a zone ──────────────────────────────────────────
  const classify = (r: any): "guest" | "family" | "service" => {
    if (is(r, "entrance", "foyer", "lobby", "majlis", "reception", "parking", "garage")) return "guest";
    if (tp(r) === "wc" || tp(r) === "toilet") return "guest";
    if (is(r, "stair", "elevator", "family", "living", "salon", "dining")) return "family";
    if (is(r, "kitchen", "maid", "laundry", "storage", "driver")) return "service";
    if (is(r, "bathroom", "bath")) return "service";
    return "family"; // bedrooms and unknowns → family zone
  };

  // ── Normalise room width/height (enforce minimums + aspect ratio) ────────────
  const norm = (r: any): any => {
    const minW = tp(r) === "wc" || tp(r) === "toilet" ? 1.2 : 2.5;
    let w = snap(Math.max(r.width  ?? 3.0, minW));
    let h = snap(Math.max(r.height ?? 3.0, 2.0));
    if (w / h > 2.5) h = snap(w / 2.5);   // max ratio 1:2.5
    if (h / w > 2.5) w = snap(h / 2.5);
    return { ...r, width: w, height: h };
  };

  // Group by zone
  const zones: Record<string, any[]> = { guest: [], family: [], service: [] };
  rooms.forEach(r => zones[classify(r)].push(norm(r)));

  const result: any[] = [];

  // ── Strip packer: fills maxW × maxH starting at (x0, y0) ────────────────────
  function pack(rms: any[], x0: number, y0: number, maxW: number, maxH: number) {
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
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GUEST ZONE  (y: 0 → guestEnd)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const y0 = 0, zH = guestEnd;

    // Parking/garage: right wall, full zone height
    const parking = zones.guest.filter(r => is(r, "parking", "garage"));
    let rightEdge = bW;
    parking.forEach(r => {
      const w = snap(Math.max(r.width, 3.0));
      rightEdge = bW - w;
      result.push({ ...r, x: rightEdge, y: y0, width: w, height: zH });
    });
    const availW = rightEdge; // remaining width after parking

    // Majlis: NW corner (x=0)
    let majlisW = 0;
    const majlis = zones.guest.find(r => is(r, "majlis", "reception"));
    if (majlis) {
      const w = clamp(snap(Math.max(majlis.width, 3.5)), 3.0, availW * 0.45);
      const h = clamp(snap(Math.max(majlis.height, 3.5)), 3.0, zH);
      result.push({ ...majlis, x: 0, y: y0, width: w, height: h });
      majlisW = w;
    }

    // Entrance/foyer: top-center of remaining space
    let entranceH = 2.0;
    const entrance = zones.guest.find(r => is(r, "entrance", "foyer", "lobby"));
    if (entrance) {
      const w = clamp(snap(Math.max(entrance.width, 3.0)), 2.5, availW - majlisW);
      const h = clamp(snap(Math.max(entrance.height, 2.0)), 2.0, zH);
      const ex = snap(majlisW + (availW - majlisW) / 2 - w / 2);
      result.push({ ...entrance, x: clamp(ex, majlisW, availW - w), y: y0, width: w, height: h });
      entranceH = h;
    }

    // Remaining guest rooms (WC, etc.)
    const others = zones.guest.filter(r => !is(r, "parking", "garage", "majlis", "entrance", "foyer", "lobby"));
    pack(others, 0, y0 + entranceH, availW, zH - entranceH);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FAMILY ZONE  (y: guestEnd → familyEnd)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const y0 = guestEnd, zH = familyEnd - guestEnd;

    // Staircase: right wall (east)
    let stairW = 0;
    const stair = zones.family.find(r => is(r, "stair"));
    if (stair) {
      const w = clamp(snap(Math.max(stair.width, 2.5)), 2.5, bW * 0.3);
      const h = clamp(snap(Math.max(stair.height, 3.0)), 2.5, zH);
      result.push({ ...stair, x: bW - w, y: y0, width: w, height: h });
      stairW = w;
    }

    // Dining: bottom of family zone — will share wall with kitchen below
    let diningH = 0;
    const dining = zones.family.find(r => is(r, "dining"));
    if (dining) {
      const w = clamp(snap(Math.max(dining.width, 3.0)), 2.5, bW - stairW);
      const h = clamp(snap(Math.max(dining.height, 3.0)), 2.5, zH * 0.45);
      diningH = h;
      result.push({ ...dining, x: 0, y: familyEnd - h, width: w, height: h });
    }

    // Remaining family rooms: strip pack top of zone
    const others = zones.family.filter(r => !is(r, "stair", "dining"));
    pack(others, 0, y0, bW - stairW, zH - diningH);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SERVICE ZONE  (y: familyEnd → bD)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const y0 = familyEnd, zH = bD - familyEnd;

    // Bathrooms cluster: right side (shared plumbing wall)
    const baths = zones.service.filter(r => is(r, "bathroom", "bath", "toilet") || tp(r) === "wc");
    let bathLeftEdge = bW;
    baths.forEach(r => {
      const w = snap(Math.max(r.width, tp(r) === "wc" || tp(r) === "toilet" ? 1.2 : 2.0));
      const h = clamp(snap(Math.max(r.height, 2.0)), 1.5, zH);
      bathLeftEdge = Math.max(0, bathLeftEdge - w);
      result.push({ ...r, x: bathLeftEdge, y: y0, width: w, height: h });
    });

    // Kitchen: x=0, adjacent to dining above (shared wall at familyEnd)
    let kitchenW = 0;
    const kitchen = zones.service.find(r => is(r, "kitchen"));
    if (kitchen) {
      const w = clamp(snap(Math.max(kitchen.width, 3.0)), 2.5, bathLeftEdge);
      const h = clamp(snap(Math.max(kitchen.height, 3.0)), 2.5, zH);
      result.push({ ...kitchen, x: 0, y: y0, width: w, height: h });
      kitchenW = w;
    }

    // Other service rooms
    const others = zones.service.filter(r => !is(r, "bathroom", "bath", "toilet", "kitchen") && tp(r) !== "wc");
    pack(others, kitchenW, y0, bathLeftEdge - kitchenW, zH);
  }

  // ── Vertical corridor through all zones ──────────────────────────────────────
  const corrW = 1.2;
  const corrX = snap(bW / 2 - corrW / 2);
  result.push({
    name: "Corridor", nameAr: "ممر", type: "corridor",
    x: corrX, y: 0, width: corrW, height: bD,
    area: parseFloat((corrW * bD).toFixed(1)),
    floor: rooms[0]?.floor ?? 0,
  });

  // ── Scale up if coverage < 95% ───────────────────────────────────────────────
  const covered = result.reduce((s, r) => s + r.width * r.height, 0);
  const target  = bW * bD * 0.95;
  if (covered < target && covered > 0) {
    const sc = Math.sqrt(target / covered);
    return result.map(r => {
      const w = clamp(snap(r.width * sc),  1.0, bW);
      const h = clamp(snap(r.height * sc), 1.0, bD);
      return { ...r, x: clamp(r.x, 0, bW - w), y: clamp(r.y, 0, bD - h), width: w, height: h };
    });
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
        // Step 3b: Load learned blueprints from engineer edits
        const learnedBps = await getLearnedBlueprints();
        const learnedContext = generateLearnedContext(learnedBps);
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

          console.error("BSP INPUT:", userBuildingWidth, userBuildingDepth, "setbacks:", correctedSetbacks);
          const bspLayout = generateBSPLayout({
            landArea: project.landArea ?? 300,
            buildingType: (project.buildingType === "villa" ? "villa" : "apartment") as "villa" | "apartment",
            numberOfFloors: codeCheck.corrected.numberOfFloors,
            bedrooms: project.bedrooms ?? 3,
            bathrooms: project.bathrooms ?? 2,
            conceptIndex: i,
            extras: {
              majlis: project.majlis ?? 1,
              parking: project.garages ?? 1,
              maidRoom: project.maidRooms ?? 0,
              balcony: project.balconies ?? 1,
            },
            setbacks: correctedSetbacks,
            buildingWidth: userBuildingWidth,
            buildingDepth: userBuildingDepth,
          });

          // 4b: AI enrichment (titles, descriptions, highlights)
          const prompt = buildConceptPrompt(project, conceptIndex, codeCheck.corrected, learnedContext);
          return invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an expert Saudi architectural AI. Generate precise floor plan data. Always respond with valid JSON only, no markdown.",
              },
              { role: "user", content: prompt },
            ],
          }).then(async (response) => {
            const rawContent = response.choices[0]?.message?.content;
            const content = typeof rawContent === "string" ? rawContent : "{}";
            let aiData: any = {};
            try {
              const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
              const parsed = JSON.parse(cleaned);
              // If GPT returned an error object, treat as no AI rooms
              if (parsed && parsed.error) {
                console.error("GPT returned error:", parsed.error);
                aiData = {};
              } else {
                aiData = parsed;
              }
            } catch (e) {
              console.error("GPT JSON parse failed:", content.slice(0, 200));
              aiData = {};
            }

            // ── DEBUG LOGGING (temporary) ────────────────────────────────
            console.error("GPT RAW RESPONSE:", JSON.stringify(content).slice(0, 500));
            try { fs.writeFileSync("/tmp/gpt-response.json", JSON.stringify({ conceptIndex, rawContent: content, parsed: aiData }, null, 2)); } catch {};

            // Merge BSP layout with AI enrichment
            const conceptTitle = CONCEPT_TITLES[i];

            // Try to use AI-generated rooms (higher quality) if available
            // Fall back to BSP rooms if AI didn't return valid room data
            let aiGroundRooms: any[] = [];
            let aiUpperRooms: any[] = [];
            if (aiData.groundFloor?.rooms && Array.isArray(aiData.groundFloor.rooms) && aiData.groundFloor.rooms.length > 2) {
              aiGroundRooms = aiData.groundFloor.rooms.map((r: any) => ({
                name: r.nameEn ?? r.name ?? "Room",
                nameAr: r.nameAr ?? "غرفة",
                floor: 0,
                width: parseFloat((r.width ?? 3.5).toFixed(2)),
                length: parseFloat((r.length ?? 3.5).toFixed(2)),
                area: parseFloat((r.area ?? (r.width ?? 3.5) * (r.length ?? 3.5)).toFixed(1)),
                type: r.type ?? "bedroom",
                x: (parseFloat((r.x ?? 0).toFixed(2)) / bspLayout.buildingWidth) * 100,
                y: (parseFloat((r.y ?? 0).toFixed(2)) / bspLayout.buildingDepth) * 100,
                w: (parseFloat((r.width ?? 3.5).toFixed(2)) / bspLayout.buildingWidth) * 100,
                h: (parseFloat((r.length ?? 3.5).toFixed(2)) / bspLayout.buildingDepth) * 100,
                hasWindow: r.hasWindow,
                doorWall: r.doorWall,
                notes: r.notes,
              }));
            }
            if (aiData.upperFloors && Array.isArray(aiData.upperFloors)) {
              aiUpperRooms = aiData.upperFloors.flatMap((floorData: any) =>
                (floorData.rooms ?? []).map((r: any) => ({
                  name: r.nameEn ?? r.name ?? "Room",
                  nameAr: r.nameAr ?? "غرفة",
                  floor: floorData.floorNumber ?? 1,
                  width: parseFloat((r.width ?? 3.5).toFixed(2)),
                  length: parseFloat((r.length ?? 3.5).toFixed(2)),
                  area: parseFloat((r.area ?? (r.width ?? 3.5) * (r.length ?? 3.5)).toFixed(1)),
                  type: r.type ?? "bedroom",
                  x: (parseFloat((r.x ?? 0).toFixed(2)) / bspLayout.buildingWidth) * 100,
                  y: (parseFloat((r.y ?? 0).toFixed(2)) / bspLayout.buildingDepth) * 100,
                  w: (parseFloat((r.width ?? 3.5).toFixed(2)) / bspLayout.buildingWidth) * 100,
                  h: (parseFloat((r.length ?? 3.5).toFixed(2)) / bspLayout.buildingDepth) * 100,
                  hasWindow: r.hasWindow,
                  doorWall: r.doorWall,
                  notes: r.notes,
                }))
              );
            }

            // BSP spaces with percentage coordinates (guaranteed to fill building)
            const bspSpaces = bspLayout.floors.flatMap(f =>
              f.rooms.map(r => ({
                name: r.nameEn,
                nameAr: r.nameAr,
                floor: r.floor,
                width: r.width,
                length: r.height,
                area: r.area,
                type: r.type,
                // Percentage coordinates (0-100) — guaranteed to fill building with no gaps
                x: (r.x / bspLayout.buildingWidth) * 100,
                y: (r.y / bspLayout.buildingDepth) * 100,
                w: (r.width / bspLayout.buildingWidth) * 100,
                h: (r.height / bspLayout.buildingDepth) * 100,
              }))
            );

            // Use AI room positions when valid; fall back to BSP silently
            let hasValidAIRooms = aiGroundRooms.length > 0 &&
              aiGroundRooms.every((r: any) =>
                r.x != null && r.y != null &&
                r.width != null && r.length != null &&
                !isNaN(r.x) && !isNaN(r.y) &&
                !isNaN(r.width) && !isNaN(r.length) &&
                r.width > 0 && r.length > 0
              );

            // Validate required rooms are present
            if (hasValidAIRooms) {
              const returnedTypes = aiGroundRooms.map((r: any) => (r.type ?? "").toLowerCase());
              const has = (kw: string) => returnedTypes.some(t => t.includes(kw));
              const requiredTypes = ['kitchen', 'bathroom', 'staircase'];
              if (project.bedrooms > 0) requiredTypes.push('bedroom');
              if ((project.majlis ?? 1) > 0) requiredTypes.push('majlis');
              const missing = requiredTypes.filter(t => !has(t));
              if (missing.length > 0) {
                console.error("MISSING REQUIRED ROOMS:", missing, "— falling back to BSP");
                hasValidAIRooms = false;
              }
              // Cap oversized parking (>18m²) to prevent it dominating the plan
              if (hasValidAIRooms) {
                for (const r of aiGroundRooms) {
                  if ((r.type ?? "").includes("park") || (r.type ?? "").includes("garage")) {
                    if (r.width * r.length > 20) {
                      const scale = Math.sqrt(18 / (r.width * r.length));
                      r.width = parseFloat((r.width * scale).toFixed(2));
                      r.length = parseFloat((r.length * scale).toFixed(2));
                      // Recalculate percentage coords
                      r.w = (r.width / bspLayout.buildingWidth) * 100;
                      r.h = (r.length / bspLayout.buildingDepth) * 100;
                    }
                  }
                }
              }
            }

            const sanitizeRoom = (r: any) => ({
              ...r,
              x: parseFloat((r.x ?? 0).toFixed(2)),
              y: parseFloat((r.y ?? 0).toFixed(2)),
              width: parseFloat((r.width ?? 3.0).toFixed(2)),
              length: parseFloat((r.length ?? 3.0).toFixed(2)),
            });

            console.error("AI ROOMS PARSED:", aiGroundRooms?.length, aiUpperRooms?.length);
            console.error("HAS VALID AI ROOMS:", hasValidAIRooms);
            console.error("FIRST ROOM SAMPLE:", JSON.stringify(aiGroundRooms?.[0]));
            console.error("FINAL SPACES SOURCE:", hasValidAIRooms ? "GPT-4o" : "BSP FALLBACK");
            try { fs.writeFileSync("/tmp/spaces-source.txt", hasValidAIRooms ? "GPT-4o" : "BSP"); } catch {};
            // ── END DEBUG ────────────────────────────────────────────────

            const finalSpaces = hasValidAIRooms
              ? [...aiGroundRooms, ...aiUpperRooms].map(sanitizeRoom)
              : bspSpaces;

            // Group upper AI rooms by floor for SVG generation
            const aiUpperByFloor = aiUpperRooms.reduce((acc: Record<number, any[]>, r: any) => {
              const fl = r.floor ?? 1;
              if (!acc[fl]) acc[fl] = [];
              acc[fl].push(r);
              return acc;
            }, {});

            // Extract meter dimensions from AI rooms (ignore GPT-4o x/y positions)
            const withMeters = (rooms: any[]) => rooms.map((r: any) => ({
              ...r,
              width:  (r.w / 100) * bspLayout.buildingWidth,
              height: (r.h / 100) * bspLayout.buildingDepth,
            }));
            const aiFloorsForSVG = hasValidAIRooms
              ? [
                  // Ground floor: full zone-based placement (ignores GPT-4o x/y)
                  { rooms: placeRoomsInZones(withMeters(aiGroundRooms), bspLayout.buildingWidth, bspLayout.buildingDepth) },
                  // Upper floors: simple strip packing
                  ...Object.values(aiUpperByFloor).map((rooms: any[]) => ({
                    rooms: snapUpperFloor(withMeters(rooms), bspLayout.buildingWidth, bspLayout.buildingDepth),
                  })),
                ]
              : null;

            const finalSvgData = hasValidAIRooms && aiFloorsForSVG
              ? generateSVG({ ...bspLayout, floors: aiFloorsForSVG }, conceptIndex)
              : bspLayout.svgData;

            const structuredData = {
              ...aiData,
              title: aiData.title ?? `Concept ${conceptIndex}: ${conceptTitle.en}`,
              titleAr: aiData.titleAr ?? `المفهوم ${conceptIndex}: ${conceptTitle.ar}`,
              spaces: finalSpaces,
              aiRoomsUsed: hasValidAIRooms, // flag to track quality
              summary: {
                totalFloors: bspLayout.summary.totalFloors,
                totalRooms: bspLayout.summary.totalRooms,
                totalArea: bspLayout.summary.totalArea,
                estimatedCost: bspLayout.summary.estimatedCost,
                bedrooms: bspLayout.summary.bedrooms,
                bathrooms: bspLayout.summary.bathrooms,
                buildingWidth: bspLayout.buildingWidth,
                buildingDepth: bspLayout.buildingDepth,
                buildingArea: bspLayout.buildingArea,
              },
              regulatoryCompliance: {
                isCompliant: codeCheck.isCompliant,
                buildingFootprint: bspLayout.buildingArea,
                actualCoverageRatio: Math.round((bspLayout.buildingArea / (project.landArea ?? 300)) * 100),
                setbacks: bspLayout.setbacks,
                complianceNotes: ["Saudi Building Code verified", "Setbacks applied"],
                complianceNotesAr: ["تم التحقق من الكود السعودي", "تم تطبيق الإرتدادات"],
              },
              // SVG floor plan data (AI positions when valid, BSP as fallback)
              svgData: finalSvgData,
              bspLayout: {
                floors: bspLayout.floors,
                buildingWidth: bspLayout.buildingWidth,
                buildingDepth: bspLayout.buildingDepth,
                setbacks: bspLayout.setbacks,
              },
              _debug: {
                spacesSource: hasValidAIRooms ? "GPT-4o" : "BSP",
                aiRoomsCount: aiGroundRooms?.length ?? 0,
                firstRoom: aiGroundRooms?.[0] ?? null,
              },
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
          });
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
        const prompt = buildConceptPrompt(project, 1, codeCheck.corrected);
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert Saudi architectural AI. Always respond with valid JSON only, no markdown." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "{}";
        let structuredData: any = {};
        try {
          const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          structuredData = JSON.parse(cleaned);
        } catch {
          structuredData = { error: "Failed to parse AI response", raw: content };
        }
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
        try {
          return JSON.parse(content2);
        } catch {
          return {};
        }
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
        let extracted: any = {};
        try {
          const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          extracted = { error: "Could not parse deed", raw: content.slice(0, 300) };
        }
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
        let extracted: any = {};
        try {
          const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          extracted = { error: "Could not parse building code", raw: content.slice(0, 300) };
        }
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
