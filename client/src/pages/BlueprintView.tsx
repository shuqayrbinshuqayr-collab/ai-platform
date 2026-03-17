import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import {
  ArrowLeft, ArrowRight, Download, CheckCircle, XCircle,
  Loader2, Layers, FileText, Ruler, Brain
} from "lucide-react";
import { useRef } from "react";

// ─── Room fill colors (very light, architectural) ────────────────────────────
const ROOM_FILL: Record<string, string> = {
  bedroom:        "#EEF2FF",
  master_bedroom: "#FFF7ED",
  living:         "#F0FDF4",
  family_living:  "#F0FDF4",
  majlis:         "#FFFBEB",
  kitchen:        "#ECFDF5",
  bathroom:       "#EFF6FF",
  toilet:         "#EFF6FF",
  dining:         "#FFF1F2",
  corridor:       "#F8FAFC",
  distributor:    "#F8FAFC",
  entrance:       "#FFFBEB",
  parking:        "#F1F5F9",
  storage:        "#F8FAFC",
  balcony:        "#F0FDF4",
  laundry:        "#EFF6FF",
  maid_room:      "#FDF4FF",
  office:         "#EEF2FF",
  prayer:         "#FFFBEB",
  staircase:      "#F1F5F9",
  other:          "#F8FAFC",
};

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

// ─── AutoCAD Floor Plan Component ────────────────────────────────────────────
function FloorPlan({
  spaces, floor, lang, bldW, bldH
}: {
  spaces: any[]; floor: number; lang: string; bldW?: number; bldH?: number;
}) {
  const floorSpaces = spaces.filter(s => (s.floor ?? 0) === floor);
  if (floorSpaces.length === 0) return null;

  const SVG_W = 640;
  const SVG_H = 540;
  const PAD_L = 65;
  const PAD_T = 45;
  const PAD_R = 35;
  const PAD_B = 65;

  const innerW = SVG_W - PAD_L - PAD_R;
  const innerH = SVG_H - PAD_T - PAD_B;

  const firstSpace = floorSpaces[0];
  const isMeterMode = firstSpace?.width !== undefined && firstSpace?.w === undefined;
  const buildingW = bldW ?? 10;
  const buildingH = bldH ?? 20;

  // Wall thickness in SVG pixels
  const WALL_T = 5;
  // Half wall for inner offset
  const HW = WALL_T / 2;

  // Convert space coordinates to SVG pixels
  function toSVG(space: any): { x: number; y: number; w: number; h: number } {
    if (isMeterMode) {
      const sx = innerW / buildingW;
      const sy = innerH / buildingH;
      return {
        x: PAD_L + (space.x ?? 0) * sx,
        y: PAD_T + (space.y ?? 0) * sy,
        w: Math.max((space.width ?? 3) * sx, 12),
        h: Math.max((space.height ?? space.length ?? 3) * sy, 12),
      };
    }
    return {
      x: PAD_L + ((space.x ?? 0) / 100) * innerW,
      y: PAD_T + ((space.y ?? 0) / 100) * innerH,
      w: Math.max(((space.w ?? 10) / 100) * innerW, 12),
      h: Math.max(((space.h ?? 10) / 100) * innerH, 12),
    };
  }

  function getDims(space: any): { wm: number; hm: number } {
    if (isMeterMode) {
      return { wm: space.width ?? 0, hm: space.height ?? space.length ?? 0 };
    }
    return {
      wm: ((space.w ?? 0) / 100) * buildingW,
      hm: ((space.h ?? 0) / 100) * buildingH,
    };
  }

  // ─── Door symbol (arc + door leaf) ───────────────────────────────────────
  // Draws a door on the bottom wall of the room by default
  function DoorSymbol({ x, y, w, h, type }: { x: number; y: number; w: number; h: number; type: string }) {
    // Door width = 25-35px, centered on the appropriate wall
    const dw = Math.min(w * 0.35, 35);
    const dh = dw; // door leaf length = same as width (square arc)

    // Determine which wall to place door on
    const onBottom = ["bedroom", "master_bedroom", "bathroom", "toilet", "maid_room", "storage", "laundry"].includes(type);
    const onLeft   = ["majlis", "family_living", "living"].includes(type);
    const onTop    = ["balcony"].includes(type);
    // Default: bottom wall

    if (onTop) {
      // Door on top wall, opens upward
      const dx = x + w / 2 - dw / 2;
      const dy = y;
      return (
        <g stroke="#1A1A1A" strokeWidth="1" fill="none">
          {/* Clear wall opening */}
          <rect x={dx} y={dy - HW} width={dw} height={WALL_T} fill="#FFFFFF" stroke="none"/>
          {/* Door leaf */}
          <line x1={dx} y1={dy} x2={dx} y2={dy - dh} stroke="#1A1A1A" strokeWidth="1"/>
          {/* Arc */}
          <path d={`M ${dx} ${dy} A ${dw} ${dh} 0 0 1 ${dx + dw} ${dy}`} strokeDasharray="3,2"/>
        </g>
      );
    } else if (onLeft) {
      // Door on left wall, opens inward (rightward)
      const dx = x;
      const dy = y + h / 2 - dw / 2;
      return (
        <g stroke="#1A1A1A" strokeWidth="1" fill="none">
          <rect x={dx - HW} y={dy} width={WALL_T} height={dw} fill="#FFFFFF" stroke="none"/>
          <line x1={dx} y1={dy} x2={dx + dh} y2={dy} stroke="#1A1A1A" strokeWidth="1"/>
          <path d={`M ${dx} ${dy} A ${dh} ${dw} 0 0 0 ${dx} ${dy + dw}`} strokeDasharray="3,2"/>
        </g>
      );
    } else {
      // Door on bottom wall, opens inward (upward)
      const dx = x + w / 2 - dw / 2;
      const dy = y + h;
      return (
        <g stroke="#1A1A1A" strokeWidth="1" fill="none">
          <rect x={dx} y={dy - HW} width={dw} height={WALL_T} fill="#FFFFFF" stroke="none"/>
          <line x1={dx} y1={dy} x2={dx} y2={dy - dh} stroke="#1A1A1A" strokeWidth="1"/>
          <path d={`M ${dx} ${dy} A ${dw} ${dh} 0 0 0 ${dx + dw} ${dy}`} strokeDasharray="3,2"/>
        </g>
      );
    }
  }

  // ─── Window symbol (3 parallel lines on wall) ────────────────────────────
  function WindowSymbol({ x, y, w, h, type }: { x: number; y: number; w: number; h: number; type: string }) {
    const ww = Math.min(w * 0.45, 45); // window width
    const onTop = ["balcony", "majlis", "living", "family_living"].includes(type);

    if (onTop) {
      // Window on top wall
      const wx = x + w / 2 - ww / 2;
      const wy = y;
      return (
        <g>
          <rect x={wx} y={wy - HW} width={ww} height={WALL_T} fill="#FFFFFF" stroke="none"/>
          <line x1={wx} y1={wy - HW} x2={wx + ww} y2={wy - HW} stroke="#1A1A1A" strokeWidth="0.8"/>
          <line x1={wx} y1={wy} x2={wx + ww} y2={wy} stroke="#6B9AC4" strokeWidth="1.2"/>
          <line x1={wx} y1={wy + HW} x2={wx + ww} y2={wy + HW} stroke="#1A1A1A" strokeWidth="0.8"/>
        </g>
      );
    }
    // Window on right wall
    const wx = x + w;
    const wy = y + h * 0.25;
    const wh = Math.min(h * 0.4, 40);
    return (
      <g>
        <rect x={wx - HW} y={wy} width={WALL_T} height={wh} fill="#FFFFFF" stroke="none"/>
        <line x1={wx - HW} y1={wy} x2={wx - HW} y2={wy + wh} stroke="#1A1A1A" strokeWidth="0.8"/>
        <line x1={wx} y1={wy} x2={wx} y2={wy + wh} stroke="#6B9AC4" strokeWidth="1.2"/>
        <line x1={wx + HW} y1={wy} x2={wx + HW} y2={wy + wh} stroke="#1A1A1A" strokeWidth="0.8"/>
      </g>
    );
  }

  // ─── Staircase symbol ─────────────────────────────────────────────────────
  function StaircaseSymbol({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
    const steps = Math.max(4, Math.floor(h / 12));
    const stepH = h / steps;
    return (
      <g stroke="#9CA3AF" strokeWidth="0.7" fill="none">
        {Array.from({ length: steps }).map((_, i) => (
          <line key={i} x1={x + 4} y1={y + i * stepH} x2={x + w - 4} y2={y + i * stepH}/>
        ))}
        {/* Arrow indicating direction */}
        <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} stroke="#6B7280" strokeWidth="1"/>
        <polygon points={`${x + w / 2},${y + 4} ${x + w / 2 - 4},${y + 14} ${x + w / 2 + 4},${y + 14}`} fill="#6B7280"/>
      </g>
    );
  }

  // ─── Dimension line ───────────────────────────────────────────────────────
  function DimLine({ x1, y1, x2, y2, label, axis }: {
    x1: number; y1: number; x2: number; y2: number; label: string; axis: "h" | "v";
  }) {
    const C = "#374151";
    const FS = 7.5;
    const TICK = 5;
    const ARROW = 5;

    if (axis === "h") {
      const my = (y1 + y2) / 2;
      const mx = (x1 + x2) / 2;
      return (
        <g>
          <line x1={x1} y1={y1} x2={x1} y2={y1 + TICK} stroke={C} strokeWidth="0.7"/>
          <line x1={x2} y1={y1} x2={x2} y2={y1 + TICK} stroke={C} strokeWidth="0.7"/>
          <line x1={x1} y1={my} x2={x2} y2={my} stroke={C} strokeWidth="0.7"/>
          <polygon points={`${x1},${my} ${x1+ARROW},${my-2} ${x1+ARROW},${my+2}`} fill={C}/>
          <polygon points={`${x2},${my} ${x2-ARROW},${my-2} ${x2-ARROW},${my+2}`} fill={C}/>
          <rect x={mx - 16} y={my - 6} width="32" height="11" fill="#FFFFFF"/>
          <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="middle"
            fill={C} fontSize={FS} fontFamily="'Share Tech Mono','Courier New',monospace" fontWeight="600">
            {label}
          </text>
        </g>
      );
    } else {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      return (
        <g>
          <line x1={x1} y1={y1} x2={x1 + TICK} y2={y1} stroke={C} strokeWidth="0.7"/>
          <line x1={x1} y1={y2} x2={x1 + TICK} y2={y2} stroke={C} strokeWidth="0.7"/>
          <line x1={mx} y1={y1} x2={mx} y2={y2} stroke={C} strokeWidth="0.7"/>
          <polygon points={`${mx},${y1} ${mx-2},${y1+ARROW} ${mx+2},${y1+ARROW}`} fill={C}/>
          <polygon points={`${mx},${y2} ${mx-2},${y2-ARROW} ${mx+2},${y2-ARROW}`} fill={C}/>
          <rect x={mx - 5} y={my - 16} width="10" height="32" fill="#FFFFFF"/>
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
        {/* Fine grid */}
        <pattern id={`grid-f${floor}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E5E7EB" strokeWidth="0.25"/>
        </pattern>
        {/* Balcony hatch */}
        <pattern id={`hatch-f${floor}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#D1D5DB" strokeWidth="0.8"/>
        </pattern>
      </defs>

      {/* White background */}
      <rect width={SVG_W} height={SVG_H} fill="#FFFFFF"/>

      {/* Drawing area grid */}
      <rect x={PAD_L} y={PAD_T} width={innerW} height={innerH} fill={`url(#grid-f${floor})`}/>

      {/* ── Render each room ── */}
      {floorSpaces.map((space, i) => {
        const { x, y, w, h } = toSVG(space);
        const { wm, hm } = getDims(space);
        const type = space.type ?? "other";
        const fill = type === "balcony"
          ? `url(#hatch-f${floor})`
          : (ROOM_FILL[type] ?? ROOM_FILL.other);
        const nameAr = space.nameAr || space.name || "";
        const nameEn = space.name || "";
        const label = lang === "ar" ? nameAr : nameEn;
        const area = space.area
          ? parseFloat(space.area).toFixed(1)
          : (wm > 0 && hm > 0 ? (wm * hm).toFixed(1) : null);
        const cx = x + w / 2;
        const cy = y + h / 2;
        const nameFontSize = w > 80 ? 11 : w > 50 ? 9 : 7;
        const areaFontSize = w > 80 ? 8.5 : 7;

        return (
          <g key={i}>
            {/* ── Room fill ── */}
            <rect x={x} y={y} width={w} height={h} fill={fill}/>

            {/* ── Thick walls (architectural double-line style) ── */}
            {/* Outer wall */}
            <rect
              x={x - HW} y={y - HW}
              width={w + WALL_T} height={h + WALL_T}
              fill="none" stroke="#1A1A1A" strokeWidth={WALL_T}
            />
            {/* Inner wall line */}
            <rect
              x={x + HW} y={y + HW}
              width={w - WALL_T} height={h - WALL_T}
              fill="none" stroke="#4B5563" strokeWidth="0.5"
            />

            {/* ── Staircase pattern ── */}
            {type === "staircase" && <StaircaseSymbol x={x+2} y={y+2} w={w-4} h={h-4}/>}

            {/* ── Window symbol ── */}
            {HAS_WINDOW.has(type) && w > 30 && h > 20 && (
              <WindowSymbol x={x} y={y} w={w} h={h} type={type}/>
            )}

            {/* ── Door symbol ── */}
            {HAS_DOOR.has(type) && w > 25 && h > 25 && (
              <DoorSymbol x={x} y={y} w={w} h={h} type={type}/>
            )}

            {/* ── Room label ── */}
            {w > 35 && h > 25 && (
              <>
                <text
                  x={cx} y={cy - (area ? 7 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#111827" fontSize={nameFontSize} fontWeight="700"
                  fontFamily="'Cairo','Arial',sans-serif"
                >
                  {label.length > 14 ? label.substring(0, 14) + "…" : label}
                </text>
                {area && (
                  <text
                    x={cx} y={cy + 7}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#6B7280" fontSize={areaFontSize}
                    fontFamily="'Share Tech Mono','Courier New',monospace"
                  >
                    {area} m²
                  </text>
                )}
              </>
            )}

            {/* ── Internal dimension cotes ── */}
            {w > 60 && wm > 0 && (
              <DimLine
                x1={x + 6} y1={y + h - 14} x2={x + w - 6} y2={y + h - 14}
                label={`${wm.toFixed(2)}م`} axis="h"
              />
            )}
            {h > 55 && hm > 0 && (
              <DimLine
                x1={x + w - 14} y1={y + 6} x2={x + w - 14} y2={y + h - 6}
                label={`${hm.toFixed(2)}م`} axis="v"
              />
            )}
          </g>
        );
      })}

      {/* ── Outer building boundary (very thick) ── */}
      <rect
        x={PAD_L - HW} y={PAD_T - HW}
        width={innerW + WALL_T} height={innerH + WALL_T}
        fill="none" stroke="#000000" strokeWidth={WALL_T + 2}
      />

      {/* ── Top dimension (building width) ── */}
      <g>
        <line x1={PAD_L} y1={PAD_T - 20} x2={PAD_L + innerW} y2={PAD_T - 20} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_L} y1={PAD_T - 25} x2={PAD_L} y2={PAD_T - 15} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_L + innerW} y1={PAD_T - 25} x2={PAD_L + innerW} y2={PAD_T - 15} stroke="#374151" strokeWidth="1"/>
        <polygon points={`${PAD_L},${PAD_T-20} ${PAD_L+7},${PAD_T-22} ${PAD_L+7},${PAD_T-18}`} fill="#374151"/>
        <polygon points={`${PAD_L+innerW},${PAD_T-20} ${PAD_L+innerW-7},${PAD_T-22} ${PAD_L+innerW-7},${PAD_T-18}`} fill="#374151"/>
        <rect x={PAD_L + innerW/2 - 22} y={PAD_T - 28} width="44" height="13" fill="#FFFFFF"/>
        <text x={PAD_L + innerW / 2} y={PAD_T - 21}
          textAnchor="middle" fill="#374151" fontSize="10"
          fontFamily="'Share Tech Mono',monospace" fontWeight="700">
          {buildingW.toFixed(2)} م
        </text>
      </g>

      {/* ── Left dimension (building depth) ── */}
      <g>
        <line x1={PAD_L - 20} y1={PAD_T} x2={PAD_L - 20} y2={PAD_T + innerH} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_L - 25} y1={PAD_T} x2={PAD_L - 15} y2={PAD_T} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_L - 25} y1={PAD_T + innerH} x2={PAD_L - 15} y2={PAD_T + innerH} stroke="#374151" strokeWidth="1"/>
        <polygon points={`${PAD_L-20},${PAD_T} ${PAD_L-22},${PAD_T+7} ${PAD_L-18},${PAD_T+7}`} fill="#374151"/>
        <polygon points={`${PAD_L-20},${PAD_T+innerH} ${PAD_L-22},${PAD_T+innerH-7} ${PAD_L-18},${PAD_T+innerH-7}`} fill="#374151"/>
        <rect x={PAD_L - 33} y={PAD_T + innerH/2 - 22} width="13" height="44" fill="#FFFFFF"/>
        <text x={PAD_L - 27} y={PAD_T + innerH / 2}
          textAnchor="middle" fill="#374151" fontSize="10"
          fontFamily="'Share Tech Mono',monospace" fontWeight="700"
          transform={`rotate(-90,${PAD_L - 27},${PAD_T + innerH / 2})`}>
          {buildingH.toFixed(2)} م
        </text>
      </g>

      {/* ── North arrow ── */}
      <g transform={`translate(${SVG_W - 40}, ${PAD_T + 22})`}>
        <circle cx="0" cy="0" r="16" fill="none" stroke="#374151" strokeWidth="1.2"/>
        <polygon points="0,-14 -5,0 0,-4 5,0" fill="#1A1A1A"/>
        <polygon points="0,14 -5,0 0,4 5,0" fill="#D1D5DB"/>
        <text x="0" y="-19" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="800"
          fontFamily="'Share Tech Mono',monospace">N</text>
      </g>

      {/* ── Title block ── */}
      <rect x="0" y={SVG_H - 50} width={SVG_W} height="50" fill="#F9FAFB"/>
      <line x1="0" y1={SVG_H - 50} x2={SVG_W} y2={SVG_H - 50} stroke="#1A1A1A" strokeWidth="2"/>
      <line x1="0" y1={SVG_H - 28} x2={SVG_W} y2={SVG_H - 28} stroke="#D1D5DB" strokeWidth="0.5"/>

      <text x="14" y={SVG_H - 34} fill="#111827" fontSize="13" fontWeight="800"
        fontFamily="'Cairo',Arial,sans-serif">
        {floorLabel}
      </text>
      <text x="14" y={SVG_H - 13} fill="#6B7280" fontSize="8.5"
        fontFamily="'Share Tech Mono',monospace">
        {`${buildingW.toFixed(2)}م × ${buildingH.toFixed(2)}م  |  SCALE 1:100  |  SOAR.AI`}
      </text>
      <text x={SVG_W - 14} y={SVG_H - 34} textAnchor="end" fill="#374151" fontSize="9"
        fontFamily="'Share Tech Mono',monospace">
        {floorSpaces.length} {lang === "ar" ? "مساحة" : "spaces"}
      </text>
      <text x={SVG_W - 14} y={SVG_H - 13} textAnchor="end" fill="#9CA3AF" fontSize="8"
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
  const svgRef = useRef<HTMLDivElement>(null);
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const { data: blueprint, isLoading } = trpc.blueprints.get.useQuery({ id: blueprintId });

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
          <Button onClick={handleDownloadSVG} variant="outline" className="gap-2 shrink-0">
            <Download className="w-4 h-4"/>
            {lang === "ar" ? "تحميل SVG" : "Download SVG"}
          </Button>
        </div>

        {/* Floor plans */}
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
                <FloorPlan
                  spaces={spaces}
                  floor={floor}
                  lang={lang}
                  bldW={summary.buildingWidth}
                  bldH={summary.buildingDepth}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        {Object.keys(summary).length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Layers, label: lang === "ar" ? "الطوابق" : "Floors", value: summary.totalFloors ?? "—" },
              { icon: Ruler, label: lang === "ar" ? "المساحة الكلية" : "Total Area", value: summary.totalArea ? `${summary.totalArea} m²` : "—" },
              { icon: Brain, label: lang === "ar" ? "عدد الغرف" : "Rooms", value: summary.totalRooms ?? "—" },
              { icon: FileText, label: lang === "ar" ? "التكلفة التقديرية" : "Est. Cost", value: summary.estimatedCost ?? "—" },
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
