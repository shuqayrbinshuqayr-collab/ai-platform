import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import {
  Zap, MapPin, Ruler, Building2, ArrowLeft, ArrowRight,
  Loader2, FileText, Layers, Brain, CheckCircle, Clock,
  Home as HomeIcon, Car, Droplets, ChefHat, Sofa
} from "lucide-react";

function parseRoomData(additionalReqs: string | null | undefined) {
  if (!additionalReqs) return {};
  const result: Record<string, number> = {};
  additionalReqs.split("|").forEach(part => {
    const [key, val] = part.split(":");
    if (key && val && !isNaN(parseInt(val))) {
      result[key] = parseInt(val);
    }
  });
  return result;
}

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });
  const { data: blueprints } = trpc.blueprints.listByProject.useQuery({ projectId });

  // Navigate to generate6 page instead of calling generate directly
  const handleGenerate6 = () => {
    navigate(`/projects/${projectId}/generate`);
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="text-muted-foreground">{lang === "ar" ? "المشروع غير موجود" : "Project not found"}</div>
      </div>
    );
  }

  const rooms = parseRoomData(project.additionalRequirements);
  const facadeStyle = rooms["facadeStyle"] || "modern";

  const statusColors: Record<string, string> = {
    draft: "bg-secondary/50 text-muted-foreground border-border/50",
    processing: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    completed: "bg-green-500/15 text-green-400 border-green-500/30",
    archived: "bg-secondary/30 text-muted-foreground border-border/30",
  };

  const roomDisplayFields = [
    { key: "bedrooms", icon: HomeIcon, ar: "غرف النوم", en: "Bedrooms" },
    { key: "bathrooms", icon: Droplets, ar: "الحمامات", en: "Bathrooms" },
    { key: "kitchens", icon: ChefHat, ar: "المطابخ", en: "Kitchens" },
    { key: "livingRooms", icon: Sofa, ar: "الصالات", en: "Living Rooms" },
    { key: "majlis", icon: Sofa, ar: "المجالس", en: "Majlis" },
    { key: "garages", icon: Car, ar: "الكراجات", en: "Garages" },
  ].filter(({ key }) => rooms[key] && rooms[key] > 0);

  return (
    <div className="min-h-screen pt-16 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group text-sm"
        >
          <BackIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {t(lang, "myProjects")}
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <div className="text-xs text-primary font-mono opacity-70">// PROJECT DETAIL //</div>
            <h1 className="text-3xl font-black text-white">{project.name}</h1>
            {project.description && <p className="text-muted-foreground text-sm">{project.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[project.status] ?? statusColors.draft}`}>
              {t(lang, project.status as any)}
            </span>
          </div>
        </div>

        {/* Data Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Land Data */}
          <div className="soar-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-4 h-4" />
              <span className="font-bold text-sm">{t(lang, "landData")}</span>
            </div>
            <div className="space-y-2 text-xs">
              {project.landArea && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "المساحة" : "Area"}</span>
                  <span className="text-foreground font-mono font-bold">{project.landArea} m²</span>
                </div>
              )}
              {project.landWidth && project.landLength && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الأبعاد" : "Dimensions"}</span>
                  <span className="text-foreground font-mono font-bold">{project.landWidth} × {project.landLength} m</span>
                </div>
              )}
              {project.landShape && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الشكل" : "Shape"}</span>
                  <span className="text-foreground">{t(lang, project.landShape as any)}</span>
                </div>
              )}
              {project.landCoordinates && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الإحداثيات" : "Coordinates"}</span>
                  <span className="text-primary font-mono text-xs">{project.landCoordinates.substring(0, 20)}...</span>
                </div>
              )}
            </div>
          </div>

          {/* Regulatory */}
          <div className="soar-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Ruler className="w-4 h-4" />
              <span className="font-bold text-sm">{t(lang, "regulatoryConstraints")}</span>
            </div>
            <div className="space-y-2 text-xs">
              {project.buildingRatio && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "نسبة البناء" : "Coverage"}</span>
                  <span className="text-foreground font-mono font-bold">{project.buildingRatio}%</span>
                </div>
              )}
              {project.maxFloors && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الحد الأقصى للطوابق" : "Max Floors"}</span>
                  <span className="text-foreground font-mono font-bold">{project.maxFloors}</span>
                </div>
              )}
              {project.frontSetback && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "إرتداد أمامي" : "Front Setback"}</span>
                  <span className="text-foreground font-mono font-bold">{project.frontSetback}m</span>
                </div>
              )}
              {project.sideSetback && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "إرتداد جانبي" : "Side Setback"}</span>
                  <span className="text-foreground font-mono font-bold">{project.sideSetback}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="soar-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="w-4 h-4" />
              <span className="font-bold text-sm">{t(lang, "userRequirements")}</span>
            </div>
            <div className="space-y-2 text-xs">
              {project.buildingType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "النوع" : "Type"}</span>
                  <span className="text-foreground capitalize">{t(lang, project.buildingType as any) || project.buildingType}</span>
                </div>
              )}
              {project.numberOfFloors && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الطوابق" : "Floors"}</span>
                  <span className="text-foreground font-mono font-bold">{project.numberOfFloors}</span>
                </div>
              )}
              {project.numberOfRooms && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "غرف النوم" : "Bedrooms"}</span>
                  <span className="text-foreground font-mono font-bold">{project.numberOfRooms}</span>
                </div>
              )}
              {facadeStyle && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === "ar" ? "الواجهة" : "Facade"}</span>
                  <span className="text-primary font-semibold capitalize">{facadeStyle}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Room Details */}
        {roomDisplayFields.length > 0 && (
          <div className="soar-card rounded-xl p-5 mb-6">
            <div className="text-xs text-primary font-mono mb-3">// {lang === "ar" ? "تفاصيل الغرف" : "ROOM DETAILS"} //</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {roomDisplayFields.map(({ key, icon: Icon, ar, en }) => (
                <div key={key} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-secondary/30 border border-border/40">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-lg font-black text-foreground">{rooms[key]}</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">{lang === "ar" ? ar : en}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Blueprint Section */}
        <div className="soar-card rounded-xl p-8 mb-8 text-center space-y-5 border-primary/20">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              {lang === "ar" ? "توليد 6 مخططات معمارية بالذكاء الاصطناعي" : "Generate 6 AI Architectural Blueprints"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {lang === "ar"
                ? "سيقوم الذكاء الاصطناعي بتحليل جميع البيانات المدخلة وتوليد مخطط معماري أولي متوافق مع الاشتراطات التنظيمية"
                : "AI will analyze all entered data and generate a preliminary architectural blueprint compliant with regulatory requirements"}
            </p>
          </div>

          {/* 6 concept indicators */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-lg border-2 border-border/50 flex items-center justify-center text-xs font-bold text-muted-foreground"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <Button
            size="lg"
            onClick={handleGenerate6}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-3 glow-orange px-10"
          >
            <Brain className="w-5 h-5" />
            {lang === "ar" ? "توليد 6 مخططات" : "Generate 6 Blueprints"}
          </Button>
        </div>

        {/* Previous Blueprints */}
        {blueprints && blueprints.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">
                {lang === "ar" ? "المخططات المولّدة" : "Generated Blueprints"}
              </h2>
              <span className="text-xs text-muted-foreground font-mono">({blueprints.length})</span>
            </div>
            <div className="space-y-2">
              {blueprints.map((bp) => (
                <div
                  key={bp.id}
                  className="soar-card rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => navigate(`/blueprints/${bp.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-foreground font-semibold text-sm">{bp.title || `Blueprint #${bp.id}`}</div>
                      <div className="text-muted-foreground text-xs font-mono">
                        {new Date(bp.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                        {bp.generationTime && ` · ${(bp.generationTime / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 gap-1.5 text-xs"
                    >
                      {t(lang, "viewBlueprint")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
