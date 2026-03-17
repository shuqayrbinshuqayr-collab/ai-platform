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

// ─── AutoCAD-style room fills ────────────────────────────────────────────────
const ROOM_HATCH_MINI: Record<string, string> = {
  bedroom: "#EEF2FF", master_bedroom: "#FFF7ED", living: "#F0FDF4",
  family_living: "#F0FDF4", majlis: "#FFFBEB", kitchen: "#ECFDF5",
  bathroom: "#EFF6FF", toilet: "#EFF6FF", dining: "#FFF1F2",
  corridor: "#F8FAFC", distributor: "#F8FAFC", entrance: "#FFFBEB",
  parking: "#F1F5F9", storage: "#F8FAFC", balcony: "#F0FDF4",
  laundry: "#EFF6FF", maid_room: "#FDF4FF", office: "#EEF2FF",
  prayer: "#FFFBEB", staircase: "#F1F5F9", other: "#F8FAFC",
};
const MINI_HAS_DOOR = new Set(["bedroom","master_bedroom","living","family_living","majlis","kitchen","dining","bathroom","toilet","maid_room","office","prayer","entrance","storage","laundry","corridor","distributor"]);
const MINI_HAS_WIN  = new Set(["bedroom","master_bedroom","living","family_living","majlis","kitchen","dining","balcony","office","prayer"]);

// ─── Mini floor plan SVG — AutoCAD style ─────────────────────────────────────
function MiniFloorPlan({ spaces, floor, bspLayout }: { spaces: any[]; floor: number; bspLayout?: any }) {
  const floorSpaces = (spaces ?? []).filter((s) => (s.floor ?? 0) === floor);
  if (floorSpaces.length === 0) return null;

  const SVG_W = 220;
  const SVG_H = 180;
  const PAD = 10;
  const innerW = SVG_W - PAD * 2;
  const innerH = SVG_H - PAD * 2;

  const hasBSPCoords = bspLayout?.buildingWidth && floorSpaces[0]?.width !== undefined;
  const bldW = bspLayout?.buildingWidth ?? 10;
  const bldH = bspLayout?.buildingDepth ?? 20;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#FFFFFF" }}
    >
      <defs>
        <pattern id={`grid-mini-${floor}`} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#E5E7EB" strokeWidth="0.3" />
        </pattern>
        <pattern id={`hatch-mini-${floor}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#D1D5DB" strokeWidth="0.8"/>
        </pattern>
      </defs>

      {/* White background */}
      <rect width={SVG_W} height={SVG_H} fill="#FFFFFF"/>
      {/* Grid */}
      <rect x={PAD} y={PAD} width={innerW} height={innerH} fill={`url(#grid-mini-${floor})`}/>

      {/* Rooms */}
      {floorSpaces.map((space, i) => {
        let x: number, y: number, w: number, h: number;
        if (hasBSPCoords && space.width !== undefined) {
          const scaleX = innerW / bldW;
          const scaleY = innerH / bldH;
          x = PAD + (space.x ?? 0) * scaleX;
          y = PAD + (space.y ?? 0) * scaleY;
          w = Math.max((space.width ?? 3) * scaleX, 4);
          h = Math.max((space.height ?? 3) * scaleY, 4);
        } else {
          x = PAD + ((space.x ?? 0) / 100) * innerW;
          y = PAD + ((space.y ?? 0) / 100) * innerH;
          w = Math.max(((space.w ?? 10) / 100) * innerW, 4);
          h = Math.max(((space.h ?? 10) / 100) * innerH, 4);
        }
        const type = space.type ?? "other";
        const fill = type === "balcony" ? `url(#hatch-mini-${floor})` : (ROOM_HATCH_MINI[type] ?? "#F8FAFC");
        const cx = x + w / 2;
        const cy = y + h / 2;
        const area = space.area ?? (space.width && space.height ? (space.width * space.height).toFixed(1) : null);
        const WALL = 2;   // wall thickness
        const HW = WALL / 2;

        // Door size
        const dw = Math.min(w * 0.35, 20);
        // Window size
        const ww = Math.min(w * 0.4, 25);

        // Door placement
        const doorOnLeft = ["majlis","family_living","living"].includes(type);
        const doorOnTop  = ["balcony"].includes(type);

        return (
          <g key={i}>
            {/* Room fill */}
            <rect x={x} y={y} width={w} height={h} fill={fill}/>

            {/* Outer thick wall */}
            <rect x={x-HW} y={y-HW} width={w+WALL} height={h+WALL}
              fill="none" stroke="#1A1A1A" strokeWidth={WALL}/>
            {/* Inner thin wall line */}
            <rect x={x+HW} y={y+HW} width={w-WALL} height={h-WALL}
              fill="none" stroke="#4B5563" strokeWidth="0.4"/>

            {/* Staircase lines */}
            {type === "staircase" && (() => {
              const steps = Math.max(3, Math.floor(h / 10));
              return Array.from({length: steps}).map((_,si) => (
                <line key={si} x1={x+2} y1={y + si*(h/steps)} x2={x+w-2} y2={y + si*(h/steps)}
                  stroke="#9CA3AF" strokeWidth="0.5"/>
              ));
            })()}

            {/* Window symbol (right wall) */}
            {MINI_HAS_WIN.has(type) && w > 20 && h > 15 && (() => {
              if (doorOnTop || ["majlis","living","family_living"].includes(type)) {
                // window on top
                const wx = x + w/2 - ww/2;
                return (
                  <g>
                    <rect x={wx} y={y-HW} width={ww} height={WALL} fill="#FFFFFF" stroke="none"/>
                    <line x1={wx} y1={y-HW} x2={wx+ww} y2={y-HW} stroke="#1A1A1A" strokeWidth="0.5"/>
                    <line x1={wx} y1={y} x2={wx+ww} y2={y} stroke="#6B9AC4" strokeWidth="0.8"/>
                    <line x1={wx} y1={y+HW} x2={wx+ww} y2={y+HW} stroke="#1A1A1A" strokeWidth="0.5"/>
                  </g>
                );
              }
              // window on right wall
              const wh2 = Math.min(h * 0.4, 20);
              const wy = y + h * 0.25;
              return (
                <g>
                  <rect x={x+w-HW} y={wy} width={WALL} height={wh2} fill="#FFFFFF" stroke="none"/>
                  <line x1={x+w-HW} y1={wy} x2={x+w-HW} y2={wy+wh2} stroke="#1A1A1A" strokeWidth="0.5"/>
                  <line x1={x+w} y1={wy} x2={x+w} y2={wy+wh2} stroke="#6B9AC4" strokeWidth="0.8"/>
                  <line x1={x+w+HW} y1={wy} x2={x+w+HW} y2={wy+wh2} stroke="#1A1A1A" strokeWidth="0.5"/>
                </g>
              );
            })()}

            {/* Door symbol */}
            {MINI_HAS_DOOR.has(type) && w > 18 && h > 18 && (() => {
              if (doorOnTop) {
                const dx = x + w/2 - dw/2;
                return (
                  <g stroke="#1A1A1A" strokeWidth="0.7" fill="none">
                    <rect x={dx} y={y-HW} width={dw} height={WALL} fill="#FFFFFF" stroke="none"/>
                    <line x1={dx} y1={y} x2={dx} y2={y-dw}/>
                    <path d={`M ${dx} ${y} A ${dw} ${dw} 0 0 1 ${dx+dw} ${y}`} strokeDasharray="2,1.5"/>
                  </g>
                );
              } else if (doorOnLeft) {
                const dy = y + h/2 - dw/2;
                return (
                  <g stroke="#1A1A1A" strokeWidth="0.7" fill="none">
                    <rect x={x-HW} y={dy} width={WALL} height={dw} fill="#FFFFFF" stroke="none"/>
                    <line x1={x} y1={dy} x2={x+dw} y2={dy}/>
                    <path d={`M ${x} ${dy} A ${dw} ${dw} 0 0 0 ${x} ${dy+dw}`} strokeDasharray="2,1.5"/>
                  </g>
                );
              } else {
                // door on bottom wall
                const dx = x + w/2 - dw/2;
                return (
                  <g stroke="#1A1A1A" strokeWidth="0.7" fill="none">
                    <rect x={dx} y={y+h-HW} width={dw} height={WALL} fill="#FFFFFF" stroke="none"/>
                    <line x1={dx} y1={y+h} x2={dx} y2={y+h-dw}/>
                    <path d={`M ${dx} ${y+h} A ${dw} ${dw} 0 0 0 ${dx+dw} ${y+h}`} strokeDasharray="2,1.5"/>
                  </g>
                );
              }
            })()}

            {/* Room label */}
            {w > 25 && h > 14 && (
              <>
                <text x={cx} y={cy - (area ? 4 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#111827" fontSize="5.5"
                  fontFamily="'Cairo',Arial,sans-serif" fontWeight="700">
                  {(space.nameAr ?? space.name ?? "").substring(0, 12)}
                </text>
                {area && (
                  <text x={cx} y={cy + 5}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#6B7280" fontSize="4.5" fontFamily="monospace">
                    {parseFloat(area).toFixed(1)}m²
                  </text>
                )}
              </>
            )}

            {/* Mini cotes */}
            {w > 40 && (() => {
              const wm = hasBSPCoords && space.width ? space.width : ((space.w ?? 0) / 100) * bldW;
              if (wm <= 0) return null;
              const lx1 = x + 3; const lx2 = x + w - 3;
              const ly = y + h - 5;
              const mx = (lx1 + lx2) / 2;
              return (
                <g>
                  <line x1={lx1} y1={ly} x2={lx2} y2={ly} stroke="#374151" strokeWidth="0.5"/>
                  <polygon points={`${lx1},${ly} ${lx1+3},${ly-1.5} ${lx1+3},${ly+1.5}`} fill="#374151"/>
                  <polygon points={`${lx2},${ly} ${lx2-3},${ly-1.5} ${lx2-3},${ly+1.5}`} fill="#374151"/>
                  <rect x={mx-8} y={ly-4} width="16" height="7" fill="#FFFFFF"/>
                  <text x={mx} y={ly} textAnchor="middle" dominantBaseline="middle"
                    fill="#374151" fontSize="4" fontFamily="monospace" fontWeight="600">
                    {wm.toFixed(1)}م
                  </text>
                </g>
              );
            })()}
            {h > 35 && (() => {
              const hm = hasBSPCoords && space.height ? space.height : ((space.h ?? 0) / 100) * bldH;
              if (hm <= 0) return null;
              const lx = x + w - 5;
              const ly1 = y + 3; const ly2 = y + h - 3;
              const my = (ly1 + ly2) / 2;
              return (
                <g>
                  <line x1={lx} y1={ly1} x2={lx} y2={ly2} stroke="#374151" strokeWidth="0.5"/>
                  <polygon points={`${lx},${ly1} ${lx-1.5},${ly1+3} ${lx+1.5},${ly1+3}`} fill="#374151"/>
                  <polygon points={`${lx},${ly2} ${lx-1.5},${ly2-3} ${lx+1.5},${ly2-3}`} fill="#374151"/>
                  <rect x={lx-4} y={my-8} width="7" height="16" fill="#FFFFFF"/>
                  <text x={lx} y={my} textAnchor="middle" dominantBaseline="middle"
                    fill="#374151" fontSize="4" fontFamily="monospace" fontWeight="600"
                    transform={`rotate(-90,${lx},${my})`}>
                    {hm.toFixed(1)}م
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* Outer building boundary — thick black */}
      <rect x={PAD} y={PAD} width={innerW} height={innerH} fill="none" stroke="#000000" strokeWidth="2.5" />

      {/* Floor label bar */}
      <rect x="0" y={SVG_H - 14} width={SVG_W} height="14" fill="#F9FAFB"/>
      <line x1="0" y1={SVG_H - 14} x2={SVG_W} y2={SVG_H - 14} stroke="#D1D5DB" strokeWidth="0.5"/>
      <text
        x="6" y={SVG_H - 5}
        fill="#374151" fontSize="6"
        fontFamily="'Share Tech Mono', monospace" fontWeight="600"
      >
        {floor === 0 ? "الدور الأرضي" : `الدور ${floor}`}  |  {bldW.toFixed(1)}م × {bldH.toFixed(1)}م
      </text>
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
