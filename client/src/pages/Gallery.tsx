import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { Layers, Eye, Loader2, Zap, Crown, Lock } from "lucide-react";
import { trpc as trpcClient } from "@/lib/trpc";

export default function Gallery() {
  const { isAuthenticated } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();

  const { data: blueprints, isLoading } = trpcClient.blueprints.listAll.useQuery(undefined, { enabled: isAuthenticated });
  const { data: subscription } = trpcClient.subscription.get.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = subscription?.plan === "solo" || subscription?.plan === "office";

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

  return (
    <div className="min-h-screen pt-16 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="text-xs text-primary font-mono opacity-70">// BLUEPRINT GALLERY //</div>
            <h1 className="text-3xl font-black text-white">{t(lang, "gallery")}</h1>
            <p className="text-muted-foreground text-sm">
              {lang === "ar" ? "جميع المخططات المعمارية المولّدة" : "All generated architectural blueprints"}
            </p>
          </div>
          {!isPro && (
            <div className="soar-card rounded-xl p-3 flex items-center gap-3 border-primary/20">
              <Lock className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                {lang === "ar" ? "ملف المشاريع الخاص متاح في خطة Pro" : "Private portfolio available in Pro plan"}
              </div>
              <Button
                size="sm"
                className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1 text-xs h-7 px-2"
                onClick={() => navigate("/pricing")}
              >
                <Crown className="w-3 h-3" />
                Pro
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !blueprints || blueprints.length === 0 ? (
          <div className="soar-card rounded-2xl p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mx-auto">
              <Layers className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold text-white">{lang === "ar" ? "لا توجد مخططات بعد" : "No blueprints yet"}</h3>
            <p className="text-muted-foreground text-sm">{lang === "ar" ? "أنشئ مشروعاً وولّد مخططاً معمارياً" : "Create a project and generate an architectural blueprint"}</p>
            <Button onClick={() => navigate("/projects/new")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 glow-orange">
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
                  className="soar-card rounded-xl overflow-hidden hover:border-primary/50 transition-all group cursor-pointer"
                  onClick={() => navigate(`/blueprints/${bp.id}`)}
                >
                  {/* Blueprint mini preview */}
                  <div className="relative h-44 overflow-hidden" style={{ background: "oklch(0.09 0.008 240)" }}>
                    <svg viewBox="0 0 300 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`g-${bp.id}`} width="15" height="15" patternUnits="userSpaceOnUse">
                          <path d="M 15 0 L 0 0 0 15" fill="none" stroke="oklch(0.70 0.19 45 / 0.07)" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="300" height="180" fill={`url(#g-${bp.id})`} />
                      <rect x="20" y="20" width="260" height="140" fill="none" stroke="oklch(0.70 0.19 45 / 0.5)" strokeWidth="1.5" />
                      {spaces.slice(0, 8).map((space, i) => {
                        const x = 20 + (space.x / 100) * 260;
                        const y = 20 + (space.y / 100) * 140;
                        const w = (space.w / 100) * 260;
                        const h = (space.h / 100) * 140;
                        return (
                          <rect key={i} x={x} y={y} width={w} height={h}
                            fill="oklch(0.70 0.19 45 / 0.10)"
                            stroke="oklch(0.70 0.19 45 / 0.50)" strokeWidth="1" />
                        );
                      })}
                      {spaces.length === 0 && (
                        <>
                          <rect x="20" y="20" width="130" height="70" fill="oklch(0.70 0.19 45 / 0.08)" stroke="oklch(0.70 0.19 45 / 0.4)" strokeWidth="1" />
                          <rect x="150" y="20" width="130" height="70" fill="oklch(0.70 0.19 45 / 0.06)" stroke="oklch(0.70 0.19 45 / 0.4)" strokeWidth="1" />
                          <rect x="20" y="90" width="80" height="70" fill="oklch(0.70 0.19 45 / 0.07)" stroke="oklch(0.70 0.19 45 / 0.4)" strokeWidth="1" />
                          <rect x="100" y="90" width="180" height="70" fill="oklch(0.70 0.19 45 / 0.05)" stroke="oklch(0.70 0.19 45 / 0.4)" strokeWidth="1" />
                        </>
                      )}
                      {/* Orange corner markers */}
                      <path d="M 20 20 L 32 20 M 20 20 L 20 32" stroke="oklch(0.70 0.19 45)" strokeWidth="2" />
                      <path d="M 280 20 L 268 20 M 280 20 L 280 32" stroke="oklch(0.70 0.19 45)" strokeWidth="2" />
                      <path d="M 20 160 L 32 160 M 20 160 L 20 148" stroke="oklch(0.70 0.19 45)" strokeWidth="2" />
                      <path d="M 280 160 L 268 160 M 280 160 L 280 148" stroke="oklch(0.70 0.19 45)" strokeWidth="2" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                      <span className="text-primary text-xs font-mono font-bold">
                        {spaces.length} {lang === "ar" ? "مساحة" : "spaces"}
                      </span>
                      {summary.totalArea && (
                        <span className="text-muted-foreground text-xs font-mono">{summary.totalArea} m²</span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm">
                      {title || `Blueprint #${bp.id}`}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-mono">
                        {new Date(bp.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                      </span>
                      {bp.generationTime && (
                        <span className="text-muted-foreground text-xs font-mono">
                          {(bp.generationTime / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="flex-1 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 gap-1.5 text-xs"
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
