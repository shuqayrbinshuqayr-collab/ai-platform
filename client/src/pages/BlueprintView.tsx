import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import {
  ArrowLeft, ArrowRight, Download, CheckCircle, XCircle,
  Loader2, Layers, FileText, Ruler, Brain, Edit3, FileDown
} from "lucide-react";
import { useRef } from "react";
import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";

// Rooms that typically have windows
const HAS_WINDOW = new Set([
  "bedroom", "master_bedroom", "living", "family_living",
  "majlis", "kitchen", "dining", "balcony", "office", "prayer"
]);

// Rooms that have doors
const HAS_DOOR = new Set([
  "bedroom", "master_bedroom", "living", "family_living", "majlis",
  "kitchen", "dining", "bathroom", "toilet", "maid_room", "office",
  "prayer", "entrance", "storage", "laundry", "corridor", "distributor"
]);

// ─── Unified Site + Floor Plan Component ─────────────────────────────────────
// Draws: land → gardens → driveway → fence → building footprint → interior rooms
function UnifiedFloorPlan({
  spaces, floor, lang,
  bldW: bldWProp, bldH: bldHProp,
  landW: landWProp, landD: landDProp,
  frontSetback: frontSbProp, backSetback: backSbProp, sideSetback: sideSbProp,
}: {
  spaces: any[]; floor: number; lang: string;
  bldW?: number; bldH?: number;
  landW?: number; landD?: number;
  frontSetback?: number; backSetback?: number; sideSetback?: number;
}) {
  const floorSpaces = spaces.filter(s => (s.floor ?? 0) === floor);
  if (floorSpaces.length === 0) return null;

  // Resolve dimensions with fallbacks
  const frontSb  = frontSbProp  ?? 3;
  const backSb   = backSbProp   ?? 2;
  const sideSb   = sideSbProp   ?? 1.5;
  const bldW     = bldWProp     ?? 10;
  const bldH     = bldHProp     ?? 15;
  const landW    = landWProp    ?? bldW + sideSb * 2;
  const landD    = landDProp    ?? bldH + frontSb + backSb;

  // ── SVG canvas ──────────────────────────────────────────────────────────────
  const SVG_W = 640;
  const SVG_H = 640;
  const PAD   = 60; // padding for dimension labels

  const availW = SVG_W - PAD * 2;
  const availH = SVG_H - PAD * 2;

  // Scale: fit full land proportionally
  const scale = Math.min(availW / landW, availH / landD); // px per meter

  const landSvgW = landW * scale;
  const landSvgH = landD * scale;

  // Center land in available area
  const landX = PAD + (availW - landSvgW) / 2;
  const landY = PAD + (availH - landSvgH) / 2;

  // Building position inside land (street = BOTTOM, back = TOP)
  const bldX     = landX + sideSb * scale;
  const bldY     = landY + backSb * scale;
  const bldSvgW  = bldW * scale;
  const bldSvgH  = bldH * scale;
  const bldRight  = bldX + bldSvgW;
  const bldBottom = bldY + bldSvgH;
  const landBottom = landY + landSvgH;

  // Fence thickness: 0.3m or at least 3px
  const wallT = Math.max(3, 0.3 * scale);

  // Vehicle gate: 4m wide, positioned left side of front wall
  const vGateW = Math.min(4 * scale, landSvgW * 0.4);
  const vGateX = landX + 2 * scale;
  const vGateCX = vGateX + vGateW / 2;

  // Pedestrian gate: 1.2m, right of vehicle gate
  const pGateW = Math.min(1.2 * scale, landSvgW * 0.15);
  const pGateX = vGateX + vGateW + Math.max(4, 0.5 * scale);

  // Gate leaf length (swings inward toward back)
  const leafL = Math.min(vGateW / 2, 30);

  // Garage door: 3.5m centered on building south face
  const garageW = Math.min(3.5 * scale, bldSvgW * 0.5);
  const garageH = Math.max(10, Math.min(20, 2.2 * scale));
  const garageX = bldX + bldSvgW / 2 - garageW / 2;

  // Tree radius
  const treeR = Math.max(5, Math.min(11, scale * 0.5));

  // Trees: collect positions, skip driveway corridor
  const trees: { cx: number; cy: number }[] = [];
  const skipL = vGateCX - vGateW / 2 - treeR - 3;
  const skipR = vGateCX + vGateW / 2 + treeR + 3;

  // Front garden trees (between bldBottom and landBottom)
  const frontH = landBottom - bldBottom;
  if (frontH > treeR * 3) {
    const ty = bldBottom + frontH * 0.45;
    for (let i = 0; i < 5; i++) {
      const tx = landX + (landSvgW / 6) * (i + 0.8);
      if (tx > skipL && tx < skipR) continue;
      trees.push({ cx: tx, cy: ty });
    }
  }
  // Back garden trees
  const backH = bldY - landY;
  if (backH > treeR * 3) {
    const ty = landY + backH * 0.5;
    for (let i = 0; i < 4; i++) {
      trees.push({ cx: landX + (landSvgW / 5) * (i + 0.7), cy: ty });
    }
  }
  // Side strip trees
  const sidePxW = sideSb * scale;
  if (sidePxW > treeR * 2.5) {
    const cx1 = landX + sidePxW / 2;
    const cx2 = bldRight + sidePxW / 2;
    [cx1, cx2].forEach(cx => {
      trees.push({ cx, cy: bldY + bldSvgH * 0.25 });
      trees.push({ cx, cy: bldY + bldSvgH * 0.75 });
    });
  }

  // ── Room coordinate helpers ─────────────────────────────────────────────────
  function roomToSVG(space: any) {
    const isMeter = space.width !== undefined && space.w === undefined;
    if (isMeter) {
      const sx = bldSvgW / bldW;
      const sy = bldSvgH / bldH;
      return {
        x: bldX + (space.x ?? 0) * sx,
        y: bldY + (space.y ?? 0) * sy,
        w: Math.max((space.width ?? 3) * sx, 10),
        h: Math.max((space.height ?? space.length ?? 3) * sy, 10),
      };
    }
    return {
      x: bldX + ((space.x ?? 0) / 100) * bldSvgW,
      y: bldY + ((space.y ?? 0) / 100) * bldSvgH,
      w: Math.max(((space.w ?? 10) / 100) * bldSvgW, 10),
      h: Math.max(((space.h ?? 10) / 100) * bldSvgH, 10),
    };
  }

  function getRoomDims(space: any) {
    if (space.width !== undefined) return { wm: space.width ?? 0, hm: space.height ?? space.length ?? 0 };
    return { wm: ((space.w ?? 0) / 100) * bldW, hm: ((space.h ?? 0) / 100) * bldH };
  }

  // Wall thickness for room walls
  const WALL_T = Math.max(3, Math.min(5, scale * 0.18));
  const HW = WALL_T / 2;

  // ── Sub-components ──────────────────────────────────────────────────────────

  function DoorSymbol({ x, y, w, h, type }: { x: number; y: number; w: number; h: number; type: string }) {
    const dw = Math.min(w * 0.38, 32);
    const dh = dw;
    const onTop  = ["balcony"].includes(type);
    const onLeft = ["majlis", "family_living", "living"].includes(type);
    if (onTop) {
      const dx = x + w / 2 - dw / 2;
      const dy = y;
      return (
        <g stroke="#1A1A1A" strokeWidth="0.9" fill="none">
          <rect x={dx} y={dy - HW} width={dw} height={WALL_T} fill="#fff" stroke="none"/>
          <line x1={dx} y1={dy} x2={dx} y2={dy - dh}/>
          <path d={`M ${dx} ${dy} A ${dw} ${dh} 0 0 1 ${dx + dw} ${dy}`} strokeDasharray="3,2"/>
        </g>
      );
    } else if (onLeft) {
      const dx = x;
      const dy = y + h / 2 - dw / 2;
      return (
        <g stroke="#1A1A1A" strokeWidth="0.9" fill="none">
          <rect x={dx - HW} y={dy} width={WALL_T} height={dw} fill="#fff" stroke="none"/>
          <line x1={dx} y1={dy} x2={dx + dh} y2={dy}/>
          <path d={`M ${dx} ${dy} A ${dh} ${dw} 0 0 0 ${dx} ${dy + dw}`} strokeDasharray="3,2"/>
        </g>
      );
    } else {
      const dx = x + w / 2 - dw / 2;
      const dy = y + h;
      return (
        <g stroke="#1A1A1A" strokeWidth="0.9" fill="none">
          <rect x={dx} y={dy - HW} width={dw} height={WALL_T} fill="#fff" stroke="none"/>
          <line x1={dx} y1={dy} x2={dx} y2={dy - dh}/>
          <path d={`M ${dx} ${dy} A ${dw} ${dh} 0 0 0 ${dx + dw} ${dy}`} strokeDasharray="3,2"/>
        </g>
      );
    }
  }

  function WindowSymbol({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
    // Exterior wall = edge aligns with building boundary
    const atTop    = Math.abs(y - bldY) < 5;
    const atBottom = Math.abs((y + h) - bldBottom) < 5;
    const atLeft   = Math.abs(x - bldX) < 5;
    const atRight  = Math.abs((x + w) - bldRight) < 5;
    const ww = Math.min(w * 0.45, 44);
    const wh = Math.min(h * 0.4, 38);
    if (atTop) {
      const wx = x + w / 2 - ww / 2;
      return (
        <g>
          <rect x={wx} y={y - HW} width={ww} height={WALL_T} fill="#fff" stroke="none"/>
          <line x1={wx} y1={y - HW} x2={wx + ww} y2={y - HW} stroke="#1A1A1A" strokeWidth="0.7"/>
          <line x1={wx} y1={y} x2={wx + ww} y2={y} stroke="#6B9AC4" strokeWidth="1.2"/>
          <line x1={wx} y1={y + HW} x2={wx + ww} y2={y + HW} stroke="#1A1A1A" strokeWidth="0.7"/>
        </g>
      );
    }
    if (atBottom) {
      const wx = x + w / 2 - ww / 2;
      const wy = y + h;
      return (
        <g>
          <rect x={wx} y={wy - HW} width={ww} height={WALL_T} fill="#fff" stroke="none"/>
          <line x1={wx} y1={wy - HW} x2={wx + ww} y2={wy - HW} stroke="#1A1A1A" strokeWidth="0.7"/>
          <line x1={wx} y1={wy} x2={wx + ww} y2={wy} stroke="#6B9AC4" strokeWidth="1.2"/>
          <line x1={wx} y1={wy + HW} x2={wx + ww} y2={wy + HW} stroke="#1A1A1A" strokeWidth="0.7"/>
        </g>
      );
    }
    if (atRight) {
      const wy = y + h * 0.25;
      const wx = x + w;
      return (
        <g>
          <rect x={wx - HW} y={wy} width={WALL_T} height={wh} fill="#fff" stroke="none"/>
          <line x1={wx - HW} y1={wy} x2={wx - HW} y2={wy + wh} stroke="#1A1A1A" strokeWidth="0.7"/>
          <line x1={wx} y1={wy} x2={wx} y2={wy + wh} stroke="#6B9AC4" strokeWidth="1.2"/>
          <line x1={wx + HW} y1={wy} x2={wx + HW} y2={wy + wh} stroke="#1A1A1A" strokeWidth="0.7"/>
        </g>
      );
    }
    if (atLeft) {
      const wy = y + h * 0.25;
      const wx = x;
      return (
        <g>
          <rect x={wx - HW} y={wy} width={WALL_T} height={wh} fill="#fff" stroke="none"/>
          <line x1={wx - HW} y1={wy} x2={wx - HW} y2={wy + wh} stroke="#1A1A1A" strokeWidth="0.7"/>
          <line x1={wx} y1={wy} x2={wx} y2={wy + wh} stroke="#6B9AC4" strokeWidth="1.2"/>
          <line x1={wx + HW} y1={wy} x2={wx + HW} y2={wy + wh} stroke="#1A1A1A" strokeWidth="0.7"/>
        </g>
      );
    }
    return null;
  }

  function StaircaseSymbol({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
    const steps = Math.max(4, Math.floor(h / 12));
    const stepH = h / steps;
    return (
      <g stroke="#9CA3AF" strokeWidth="0.7" fill="none">
        {Array.from({ length: steps }).map((_, i) => (
          <line key={i} x1={x + 4} y1={y + i * stepH} x2={x + w - 4} y2={y + i * stepH}/>
        ))}
        <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} stroke="#6B7280" strokeWidth="1"/>
        <polygon points={`${x + w / 2},${y + 4} ${x + w / 2 - 4},${y + 14} ${x + w / 2 + 4},${y + 14}`} fill="#6B7280"/>
      </g>
    );
  }

  function DimLine({ x1, y1, x2, y2, label, axis }: {
    x1: number; y1: number; x2: number; y2: number; label: string; axis: "h" | "v";
  }) {
    const C = "#374151"; const FS = 7.5; const TICK = 5; const ARROW = 5;
    if (axis === "h") {
      const my = (y1 + y2) / 2; const mx = (x1 + x2) / 2;
      return (
        <g>
          <line x1={x1} y1={y1} x2={x1} y2={y1 + TICK} stroke={C} strokeWidth="0.7"/>
          <line x1={x2} y1={y1} x2={x2} y2={y1 + TICK} stroke={C} strokeWidth="0.7"/>
          <line x1={x1} y1={my} x2={x2} y2={my} stroke={C} strokeWidth="0.7"/>
          <polygon points={`${x1},${my} ${x1+ARROW},${my-2} ${x1+ARROW},${my+2}`} fill={C}/>
          <polygon points={`${x2},${my} ${x2-ARROW},${my-2} ${x2-ARROW},${my+2}`} fill={C}/>
          <rect x={mx - 16} y={my - 6} width="32" height="11" fill="#fff"/>
          <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
            fill={C} fontSize={FS} fontFamily="'Share Tech Mono','Courier New',monospace" fontWeight="600">
            {label}
          </text>
        </g>
      );
    } else {
      const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
      return (
        <g>
          <line x1={x1} y1={y1} x2={x1 + TICK} y2={y1} stroke={C} strokeWidth="0.7"/>
          <line x1={x1} y1={y2} x2={x1 + TICK} y2={y2} stroke={C} strokeWidth="0.7"/>
          <line x1={mx} y1={y1} x2={mx} y2={y2} stroke={C} strokeWidth="0.7"/>
          <polygon points={`${mx},${y1} ${mx-2},${y1+ARROW} ${mx+2},${y1+ARROW}`} fill={C}/>
          <polygon points={`${mx},${y2} ${mx-2},${y2-ARROW} ${mx+2},${y2-ARROW}`} fill={C}/>
          <rect x={mx - 5} y={my - 16} width="10" height="32" fill="#fff"/>
          <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
            fill={C} fontSize={FS} fontFamily="'Share Tech Mono','Courier New',monospace" fontWeight="600"
            transform={`rotate(-90,${mx},${my})`}>
            {label}
          </text>
        </g>
      );
    }
  }

  const floorLabel = floor === 0
    ? (lang === "ar" ? "الدور الأرضي" : "GROUND FLOOR")
    : (lang === "ar" ? `الدور ${["الأول","الثاني","الثالث","الرابع"][floor-1] ?? floor}` : `FLOOR ${floor}`);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#FFFFFF", fontFamily: "'Cairo','Arial',sans-serif" }}
    >
      <defs>
        <pattern id={`grid-u${floor}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E5E7EB" strokeWidth="0.2"/>
        </pattern>
      </defs>

      {/* ════ LAYER 1 — LAND FILL ════ */}
      <rect x={landX} y={landY} width={landSvgW} height={landSvgH}
        fill="#f5f2eb" stroke="none"/>

      {/* ════ LAYER 2 — SETBACK GARDENS ════ */}
      {/* Back garden (top) */}
      <rect x={landX} y={landY} width={landSvgW} height={backSb * scale} fill="#e8f0d8"/>
      {/* Front garden (bottom) — driveway will paint over */}
      <rect x={landX} y={bldBottom} width={landSvgW} height={landBottom - bldBottom} fill="#e8f0d8"/>
      {/* Left side setback */}
      <rect x={landX} y={bldY} width={sideSb * scale} height={bldSvgH} fill="#ede8dc"/>
      {/* Right side setback */}
      <rect x={bldRight} y={bldY} width={sideSb * scale} height={bldSvgH} fill="#ede8dc"/>

      {/* Garden labels */}
      {(landBottom - bldBottom) > 18 && (
        <text x={landX + 6} y={bldBottom + (landBottom - bldBottom) / 2 + 4}
          fill="#5a7a3a" fontSize={8} fontFamily="'Cairo','Arial',sans-serif">
          {lang === "ar" ? "حديقة أمامية" : "Front Garden"}
        </text>
      )}
      {(bldY - landY) > 18 && (
        <text x={landX + 6} y={landY + (bldY - landY) / 2 + 4}
          fill="#5a7a3a" fontSize={8} fontFamily="'Cairo','Arial',sans-serif">
          {lang === "ar" ? "حديقة خلفية" : "Back Garden"}
        </text>
      )}
      {/* Side setback labels */}
      {sideSb * scale > 18 && (
        <>
          <text x={landX + (sideSb * scale) / 2} y={bldY + bldSvgH / 2}
            textAnchor="middle" fill="#8a7a5a" fontSize={7}
            fontFamily="'Cairo','Arial',sans-serif"
            transform={`rotate(-90,${landX + (sideSb * scale) / 2},${bldY + bldSvgH / 2})`}>
            {sideSb}م
          </text>
          <text x={bldRight + (sideSb * scale) / 2} y={bldY + bldSvgH / 2}
            textAnchor="middle" fill="#8a7a5a" fontSize={7}
            fontFamily="'Cairo','Arial',sans-serif"
            transform={`rotate(-90,${bldRight + (sideSb * scale) / 2},${bldY + bldSvgH / 2})`}>
            {sideSb}م
          </text>
        </>
      )}

      {/* ── Trees ── */}
      {trees.map((t, i) => (
        <g key={i}>
          <circle cx={t.cx} cy={t.cy} r={treeR} fill="#b8dba0" stroke="#4a7c3f" strokeWidth="0.8"/>
          <circle cx={t.cx} cy={t.cy} r={treeR * 0.35} fill="#4a7c3f" stroke="none"/>
        </g>
      ))}

      {/* ════ LAYER 3 — DRIVEWAY ════ */}
      <rect x={vGateX} y={bldBottom} width={vGateW} height={landBottom - bldBottom}
        fill="#d4c9a8" stroke="none"/>
      <line x1={vGateCX} y1={bldBottom} x2={vGateCX} y2={landBottom}
        stroke="#b0a080" strokeWidth="1.5" strokeDasharray="8,4"/>

      {/* ════ LAYER 4 — FENCE (0.3m thick) ════ */}
      {/* Back wall */}
      <rect x={landX} y={landY} width={landSvgW} height={wallT} fill="#2d2d2d"/>
      {/* Left wall */}
      <rect x={landX} y={landY} width={wallT} height={landSvgH} fill="#2d2d2d"/>
      {/* Right wall */}
      <rect x={landX + landSvgW - wallT} y={landY} width={wallT} height={landSvgH} fill="#2d2d2d"/>
      {/* Front wall — split around gates */}
      <rect x={landX} y={landBottom - wallT} width={vGateX - landX} height={wallT} fill="#2d2d2d"/>
      <rect x={vGateX + vGateW} y={landBottom - wallT}
        width={pGateX - (vGateX + vGateW)} height={wallT} fill="#2d2d2d"/>
      <rect x={pGateX + pGateW} y={landBottom - wallT}
        width={(landX + landSvgW) - (pGateX + pGateW)} height={wallT} fill="#2d2d2d"/>

      {/* ════ LAYER 5 — BUILDING FOOTPRINT ════ */}
      {/* Building interior grid */}
      <rect x={bldX} y={bldY} width={bldSvgW} height={bldSvgH}
        fill={`url(#grid-u${floor})`}/>
      {/* Building white fill (rooms will paint over grid) */}
      <rect x={bldX} y={bldY} width={bldSvgW} height={bldSvgH}
        fill="#ffffff" fillOpacity="0.7" stroke="none"/>

      {/* ════ LAYER 6 — INTERIOR ROOMS ════ */}
      {floorSpaces.map((space, i) => {
        const { x, y, w, h } = roomToSVG(space);
        const { wm, hm } = getRoomDims(space);
        const type  = space.type ?? "other";
        const fill  = type === "staircase" ? "#f0f0f0" : "#ffffff";
        const label = lang === "ar" ? (space.nameAr || space.name || "") : (space.name || "");
        const area  = space.area
          ? parseFloat(space.area).toFixed(1)
          : (wm > 0 && hm > 0 ? (wm * hm).toFixed(1) : null);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const nameFontSize = w > 70 ? 10 : w > 45 ? 8.5 : 7;
        const areaFontSize = w > 70 ? 8 : 6.5;

        return (
          <g key={i}>
            {/* Room fill */}
            <rect x={x} y={y} width={w} height={h} fill={fill}/>
            {/* Outer wall */}
            <rect x={x - HW} y={y - HW} width={w + WALL_T} height={h + WALL_T}
              fill="none" stroke="#1A1A1A" strokeWidth={WALL_T}/>
            {/* Inner wall line */}
            <rect x={x + HW} y={y + HW} width={w - WALL_T} height={h - WALL_T}
              fill="none" stroke="#4B5563" strokeWidth="0.4"/>
            {/* Staircase */}
            {type === "staircase" && <StaircaseSymbol x={x+2} y={y+2} w={w-4} h={h-4}/>}
            {/* Window */}
            {HAS_WINDOW.has(type) && w > 28 && h > 18 && (
              <WindowSymbol x={x} y={y} w={w} h={h}/>
            )}
            {/* Door */}
            {HAS_DOOR.has(type) && w > 22 && h > 22 && (
              <DoorSymbol x={x} y={y} w={w} h={h} type={type}/>
            )}
            {/* Room label */}
            {w > 30 && h > 22 && (
              <>
                <text x={cx} y={cy - (area ? 6 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#111827" fontSize={nameFontSize} fontWeight="700"
                  fontFamily="'Cairo','Arial',sans-serif">
                  {label.length > 13 ? label.substring(0, 13) + "…" : label}
                </text>
                {area && (
                  <text x={cx} y={cy + 7}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#6B7280" fontSize={areaFontSize}
                    fontFamily="'Share Tech Mono','Courier New',monospace">
                    {area} م²
                  </text>
                )}
              </>
            )}
            {/* Internal dim cotes */}
            {w > 55 && wm > 0 && (
              <DimLine x1={x+5} y1={y+h-12} x2={x+w-5} y2={y+h-12}
                label={`${wm.toFixed(2)}م`} axis="h"/>
            )}
            {h > 48 && hm > 0 && (
              <DimLine x1={x+w-12} y1={y+5} x2={x+w-12} y2={y+h-5}
                label={`${hm.toFixed(2)}م`} axis="v"/>
            )}
          </g>
        );
      })}

      {/* ════ LAYER 7 — GATE SYMBOLS ════ */}
      {/* Vehicle gate leaves (two leaves, each swings inward) */}
      <rect x={vGateX} y={landBottom - wallT - leafL} width={wallT * 1.5} height={leafL}
        fill="#555" stroke="#333" strokeWidth="0.8"/>
      <rect x={vGateX + vGateW - wallT * 1.5} y={landBottom - wallT - leafL} width={wallT * 1.5} height={leafL}
        fill="#555" stroke="#333" strokeWidth="0.8"/>
      {/* Vehicle gate swing arcs */}
      <path
        d={`M ${vGateX} ${landBottom - wallT} A ${leafL} ${leafL} 0 0 1 ${vGateX + leafL} ${landBottom - wallT - leafL}`}
        fill="none" stroke="#888" strokeWidth="0.8" strokeDasharray="4,3"/>
      <path
        d={`M ${vGateX + vGateW} ${landBottom - wallT} A ${leafL} ${leafL} 0 0 0 ${vGateX + vGateW - leafL} ${landBottom - wallT - leafL}`}
        fill="none" stroke="#888" strokeWidth="0.8" strokeDasharray="4,3"/>
      {/* Vehicle gate label */}
      <text x={vGateCX} y={landBottom - wallT - leafL - 5}
        textAnchor="middle" fill="#374151" fontSize={8} fontWeight="700"
        fontFamily="'Cairo','Arial',sans-serif">
        {lang === "ar" ? "بوابة سيارات" : "Vehicle Gate"}
      </text>

      {/* Pedestrian gate (single leaf) */}
      <rect x={pGateX} y={landBottom - wallT - pGateW} width={wallT * 1.2} height={pGateW}
        fill="#777" stroke="#444" strokeWidth="0.7"/>
      <path
        d={`M ${pGateX} ${landBottom - wallT} A ${pGateW} ${pGateW} 0 0 1 ${pGateX + pGateW} ${landBottom - wallT - pGateW}`}
        fill="none" stroke="#888" strokeWidth="0.7" strokeDasharray="3,2"/>
      <text x={pGateX + pGateW / 2} y={landBottom - wallT - pGateW - 4}
        textAnchor="middle" fill="#6b7280" fontSize={7}
        fontFamily="'Cairo','Arial',sans-serif">
        {lang === "ar" ? "مشاة" : "Ped."}
      </text>

      {/* ════ LAYER 8 — GARAGE DOOR ════ */}
      <rect x={garageX} y={bldBottom - garageH} width={garageW} height={garageH}
        fill="#e5e7eb" stroke="#374151" strokeWidth="1"/>
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i}
          x1={garageX + 2} y1={bldBottom - garageH + (garageH / 6) * (i + 1)}
          x2={garageX + garageW - 2} y2={bldBottom - garageH + (garageH / 6) * (i + 1)}
          stroke="#9ca3af" strokeWidth="0.6"/>
      ))}
      <text x={garageX + garageW / 2} y={bldBottom - garageH - 4}
        textAnchor="middle" fill="#374151" fontSize={7}
        fontFamily="'Cairo','Arial',sans-serif">
        {lang === "ar" ? "موقف سيارة" : "Garage"}
      </text>

      {/* ════ LAYER 9 — BUILDING BOUNDARY (poché walls) ════ */}
      <rect x={bldX} y={bldY} width={bldSvgW} height={bldSvgH}
        fill="none" stroke="#000000" strokeWidth={WALL_T + 1}/>

      {/* ════ LAYER 10 — LAND BOUNDARY ════ */}
      <rect x={landX} y={landY} width={landSvgW} height={landSvgH}
        fill="none" stroke="#1a1a1a" strokeWidth="4"/>

      {/* ════ ANNOTATIONS ════ */}
      {/* Street strip */}
      <rect x={landX} y={landBottom + 2} width={landSvgW} height={16}
        fill="#c8c0b0" stroke="none"/>
      <text x={landX + landSvgW / 2} y={landBottom + 14}
        textAnchor="middle" fill="#374151" fontSize={9} fontWeight="700"
        fontFamily="'Cairo','Arial',sans-serif">
        {lang === "ar" ? "◄ الشارع ►" : "◄ STREET ►"}
      </text>

      {/* Land dimensions (top + left) */}
      <line x1={landX} y1={landY - 18} x2={landX + landSvgW} y2={landY - 18} stroke="#374151" strokeWidth="0.8"/>
      <line x1={landX} y1={landY - 23} x2={landX} y2={landY - 13} stroke="#374151" strokeWidth="0.8"/>
      <line x1={landX + landSvgW} y1={landY - 23} x2={landX + landSvgW} y2={landY - 13} stroke="#374151" strokeWidth="0.8"/>
      <rect x={landX + landSvgW / 2 - 22} y={landY - 25} width="44" height="12" fill="#fff"/>
      <text x={landX + landSvgW / 2} y={landY - 15} textAnchor="middle"
        fill="#374151" fontSize={9} fontWeight="700" fontFamily="'Share Tech Mono',monospace">
        {landW.toFixed(1)} م
      </text>

      <line x1={landX - 18} y1={landY} x2={landX - 18} y2={landBottom} stroke="#374151" strokeWidth="0.8"/>
      <line x1={landX - 23} y1={landY} x2={landX - 13} y2={landY} stroke="#374151" strokeWidth="0.8"/>
      <line x1={landX - 23} y1={landBottom} x2={landX - 13} y2={landBottom} stroke="#374151" strokeWidth="0.8"/>
      <rect x={landX - 33} y={landY + landSvgH / 2 - 22} width="13" height="44" fill="#fff"/>
      <text x={landX - 26} y={landY + landSvgH / 2} textAnchor="middle"
        fill="#374151" fontSize={9} fontWeight="700" fontFamily="'Share Tech Mono',monospace"
        transform={`rotate(-90,${landX - 26},${landY + landSvgH / 2})`}>
        {landD.toFixed(1)} م
      </text>

      {/* Building dimensions */}
      <text x={bldX + bldSvgW / 2} y={bldY - 5} textAnchor="middle"
        fill="#374151" fontSize={8} fontFamily="'Share Tech Mono',monospace">
        {bldW.toFixed(1)}م × {bldH.toFixed(1)}م
      </text>

      {/* Setback callout labels */}
      {frontSb * scale > 20 && (
        <text x={landX + landSvgW - 6} y={bldBottom + (landBottom - bldBottom) / 2 + 4}
          textAnchor="end" fill="#6b7280" fontSize={7.5}
          fontFamily="'Cairo','Arial',sans-serif">
          {lang === "ar" ? `ارتداد أمامي ${frontSb}م` : `Front ${frontSb}m`}
        </text>
      )}
      {backSb * scale > 16 && (
        <text x={landX + landSvgW - 6} y={landY + (bldY - landY) / 2 + 4}
          textAnchor="end" fill="#6b7280" fontSize={7.5}
          fontFamily="'Cairo','Arial',sans-serif">
          {lang === "ar" ? `ارتداد خلفي ${backSb}م` : `Back ${backSb}m`}
        </text>
      )}

      {/* North arrow */}
      <g transform={`translate(${landX + landSvgW - 2}, ${landY + 22})`}>
        <circle cx="0" cy="0" r="13" fill="#fff" stroke="#374151" strokeWidth="0.8"/>
        <line x1="0" y1="9" x2="0" y2="-9" stroke="#374151" strokeWidth="1"/>
        <polygon points="0,-12 -3,-5 3,-5" fill="#374151"/>
        <text x="0" y="22" textAnchor="middle" fill="#374151" fontSize={8} fontWeight="600"
          fontFamily="'Share Tech Mono',monospace">N</text>
      </g>

      {/* Title block */}
      <rect x="0" y={SVG_H - 46} width={SVG_W} height="46" fill="#F9FAFB"/>
      <line x1="0" y1={SVG_H - 46} x2={SVG_W} y2={SVG_H - 46} stroke="#1A1A1A" strokeWidth="1.5"/>
      <line x1="0" y1={SVG_H - 24} x2={SVG_W} y2={SVG_H - 24} stroke="#D1D5DB" strokeWidth="0.5"/>
      <text x="14" y={SVG_H - 29} fill="#111827" fontSize="12" fontWeight="800"
        fontFamily="'Cairo',Arial,sans-serif">
        {floorLabel}
      </text>
      <text x="14" y={SVG_H - 10} fill="#6B7280" fontSize="8"
        fontFamily="'Share Tech Mono',monospace">
        {`${bldW.toFixed(2)}م × ${bldH.toFixed(2)}م  |  SCALE 1:100  |  SOAR.AI`}
      </text>
      <text x={SVG_W - 14} y={SVG_H - 29} textAnchor="end" fill="#374151" fontSize="8"
        fontFamily="'Share Tech Mono',monospace">
        {floorSpaces.length} {lang === "ar" ? "مساحة" : "spaces"}
      </text>
      <text x={SVG_W - 14} y={SVG_H - 10} textAnchor="end" fill="#9CA3AF" fontSize="7.5"
        fontFamily="'Share Tech Mono',monospace">
        {new Date().getFullYear()} © SOAR.AI
      </text>
    </svg>
  );
}

export default function BlueprintView() {
  const params = useParams<{ id: string }>();
  const blueprintId = parseInt(params.id ?? "0");
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const svgRef = useRef<HTMLDivElement>(null);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const { data: subscription } = trpc.subscription.get.useQuery(undefined, { enabled: !!user });
  const canEdit = subscription?.plan === "student" || subscription?.plan === "solo" || subscription?.plan === "office";

  const { data: blueprint, isLoading } = trpc.blueprints.get.useQuery({ id: blueprintId });
  const [dxfFloor, setDxfFloor] = React.useState<number | null>(null);
  const { data: dxfData, isFetching: dxfLoading } = trpc.blueprints.exportDXF.useQuery(
    { blueprintId, floor: dxfFloor ?? 0 },
    { enabled: dxfFloor !== null, staleTime: Infinity }
  );

  // Auto-download when DXF data arrives
  React.useEffect(() => {
    if (dxfData?.dxfContent && dxfFloor !== null) {
      const blob = new Blob([dxfData.dxfContent], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = dxfData.fileName ?? `blueprint-floor${dxfFloor}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
      setDxfFloor(null);
    }
  }, [dxfData]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm font-mono">{lang === "ar" ? "جاري تحميل المخطط..." : "Loading blueprint..."}</p>
        </div>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="text-muted-foreground">{lang === "ar" ? "المخطط غير موجود" : "Blueprint not found"}</div>
      </div>
    );
  }

  const data = blueprint.structuredData as any;
  const compliance = blueprint.regulatoryCompliance as any;
  const spaces: any[] = data?.spaces ?? [];
  const summary = data?.summary ?? {};
  const floorsArr = Array.from(new Set(spaces.map(s => s.floor))).sort() as number[];

  const handleDownloadPDF = async () => {
    if (!svgRef.current) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(svgRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const titleText = lang === "ar"
        ? (data?.titleAr || blueprint.title || "مخطط SOAR.AI")
        : (blueprint.title || "SOAR.AI Blueprint");
      pdf.setFontSize(13);
      pdf.setTextColor(40, 40, 40);
      pdf.text(titleText, pdfWidth / 2, 10, { align: "center" });
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Generated by SOAR.AI", pdfWidth / 2, 16, { align: "center" });
      const imgH = (canvas.height * pdfWidth) / canvas.width;
      const maxH = pdfHeight - 22;
      pdf.addImage(imgData, "PNG", 0, 20, pdfWidth, Math.min(imgH, maxH));
      pdf.save(`soar-blueprint-${blueprintId}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soar-blueprint-${blueprintId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const description = lang === "ar"
    ? (blueprint.conceptDescriptionAr || blueprint.conceptDescription)
    : blueprint.conceptDescription;

  return (
    <div className="min-h-screen pt-16 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-5xl">
        {/* Back */}
        <button
          onClick={() => navigate(`/projects/${blueprint.projectId}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group text-sm"
        >
          <BackIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {lang === "ar" ? "العودة للمشروع" : "Back to Project"}
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <div className="text-xs text-primary font-mono opacity-70">// BLUEPRINT VIEW //</div>
            <h1 className="text-3xl font-black text-white">
              {lang === "ar" ? (data?.titleAr || blueprint.title) : blueprint.title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">{description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="gap-2 shrink-0 border-green-500/40 text-green-400 hover:bg-green-500/10"
              disabled={pdfLoading}
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}
              {lang === "ar" ? "تحميل PDF" : "Download PDF"}
            </Button>
            <Button onClick={handleDownloadSVG} variant="outline" className="gap-2 shrink-0">
              <Download className="w-4 h-4"/>
              {lang === "ar" ? "تحميل SVG" : "Download SVG"}
            </Button>
            <Button
              onClick={() => setDxfFloor(floorsArr[0] ?? 0)}
              variant="outline"
              className="gap-2 shrink-0 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              disabled={dxfLoading}
            >
              {dxfLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
              {lang === "ar" ? "تصدير DXF (AutoCAD)" : "Export DXF (AutoCAD)"}
            </Button>
            {canEdit && (
              <Button
                onClick={() => navigate(`/blueprints/${blueprintId}/edit`)}
                className="gap-2 shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Edit3 className="w-4 h-4"/>
                {lang === "ar" ? "تعديل المخطط" : "Edit Blueprint"}
              </Button>
            )}
          </div>
        </div>

        {/* Floor plans — each floor shows full site context */}
        <div ref={svgRef} className="space-y-8">
          {floorsArr.map(floor => (
            <div key={floor} className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary"/>
                <span className="text-sm font-semibold text-foreground">
                  {floor === 0
                    ? (lang === "ar" ? "الدور الأرضي" : "Ground Floor")
                    : (lang === "ar" ? `الدور ${["الأول","الثاني","الثالث","الرابع"][floor-1] ?? floor}` : `Floor ${floor}`)}
                </span>
                <span className="text-xs text-muted-foreground font-mono ms-auto">
                  {spaces.filter(s => (s.floor ?? 0) === floor).length} {lang === "ar" ? "مساحة" : "spaces"}
                </span>
              </div>
              <div className="p-4">
                <UnifiedFloorPlan
                  spaces={spaces}
                  floor={floor}
                  lang={lang}
                  bldW={summary.buildingWidth}
                  bldH={summary.buildingDepth}
                  landW={summary.landWidth}
                  landD={summary.landDepth}
                  frontSetback={summary.frontSetback ?? 3}
                  backSetback={summary.backSetback ?? 2}
                  sideSetback={summary.sideSetback ?? 1.5}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        {Object.keys(summary).length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: Layers, label: lang === "ar" ? "الطوابق" : "Floors", value: summary.totalFloors ?? "—" },
              { icon: Ruler, label: lang === "ar" ? "المساحة الكلية" : "Total Area", value: summary.totalArea ? `${summary.totalArea} m²` : "—" },
              { icon: Brain, label: lang === "ar" ? "عدد الغرف" : "Rooms", value: summary.totalRooms ?? "—" },
              // estimatedCost hidden
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="w-3.5 h-3.5"/>
                  <span className="text-xs">{label}</span>
                </div>
                <div className="text-lg font-bold text-foreground font-mono">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Compliance */}
        {compliance && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              {compliance.isCompliant
                ? <CheckCircle className="w-4 h-4 text-green-500"/>
                : <XCircle className="w-4 h-4 text-yellow-500"/>}
              <span className="text-sm font-semibold">
                {lang === "ar" ? "الامتثال للكود السعودي" : "Saudi Building Code Compliance"}
              </span>
            </div>
            {compliance.complianceNotesAr && (
              <ul className="text-xs text-muted-foreground space-y-1">
                {(lang === "ar" ? compliance.complianceNotesAr : compliance.complianceNotes ?? []).map((note: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
