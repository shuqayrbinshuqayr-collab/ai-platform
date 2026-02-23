import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import {
  ArrowLeft, ArrowRight, Download, CheckCircle, XCircle,
  Loader2, Layers, FileText, Ruler
} from "lucide-react";
import { useRef } from "react";

// Color map for room types
const ROOM_COLORS: Record<string, string> = {
  bedroom: "oklch(0.40 0.12 240 / 0.35)",
  living: "oklch(0.45 0.15 200 / 0.35)",
  kitchen: "oklch(0.40 0.12 145 / 0.35)",
  bathroom: "oklch(0.40 0.10 280 / 0.35)",
  office: "oklch(0.40 0.12 60 / 0.35)",
  parking: "oklch(0.30 0.05 240 / 0.35)",
  corridor: "oklch(0.25 0.05 240 / 0.25)",
  balcony: "oklch(0.40 0.12 120 / 0.35)",
  storage: "oklch(0.35 0.08 240 / 0.25)",
  lobby: "oklch(0.40 0.15 180 / 0.35)",
  other: "oklch(0.35 0.08 240 / 0.30)",
};

const ROOM_STROKE: Record<string, string> = {
  bedroom: "oklch(0.65 0.18 240)",
  living: "oklch(0.65 0.20 200)",
  kitchen: "oklch(0.65 0.18 145)",
  bathroom: "oklch(0.65 0.15 280)",
  office: "oklch(0.65 0.18 60)",
  parking: "oklch(0.55 0.08 240)",
  corridor: "oklch(0.50 0.08 240)",
  balcony: "oklch(0.65 0.18 120)",
  storage: "oklch(0.55 0.10 240)",
  lobby: "oklch(0.65 0.20 180)",
  other: "oklch(0.55 0.10 240)",
};

function FloorPlan({ spaces, floor, lang }: { spaces: any[]; floor: number; lang: string }) {
  const floorSpaces = spaces.filter(s => s.floor === floor);
  if (floorSpaces.length === 0) return null;

  return (
    <svg viewBox="0 0 500 400" className="w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`grid-fp-${floor}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="oklch(0.40 0.10 240 / 0.25)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="500" height="400" fill={`url(#grid-fp-${floor})`} />

      {/* Outer boundary */}
      <rect x="30" y="30" width="440" height="340" fill="none" stroke="oklch(0.65 0.20 220)" strokeWidth="2.5" />

      {/* Corner markers */}
      <path d="M 30 30 L 50 30 M 30 30 L 30 50" stroke="oklch(0.70 0.22 200)" strokeWidth="2.5" />
      <path d="M 470 30 L 450 30 M 470 30 L 470 50" stroke="oklch(0.70 0.22 200)" strokeWidth="2.5" />
      <path d="M 30 370 L 50 370 M 30 370 L 30 350" stroke="oklch(0.70 0.22 200)" strokeWidth="2.5" />
      <path d="M 470 370 L 450 370 M 470 370 L 470 350" stroke="oklch(0.70 0.22 200)" strokeWidth="2.5" />

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
              fill="oklch(0.90 0.05 240)" fontSize="9"
              fontFamily="'Cairo', 'Share Tech Mono', monospace"
              style={{ fontWeight: 600 }}
            >
              {label.length > 12 ? label.substring(0, 12) + "…" : label}
            </text>
            {space.area && (
              <text
                x={x + w / 2} y={y + h / 2 + 8}
                textAnchor="middle" dominantBaseline="middle"
                fill="oklch(0.65 0.12 240)" fontSize="8"
                fontFamily="'Share Tech Mono', monospace"
              >
                {space.area}m²
              </text>
            )}
          </g>
        );
      })}

      {/* Title block */}
      <rect x="0" y="385" width="500" height="15" fill="oklch(0.18 0.06 240 / 0.9)" />
      <text x="10" y="395" fill="oklch(0.65 0.15 220)" fontSize="8" fontFamily="'Share Tech Mono', monospace">
        {`SOAR AI // ${lang === "ar" ? "الطابق" : "FLOOR"} ${floor === 0 ? (lang === "ar" ? "الأرضي" : "GROUND") : floor} // SCALE 1:100`}
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
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="text-slate-400">{lang === "ar" ? "المخطط غير موجود" : "Blueprint not found"}</div>
      </div>
    );
  }

  const data = blueprint.structuredData as any;
  const compliance = blueprint.regulatoryCompliance as any;
  const spaces: any[] = data?.spaces ?? [];
  const summary = data?.summary ?? {};
  const floorsSet = new Set(spaces.map(s => s.floor));
  const floors = Array.from(floorsSet).sort();

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueprint-${blueprintId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const description = lang === "ar"
    ? (blueprint.conceptDescriptionAr || blueprint.conceptDescription)
    : blueprint.conceptDescription;

  return (
    <div className="min-h-screen pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-5xl">
        {/* Back */}
        <button
          onClick={() => navigate(`/projects/${blueprint.projectId}`)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
        >
          <BackIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">{lang === "ar" ? "العودة للمشروع" : "Back to Project"}</span>
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="dimension-marker text-blue-400">// BLUEPRINT VIEW //</div>
            <h1 className="text-3xl font-black text-white">
              {lang === "ar" ? (data?.titleAr || blueprint.title) : blueprint.title}
            </h1>
            <div className="dimension-marker text-slate-500">
              {new Date(blueprint.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
              {blueprint.generationTime && ` · ${(blueprint.generationTime / 1000).toFixed(1)}s`}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadSVG}
            className="gap-2 border-border/60 text-slate-300 hover:text-white"
          >
            <Download className="w-4 h-4" />
            {lang === "ar" ? "تنزيل SVG" : "Download SVG"}
          </Button>
        </div>

        {/* Floor Plans */}
        {floors.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">{t(lang, "floorPlan")}</h2>
            </div>
            <div ref={svgRef} className="space-y-4">
              {floors.map(floor => (
                <div key={floor} className="blueprint-card cad-corner rounded-xl overflow-hidden">
                  <div className="px-4 py-2 border-b border-border/40 flex items-center justify-between">
                    <span className="dimension-marker text-blue-400">
                      {floor === 0
                        ? t(lang, "groundFloor")
                        : `${t(lang, "floor")} ${floor}`}
                    </span>
                    <span className="dimension-marker text-slate-500">
                      {spaces.filter(s => s.floor === floor).length} {lang === "ar" ? "مساحة" : "spaces"}
                    </span>
                  </div>
                  <div className="p-4" style={{ background: "oklch(0.09 0.04 240)" }}>
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
            <div className="blueprint-card cad-corner rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-blue-400">
                <FileText className="w-5 h-5" />
                <span className="font-bold">{t(lang, "summary")}</span>
              </div>
              <div className="space-y-2 text-sm">
                {summary.totalFloors && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "ar" ? "عدد الطوابق" : "Total Floors"}</span>
                    <span className="text-white font-mono">{summary.totalFloors}</span>
                  </div>
                )}
                {summary.totalRooms && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "ar" ? "عدد الغرف" : "Total Rooms"}</span>
                    <span className="text-white font-mono">{summary.totalRooms}</span>
                  </div>
                )}
                {summary.totalArea && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t(lang, "totalArea")}</span>
                    <span className="text-white font-mono">{summary.totalArea} m²</span>
                  </div>
                )}
                {summary.parkingSpaces !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "ar" ? "مواقف" : "Parking"}</span>
                    <span className="text-white font-mono">{summary.parkingSpaces}</span>
                  </div>
                )}
                {summary.estimatedCost && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t(lang, "estimatedCost")}</span>
                    <span className="text-emerald-300 font-mono text-xs">{summary.estimatedCost}</span>
                  </div>
                )}
                {summary.constructionDuration && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t(lang, "constructionDuration")}</span>
                    <span className="text-white text-xs">{summary.constructionDuration}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regulatory Compliance */}
          {compliance && Object.keys(compliance).length > 0 && (
            <div className="blueprint-card cad-corner rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-white">{t(lang, "regulatoryCompliance")}</span>
                {compliance.isCompliant ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 ms-auto" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 ms-auto" />
                )}
              </div>
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${compliance.isCompliant ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-red-500/15 text-red-300 border border-red-500/30"}`}>
                {compliance.isCompliant ? t(lang, "compliant") : t(lang, "nonCompliant")}
              </div>
              <div className="space-y-2 text-sm">
                {compliance.buildingFootprint && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "ar" ? "بصمة المبنى" : "Building Footprint"}</span>
                    <span className="text-white font-mono">{compliance.buildingFootprint} m²</span>
                  </div>
                )}
                {compliance.actualCoverageRatio && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "ar" ? "نسبة التغطية" : "Coverage Ratio"}</span>
                    <span className="text-white font-mono">{compliance.actualCoverageRatio}%</span>
                  </div>
                )}
              </div>
              {compliance.complianceNotes && compliance.complianceNotes.length > 0 && (
                <div className="space-y-1">
                  {(lang === "ar" ? compliance.complianceNotesAr : compliance.complianceNotes)?.map((note: string, i: number) => (
                    <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Concept Description */}
        {description && (
          <div className="blueprint-card cad-corner rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <FileText className="w-5 h-5" />
              <span className="font-bold">{t(lang, "conceptDescription")}</span>
            </div>
            <div className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">
              {description}
            </div>
          </div>
        )}

        {/* Spaces Table */}
        {spaces.length > 0 && (
          <div className="mt-6 blueprint-card cad-corner rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-white">{t(lang, "spaces")}</span>
              <span className="dimension-marker text-slate-500">({spaces.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-3 text-start text-slate-400 font-medium">{lang === "ar" ? "الاسم" : "Name"}</th>
                    <th className="px-4 py-3 text-start text-slate-400 font-medium">{lang === "ar" ? "الطابق" : "Floor"}</th>
                    <th className="px-4 py-3 text-start text-slate-400 font-medium">{lang === "ar" ? "الأبعاد" : "Dimensions"}</th>
                    <th className="px-4 py-3 text-start text-slate-400 font-medium">{lang === "ar" ? "المساحة" : "Area"}</th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((space, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white">
                        {lang === "ar" ? (space.nameAr || space.name) : space.name}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {space.floor === 0 ? (lang === "ar" ? "أرضي" : "G") : space.floor}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono">
                        {space.width && space.length ? `${space.width} × ${space.length} m` : "-"}
                      </td>
                      <td className="px-4 py-3 text-blue-300 font-mono">
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
