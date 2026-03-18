import { useAuth } from "@/_core/hooks/useAuth";
import { useLang } from "@/contexts/LangContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  CheckCircle, Crown, Zap, ArrowRight, Lock,
  Building2, Sparkles, Edit3, Users
} from "lucide-react";

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = {
  free: {
    nameAr: "مجاني",
    nameEn: "Free",
    priceLabel: { ar: "مجاناً", en: "Free" },
    tagAr: "للتجربة والاستكشاف",
    tagEn: "Try & explore",
    icon: Sparkles,
    borderClass: "border-white/10",
    accentClass: "text-white/50",
    featuresAr: [
      "مشروعان فقط",
      "مخططان يومياً",
      "6 مفاهيم معمارية لكل مشروع",
      "تحليل الأرض بالذكاء الاصطناعي",
      "تحميل PNG",
      "دعم عبر البريد الإلكتروني",
    ],
    featuresEn: [
      "2 projects only",
      "2 blueprints per day",
      "6 architectural concepts per project",
      "AI land analysis",
      "PNG download",
      "Email support",
    ],
    limitedIndexes: [0, 1],
  },
  solo: {
    nameAr: "احترافي",
    nameEn: "Professional",
    priceLabel: { ar: "٥٠٠ ريال / شهر", en: "SAR 500 / month" },
    tagAr: "للمهندس الفرد",
    tagEn: "For individual engineers",
    icon: Zap,
    borderClass: "border-orange-500/50",
    accentClass: "text-orange-400",
    featuresAr: [
      "مشاريع غير محدودة",
      "مخططات غير محدودة",
      "6 مفاهيم معمارية لكل مشروع",
      "تصدير DXF لـ AutoCAD",
      "محرر المخططات التفاعلي",
      "نظام التعلم الذاتي",
      "دعم فني ذو أولوية",
    ],
    featuresEn: [
      "Unlimited projects",
      "Unlimited blueprints",
      "6 architectural concepts per project",
      "DXF export for AutoCAD",
      "Interactive blueprint editor",
      "Self-learning system",
      "Priority technical support",
    ],
    limitedIndexes: [],
  },
  office: {
    nameAr: "مختص",
    nameEn: "Specialist",
    priceLabel: { ar: "٢٠٠٠ ريال / شهر", en: "SAR 2,000 / month" },
    tagAr: "للمكاتب الهندسية — حتى ٣ مستخدمين",
    tagEn: "For engineering offices — up to 3 users",
    icon: Building2,
    borderClass: "border-purple-500/50",
    accentClass: "text-purple-400",
    featuresAr: [
      "كل مزايا الخطة الفردية",
      "حتى ٣ مستخدمين في نفس الحساب",
      "لوحة إدارة المكتب",
      "ملف مشاريع مشترك للفريق",
      "تقارير الامتثال التفصيلية",
      "مراجعة رسمية من فريق SOAR",
      "دعم فني ٢٤/٧",
    ],
    featuresEn: [
      "All Solo plan features",
      "Up to 3 users per account",
      "Office management dashboard",
      "Shared team project portfolio",
      "Detailed compliance reports",
      "Official SOAR team review",
      "24/7 priority support",
    ],
    limitedIndexes: [],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const { data: subscription } = trpc.subscription.get.useQuery(undefined, { enabled: isAuthenticated });

  const upgradeMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: ({ plan }) => {
      toast.success(
        lang === "ar"
          ? `تم الترقية إلى خطة ${plan === "solo" ? "الاحترافي" : plan === "office" ? "المختص" : "المجانية"} بنجاح! 🎉`
          : `Successfully switched to ${plan} plan! 🎉`
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const currentPlan = (subscription?.plan ?? "free") as "free" | "solo" | "office";

  const handleAction = (planKey: "free" | "solo" | "office") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (planKey === "free") {
      navigate("/dashboard");
      return;
    }
    if (planKey === currentPlan) return;
    upgradeMutation.mutate({ plan: planKey });
  };

  return (
    <div className="min-h-screen bg-background pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-16 max-w-5xl">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">
              {lang === "ar" ? "خطط الاشتراك" : "Subscription Plans"}
            </span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4">
            {lang === "ar" ? "اختر خطتك المناسبة" : "Choose Your Plan"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            {lang === "ar"
              ? "ابدأ مجاناً وجرّب المنصة، ثم قم بالترقية عندما تحتاج إلى إمكانيات احترافية"
              : "Start free and explore the platform, then upgrade for professional capabilities"}
          </p>
        </div>

        {/* Current plan indicator */}
        {isAuthenticated && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm">
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-semibold">
                {lang === "ar"
                  ? `خطتك الحالية: ${currentPlan === "free" ? "مجاني" : currentPlan === "solo" ? "احترافي" : "مختص"}`
                  : `Current plan: ${currentPlan === "free" ? "Free" : currentPlan === "solo" ? "Professional" : "Specialist"}`}
              </span>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {(["free", "solo", "office"] as const).map((planKey) => {
            const plan = PLANS[planKey];
            const Icon = plan.icon;
            const isCurrent = currentPlan === planKey;
            const isPopular = planKey === "solo";
            const features = lang === "ar" ? plan.featuresAr : plan.featuresEn;

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl border-2 ${plan.borderClass} bg-card p-6 flex flex-col ${
                  isCurrent ? "ring-2 ring-primary/40" : ""
                } ${isPopular ? "shadow-lg shadow-orange-500/10" : ""}`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {lang === "ar" ? "⭐ الأكثر طلباً" : "⭐ Most Popular"}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5 mt-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${
                      planKey === "free" ? "bg-white/5" :
                      planKey === "solo" ? "bg-orange-500/10" : "bg-purple-500/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.accentClass}`} />
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-medium">
                        {lang === "ar" ? "خطتك الحالية" : "Current Plan"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white mb-1">
                    {lang === "ar" ? plan.nameAr : plan.nameEn}
                  </h2>
                  <p className={`text-xs ${plan.accentClass} mb-3`}>
                    {lang === "ar" ? plan.tagAr : plan.tagEn}
                  </p>
                  <div className={`text-2xl font-black ${planKey === "free" ? "text-white/50" : plan.accentClass}`}>
                    {lang === "ar" ? plan.priceLabel.ar : plan.priceLabel.en}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5 mb-5" />

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {features.map((feature, i) => {
                    const isLimited = (plan.limitedIndexes as number[]).includes(i);
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        {isLimited ? (
                          <Lock className="w-3.5 h-3.5 text-yellow-500/70 mt-0.5 shrink-0" />
                        ) : (
                          <CheckCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                            planKey === "free" ? "text-white/30" :
                            planKey === "solo" ? "text-orange-400" : "text-purple-400"
                          }`} />
                        )}
                        <span className={isLimited ? "text-yellow-500/70" : "text-muted-foreground"}>
                          {feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                <Button
                  className={`w-full font-bold ${
                    planKey === "free"
                      ? "border border-white/20 bg-transparent text-white/60 hover:bg-white/5"
                      : planKey === "solo"
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  } ${isCurrent ? "opacity-60 cursor-default" : ""}`}
                  variant={planKey === "free" ? "outline" : "default"}
                  disabled={(isCurrent && planKey !== "free") || upgradeMutation.isPending}
                  onClick={() => handleAction(planKey)}
                >
                  {isCurrent && planKey !== "free"
                    ? (lang === "ar" ? "خطتك الحالية ✓" : "Current Plan ✓")
                    : planKey === "free"
                    ? (lang === "ar" ? "ابدأ مجاناً" : "Start Free")
                    : upgradeMutation.isPending
                    ? (lang === "ar" ? "جاري الترقية..." : "Upgrading...")
                    : (lang === "ar" ? "اشترك الآن" : "Subscribe Now")}
                  {!isCurrent && planKey !== "free" && !upgradeMutation.isPending && (
                    <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""} ms-1`} />
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="bg-card border border-white/10 rounded-2xl overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="font-bold text-white text-sm">
              {lang === "ar" ? "مقارنة تفصيلية بين الخطط" : "Detailed Plan Comparison"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-start px-6 py-3 text-muted-foreground font-medium w-2/5">
                    {lang === "ar" ? "الميزة" : "Feature"}
                  </th>
                  <th className="px-4 py-3 text-center text-white/40 font-medium">
                    {lang === "ar" ? "مجاني" : "Free"}
                  </th>
                  <th className="px-4 py-3 text-center text-orange-400 font-medium">
                    {lang === "ar" ? "احترافي" : "Professional"}
                  </th>
                  <th className="px-4 py-3 text-center text-purple-400 font-medium">
                    {lang === "ar" ? "مختص" : "Specialist"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    ar: "عدد المشاريع", en: "Projects",
                    free: lang === "ar" ? "٢ فقط" : "2 only",
                    solo: lang === "ar" ? "غير محدود" : "Unlimited",
                    office: lang === "ar" ? "غير محدود" : "Unlimited",
                  },
                  {
                    ar: "المخططات", en: "Blueprints",
                    free: lang === "ar" ? "٢ / يوم" : "2 / day",
                    solo: lang === "ar" ? "غير محدود" : "Unlimited",
                    office: lang === "ar" ? "غير محدود" : "Unlimited",
                  },
                  {
                    ar: "عدد المستخدمين", en: "Users",
                    free: "1", solo: "1",
                    office: lang === "ar" ? "حتى ٣" : "Up to 3",
                  },
                  {
                    ar: "تصدير DXF (AutoCAD)", en: "DXF Export",
                    free: "✗", solo: "✓", office: "✓",
                  },
                  {
                    ar: "محرر المخططات التفاعلي", en: "Interactive editor",
                    free: "✗", solo: "✓", office: "✓",
                  },
                  {
                    ar: "نظام التعلم الذاتي", en: "Self-learning AI",
                    free: "✗", solo: "✓", office: "✓",
                  },
                  {
                    ar: "لوحة إدارة المكتب", en: "Office dashboard",
                    free: "✗", solo: "✗", office: "✓",
                  },
                  {
                    ar: "السعر الشهري", en: "Monthly price",
                    free: lang === "ar" ? "مجاناً" : "Free",
                    solo: lang === "ar" ? "٥٠٠ ريال" : "SAR 500",
                    office: lang === "ar" ? "٢٠٠٠ ريال" : "SAR 2,000",
                  },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-6 py-3 text-muted-foreground">
                      {lang === "ar" ? row.ar : row.en}
                    </td>
                    <td className={`px-4 py-3 text-center text-xs font-mono ${
                      row.free === "✗" ? "text-red-400/50" : "text-white/40"
                    }`}>{row.free}</td>
                    <td className={`px-4 py-3 text-center text-xs font-mono ${
                      row.solo === "✗" ? "text-red-400/50" : "text-orange-400"
                    }`}>{row.solo}</td>
                    <td className={`px-4 py-3 text-center text-xs font-mono ${
                      row.office === "✗" ? "text-red-400/50" : "text-purple-400"
                    }`}>{row.office}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Self-learning note */}
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Edit3 className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-bold text-sm">
              {lang === "ar" ? "نظام التعلم الذاتي" : "Self-Learning System"}
            </span>
          </div>
          <p className="text-sm text-orange-300/70">
            {lang === "ar"
              ? "كلما عدّل المهندس على مخطط، يتعلم النظام من هذا التعديل ويُحسّن التوليد في المشاريع القادمة تلقائياً."
              : "Every time an engineer edits a blueprint, the system learns from that edit and automatically improves future generations."}
          </p>
        </div>

        {/* Enterprise contact */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {lang === "ar" ? "تحتاج أكثر من ٤ مستخدمين؟ " : "Need more than 4 users? "}
            <a href="mailto:info@soar.ai" className="text-primary hover:underline">
              {lang === "ar" ? "تواصل معنا للحصول على عرض مخصص" : "Contact us for a custom enterprise quote"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
