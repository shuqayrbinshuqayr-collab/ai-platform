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
  Zap, Trash2, Eye, ArrowRight, ArrowLeft, Building2
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
        <div className="blueprint-card cad-corner rounded-xl p-12 text-center space-y-6 max-w-md">
          <Zap className="w-16 h-16 text-blue-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">{lang === "ar" ? "يجب تسجيل الدخول أولاً" : "Login Required"}</h2>
          <Button className="bg-blue-500 hover:bg-blue-400 text-white" onClick={() => window.location.href = getLoginUrl()}>
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

  return (
    <div className="min-h-screen pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="dimension-marker text-blue-400">// DASHBOARD //</div>
            <h1 className="text-3xl font-black text-white">
              {lang === "ar" ? `مرحباً، ${user?.name ?? ""}` : `Welcome, ${user?.name ?? ""}`}
            </h1>
            <p className="text-slate-400 text-sm">{lang === "ar" ? "إدارة مشاريعك ومخططاتك المعمارية" : "Manage your projects and architectural blueprints"}</p>
          </div>
          <Button
            onClick={() => navigate("/projects/new")}
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2 glow-blue"
          >
            <FolderPlus className="w-4 h-4" />
            {t(lang, "newProject")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: lang === "ar" ? "إجمالي المشاريع" : "Total Projects",
              value: stats?.totalProjects ?? 0,
              icon: Building2,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              label: lang === "ar" ? "المخططات" : "Blueprints",
              value: stats?.totalBlueprints ?? 0,
              icon: Layers,
              color: "text-purple-400",
              bg: "bg-purple-500/10 border-purple-500/20",
            },
            {
              label: lang === "ar" ? "مكتملة" : "Completed",
              value: stats?.completedProjects ?? 0,
              icon: CheckCircle,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
            },
            {
              label: lang === "ar" ? "مسودات" : "Drafts",
              value: stats?.draftProjects ?? 0,
              icon: Clock,
              color: "text-yellow-400",
              bg: "bg-yellow-500/10 border-yellow-500/20",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`blueprint-card rounded-xl p-5 border ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className={`text-3xl font-black ${color}`}>{value}</span>
              </div>
              <div className="text-slate-400 text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">{t(lang, "myProjects")}</h2>
            {projects && <span className="dimension-marker text-slate-500">({projects.length})</span>}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="blueprint-card cad-corner rounded-xl p-16 text-center space-y-4">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto" />
              <h3 className="text-xl font-bold text-white">{t(lang, "noProjects")}</h3>
              <p className="text-slate-400">{t(lang, "noProjectsDesc")}</p>
              <Button
                onClick={() => navigate("/projects/new")}
                className="bg-blue-500 hover:bg-blue-400 text-white gap-2"
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
                  className="blueprint-card cad-corner rounded-xl p-5 space-y-4 hover:border-blue-400/40 transition-all cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass(project.status)}`}>
                      {t(lang, project.status as any)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {project.buildingType && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        {t(lang, project.buildingType as any)}
                      </div>
                    )}
                    {project.landArea && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        {project.landArea} m²
                      </div>
                    )}
                    {project.numberOfFloors && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        {project.numberOfFloors} {lang === "ar" ? "طوابق" : "floors"}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="dimension-marker text-slate-500 text-xs">
                      {new Date(project.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                    </span>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
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
                        className="h-7 gap-1 text-xs text-slate-300 hover:text-white"
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
