import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import {
  FolderPlus, Layers, CheckCircle, Clock, Loader2,
  Zap, Trash2, Eye, ArrowRight, ArrowLeft, Building2,
  Crown, MapPin, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats } = trpc.stats.overview.useQuery(undefined, { enabled: isAuthenticated });
  const { data: subscription } = trpc.subscription.get.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = subscription?.plan === "solo" || subscription?.plan === "office";

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم حذف المشروع" : "Project deleted");
      utils.projects.list.invalidate();
      utils.stats.overview.invalidate();
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeletingId(null);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="soar-card rounded-2xl p-12 text-center space-y-6 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white">{lang === "ar" ? "يجب تسجيل الدخول أولاً" : "Login Required"}</h2>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => window.location.href = getLoginUrl()}>
            {t(lang, "login")}
          </Button>
        </div>
      </div>
    );
  }

  const statusClass = (status: string) => ({
    draft: "status-draft",
    processing: "status-processing",
    completed: "status-completed",
    archived: "status-archived",
  }[status] ?? "status-draft");

  const blueprintsUsed = subscription?.blueprintsUsedToday ?? 0;
  const blueprintsLimit = isPro ? null : 2;

  return (
    <div className="min-h-screen pt-16 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="text-xs text-primary font-mono opacity-70">// DASHBOARD //</div>
            <h1 className="text-3xl font-black text-white">
              {lang === "ar" ? `مرحباً، ${user?.name ?? ""}` : `Welcome, ${user?.name ?? ""}`}
            </h1>
            <p className="text-muted-foreground text-sm">
              {lang === "ar" ? "إدارة مشاريعك ومخططاتك المعمارية" : "Manage your projects and architectural blueprints"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-black text-primary">PRO</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => navigate("/pricing")}
              >
                <Crown className="w-3.5 h-3.5" />
                {lang === "ar" ? "ترقية الخطة" : "Upgrade Plan"}
              </Button>
            )}
            <Button
              onClick={() => navigate("/projects/new")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 glow-orange"
            >
              <FolderPlus className="w-4 h-4" />
              {t(lang, "newProject")}
            </Button>
          </div>
        </div>

        {/* Usage bar for free users */}
        {!isPro && (
          <div className="soar-card rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground font-semibold">
                  {lang === "ar" ? "المخططات المستخدمة اليوم" : "Blueprints used today"}
                </span>
                  <span className="text-sm font-mono text-primary">{blueprintsUsed} / {blueprintsLimit ?? "∞"}</span>
              </div>
              <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((blueprintsUsed / (blueprintsLimit ?? 2)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 flex-shrink-0"
              onClick={() => navigate("/pricing")}
            >
              <Crown className="w-3.5 h-3.5" />
              {lang === "ar" ? "ترقية للحصول على المزيد" : "Upgrade for more"}
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: lang === "ar" ? "إجمالي المشاريع" : "Total Projects",
              value: stats?.totalProjects ?? 0,
              icon: Building2,
              colorClass: "text-primary",
              bgClass: "bg-primary/10 border-primary/20",
            },
            {
              label: lang === "ar" ? "المخططات" : "Blueprints",
              value: stats?.totalBlueprints ?? 0,
              icon: Layers,
              colorClass: "text-purple-400",
              bgClass: "bg-purple-500/10 border-purple-500/20",
            },
            {
              label: lang === "ar" ? "مكتملة" : "Completed",
              value: stats?.completedProjects ?? 0,
              icon: CheckCircle,
              colorClass: "text-emerald-400",
              bgClass: "bg-emerald-500/10 border-emerald-500/20",
            },
            {
              label: lang === "ar" ? "مسودات" : "Drafts",
              value: stats?.draftProjects ?? 0,
              icon: Clock,
              colorClass: "text-yellow-400",
              bgClass: "bg-yellow-500/10 border-yellow-500/20",
            },
          ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
            <div key={label} className={`soar-card rounded-xl p-5 border ${bgClass}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${colorClass}`} />
                <span className={`text-3xl font-black ${colorClass}`}>{value}</span>
              </div>
              <div className="text-muted-foreground text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-white">{t(lang, "myProjects")}</h2>
            {projects && <span className="text-xs text-muted-foreground font-mono">({projects.length})</span>}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="soar-card rounded-2xl p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-bold text-white">{t(lang, "noProjects")}</h3>
              <p className="text-muted-foreground text-sm">{t(lang, "noProjectsDesc")}</p>
              <Button
                onClick={() => navigate("/projects/new")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 glow-orange"
              >
                <FolderPlus className="w-4 h-4" />
                {t(lang, "newProject")}
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="soar-card rounded-xl p-5 space-y-4 hover:border-primary/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass(project.status)}`}>
                      {t(lang, project.status as any)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {project.buildingType && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        {t(lang, project.buildingType as any)}
                      </div>
                    )}
                    {project.landArea && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {project.landArea} m²
                      </div>
                    )}
                    {project.numberOfFloors && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Layers className="w-3.5 h-3.5 text-primary/70" />
                        {project.numberOfFloors} {lang === "ar" ? "طوابق" : "floors"}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-muted-foreground text-xs font-mono">
                      {new Date(project.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                    </span>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(t(lang, "confirmDelete"))) {
                            setDeletingId(project.id);
                            deleteProject.mutate({ id: project.id });
                          }
                        }}
                        disabled={deletingId === project.id}
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {lang === "ar" ? "فتح" : "Open"}
                        <ArrowIcon className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
