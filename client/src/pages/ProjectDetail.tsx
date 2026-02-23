import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import {
  Zap, MapPin, Ruler, Building2, ArrowLeft, ArrowRight,
  Loader2, FileText, CheckCircle, XCircle, Clock, Layers
} from "lucide-react";
import { useState } from "react";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const [generating, setGenerating] = useState(false);

  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });
  const { data: blueprints } = trpc.blueprints.listByProject.useQuery({ projectId });

  const generateMutation = trpc.blueprints.generate.useMutation({
    onSuccess: (data) => {
      toast.success(lang === "ar" ? "تم توليد المخطط بنجاح!" : "Blueprint generated successfully!");
      utils.blueprints.listByProject.invalidate({ projectId });
      utils.projects.get.invalidate({ id: projectId });
      navigate(`/blueprints/${data.blueprintId}`);
    },
    onError: (err) => {
      toast.error(err.message);
      setGenerating(false);
    },
    onSettled: () => setGenerating(false),
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="text-slate-400">{lang === "ar" ? "المشروع غير موجود" : "Project not found"}</div>
      </div>
    );
  }

  const buildingTypeLabel = (type: string | null) => {
    if (!type) return "-";
    return t(lang, type as any) || type;
  };

  const statusClass = {
    draft: "status-draft",
    processing: "status-processing",
    completed: "status-completed",
    archived: "status-archived",
  }[project.status] ?? "status-draft";

  return (
    <div className="min-h-screen pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
        >
          <BackIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">{t(lang, "myProjects")}</span>
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="dimension-marker text-blue-400">// PROJECT DETAIL //</div>
            <h1 className="text-3xl font-black text-white">{project.name}</h1>
            {project.description && (
              <p className="text-slate-400">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {t(lang, project.status as any)}
            </span>
          </div>
        </div>

        {/* Data Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Land Data */}
          <div className="blueprint-card cad-corner rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <MapPin className="w-5 h-5" />
              <span className="font-bold text-sm">{t(lang, "landData")}</span>
            </div>
            <div className="space-y-2 text-sm">
              {project.landArea && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{t(lang, "landArea")}</span>
                  <span className="text-white font-mono">{project.landArea} m²</span>
                </div>
              )}
              {project.landWidth && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{t(lang, "landWidth")}</span>
                  <span className="text-white font-mono">{project.landWidth} m</span>
                </div>
              )}
              {project.landLength && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{t(lang, "landLength")}</span>
                  <span className="text-white font-mono">{project.landLength} m</span>
                </div>
              )}
              {project.landShape && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{t(lang, "landShape")}</span>
                  <span className="text-white">{t(lang, project.landShape as any)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Regulatory */}
          <div className="blueprint-card cad-corner rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Ruler className="w-5 h-5" />
              <span className="font-bold text-sm">{t(lang, "regulatoryConstraints")}</span>
            </div>
            <div className="space-y-2 text-sm">
              {project.buildingRatio && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "نسبة البناء" : "Coverage"}</span>
                  <span className="text-white font-mono">{project.buildingRatio}%</span>
                </div>
              )}
              {project.maxFloors && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "الحد الأقصى" : "Max Floors"}</span>
                  <span className="text-white font-mono">{project.maxFloors}</span>
                </div>
              )}
              {project.frontSetback && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "إرتداد أمامي" : "Front"}</span>
                  <span className="text-white font-mono">{project.frontSetback}m</span>
                </div>
              )}
              {project.sideSetback && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "إرتداد جانبي" : "Side"}</span>
                  <span className="text-white font-mono">{project.sideSetback}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="blueprint-card cad-corner rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Building2 className="w-5 h-5" />
              <span className="font-bold text-sm">{t(lang, "userRequirements")}</span>
            </div>
            <div className="space-y-2 text-sm">
              {project.buildingType && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "النوع" : "Type"}</span>
                  <span className="text-white">{buildingTypeLabel(project.buildingType)}</span>
                </div>
              )}
              {project.numberOfRooms && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "الغرف" : "Rooms"}</span>
                  <span className="text-white font-mono">{project.numberOfRooms}</span>
                </div>
              )}
              {project.numberOfFloors && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "الطوابق" : "Floors"}</span>
                  <span className="text-white font-mono">{project.numberOfFloors}</span>
                </div>
              )}
              {project.parkingSpaces !== null && project.parkingSpaces !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "ar" ? "مواقف" : "Parking"}</span>
                  <span className="text-white font-mono">{project.parkingSpaces}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Blueprint Button */}
        <div className="blueprint-card cad-corner rounded-xl p-8 mb-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {lang === "ar" ? "توليد المخطط المعماري بالذكاء الاصطناعي" : "Generate AI Architectural Blueprint"}
          </h2>
          <p className="text-slate-400 max-w-md mx-auto text-sm">
            {lang === "ar"
              ? "سيقوم الذكاء الاصطناعي بتحليل جميع البيانات المدخلة وتوليد مخطط معماري أولي متوافق مع الاشتراطات التنظيمية"
              : "AI will analyze all entered data and generate a preliminary architectural blueprint compliant with regulatory requirements"}
          </p>
          <Button
            size="lg"
            onClick={() => {
              setGenerating(true);
              generateMutation.mutate({ projectId, lang });
            }}
            disabled={generating || project.status === "processing"}
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-3 glow-blue px-10"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t(lang, "generating")}
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                {t(lang, "generate")}
              </>
            )}
          </Button>
          {generating && (
            <p className="text-blue-400/70 text-sm dimension-marker animate-pulse">
              {lang === "ar" ? "قد يستغرق هذا 15-30 ثانية..." : "This may take 15-30 seconds..."}
            </p>
          )}
        </div>

        {/* Previous Blueprints */}
        {blueprints && blueprints.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">
                {lang === "ar" ? "المخططات السابقة" : "Previous Blueprints"}
              </h2>
              <span className="dimension-marker text-slate-500">({blueprints.length})</span>
            </div>
            <div className="space-y-3">
              {blueprints.map((bp) => (
                <div key={bp.id} className="blueprint-card rounded-lg p-4 flex items-center justify-between gap-4 hover:border-blue-400/40 transition-all">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">{bp.title || `Blueprint #${bp.id}`}</div>
                      <div className="text-slate-400 text-xs dimension-marker">
                        {new Date(bp.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                        {bp.generationTime && ` · ${(bp.generationTime / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/blueprints/${bp.id}`)}
                    className="border-border/60 text-slate-300 hover:text-white gap-2"
                  >
                    {t(lang, "viewBlueprint")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
