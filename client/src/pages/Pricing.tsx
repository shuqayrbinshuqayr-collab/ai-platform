import { useAuth } from "@/_core/hooks/useAuth";
import { useLang } from "@/contexts/LangContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  CheckCircle, Crown, Zap, Star, ArrowRight, Lock,
  FolderOpen, LayoutGrid, Download, Brain, Headphones, Shield
} from "lucide-react";

export default function Pricing() {
  const { isAuthenticated, user } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();

  const { data: subscription } = trpc.subscription.get.useQuery(undefined, { enabled: isAuthenticated });
  const upgradeMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: ({ plan }) => {
      toast.success(
        plan === "pro"
          ? (lang === "ar" ? "تم الترقية إلى Pro بنجاح!" : "Successfully upgraded to Pro!")
          : (lang === "ar" ? "تم التحويل إلى الخطة المجانية" : "Switched to Free plan")
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const isPro = subscription?.plan === "pro";

  const freeFeatures = lang === "ar"
    ? ["3 مخططات شهرياً", "5 مشاريع", "تحليل الأرض بالذكاء الاصطناعي", "توليد 6 مفاهيم معمارية", "تحميل PNG", "دعم عبر البريد الإلكتروني"]
    : ["3 blueprints/month", "5 projects", "AI land analysis", "6 architectural concepts", "PNG download", "Email support"];

  const proFeatures = lang === "ar"
    ? ["مخططات غير محدودة", "مشاريع غير محدودة", "ملف مشاريع خاص", "تصدير Revit & AutoCAD", "مراجعة رسمية من فريق SOAR", "أولوية الدعم الفني 24/7", "تحليل متقدم للأرض", "تقارير الامتثال التفصيلية"]
    : ["Unlimited blueprints", "Unlimited projects", "Private project portfolio", "Revit & AutoCAD export", "Official SOAR team review", "Priority 24/7 support", "Advanced land analysis", "Detailed compliance reports"];

  const proIcons = [LayoutGrid, FolderOpen, FolderOpen, Download, Shield, Headphones, Brain, CheckCircle];

  return (
    <div className="min-h-screen bg-background pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{lang === "ar" ? "خطط الاشتراك" : "Subscription Plans"}</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4">
            {lang === "ar" ? "اختر خطتك المناسبة" : "Choose Your Plan"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ar"
              ? "ابدأ مجاناً وقم بالترقية عندما تحتاج إلى مزيد من الميزات الاحترافية"
              : "Start free and upgrade when you need more professional features"}
          </p>
        </div>

        {/* Current plan badge */}
        {isAuthenticated && subscription && (
          <div className="flex justify-center mb-8">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${
              isPro ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 bg-secondary/30 text-muted-foreground"
            }`}>
              {isPro ? <Crown className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {lang === "ar"
                ? `خطتك الحالية: ${isPro ? "احترافي" : "مجاني"}`
                : `Current plan: ${isPro ? "Pro" : "Free"}`}
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Free Plan */}
          <div className={`soar-card rounded-2xl p-8 flex flex-col ${!isPro && isAuthenticated ? "border-border/60" : ""}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-white">{lang === "ar" ? "مجاني" : "Free"}</h2>
                <div className="flex items-end gap-1 mt-2">
                  <span className="text-3xl font-black text-foreground">$0</span>
                  <span className="text-muted-foreground text-sm mb-1">/{lang === "ar" ? "شهر" : "mo"}</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-secondary/50 border border-border/50 text-xs font-bold text-muted-foreground">
                FREE
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {!isAuthenticated ? (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                onClick={() => window.location.href = getLoginUrl()}
              >
                {lang === "ar" ? "ابدأ مجاناً" : "Start Free"}
              </Button>
            ) : isPro ? (
              <Button
                variant="outline"
                className="w-full border-border/60 text-muted-foreground hover:border-primary/40"
                onClick={() => upgradeMutation.mutate({ plan: "free" })}
                disabled={upgradeMutation.isPending}
              >
                {lang === "ar" ? "التحويل إلى المجاني" : "Downgrade to Free"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-primary/30 text-primary"
                disabled
              >
                <CheckCircle className="w-4 h-4 me-2" />
                {lang === "ar" ? "خطتك الحالية" : "Current Plan"}
              </Button>
            )}
          </div>

          {/* Pro Plan */}
          <div className="soar-card rounded-2xl p-8 flex flex-col border-primary/40 relative glow-orange-sm">
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <div className="pro-badge flex items-center gap-1 px-4 py-1.5">
                <Star className="w-3 h-3" />
                {lang === "ar" ? "الأكثر شعبية" : "Most Popular"}
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 mt-2">
              <div>
                <h2 className="text-xl font-black text-white">{lang === "ar" ? "احترافي" : "Pro"}</h2>
                <div className="flex items-end gap-1 mt-2">
                  <span className="text-3xl font-black text-primary">$29</span>
                  <span className="text-muted-foreground text-sm mb-1">/{lang === "ar" ? "شهر" : "mo"}</span>
                </div>
              </div>
              <div className="pro-badge flex items-center gap-1">
                <Crown className="w-3 h-3" />PRO
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {proFeatures.map((feature, i) => {
                const Icon = proIcons[i] || CheckCircle;
                return (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                );
              })}
            </ul>

            {!isAuthenticated ? (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-2 glow-orange"
                onClick={() => window.location.href = getLoginUrl()}
              >
                <Crown className="w-4 h-4" />
                {lang === "ar" ? "ابدأ بـ Pro" : "Get Started with Pro"}
              </Button>
            ) : isPro ? (
              <Button
                className="w-full bg-primary/20 border border-primary/40 text-primary font-bold"
                disabled
              >
                <CheckCircle className="w-4 h-4 me-2" />
                {lang === "ar" ? "خطتك الحالية" : "Current Plan"}
              </Button>
            ) : (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-2 glow-orange"
                onClick={() => upgradeMutation.mutate({ plan: "pro" })}
                disabled={upgradeMutation.isPending}
              >
                {upgradeMutation.isPending ? (
                  <>{lang === "ar" ? "جاري الترقية..." : "Upgrading..."}</>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    {lang === "ar" ? "ترقية إلى Pro" : "Upgrade to Pro"}
                    <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Coming Phases */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white mb-2">
              {lang === "ar" ? "المراحل القادمة" : "Upcoming Phases"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {lang === "ar" ? "مشتركو Pro يحصلون على وصول مبكر لكل مرحلة جديدة" : "Pro subscribers get early access to every new phase"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                v: "V2", yearAr: "2026 — Q1", yearEn: "2026 — Q1",
                titleAr: "الحزمة الهندسية الكاملة", titleEn: "Full Engineering Package",
                audienceAr: "المكاتب الهندسية · أصحاب المشاريع", audienceEn: "Engineering Offices · Project Owners",
                featuresAr: ["الواجهات المعمارية", "المخططات الكهربائية", "السباكة والتكييف", "جداول الكميات", "المخططات الإنشائية"],
                featuresEn: ["Facade design", "Electrical plans", "Plumbing & HVAC", "Bill of Quantities", "Structural drawings"],
              },
              {
                v: "V3", yearAr: "2026 — Q2", yearEn: "2026 — Q2",
                titleAr: "الاعتماد الرسمي", titleEn: "Official Certification",
                audienceAr: "أصحاب المشاريع · المكاتب المعتمدة", audienceEn: "Project Owners · Certified Offices",
                featuresAr: ["شبكة مكاتب معتمدة", "مراجعة مهندسين مرخصين", "ختم هندسي رسمي", "ملف جاهز للتقديم", "تكامل مع البلديات"],
                featuresEn: ["Certified offices network", "Licensed engineer review", "Official engineering stamp", "Submission-ready file", "Municipality integration"],
              },
              {
                v: "V4", yearAr: "2027 — Q1", yearEn: "2027 — Q1",
                titleAr: "التسعير والتنفيذ", titleEn: "Pricing & Execution",
                audienceAr: "الأفراد · المطورون العقاريون", audienceEn: "Individuals · Real Estate Developers",
                featuresAr: ["عروض مقاولين معتمدين", "مقارنة العروض", "إدارة عقود التنفيذ", "متابعة مراحل البناء", "تكامل بنوك التمويل"],
                featuresEn: ["Certified contractor quotes", "Bid comparison", "Contract management", "Construction tracking", "Financing bank integration"],
              },
            ].map(({ v, yearAr, yearEn, titleAr, titleEn, audienceAr, audienceEn, featuresAr, featuresEn }) => (
              <div key={v} className="soar-card rounded-2xl p-6 relative overflow-hidden opacity-80">
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-secondary/50 border border-border/30 rounded-full px-2 py-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    {lang === "ar" ? "قريباً" : "Soon"}
                  </span>
                </div>
                <div className="text-2xl font-black text-muted-foreground/40 mb-2">{v}</div>
                <h3 className="text-muted-foreground font-bold text-sm mb-1">{lang === "ar" ? titleAr : titleEn}</h3>
                <p className="text-muted-foreground/50 text-xs mb-1">{lang === "ar" ? audienceAr : audienceEn}</p>
                <p className="text-muted-foreground/40 text-xs font-semibold mb-4">{lang === "ar" ? yearAr : yearEn}</p>
                <ul className="space-y-1.5">
                  {(lang === "ar" ? featuresAr : featuresEn).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground/50">
                      <Lock className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 bg-primary/5 border border-primary/10 rounded-lg p-2.5 text-center">
                  <p className="text-primary/50 text-[11px] font-semibold">
                    {lang === "ar" ? "مشتركو Pro يحصلون على وصول مبكر" : "Pro subscribers get early access"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="soar-card rounded-2xl p-8">
          <h3 className="text-lg font-black text-white mb-6 text-center">
            {lang === "ar" ? "مقارنة الخطط" : "Plan Comparison"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-start py-3 text-muted-foreground font-semibold">{lang === "ar" ? "الميزة" : "Feature"}</th>
                  <th className="text-center py-3 text-muted-foreground font-semibold">{lang === "ar" ? "مجاني" : "Free"}</th>
                  <th className="text-center py-3 text-primary font-bold">{lang === "ar" ? "احترافي" : "Pro"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  { feature: lang === "ar" ? "المخططات الشهرية" : "Monthly blueprints", free: "3", pro: lang === "ar" ? "غير محدود" : "Unlimited" },
                  { feature: lang === "ar" ? "المشاريع" : "Projects", free: "5", pro: lang === "ar" ? "غير محدود" : "Unlimited" },
                  { feature: lang === "ar" ? "ملف المشاريع الخاص" : "Private portfolio", free: false, pro: true },
                  { feature: lang === "ar" ? "تصدير Revit/AutoCAD" : "Revit/AutoCAD export", free: false, pro: true },
                  { feature: lang === "ar" ? "مراجعة فريق SOAR" : "SOAR team review", free: false, pro: true },
                  { feature: lang === "ar" ? "الإدخال الصوتي" : "Voice input", free: true, pro: true },
                  { feature: lang === "ar" ? "تكامل Google Maps" : "Google Maps integration", free: true, pro: true },
                  { feature: lang === "ar" ? "أولوية الدعم" : "Priority support", free: false, pro: true },
                ].map(({ feature, free, pro }) => (
                  <tr key={feature}>
                    <td className="py-3 text-foreground">{feature}</td>
                    <td className="py-3 text-center">
                      {typeof free === "boolean" ? (
                        free ? <CheckCircle className="w-4 h-4 text-primary mx-auto" /> : <Lock className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground font-mono">{free}</span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {typeof pro === "boolean" ? (
                        pro ? <CheckCircle className="w-4 h-4 text-primary mx-auto" /> : <Lock className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="text-primary font-bold">{pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
