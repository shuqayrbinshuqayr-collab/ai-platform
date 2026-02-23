import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { Layers, Eye, Loader2, Zap, FileText, Download } from "lucide-react";

export default function Gallery() {
  const { isAuthenticated } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();

  const { data: blueprints, isLoading } = trpc.blueprints.listAll.useQuery(undefined, { enabled: isAuthenticated });

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

  return (
    <div className="min-h-screen pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="dimension-marker text-blue-400">// BLUEPRINT GALLERY //</div>
          <h1 className="text-3xl font-black text-white">{t(lang, "gallery")}</h1>
          <p className="text-slate-400">{lang === "ar" ? "جميع المخططات المعمارية المولّدة لمكتبك الهندسي" : "All generated architectural blueprints for your engineering office"}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : !blueprints || blueprints.length === 0 ? (
          <div className="blueprint-card cad-corner rounded-xl p-16 text-center space-y-4">
            <Layers className="w-16 h-16 text-slate-600 mx-auto" />
            <h3 className="text-xl font-bold text-white">{lang === "ar" ? "لا توجد مخططات بعد" : "No blueprints yet"}</h3>
            <p className="text-slate-400">{lang === "ar" ? "أنشئ مشروعاً وولّد مخططاً معمارياً" : "Create a project and generate an architectural blueprint"}</p>
            <Button onClick={() => navigate("/projects/new")} className="bg-blue-500 hover:bg-blue-400 text-white gap-2">
              <Zap className="w-4 h-4" />
              {t(lang, "newProject")}
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blueprints.map((bp) => {
              const data = bp.structuredData as any;
              const spaces: any[] = data?.spaces ?? [];
              const summary = data?.summary ?? {};
              const title = lang === "ar" ? (data?.titleAr || bp.title) : bp.title;

              return (
                <div
                  key={bp.id}
                  className="blueprint-card cad-corner rounded-xl overflow-hidden hover:border-blue-400/50 transition-all group cursor-pointer"
                  onClick={() => navigate(`/blueprints/${bp.id}`)}
                >
                  {/* Blueprint mini preview */}
                  <div className="relative h-40 overflow-hidden" style={{ background: "oklch(0.09 0.04 240)" }}>
                    <svg viewBox="0 0 300 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`g-${bp.id}`} width="15" height="15" patternUnits="userSpaceOnUse">
                          <path d="M 15 0 L 0 0 0 15" fill="none" stroke="oklch(0.35 0.08 240 / 0.3)" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="300" height="180" fill={`url(#g-${bp.id})`} />
                      <rect x="20" y="20" width="260" height="140" fill="none" stroke="oklch(0.60 0.18 220)" strokeWidth="1.5" />
                      {spaces.slice(0, 8).map((space, i) => {
                        const x = 20 + (space.x / 100) * 260;
                        const y = 20 + (space.y / 100) * 140;
                        const w = (space.w / 100) * 260;
                        const h = (space.h / 100) * 140;
                        return (
                          <rect key={i} x={x} y={y} width={w} height={h}
                            fill="oklch(0.40 0.12 240 / 0.25)"
                            stroke="oklch(0.55 0.15 240 / 0.7)" strokeWidth="1" />
                        );
                      })}
                      {spaces.length === 0 && (
                        <>
                          <rect x="20" y="20" width="130" height="70" fill="oklch(0.40 0.12 240 / 0.2)" stroke="oklch(0.55 0.15 240 / 0.6)" strokeWidth="1" />
                          <rect x="150" y="20" width="130" height="70" fill="oklch(0.40 0.12 240 / 0.15)" stroke="oklch(0.55 0.15 240 / 0.6)" strokeWidth="1" />
                          <rect x="20" y="90" width="80" height="70" fill="oklch(0.40 0.12 240 / 0.18)" stroke="oklch(0.55 0.15 240 / 0.6)" strokeWidth="1" />
                          <rect x="100" y="90" width="180" height="70" fill="oklch(0.40 0.12 240 / 0.12)" stroke="oklch(0.55 0.15 240 / 0.6)" strokeWidth="1" />
                        </>
                      )}
                      <path d="M 20 20 L 30 20 M 20 20 L 20 30" stroke="oklch(0.70 0.22 200)" strokeWidth="1.5" />
                      <path d="M 280 20 L 270 20 M 280 20 L 280 30" stroke="oklch(0.70 0.22 200)" strokeWidth="1.5" />
                      <path d="M 20 160 L 30 160 M 20 160 L 20 150" stroke="oklch(0.70 0.22 200)" strokeWidth="1.5" />
                      <path d="M 280 160 L 270 160 M 280 160 L 280 150" stroke="oklch(0.70 0.22 200)" strokeWidth="1.5" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                      <span className="dimension-marker text-blue-400 text-xs">
                        {spaces.length} {lang === "ar" ? "مساحة" : "spaces"}
                      </span>
                      {summary.totalArea && (
                        <span className="dimension-marker text-slate-400 text-xs">{summary.totalArea} m²</span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 text-sm">
                      {title || `Blueprint #${bp.id}`}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="dimension-marker text-slate-500 text-xs">
                        {new Date(bp.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                      </span>
                      {bp.generationTime && (
                        <span className="dimension-marker text-slate-500 text-xs">
                          {(bp.generationTime / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 gap-1.5 text-xs"
                        onClick={() => navigate(`/blueprints/${bp.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t(lang, "viewBlueprint")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
