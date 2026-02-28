import { useLang } from "@/contexts/LangContext";
import NavBar from "@/components/NavBar";
import { CheckCircle2, Clock, Lock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

const phases = [
  {
    version: "V1",
    titleAr: "المخططات المعمارية",
    titleEn: "Architectural Blueprints",
    statusAr: "متاح الآن",
    statusEn: "Live Now",
    timelineAr: "2025 — الإطلاق",
    timelineEn: "2025 — Launch",
    status: "live",
    audienceAr: "أصحاب الأراضي · الأفراد · المكاتب الهندسية",
    audienceEn: "Land Owners · Individuals · Engineering Offices",
    color: "#FF6B00",
    featuresAr: [
      "تحليل الأرض بالذكاء الاصطناعي عبر Google Maps",
      "توليد 6 مخططات معمارية متزامنة في 30 ثانية",
      "نموذج بيانات تفصيلي (غرف، حمامات، مجالس، واجهات)",
      "تصدير بصيغة Revit / AutoCAD",
      "إدخال صوتي بالعربية عبر Whisper AI",
      "نظام اشتراكات مجاني / Pro",
    ],
    featuresEn: [
      "AI land analysis via Google Maps",
      "Generate 6 architectural blueprints in 30 seconds",
      "Detailed data form (rooms, bathrooms, majlis, facades)",
      "Export in Revit / AutoCAD format",
      "Arabic voice input via Whisper AI",
      "Free / Pro subscription system",
    ],
  },
  {
    version: "V2",
    titleAr: "الحزمة الهندسية الكاملة",
    titleEn: "Full Engineering Package",
    statusAr: "قريباً — 2026",
    statusEn: "Coming Soon — 2026",
    timelineAr: "2026 — الربع الأول",
    timelineEn: "2026 — Q1",
    status: "soon",
    audienceAr: "المكاتب الهندسية · أصحاب المشاريع",
    audienceEn: "Engineering Offices · Project Owners",
    color: "#FF8C3A",
    featuresAr: [
      "المخططات المعمارية (من V1)",
      "تصميم الواجهات المعمارية",
      "المخططات الكهربائية",
      "مخططات السباكة والصرف الصحي",
      "مخططات التكييف والتهوية (HVAC)",
      "جداول الكميات والمواصفات الفنية",
      "المخططات الإنشائية",
    ],
    featuresEn: [
      "Architectural blueprints (from V1)",
      "Facade design",
      "Electrical plans",
      "Plumbing & drainage plans",
      "HVAC plans",
      "Bill of Quantities (BOQ) & specifications",
      "Structural drawings",
    ],
  },
  {
    version: "V3",
    titleAr: "الاعتماد الرسمي",
    titleEn: "Official Certification",
    statusAr: "قريباً — 2026",
    statusEn: "Coming Soon — 2026",
    timelineAr: "2026 — الربع الثاني",
    timelineEn: "2026 — Q2",
    status: "soon",
    audienceAr: "أصحاب المشاريع · المكاتب الهندسية المعتمدة",
    audienceEn: "Project Owners · Certified Engineering Offices",
    color: "#FFA500",
    featuresAr: [
      "شبكة مكاتب هندسية معتمدة داخل المنصة",
      "مراجعة المخططات من مهندسين مرخصين",
      "اعتماد رسمي وختم هندسي",
      "تقرير الامتثال للاشتراطات السعودية",
      "ملف المشروع الكامل جاهز للتقديم",
      "تكامل مع أنظمة البلديات",
    ],
    featuresEn: [
      "Network of certified engineering offices on platform",
      "Blueprint review by licensed engineers",
      "Official certification & engineering stamp",
      "Saudi regulatory compliance report",
      "Complete project file ready for submission",
      "Integration with municipality systems",
    ],
  },
  {
    version: "V4",
    titleAr: "التسعير والتنفيذ",
    titleEn: "Pricing & Execution",
    statusAr: "قريباً — 2027",
    statusEn: "Coming Soon — 2027",
    timelineAr: "2027 — الربع الأول",
    timelineEn: "2027 — Q1",
    status: "future",
    audienceAr: "الأفراد · المطورون العقاريون",
    audienceEn: "Individuals · Real Estate Developers",
    color: "#FFB84D",
    featuresAr: [
      "عرض المشروع على مقاولين معتمدين",
      "تلقي عروض أسعار متعددة للتنفيذ",
      "مقارنة العروض وتقييم المقاولين",
      "إدارة عقود التنفيذ",
      "متابعة مراحل البناء",
      "تكامل مع بنوك التمويل العقاري",
    ],
    featuresEn: [
      "Submit project to certified contractors",
      "Receive multiple execution quotes",
      "Compare bids & evaluate contractors",
      "Manage execution contracts",
      "Track construction phases",
      "Integration with real estate financing banks",
    ],
  },
];

export default function Roadmap() {
  const { lang } = useLang();
  const { isAuthenticated } = useAuth();
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-[#0D0D0D]" dir={isAr ? "rtl" : "ltr"}>
      <NavBar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(#FF6B00 1px, transparent 1px), linear-gradient(90deg, #FF6B00 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
            <span className="text-[#FF6B00] text-sm font-medium">
              {isAr ? "خارطة طريق SOAR.AI" : "SOAR.AI Roadmap"}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {isAr ? "من الأرض إلى التنفيذ" : "From Land to Execution"}
            <br />
            <span className="text-[#FF6B00]">
              {isAr ? "في 4 مراحل متكاملة" : "In 4 Integrated Phases"}
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {isAr
              ? "SOAR.AI تبني منظومة متكاملة تأخذك من تحليل الأرض حتى تنفيذ المشروع — كل مرحلة تبني على السابقة"
              : "SOAR.AI builds an integrated ecosystem from land analysis to project execution — each phase builds on the previous"}
          </p>
        </div>
      </section>

      {/* Phases Timeline */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        {/* Timeline connector */}
        <div className="relative">
          {phases.map((phase, idx) => (
            <div key={phase.version} className="relative mb-8">
              {/* Connector line */}
              {idx < phases.length - 1 && (
                <div className="absolute left-8 md:left-1/2 top-full w-0.5 h-8 bg-gradient-to-b from-[#FF6B00]/50 to-transparent z-10" />
              )}

              <div className={`grid md:grid-cols-2 gap-6 items-start ${idx % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                {/* Phase Card */}
                <div
                  className={`bg-[#1A1A1A] rounded-2xl border overflow-hidden ${
                    phase.status === "live"
                      ? "border-[#FF6B00]"
                      : phase.status === "soon"
                      ? "border-[#FF6B00]/30"
                      : "border-white/10"
                  } ${idx % 2 === 1 ? "md:order-2" : ""}`}
                >
                  {/* Card Header */}
                  <div
                    className="p-6 border-b border-white/10"
                    style={{ background: `linear-gradient(135deg, ${phase.color}15, transparent)` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-3xl font-black"
                          style={{ color: phase.color }}
                        >
                          {phase.version}
                        </span>
                        <div>
                          <h3 className="text-white font-bold text-xl">
                            {isAr ? phase.titleAr : phase.titleEn}
                          </h3>
                          <p className="text-gray-500 text-sm">
                            {isAr ? phase.timelineAr : phase.timelineEn}
                          </p>
                        </div>
                      </div>
                      {/* Status Badge */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        phase.status === "live"
                          ? "bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40"
                          : phase.status === "soon"
                          ? "bg-white/5 text-gray-400 border border-white/10"
                          : "bg-white/5 text-gray-500 border border-white/5"
                      }`}>
                        {phase.status === "live" ? (
                          <><CheckCircle2 className="w-3 h-3" />{isAr ? phase.statusAr : phase.statusEn}</>
                        ) : phase.status === "soon" ? (
                          <><Clock className="w-3 h-3" />{isAr ? phase.statusAr : phase.statusEn}</>
                        ) : (
                          <><Lock className="w-3 h-3" />{isAr ? phase.statusAr : phase.statusEn}</>
                        )}
                      </div>
                    </div>

                    {/* Audience */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-gray-500 text-xs">{isAr ? "الجمهور:" : "Audience:"}</span>
                      <span className="text-gray-300 text-xs font-medium">
                        {isAr ? phase.audienceAr : phase.audienceEn}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6">
                    <ul className="space-y-3">
                      {(isAr ? phase.featuresAr : phase.featuresEn).map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div
                            className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: phase.status === "live" ? phase.color : "#555" }}
                          />
                          <span className={`text-sm ${phase.status === "live" ? "text-gray-200" : "text-gray-500"}`}>
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {phase.status === "live" && (
                      <div className="mt-6">
                        <Link href={isAuthenticated ? "/new-project" : getLoginUrl()}>
                          <button
                            className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${phase.color}, #FF8C3A)` }}
                          >
                            {isAr ? "ابدأ الآن" : "Get Started"}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    )}
                    {phase.status === "soon" && (
                      <div className="mt-6">
                        <button
                          className="w-full py-3 rounded-xl font-semibold text-gray-500 border border-white/10 flex items-center justify-center gap-2 cursor-not-allowed"
                          disabled
                        >
                          <Clock className="w-4 h-4" />
                          {isAr ? "قريباً" : "Coming Soon"}
                        </button>
                      </div>
                    )}
                    {phase.status === "future" && (
                      <div className="mt-6">
                        <button
                          className="w-full py-3 rounded-xl font-semibold text-gray-600 border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-4 h-4" />
                          {isAr ? "2027" : "2027"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline Marker */}
                <div className={`hidden md:flex flex-col items-center justify-start pt-8 ${idx % 2 === 1 ? "md:order-1" : ""}`}>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black border-2 mb-3"
                    style={{
                      borderColor: phase.status === "live" ? phase.color : "#333",
                      color: phase.status === "live" ? phase.color : "#555",
                      background: phase.status === "live" ? `${phase.color}15` : "#1A1A1A",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">
                      {isAr ? phase.titleAr : phase.titleEn}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {isAr ? phase.timelineAr : phase.timelineEn}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-[#1A1A1A] border border-[#FF6B00]/20 rounded-2xl p-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            {isAr ? "ابدأ رحلتك مع V1 اليوم" : "Start Your Journey with V1 Today"}
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            {isAr
              ? "انضم إلى المكاتب الهندسية وأصحاب الأراضي الذين يستخدمون SOAR.AI لتوليد مخططاتهم المعمارية في ثوانٍ"
              : "Join engineering offices and land owners using SOAR.AI to generate architectural blueprints in seconds"}
          </p>
          <Link href={isAuthenticated ? "/new-project" : getLoginUrl()}>
            <button className="px-8 py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-[#FF6B00] to-[#FF8C3A] hover:opacity-90 transition-all">
              {isAr ? "ابدأ مجاناً" : "Start for Free"}
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
