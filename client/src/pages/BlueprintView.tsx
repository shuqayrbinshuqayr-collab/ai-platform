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

// Updated color map with orange/warm tones for SOAR theme
const ROOM_COLORS: Record<string, string> = {
  bedroom: "oklch(0.70 0.19 45 / 0.15)",
  living: "oklch(0.65 0.15 200 / 0.15)",
  kitchen: "oklch(0.65 0.18 145 / 0.15)",
  bathroom: "oklch(0.60 0.15 280 / 0.15)",
  office: "oklch(0.65 0.18 60 / 0.15)",
  parking: "oklch(0.35 0.05 240 / 0.20)",
  corridor: "oklch(0.30 0.05 240 / 0.15)",
  balcony: "oklch(0.65 0.18 120 / 0.15)",
  storage: "oklch(0.40 0.08 240 / 0.15)",
  lobby: "oklch(0.65 0.20 180 / 0.15)",
  majlis: "oklch(0.70 0.19 45 / 0.20)",
  other: "oklch(0.40 0.08 240 / 0.15)",
};

const ROOM_STROKE: Record<string, string> = {
  bedroom: "oklch(0.70 0.19 45)",
  living: "oklch(0.65 0.20 200)",
  kitchen: "oklch(0.65 0.18 145)",
  bathroom: "oklch(0.65 0.15 280)",
  office: "oklch(0.65 0.18 60)",
  parking: "oklch(0.55 0.08 240)",
  corridor: "oklch(0.50 0.08 240)",
  balcony: "oklch(0.65 0.18 120)",
  storage: "oklch(0.55 0.10 240)",
  lobby: "oklch(0.65 0.20 180)",
  majlis: "oklch(0.75 0.22 45)",
  other: "oklch(0.55 0.10 240)",
};

function FloorPlan({ spaces, floor, lang, bldW, bldH }: { spaces: any[]; floor: number; lang: string; bldW?: number; bldH?: number }) {
  const floorSpaces = spaces.filter(s => (s.floor ?? 0) === floor);
  if (floorSpaces.length === 0) return null;

  const SVG_W = 500;
  const SVG_H = 400;
  const PAD = 30;
  const innerW = SVG_W - PAD * 2; // 440
  const innerH = SVG_H - PAD * 2; // 340

  // Detect coordinate system:
  // - If spaces have w/h fields (0-100 range) → percentage mode
  // - If spaces have width/height fields (meters) → meter mode
  const firstSpace = floorSpaces[0];
  const isMeterMode = firstSpace?.width !== undefined && firstSpace?.w === undefined;
  const buildingW = bldW ?? 10;
  const buildingH = bldH ?? 20;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`grid-fp-${floor}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="oklch(0.70 0.19 45 / 0.08)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="oklch(0.09 0.008 240)" />
      <rect x={PAD} y={PAD} width={innerW} height={innerH} fill={`url(#grid-fp-${floor})`} />

      {/* Outer boundary */}
      <rect x={PAD} y={PAD} width={innerW} height={innerH} fill="none" stroke="oklch(0.70 0.19 45 / 0.6)" strokeWidth="2.5" />

      {/* Corner markers */}
      <path d={`M ${PAD} ${PAD} L ${PAD+25} ${PAD} M ${PAD} ${PAD} L ${PAD} ${PAD+25}`} stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />
      <path d={`M ${SVG_W-PAD} ${PAD} L ${SVG_W-PAD-25} ${PAD} M ${SVG_W-PAD} ${PAD} L ${SVG_W-PAD} ${PAD+25}`} stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />
      <path d={`M ${PAD} ${SVG_H-PAD} L ${PAD+25} ${SVG_H-PAD} M ${PAD} ${SVG_H-PAD} L ${PAD} ${SVG_H-PAD-25}`} stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />
      <path d={`M ${SVG_W-PAD} ${SVG_H-PAD} L ${SVG_W-PAD-25} ${SVG_H-PAD} M ${SVG_W-PAD} ${SVG_H-PAD} L ${SVG_W-PAD} ${SVG_H-PAD-25}`} stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />

      {/* Rooms */}
      {floorSpaces.map((space, i) => {
        let x: number, y: number, w: number, h: number;

        if (isMeterMode) {
          // Meter-based: scale to SVG
          const scaleX = innerW / buildingW;
          const scaleY = innerH / buildingH;
          x = PAD + (space.x ?? 0) * scaleX;
          y = PAD + (space.y ?? 0) * scaleY;
          w = Math.max((space.width ?? 3) * scaleX, 6);
          h = Math.max((space.height ?? space.length ?? 3) * scaleY, 6);
        } else {
          // Percentage-based (0-100)
          x = PAD + ((space.x ?? 0) / 100) * innerW;
          y = PAD + ((space.y ?? 0) / 100) * innerH;
          w = Math.max(((space.w ?? 10) / 100) * innerW, 6);
          h = Math.max(((space.h ?? 10) / 100) * innerH, 6);
        }

        const fill = ROOM_COLORS[space.type] ?? ROOM_COLORS.other;
        const stroke = ROOM_STROKE[space.type] ?? ROOM_STROKE.other;
        const nameAr = space.nameAr || space.name;
        const nameEn = space.name;
        const label = lang === "ar" ? nameAr : nameEn;
        const area = space.area ?? (space.width && (space.height ?? space.length) ? (space.width * (space.height ?? space.length)).toFixed(1) : null);
        const cx = x + w / 2;
        const cy = y + h / 2;

        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth="1.5" />
            {w > 40 && h > 25 && (
              <>
                <text
                  x={cx} y={cy - 5}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="oklch(0.95 0.05 45)" fontSize="10"
                  fontFamily="'Cairo', Arial, sans-serif"
                  fontWeight="700"
                >
                  {label && label.length > 14 ? label.substring(0, 14) + "…" : label}
                </text>
                {area && (
                  <text
                    x={cx} y={cy + 9}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="oklch(0.70 0.19 45)" fontSize="9"
                    fontFamily="'Share Tech Mono', monospace"
                  >
                    {area}m²
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Title block */}
      <rect x="0" y={SVG_H - 15} width={SVG_W} height="15" fill="oklch(0.12 0.010 240)" />
      <text x="10" y={SVG_H - 5} fill="oklch(0.70 0.19 45 / 0.8)" fontSize="8" fontFamily="'Share Tech Mono', monospace">
        {`SOAR.AI // ${lang === "ar" ? "الطابق" : "FLOOR"} ${floor === 0 ? (lang === "ar" ? "الأرضي" : "GROUND") : floor} // ${buildingW.toFixed(1)}m × ${buildingH.toFixed(1)}m`}
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
                <div key={floor} className="soar-card rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between bg-secondary/20">
                    <span className="text-primary text-xs font-mono font-bold">
                      {floor === 0
                        ? t(lang, "groundFloor")
                        : `${t(lang, "floor")} ${floor}`}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                      {spaces.filter(s => s.floor === floor).length} {lang === "ar" ? "مساحة" : "spaces"}
                    </span>
                  </div>
                  <div className="p-4" style={{ background: "oklch(0.09 0.008 240)" }}>
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
          {Object.keys(summary).length > 0 && (
            <div className="soar-card rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <FileText className="w-5 h-5" />
                <span className="font-bold">{t(lang, "summary")}</span>
              </div>
              <div className="space-y-2.5 text-sm">
                {summary.totalFloors && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "عدد الطوابق" : "Total Floors"}</span>
                    <span className="text-foreground font-mono font-bold">{summary.totalFloors}</span>
                  </div>
                )}
                {summary.totalRooms && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "عدد الغرف" : "Total Rooms"}</span>
                    <span className="text-foreground font-mono font-bold">{summary.totalRooms}</span>
                  </div>
                )}
                {summary.totalArea && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t(lang, "totalArea")}</span>
                    <span className="text-foreground font-mono font-bold">{summary.totalArea} m²</span>
                  </div>
                )}
                {summary.parkingSpaces !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "مواقف" : "Parking"}</span>
                    <span className="text-foreground font-mono font-bold">{summary.parkingSpaces}</span>
                  </div>
                )}
                {summary.estimatedCost && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t(lang, "estimatedCost")}</span>
                    <span className="text-primary font-mono text-xs font-bold">{summary.estimatedCost}</span>
                  </div>
                )}
                {summary.constructionDuration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t(lang, "constructionDuration")}</span>
                    <span className="text-foreground text-xs">{summary.constructionDuration}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regulatory Compliance — hidden from user, processed in backend */}
        </div>

        {/* Concept Description */}
        {description && (
          <div className="soar-card rounded-xl p-6 space-y-4 mb-6">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="w-5 h-5" />
              <span className="font-bold">{t(lang, "conceptDescription")}</span>
            </div>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
              {description}
            </div>
          </div>
        )}

        {/* Spaces Table */}
        {spaces.length > 0 && (
          <div className="soar-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2 bg-secondary/20">
              <Layers className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{t(lang, "spaces")}</span>
              <span className="text-muted-foreground text-xs font-mono">({spaces.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-3 text-start text-muted-foreground font-semibold">{lang === "ar" ? "الاسم" : "Name"}</th>
                    <th className="px-4 py-3 text-start text-muted-foreground font-semibold">{lang === "ar" ? "الطابق" : "Floor"}</th>
                    <th className="px-4 py-3 text-start text-muted-foreground font-semibold">{lang === "ar" ? "الأبعاد" : "Dimensions"}</th>
                    <th className="px-4 py-3 text-start text-muted-foreground font-semibold">{lang === "ar" ? "المساحة" : "Area"}</th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((space, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">
                        {lang === "ar" ? (space.nameAr || space.name) : space.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {space.floor === 0 ? (lang === "ar" ? "أرضي" : "G") : space.floor}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {space.width && space.length ? `${space.width} × ${space.length} m` : "-"}
                      </td>
                      <td className="px-4 py-3 text-primary font-mono font-bold">
                        {space.area ? `${space.area} m²` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
