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

function FloorPlan({ spaces, floor, lang }: { spaces: any[]; floor: number; lang: string }) {
  const floorSpaces = spaces.filter(s => s.floor === floor);
  if (floorSpaces.length === 0) return null;

  return (
    <svg viewBox="0 0 500 400" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`grid-fp-${floor}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="oklch(0.70 0.19 45 / 0.08)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="500" height="400" fill={`url(#grid-fp-${floor})`} />

      {/* Outer boundary */}
      <rect x="30" y="30" width="440" height="340" fill="none" stroke="oklch(0.70 0.19 45 / 0.6)" strokeWidth="2.5" />

      {/* Corner markers - orange */}
      <path d="M 30 30 L 55 30 M 30 30 L 30 55" stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />
      <path d="M 470 30 L 445 30 M 470 30 L 470 55" stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />
      <path d="M 30 370 L 55 370 M 30 370 L 30 345" stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />
      <path d="M 470 370 L 445 370 M 470 370 L 470 345" stroke="oklch(0.70 0.19 45)" strokeWidth="2.5" />

      {/* Rooms */}
      {floorSpaces.map((space, i) => {
        const x = 30 + (space.x / 100) * 440;
        const y = 30 + (space.y / 100) * 340;
        const w = (space.w / 100) * 440;
        const h = (space.h / 100) * 340;
        const fill = ROOM_COLORS[space.type] ?? ROOM_COLORS.other;
        const stroke = ROOM_STROKE[space.type] ?? ROOM_STROKE.other;
        const nameAr = space.nameAr || space.name;
        const nameEn = space.name;
        const label = lang === "ar" ? nameAr : nameEn;

        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth="1.5" />
            <text
              x={x + w / 2} y={y + h / 2 - 6}
              textAnchor="middle" dominantBaseline="middle"
              fill="oklch(0.92 0.05 240)" fontSize="9"
              fontFamily="'Cairo', 'Share Tech Mono', monospace"
              style={{ fontWeight: 600 }}
            >
              {label.length > 12 ? label.substring(0, 12) + "…" : label}
            </text>
            {space.area && (
              <text
                x={x + w / 2} y={y + h / 2 + 8}
                textAnchor="middle" dominantBaseline="middle"
                fill="oklch(0.70 0.19 45 / 0.8)" fontSize="8"
                fontFamily="'Share Tech Mono', monospace"
              >
                {space.area}m²
              </text>
            )}
          </g>
        );
      })}

      {/* Title block */}
      <rect x="0" y="385" width="500" height="15" fill="oklch(0.12 0.010 240)" />
      <text x="10" y="395" fill="oklch(0.70 0.19 45 / 0.8)" fontSize="8" fontFamily="'Share Tech Mono', monospace">
        {`SOAR.AI // ${lang === "ar" ? "الطابق" : "FLOOR"} ${floor === 0 ? (lang === "ar" ? "الأرضي" : "GROUND") : floor} // SCALE 1:100`}
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
                    <FloorPlan spaces={spaces} floor={floor} lang={lang} />
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
