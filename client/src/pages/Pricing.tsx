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
  Building2, Sparkles, GraduationCap
} from "lucide-react";

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = {
  student: {
    nameAr: "طلاب",
    nameEn: "Student",
    priceLabel: { ar: "٢٠ ريال / شهر", en: "SAR 20 / month" },
    tagAr: "للطلاب والمتدربين",
    tagEn: "For students & learners",
    icon: GraduationCap,
    borderClass: "border-blue-500/30",
    accentClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    featuresAr: [
      "مشروع واحد يومياً",
      "مشاريع غير محدودة",
      "6 مفاهيم معمارية لكل مشروع",
      "تحليل الأرض بالذكاء الاصطناعي",
      "تحميل SVG",
      "دعم عبر البريد الإلكتروني",
    ],
    featuresEn: [
      "1 project per day",
      "Unlimited projects",
      "6 architectural concepts per project",
      "AI land analysis",
      "SVG download",
      "Email support",
    ],
    limitedIndexes: [0],
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
    bgClass: "bg-orange-500/10",
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
    bgClass: "bg-purple-500/10",
    featuresAr: [
      "كل مزايا الخطة الاحترافية",
      "حتى ٣ مستخدمين في نفس الحساب",
      "لوحة إدارة المكتب",
      "ملف مشاريع مشترك للفريق",
      "تقارير الامتثال التفصيلية",
      "مراجعة رسمية من فريق SOAR",
      "دعم فني ٢٤/٧",
    ],
    featuresEn: [
      "All Professional plan features",
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
          ? `تم الاشتراك في خطة ${plan === "student" ? "الطلاب" : plan === "solo" ? "الاحترافي" : "المختص"} بنجاح! 🎉`
          : `Successfully subscribed to ${plan} plan! 🎉`
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const currentPlan = (subscription?.plan ?? "student") as "student" | "solo" | "office";

  const handleAction = (planKey: "student" | "solo" | "office") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (planKey === currentPlan) return;
    upgradeMutation.mutate({ plan: planKey });
  };

  const planLabel = (p: string) =>
    p === "student" ? (lang === "ar" ? "طلاب" : "Student")
    : p === "solo" ? (lang === "ar" ? "احترافي" : "Professional")
    : (lang === "ar" ? "مختص" : "Specialist");

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
              ? "ابدأ بخطة الطلاب بـ ٢٠ ريال فقط، ثم قم بالترقية عندما تحتاج إلى إمكانيات احترافية"
              : "Start with the Student plan at SAR 20, then upgrade when you need professional capabilities"}
          </p>
        </div>

        {/* Current plan indicator */}
        {isAuthenticated && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm">
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-semibold">
                {lang === "ar"
                  ? `خطتك الحالية: ${planLabel(currentPlan)}`
                  : `Current plan: ${planLabel(currentPlan)}`}
              </span>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {(["student", "solo", "office"] as const).map((planKey) => {
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
                    <div className={`p-2 rounded-lg ${plan.bgClass}`}>
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
                  <div className={`text-2xl font-black ${plan.accentClass}`}>
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
                          <CheckCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${plan.accentClass}`} />
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
                    planKey === "student"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : planKey === "solo"
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  } ${isCurrent ? "opacity-60 cursor-default" : ""}`}
                  disabled={isCurrent || upgradeMutation.isPending}
                  onClick={() => handleAction(planKey)}
                >
                  {isCurrent
                    ? (lang === "ar" ? "خطتك الحالية ✓" : "Current Plan ✓")
                    : upgradeMutation.isPending
                    ? (lang === "ar" ? "جاري الاشتراك..." : "Processing...")
                    : (lang === "ar" ? "اشترك الآن" : "Subscribe Now")}
                  {!isCurrent && !upgradeMutation.isPending && (
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
            <h3 className="text-white font-bold text-lg">
              {lang === "ar" ? "مقارنة تفصيلية" : "Detailed Comparison"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-start px-6 py-3 text-muted-foreground font-medium">
                    {lang === "ar" ? "الميزة" : "Feature"}
                  </th>
                  <th className="text-center px-4 py-3 text-blue-400 font-bold">
                    {lang === "ar" ? "طلاب" : "Student"}
                  </th>
                  <th className="text-center px-4 py-3 text-orange-400 font-bold">
                    {lang === "ar" ? "احترافي" : "Professional"}
                  </th>
                  <th className="text-center px-4 py-3 text-purple-400 font-bold">
                    {lang === "ar" ? "مختص" : "Specialist"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { ar: "السعر الشهري", en: "Monthly Price", vals: ["٢٠ ريال", "٥٠٠ ريال", "٢٠٠٠ ريال"] },
                  { ar: "المشاريع اليومية", en: "Daily Projects", vals: ["١ مشروع/يوم", "غير محدود", "غير محدود"] },
                  { ar: "المستخدمون", en: "Users", vals: ["١", "١", "حتى ٣"] },
                  { ar: "تصدير DXF", en: "DXF Export", vals: [false, true, true] },
                  { ar: "المحرر التفاعلي", en: "Interactive Editor", vals: [false, true, true] },
                  { ar: "نظام التعلم الذاتي", en: "Self-Learning", vals: [false, true, true] },
                  { ar: "لوحة إدارة المكتب", en: "Office Dashboard", vals: [false, false, true] },
                  { ar: "دعم فني ٢٤/٧", en: "24/7 Support", vals: [false, false, true] },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/2">
                    <td className="px-6 py-3 text-muted-foreground">
                      {lang === "ar" ? row.ar : row.en}
                    </td>
                    {row.vals.map((val, j) => (
                      <td key={j} className="text-center px-4 py-3">
                        {typeof val === "boolean" ? (
                          val
                            ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                            : <span className="text-white/20 text-lg">—</span>
                        ) : (
                          <span className={`font-semibold ${j === 0 ? "text-blue-400" : j === 1 ? "text-orange-400" : "text-purple-400"}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ note */}
        <p className="text-center text-muted-foreground text-xs">
          {lang === "ar"
            ? "جميع الأسعار بالريال السعودي. يمكن الإلغاء في أي وقت."
            : "All prices in Saudi Riyals. Cancel anytime."}
        </p>
      </div>
    </div>
  );
}
