import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import {
  Brain, CheckCircle, Loader2, ArrowLeft, ArrowRight,
  Zap, AlertTriangle, Home as HomeIcon, Building2,
  Layers, Ruler, Clock, ChevronRight, Star
} from "lucide-react";

// ─── Room color map ───────────────────────────────────────────────────────
const ROOM_COLORS: Record<string, string> = {
  bedroom: "oklch(0.70 0.19 45 / 0.18)",
  living: "oklch(0.65 0.15 200 / 0.18)",
  kitchen: "oklch(0.65 0.18 145 / 0.18)",
  bathroom: "oklch(0.60 0.15 280 / 0.18)",
  office: "oklch(0.65 0.18 60 / 0.18)",
  parking: "oklch(0.35 0.05 240 / 0.22)",
  corridor: "oklch(0.30 0.05 240 / 0.15)",
  balcony: "oklch(0.65 0.18 120 / 0.18)",
  storage: "oklch(0.40 0.08 240 / 0.15)",
  lobby: "oklch(0.65 0.20 180 / 0.18)",
  majlis: "oklch(0.70 0.19 45 / 0.22)",
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

// ─── Mini floor plan SVG ──────────────────────────────────────────────────
function MiniFloorPlan({ spaces, floor }: { spaces: any[]; floor: number }) {
  const floorSpaces = (spaces ?? []).filter((s) => s.floor === floor);
  if (floorSpaces.length === 0) return null;
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`grid-mini-${floor}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="oklch(0.70 0.19 45 / 0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="160" fill={`url(#grid-mini-${floor})`} />
      <rect x="10" y="10" width="180" height="140" fill="none" stroke="oklch(0.70 0.19 45 / 0.5)" strokeWidth="1.5" />
      {floorSpaces.map((space, i) => {
        const x = 10 + (space.x / 100) * 180;
        const y = 10 + (space.y / 100) * 140;
        const w = (space.w / 100) * 180;
        const h = (space.h / 100) * 140;
        const fill = ROOM_COLORS[space.type] ?? ROOM_COLORS.other;
        const stroke = ROOM_STROKE[space.type] ?? ROOM_STROKE.other;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth="1" />
            {w > 25 && h > 15 && (
              <text
                x={x + w / 2}
                y={y + h / 2 + 3}
                textAnchor="middle"
                fontSize="6"
                fill="oklch(0.90 0.05 45)"
                fontFamily="monospace"
              >
                {space.nameAr ?? space.name ?? ""}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Blueprint Card ───────────────────────────────────────────────────────
function BlueprintCard({
  blueprint,
  isSelected,
  onSelect,
  lang,
}: {
  blueprint: any;
  isSelected: boolean;
  onSelect: () => void;
  lang: string;
}) {
  const data = blueprint.structuredData ?? {};
  const spaces = data.spaces ?? [];
  const summary = data.summary ?? {};
  const compliance = data.regulatoryCompliance ?? {};
  const highlights = lang === "ar" ? (data.highlightsAr ?? data.highlights ?? []) : (data.highlights ?? []);
  const title = lang === "ar" ? (data.titleAr ?? blueprint.title) : (blueprint.title ?? data.title);
  const floors = summary.totalFloors ?? 1;
  const floorNumbers = Array.from({ length: floors }, (_, i) => i);

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? "border-primary bg-primary/8 shadow-[0_0_24px_oklch(0.70_0.19_45_/_0.25)]"
          : "border-border/40 bg-card/60 hover:border-primary/40 hover:bg-card/80"
      }`}
      onClick={onSelect}
    >
      {/* Selected badge */}
      {isSelected && (
        <div className="absolute top-3 end-3 z-10 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" />
          {lang === "ar" ? "مختار" : "Selected"}
        </div>
      )}

      {/* Concept index badge */}
      <div className="absolute top-3 start-3 z-10 bg-background/80 border border-border/60 text-xs font-mono text-primary px-2 py-0.5 rounded-md">
        #{blueprint.conceptIndex ?? "?"}
      </div>

      {/* Floor plan preview */}
      <div className="bg-background/40 border-b border-border/30 p-3" style={{ height: 140 }}>
        {spaces.length > 0 ? (
          <MiniFloorPlan spaces={spaces} floor={0} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-foreground text-sm leading-tight">{title}</h3>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: lang === "ar" ? "الأدوار" : "Floors", value: summary.totalFloors ?? "—" },
            { label: lang === "ar" ? "الغرف" : "Rooms", value: summary.totalRooms ?? "—" },
            { label: lang === "ar" ? "المساحة" : "Area", value: summary.totalArea ? `${summary.totalArea}م²` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-secondary/30 rounded-lg py-1.5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xs font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {/* Compliance */}
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
          compliance.isCompliant !== false
            ? "bg-green-500/10 text-green-400 border border-green-500/20"
            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
        }`}>
          {compliance.isCompliant !== false ? (
            <CheckCircle className="w-3 h-3 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          )}
          {compliance.isCompliant !== false
            ? (lang === "ar" ? "متوافق مع الكود السعودي" : "Saudi Code Compliant")
            : (lang === "ar" ? "يحتاج مراجعة" : "Needs Review")}
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <ul className="space-y-1">
            {highlights.slice(0, 3).map((h: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Star className="w-2.5 h-2.5 text-primary flex-shrink-0 mt-0.5" />
                {h}
              </li>
            ))}
          </ul>
        )}

        {/* Cost */}
        {summary.estimatedCost && (
          <div className="text-xs text-primary font-mono border-t border-border/30 pt-2">
            {lang === "ar" ? "التكلفة التقديرية: " : "Est. Cost: "}{summary.estimatedCost}
          </div>
        )}

        {/* Floor tabs */}
        {floors > 1 && (
          <div className="flex gap-1 flex-wrap">
            {floorNumbers.map((f) => (
              <span key={f} className="text-xs bg-secondary/40 text-muted-foreground px-2 py-0.5 rounded font-mono">
                {lang === "ar" ? `الدور ${f === 0 ? "الأرضي" : f}` : `Floor ${f === 0 ? "G" : f}`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Select button */}
      <div className="px-4 pb-4">
        <Button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`w-full text-xs font-bold h-8 ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 text-foreground hover:bg-primary hover:text-primary-foreground border border-border/40"
          }`}
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected
            ? (lang === "ar" ? "✓ هذا هو اختياري" : "✓ This is my choice")
            : (lang === "ar" ? "اختر هذا المخطط" : "Select This Blueprint")}
        </Button>
      </div>
    </div>
  );
}

// ─── Loading animation ────────────────────────────────────────────────────
function GeneratingAnimation({ lang, step }: { lang: string; step: number }) {
  const steps = lang === "ar"
    ? [
        "جاري التحقق من اشتراطات البلدية...",
        "تطبيق الكود المعماري السعودي تلقائياً...",
        "توليد المفهوم المعماري الأول...",
        "توليد المفهوم الثاني والثالث...",
        "توليد المفاهيم الرابع والخامس والسادس...",
        "مراجعة الامتثال التنظيمي...",
        "تجهيز عرض المخططات...",
      ]
    : [
        "Checking municipality requirements...",
        "Applying Saudi Building Code automatically...",
        "Generating concept #1...",
        "Generating concepts #2 and #3...",
        "Generating concepts #4, #5, and #6...",
        "Reviewing regulatory compliance...",
        "Preparing blueprint display...",
      ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Animated logo */}
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Brain className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full animate-ping opacity-60" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-foreground">
          {lang === "ar" ? "SOAR.AI يعمل..." : "SOAR.AI is working..."}
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          {lang === "ar"
            ? "يتم توليد 6 مخططات معمارية متنوعة بناءً على متطلباتك والكود السعودي"
            : "Generating 6 diverse architectural concepts based on your requirements and Saudi Code"}
        </p>
      </div>

      {/* Progress steps */}
      <div className="w-full max-w-md space-y-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
              i < step
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : i === step
                ? "bg-primary/10 border border-primary/30 text-primary"
                : "bg-secondary/20 border border-border/20 text-muted-foreground/40"
            }`}
          >
            {i < step ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : i === step ? (
              <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-current/30 flex-shrink-0" />
            )}
            {s}
          </div>
        ))}
      </div>

      {/* Time estimate */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        {lang === "ar" ? "يستغرق عادةً 30-60 ثانية" : "Usually takes 30-60 seconds"}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function GenerateBlueprints() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [phase, setPhase] = useState<"generating" | "selecting" | "done">("generating");
  const [animStep, setAnimStep] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<number | null>(null);
  const [codeWarnings, setCodeWarnings] = useState<string[]>([]);

  const { data: project } = trpc.projects.get.useQuery({ id: projectId });

  const { data: batchBlueprints } = trpc.blueprints.listByBatch.useQuery(
    { batchId: batchId! },
    { enabled: !!batchId, refetchInterval: false }
  );

  const generate6 = trpc.blueprints.generate6.useMutation({
    onSuccess: (data) => {
      setBatchId(data.batchId);
      setCodeWarnings(lang === "ar" ? data.codeWarnings : data.codeWarningsEn);
      setPhase("selecting");
    },
    onError: (err) => {
      toast.error(err.message);
      navigate(`/projects/${projectId}`);
    },
  });

  const selectMutation = trpc.blueprints.select.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم اختيار المخطط بنجاح!" : "Blueprint selected successfully!");
      utils.blueprints.listByProject.invalidate({ projectId });
      utils.projects.get.invalidate({ id: projectId });
      setPhase("done");
      setTimeout(() => navigate(`/blueprints/${selectedBlueprintId}`), 800);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-start generation on mount
  useEffect(() => {
    if (projectId > 0) {
      generate6.mutate({ projectId, lang: lang as "ar" | "en" });
    }
  }, [projectId]);

  // Animate loading steps
  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setAnimStep((s) => Math.min(s + 1, 6));
    }, 5000);
    return () => clearInterval(interval);
  }, [phase]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handleSelectBlueprint = (blueprintId: number) => {
    setSelectedBlueprintId(blueprintId);
  };

  const handleConfirmSelection = () => {
    if (!selectedBlueprintId) {
      toast.error(lang === "ar" ? "الرجاء اختيار مخطط أولاً" : "Please select a blueprint first");
      return;
    }
    selectMutation.mutate({ blueprintId: selectedBlueprintId, projectId });
  };

  return (
    <div className="min-h-screen pt-16 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-7xl">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <BackIcon className="w-4 h-4" />
            {lang === "ar" ? "لوحة التحكم" : "Dashboard"}
          </button>
          {project && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              <span className="text-foreground font-semibold text-sm">{project.name}</span>
            </>
          )}
          {phase === "selecting" && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              <span className="text-primary font-semibold text-sm">
                {lang === "ar" ? "اختر المخطط المناسب" : "Select Blueprint"}
              </span>
            </>
          )}
        </div>

        {/* ─── GENERATING PHASE ─── */}
        {phase === "generating" && (
          <GeneratingAnimation lang={lang} step={animStep} />
        )}

        {/* ─── SELECTING PHASE ─── */}
        {phase === "selecting" && batchBlueprints && (
          <div className="space-y-6">
            {/* Title */}
            <div className="text-center space-y-2">
              <div className="text-xs text-primary font-mono opacity-70">// 6 ARCHITECTURAL CONCEPTS //</div>
              <h1 className="text-3xl font-black text-foreground">
                {lang === "ar" ? "اختر المخطط الأنسب لمشروعك" : "Choose the Best Blueprint for Your Project"}
              </h1>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                {lang === "ar"
                  ? "تم توليد 6 مفاهيم معمارية متنوعة — كل مخطط تم التحقق منه تلقائياً وفق الكود السعودي"
                  : "6 diverse architectural concepts generated — each verified automatically against Saudi Building Code"}
              </p>
            </div>

            {/* Code warnings hidden — processed silently in backend */}

            {/* Project summary strip */}
            {project && (
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  { icon: HomeIcon, label: lang === "ar" ? "نوع المبنى" : "Type", value: project.buildingType === "villa" ? (lang === "ar" ? "فيلا سكنية" : "Villa") : (lang === "ar" ? "مبنى سكني" : "Residential") },
                  { icon: Ruler, label: lang === "ar" ? "المساحة" : "Area", value: `${project.landArea ?? "—"} م²` },
                  { icon: Building2, label: lang === "ar" ? "الأدوار" : "Floors", value: project.numberOfFloors ?? "—" },
                  { icon: Zap, label: lang === "ar" ? "الحي" : "District", value: project.neighborhoodName ?? (lang === "ar" ? "الرياض" : "Riyadh") },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 bg-secondary/30 border border-border/40 rounded-lg px-3 py-1.5 text-xs">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="text-foreground font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Blueprint grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {batchBlueprints.map((bp) => (
                <BlueprintCard
                  key={bp.id}
                  blueprint={bp}
                  isSelected={selectedBlueprintId === bp.id}
                  onSelect={() => handleSelectBlueprint(bp.id)}
                  lang={lang}
                />
              ))}
            </div>

            {/* Confirm button */}
            <div className="flex flex-col items-center gap-3 pt-4">
              {selectedBlueprintId && (
                <p className="text-sm text-primary font-semibold">
                  {lang === "ar"
                    ? `✓ اخترت المخطط #${batchBlueprints.find(b => b.id === selectedBlueprintId)?.conceptIndex ?? "?"}`
                    : `✓ Selected Concept #${batchBlueprints.find(b => b.id === selectedBlueprintId)?.conceptIndex ?? "?"}`}
                </p>
              )}
              <Button
                onClick={handleConfirmSelection}
                disabled={!selectedBlueprintId || selectMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base px-10 py-6 rounded-xl glow-orange"
              >
                {selectMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin me-2" />{lang === "ar" ? "جاري الحفظ..." : "Saving..."}</>
                ) : (
                  <><CheckCircle className="w-5 h-5 me-2" />{lang === "ar" ? "تأكيد الاختيار وعرض المخطط الكامل" : "Confirm & View Full Blueprint"}</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "يمكنك العودة وتوليد 6 مخططات جديدة في أي وقت" : "You can return and generate 6 new concepts anytime"}
              </p>
            </div>
          </div>
        )}

        {/* ─── DONE PHASE ─── */}
        {phase === "done" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-foreground">
              {lang === "ar" ? "تم! جاري الانتقال للمخطط..." : "Done! Redirecting to blueprint..."}
            </h2>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
