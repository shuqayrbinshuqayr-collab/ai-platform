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

// ─── AutoCAD-style room fill colors (light, architectural) ───────────────────
const ROOM_HATCH: Record<string, string> = {
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

// ─── AutoCAD Floor Plan Component ────────────────────────────────────────────
function FloorPlan({
  spaces, floor, lang, bldW, bldH
}: {
  spaces: any[]; floor: number; lang: string; bldW?: number; bldH?: number;
}) {
  const floorSpaces = spaces.filter(s => (s.floor ?? 0) === floor);
  if (floorSpaces.length === 0) return null;

  // SVG canvas with generous padding for dimension annotations
  const SVG_W = 620;
  const SVG_H = 520;
  const PAD_LEFT = 60;   // space for left dimension lines
  const PAD_TOP = 40;    // space for top dimension lines
  const PAD_RIGHT = 30;
  const PAD_BOTTOM = 60; // space for title block + bottom dims

  const innerW = SVG_W - PAD_LEFT - PAD_RIGHT;   // 530
  const innerH = SVG_H - PAD_TOP - PAD_BOTTOM;   // 420

  // Detect coordinate system
  const firstSpace = floorSpaces[0];
  const isMeterMode = firstSpace?.width !== undefined && firstSpace?.w === undefined;
  const buildingW = bldW ?? 10;
  const buildingH = bldH ?? 20;

  const WALL = 2.5; // wall stroke width in SVG units

  // Convert space to SVG pixel coordinates
  function toSVG(space: any): { x: number; y: number; w: number; h: number } {
    if (isMeterMode) {
      const scaleX = innerW / buildingW;
      const scaleY = innerH / buildingH;
      return {
        x: PAD_LEFT + (space.x ?? 0) * scaleX,
        y: PAD_TOP + (space.y ?? 0) * scaleY,
        w: Math.max((space.width ?? 3) * scaleX, 8),
        h: Math.max((space.height ?? space.length ?? 3) * scaleY, 8),
      };
    } else {
      return {
        x: PAD_LEFT + ((space.x ?? 0) / 100) * innerW,
        y: PAD_TOP + ((space.y ?? 0) / 100) * innerH,
        w: Math.max(((space.w ?? 10) / 100) * innerW, 8),
        h: Math.max(((space.h ?? 10) / 100) * innerH, 8),
      };
    }
  }

  // Get real dimension in meters for a space
  function getDims(space: any): { wm: number; hm: number } {
    if (isMeterMode) {
      return {
        wm: space.width ?? 0,
        hm: space.height ?? space.length ?? 0,
      };
    } else {
      return {
        wm: ((space.w ?? 0) / 100) * buildingW,
        hm: ((space.h ?? 0) / 100) * buildingH,
      };
    }
  }

  const floorLabel = floor === 0
    ? (lang === "ar" ? "الدور الأرضي" : "GROUND FLOOR")
    : (lang === "ar" ? `الدور ${floor === 1 ? "الأول" : floor === 2 ? "الثاني" : floor === 3 ? "الثالث" : floor}` : `FLOOR ${floor}`);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#FFFFFF", fontFamily: "'Cairo', 'Arial', sans-serif" }}
    >
      <defs>
        {/* Fine grid pattern — architectural drawing style */}
        <pattern id={`grid-${floor}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E5E7EB" strokeWidth="0.3"/>
        </pattern>
        {/* Hatch pattern for balconies */}
        <pattern id={`hatch-${floor}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#D1D5DB" strokeWidth="1"/>
        </pattern>
      </defs>

      {/* White background */}
      <rect width={SVG_W} height={SVG_H} fill="#FFFFFF"/>

      {/* Drawing area grid */}
      <rect x={PAD_LEFT} y={PAD_TOP} width={innerW} height={innerH} fill={`url(#grid-${floor})`}/>

      {/* ── Rooms ── */}
      {floorSpaces.map((space, i) => {
        const { x, y, w, h } = toSVG(space);
        const { wm, hm } = getDims(space);
        const fill = space.type === "balcony"
          ? `url(#hatch-${floor})`
          : (ROOM_HATCH[space.type] ?? ROOM_HATCH.other);
        const nameAr = space.nameAr || space.name || "";
        const nameEn = space.name || "";
        const label = lang === "ar" ? nameAr : nameEn;
        const area = space.area
          ? parseFloat(space.area).toFixed(1)
          : (wm > 0 && hm > 0 ? (wm * hm).toFixed(1) : null);
        const cx = x + w / 2;
        const cy = y + h / 2;

        // Font sizes based on room size
        const nameFontSize = w > 80 ? 11 : w > 50 ? 9 : 7;
        const areaFontSize = w > 80 ? 9 : 7;

        return (
          <g key={i}>
            {/* Room fill */}
            <rect x={x} y={y} width={w} height={h} fill={fill} />

            {/* Thick walls (architectural style) */}
            <rect
              x={x} y={y} width={w} height={h}
              fill="none"
              stroke="#1A1A1A"
              strokeWidth={WALL}
            />

            {/* Room name */}
            {w > 35 && h > 22 && (
              <>
                <text
                  x={cx} y={cy - (area ? 6 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#111827"
                  fontSize={nameFontSize}
                  fontWeight="700"
                  fontFamily="'Cairo', 'Arial', sans-serif"
                >
                  {label.length > 16 ? label.substring(0, 16) + "…" : label}
                </text>
                {area && (
                  <text
                    x={cx} y={cy + 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#6B7280"
                    fontSize={areaFontSize}
                    fontFamily="'Share Tech Mono', 'Courier New', monospace"
                  >
                    {area} m²
                  </text>
                )}
                {/* Dimension annotation inside room (width × height) */}
                {w > 70 && h > 40 && wm > 0 && hm > 0 && (
                  <text
                    x={cx} y={cy + 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#9CA3AF"
                    fontSize={6.5}
                    fontFamily="'Share Tech Mono', 'Courier New', monospace"
                  >
                    {wm.toFixed(2)}×{hm.toFixed(2)}م
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}

      {/* ── Outer building boundary (thick) ── */}
      <rect
        x={PAD_LEFT} y={PAD_TOP}
        width={innerW} height={innerH}
        fill="none"
        stroke="#000000"
        strokeWidth={4}
      />

      {/* ── Top dimension line (building width) ── */}
      <g>
        <line x1={PAD_LEFT} y1={PAD_TOP - 15} x2={PAD_LEFT + innerW} y2={PAD_TOP - 15} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_LEFT} y1={PAD_TOP - 20} x2={PAD_LEFT} y2={PAD_TOP - 10} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_LEFT + innerW} y1={PAD_TOP - 20} x2={PAD_LEFT + innerW} y2={PAD_TOP - 10} stroke="#374151" strokeWidth="1"/>
        <text
          x={PAD_LEFT + innerW / 2} y={PAD_TOP - 20}
          textAnchor="middle" fill="#374151" fontSize="10"
          fontFamily="'Share Tech Mono', monospace" fontWeight="600"
        >
          {buildingW.toFixed(2)} م
        </text>
      </g>

      {/* ── Left dimension line (building depth) ── */}
      <g>
        <line x1={PAD_LEFT - 15} y1={PAD_TOP} x2={PAD_LEFT - 15} y2={PAD_TOP + innerH} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_LEFT - 20} y1={PAD_TOP} x2={PAD_LEFT - 10} y2={PAD_TOP} stroke="#374151" strokeWidth="1"/>
        <line x1={PAD_LEFT - 20} y1={PAD_TOP + innerH} x2={PAD_LEFT - 10} y2={PAD_TOP + innerH} stroke="#374151" strokeWidth="1"/>
        <text
          x={PAD_LEFT - 28} y={PAD_TOP + innerH / 2}
          textAnchor="middle" fill="#374151" fontSize="10"
          fontFamily="'Share Tech Mono', monospace" fontWeight="600"
          transform={`rotate(-90, ${PAD_LEFT - 28}, ${PAD_TOP + innerH / 2})`}
        >
          {buildingH.toFixed(2)} م
        </text>
      </g>

      {/* ── North arrow ── */}
      <g transform={`translate(${SVG_W - 45}, ${PAD_TOP + 20})`}>
        <circle cx="0" cy="0" r="14" fill="none" stroke="#374151" strokeWidth="1"/>
        <polygon points="0,-12 -5,6 0,2 5,6" fill="#1A1A1A"/>
        <text x="0" y="-16" textAnchor="middle" fill="#374151" fontSize="9" fontWeight="700" fontFamily="'Share Tech Mono', monospace">N</text>
      </g>

      {/* ── Title block ── */}
      <rect x="0" y={SVG_H - 45} width={SVG_W} height="45" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="0.5"/>
      <line x1="0" y1={SVG_H - 45} x2={SVG_W} y2={SVG_H - 45} stroke="#374151" strokeWidth="1.5"/>

      {/* Title block content */}
      <text x="12" y={SVG_H - 28} fill="#111827" fontSize="12" fontWeight="800" fontFamily="'Cairo', Arial, sans-serif">
        {floorLabel}
      </text>
      <text x="12" y={SVG_H - 12} fill="#6B7280" fontSize="8.5" fontFamily="'Share Tech Mono', monospace">
        {`${buildingW.toFixed(2)}م × ${buildingH.toFixed(2)}م  |  SCALE 1:100  |  SOAR.AI`}
      </text>

      {/* Rooms count */}
      <text x={SVG_W - 12} y={SVG_H - 28} textAnchor="end" fill="#374151" fontSize="9" fontFamily="'Share Tech Mono', monospace">
        {floorSpaces.length} {lang === "ar" ? "مساحة" : "spaces"}
      </text>
      <text x={SVG_W - 12} y={SVG_H - 12} textAnchor="end" fill="#9CA3AF" fontSize="8" fontFamily="'Share Tech Mono', monospace">
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
            <div className="text-muted-foreground text-xs font-mono">
              {new Date(blueprint.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
              {blueprint.generationTime && ` · ${(blueprint.generationTime / 1000).toFixed(1)}s`}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadSVG}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60"
          >
            <Download className="w-4 h-4" />
            {lang === "ar" ? "تنزيل SVG" : "Download SVG"}
          </Button>
        </div>

        {/* Floor Plans */}
        {floorsArr.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-white">{t(lang, "floorPlan")}</h2>
            </div>
            <div ref={svgRef} className="space-y-4">
              {floorsArr.map(floor => (
                <div key={floor} className="rounded-xl overflow-hidden border border-border/40 shadow-sm">
                  <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between bg-secondary/20">
                    <span className="text-primary text-xs font-mono font-bold">
                      {floor === 0
                        ? t(lang, "groundFloor")
                        : `${t(lang, "floor")} ${floor}`}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                      {spaces.filter(s => (s.floor ?? 0) === floor).length} {lang === "ar" ? "مساحة" : "spaces"}
                    </span>
                  </div>
                  {/* White background for architectural drawing */}
                  <div className="p-2 bg-white">
                    <FloorPlan
                      spaces={spaces}
                      floor={floor}
                      lang={lang}
                      bldW={summary?.buildingWidth}
                      bldH={summary?.buildingDepth}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary & Compliance */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Summary */}
          <div className="soar-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-white text-sm">{t(lang, "summary")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {summary.totalFloors !== undefined && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{lang === "ar" ? "الطوابق" : "Floors"}</span>
                  <span className="text-white font-mono">{summary.totalFloors + 1}</span>
                </div>
              )}
              {summary.totalRooms && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{lang === "ar" ? "الغرف" : "Rooms"}</span>
                  <span className="text-white font-mono">{summary.totalRooms}</span>
                </div>
              )}
              {summary.totalArea && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{lang === "ar" ? "المساحة الكلية" : "Total Area"}</span>
                  <span className="text-white font-mono">{summary.totalArea}m²</span>
                </div>
              )}
              {summary.buildingWidth && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{lang === "ar" ? "عرض المبنى" : "Building W"}</span>
                  <span className="text-white font-mono">{summary.buildingWidth}م</span>
                </div>
              )}
              {summary.buildingDepth && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{lang === "ar" ? "عمق المبنى" : "Building D"}</span>
                  <span className="text-white font-mono">{summary.buildingDepth}م</span>
                </div>
              )}
              {summary.estimatedCost && (
                <div className="flex justify-between gap-2 col-span-2">
                  <span className="text-muted-foreground">{lang === "ar" ? "التكلفة التقديرية" : "Est. Cost"}</span>
                  <span className="text-primary font-mono font-bold">{summary.estimatedCost}</span>
                </div>
              )}
            </div>
          </div>

          {/* Compliance */}
          <div className="soar-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              {compliance?.isCompliant
                ? <CheckCircle className="w-4 h-4 text-green-500" />
                : <XCircle className="w-4 h-4 text-red-400" />}
              <h3 className="font-bold text-white text-sm">{lang === "ar" ? "الامتثال للكود" : "Code Compliance"}</h3>
            </div>
            <div className="space-y-1.5">
              {(lang === "ar"
                ? (compliance?.complianceNotesAr ?? compliance?.complianceNotes ?? [])
                : (compliance?.complianceNotes ?? [])
              ).map((note: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Description */}
        {description && (
          <div className="soar-card rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-white text-sm">{lang === "ar" ? "المفهوم المعماري" : "AI Concept"}</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          </div>
        )}

        {/* Highlights */}
        {(lang === "ar" ? data?.highlightsAr : data?.highlights)?.length > 0 && (
          <div className="soar-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-white text-sm">{lang === "ar" ? "المميزات الرئيسية" : "Key Features"}</h3>
            </div>
            <ul className="space-y-1.5">
              {(lang === "ar" ? data.highlightsAr : data.highlights).map((h: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">▸</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
