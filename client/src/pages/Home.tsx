import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { Link } from "wouter";
import {
  Zap, Brain, Mic, FolderOpen, ArrowRight, ArrowLeft,
  CheckCircle, Building2, Layers, Ruler, FileText, Shield,
  ChevronRight
} from "lucide-react";

function BlueprintSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full opacity-90" xmlns="http://www.w3.org/2000/svg">
      {/* Grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="oklch(0.45 0.12 240 / 0.3)" strokeWidth="0.5"/>
        </pattern>
        <pattern id="grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="oklch(0.50 0.15 240 / 0.5)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#grid)" />
      <rect width="400" height="300" fill="url(#grid-major)" />

      {/* Floor plan outline */}
      <rect x="40" y="40" width="320" height="220" fill="none" stroke="oklch(0.65 0.20 220)" strokeWidth="2" />

      {/* Rooms */}
      <rect x="40" y="40" width="160" height="110" fill="oklch(0.55 0.18 240 / 0.15)" stroke="oklch(0.60 0.18 240)" strokeWidth="1.5" />
      <text x="120" y="100" textAnchor="middle" fill="oklch(0.75 0.15 220)" fontSize="10" fontFamily="'Share Tech Mono', monospace">LIVING ROOM</text>
      <text x="120" y="113" textAnchor="middle" fill="oklch(0.60 0.12 240)" fontSize="8" fontFamily="'Share Tech Mono', monospace">4.5 × 5.0 m</text>

      <rect x="200" y="40" width="160" height="110" fill="oklch(0.55 0.18 240 / 0.10)" stroke="oklch(0.60 0.18 240)" strokeWidth="1.5" />
      <text x="280" y="100" textAnchor="middle" fill="oklch(0.75 0.15 220)" fontSize="10" fontFamily="'Share Tech Mono', monospace">MASTER BED</text>
      <text x="280" y="113" textAnchor="middle" fill="oklch(0.60 0.12 240)" fontSize="8" fontFamily="'Share Tech Mono', monospace">4.0 × 5.0 m</text>

      <rect x="40" y="150" width="100" height="110" fill="oklch(0.55 0.18 240 / 0.08)" stroke="oklch(0.60 0.18 240)" strokeWidth="1.5" />
      <text x="90" y="210" textAnchor="middle" fill="oklch(0.75 0.15 220)" fontSize="9" fontFamily="'Share Tech Mono', monospace">KITCHEN</text>

      <rect x="140" y="150" width="120" height="110" fill="oklch(0.55 0.18 240 / 0.12)" stroke="oklch(0.60 0.18 240)" strokeWidth="1.5" />
      <text x="200" y="210" textAnchor="middle" fill="oklch(0.75 0.15 220)" fontSize="9" fontFamily="'Share Tech Mono', monospace">BEDROOM 2</text>

      <rect x="260" y="150" width="100" height="110" fill="oklch(0.55 0.18 240 / 0.08)" stroke="oklch(0.60 0.18 240)" strokeWidth="1.5" />
      <text x="310" y="210" textAnchor="middle" fill="oklch(0.75 0.15 220)" fontSize="9" fontFamily="'Share Tech Mono', monospace">BATHROOM</text>

      {/* Dimension lines */}
      <line x1="40" y1="275" x2="360" y2="275" stroke="oklch(0.55 0.15 220)" strokeWidth="1" markerEnd="url(#arrow)" />
      <line x1="40" y1="270" x2="40" y2="280" stroke="oklch(0.55 0.15 220)" strokeWidth="1" />
      <line x1="360" y1="270" x2="360" y2="280" stroke="oklch(0.55 0.15 220)" strokeWidth="1" />
      <text x="200" y="288" textAnchor="middle" fill="oklch(0.60 0.15 220)" fontSize="9" fontFamily="'Share Tech Mono', monospace">16.00 m</text>

      <line x1="375" y1="40" x2="375" y2="260" stroke="oklch(0.55 0.15 220)" strokeWidth="1" />
      <line x1="370" y1="40" x2="380" y2="40" stroke="oklch(0.55 0.15 220)" strokeWidth="1" />
      <line x1="370" y1="260" x2="380" y2="260" stroke="oklch(0.55 0.15 220)" strokeWidth="1" />
      <text x="392" y="155" textAnchor="middle" fill="oklch(0.60 0.15 220)" fontSize="9" fontFamily="'Share Tech Mono', monospace" transform="rotate(90, 392, 155)">11.00 m</text>

      {/* Corner markers */}
      <path d="M 40 40 L 55 40 M 40 40 L 40 55" stroke="oklch(0.70 0.22 200)" strokeWidth="2" />
      <path d="M 360 40 L 345 40 M 360 40 L 360 55" stroke="oklch(0.70 0.22 200)" strokeWidth="2" />
      <path d="M 40 260 L 55 260 M 40 260 L 40 245" stroke="oklch(0.70 0.22 200)" strokeWidth="2" />
      <path d="M 360 260 L 345 260 M 360 260 L 360 245" stroke="oklch(0.70 0.22 200)" strokeWidth="2" />

      {/* Title block */}
      <rect x="0" y="0" width="400" height="15" fill="oklch(0.20 0.08 240 / 0.8)" />
      <text x="10" y="11" fill="oklch(0.70 0.18 220)" fontSize="8" fontFamily="'Share Tech Mono', monospace">SOAR AI // GROUND FLOOR PLAN // SCALE 1:100</text>
    </svg>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { lang, isRTL } = useLang();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: Brain,
      title: t(lang, "feature2Title"),
      desc: t(lang, "feature2Desc"),
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30",
    },
    {
      icon: Ruler,
      title: t(lang, "feature1Title"),
      desc: t(lang, "feature1Desc"),
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30",
    },
    {
      icon: Mic,
      title: t(lang, "feature3Title"),
      desc: t(lang, "feature3Desc"),
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/30",
    },
    {
      icon: FolderOpen,
      title: t(lang, "feature4Title"),
      desc: t(lang, "feature4Desc"),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    },
  ];

  const capabilities = [
    { icon: Building2, label: lang === "ar" ? "تحليل بيانات الأرض" : "Land Data Analysis" },
    { icon: Shield, label: lang === "ar" ? "الاشتراطات التنظيمية" : "Regulatory Compliance" },
    { icon: Layers, label: lang === "ar" ? "توليد المخططات بالذكاء الاصطناعي" : "AI Blueprint Generation" },
    { icon: FileText, label: lang === "ar" ? "تصدير PDF و PNG" : "PDF & PNG Export" },
    { icon: Mic, label: lang === "ar" ? "إدخال صوتي بـ Whisper" : "Whisper Voice Input" },
    { icon: FolderOpen, label: lang === "ar" ? "إدارة المشاريع" : "Project Management" },
  ];

  return (
    <div className="min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10"
            style={{ background: "radial-gradient(ellipse, oklch(0.60 0.18 240), transparent)" }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-5"
            style={{ background: "radial-gradient(ellipse, oklch(0.65 0.22 200), transparent)" }} />
        </div>

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center py-16">
            {/* Left: Text */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm">
                <Zap className="w-3.5 h-3.5" />
                <span className="dimension-marker">{lang === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered Platform"}</span>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight">
                  {t(lang, "heroTitle")}
                </h1>
                <h2 className="text-4xl lg:text-5xl font-black text-glow"
                  style={{ color: "oklch(0.70 0.22 200)" }}>
                  {t(lang, "heroSubtitle")}
                </h2>
              </div>

              <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                {t(lang, "heroDesc")}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <Link href="/projects/new">
                    <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2 glow-blue px-8">
                      <Zap className="w-5 h-5" />
                      {t(lang, "newProject")}
                      <ArrowIcon className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2 glow-blue px-8"
                    onClick={() => window.location.href = getLoginUrl()}
                  >
                    <Zap className="w-5 h-5" />
                    {t(lang, "getStarted")}
                    <ArrowIcon className="w-4 h-4" />
                  </Button>
                )}
                <Link href="/gallery">
                  <Button size="lg" variant="outline" className="border-border/60 text-slate-300 hover:text-white hover:bg-white/5 gap-2 px-8">
                    {t(lang, "gallery")}
                  </Button>
                </Link>
              </div>

              {/* Capabilities */}
              <div className="grid grid-cols-2 gap-2">
                {capabilities.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-slate-400 text-sm">
                    <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Blueprint visualization */}
            <div className="relative">
              <div className="blueprint-card cad-corner rounded-lg p-4 glow-blue">
                <div className="dimension-marker mb-2 flex items-center justify-between">
                  <span>DWG-001 // FLOOR PLAN</span>
                  <span className="text-green-400 blueprint-pulse">● LIVE</span>
                </div>
                <div className="aspect-[4/3] rounded overflow-hidden"
                  style={{ background: "oklch(0.10 0.04 240)" }}>
                  <BlueprintSVG />
                </div>
                <div className="mt-2 flex items-center justify-between dimension-marker">
                  <span>SCALE: 1:100</span>
                  <span>AREA: 176.00 m²</span>
                  <span>SOAR AI v1.0</span>
                </div>
              </div>

              {/* Floating stats */}
              <div className="absolute -top-4 -right-4 blueprint-card rounded-lg p-3 text-center min-w-24">
                <div className="text-2xl font-black text-blue-300">30s</div>
                <div className="text-xs text-slate-400 dimension-marker">{lang === "ar" ? "وقت التوليد" : "Gen Time"}</div>
              </div>
              <div className="absolute -bottom-4 -left-4 blueprint-card rounded-lg p-3 text-center min-w-24">
                <div className="text-2xl font-black text-emerald-300">100%</div>
                <div className="text-xs text-slate-400 dimension-marker">{lang === "ar" ? "متوافق" : "Compliant"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <div className="dimension-marker text-blue-400">{lang === "ar" ? "// CAPABILITIES //" : "// CAPABILITIES //"}</div>
            <h2 className="text-4xl font-black text-white">
              {lang === "ar" ? "قدرات المنصة" : "Platform Capabilities"}
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              {lang === "ar"
                ? "منصة SOAR AI مصممة خصيصاً للمكاتب الهندسية لتسريع مرحلة التصميم الأولي"
                : "SOAR AI is designed specifically for engineering offices to accelerate the initial design phase"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="blueprint-card cad-corner rounded-lg p-6 space-y-4 hover:border-blue-400/40 transition-all group">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </div>
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <div className="dimension-marker text-blue-400">{lang === "ar" ? "// WORKFLOW //" : "// WORKFLOW //"}</div>
            <h2 className="text-4xl font-black text-white">
              {lang === "ar" ? "كيف يعمل SOAR AI" : "How SOAR AI Works"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: lang === "ar" ? "أدخل بيانات المشروع" : "Enter Project Data",
                desc: lang === "ar" ? "أدخل بيانات الأرض والاشتراطات التنظيمية ومتطلبات المستخدم، أو استخدم الإدخال الصوتي" : "Enter land data, regulatory constraints and user requirements, or use voice input",
              },
              {
                step: "02",
                title: lang === "ar" ? "الذكاء الاصطناعي يحلل ويولد" : "AI Analyzes & Generates",
                desc: lang === "ar" ? "يقوم الذكاء الاصطناعي بتحليل البيانات وتوليد مخطط معماري أولي متوافق مع الاشتراطات" : "AI analyzes data and generates a preliminary architectural blueprint compliant with regulations",
              },
              {
                step: "03",
                title: lang === "ar" ? "راجع وحمّل المخطط" : "Review & Download",
                desc: lang === "ar" ? "راجع المخطط المولّد وحمّله بصيغة PDF أو PNG، أو احفظه في مشاريعك" : "Review the generated blueprint and download it as PDF or PNG, or save it to your projects",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="blueprint-card cad-corner rounded-lg p-8 space-y-4">
                  <div className="text-6xl font-black dimension-marker opacity-30">{step}</div>
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <p className="text-slate-400 leading-relaxed">{desc}</p>
                </div>
                {step !== "03" && (
                  <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -end-4 z-10">
                    <ChevronRight className={`w-8 h-8 text-blue-400/40 ${isRTL ? "rotate-180" : ""}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <div className="blueprint-card cad-corner rounded-2xl p-12 text-center space-y-8 relative overflow-hidden glow-blue">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <BlueprintSVG />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="dimension-marker text-blue-400">// START NOW //</div>
              <h2 className="text-4xl font-black text-white">{t(lang, "ctaTitle")}</h2>
              <p className="text-slate-300 max-w-2xl mx-auto text-lg">{t(lang, "ctaDesc")}</p>
              {isAuthenticated ? (
                <Link href="/projects/new">
                  <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2 glow-blue px-10 text-lg">
                    <Zap className="w-5 h-5" />
                    {t(lang, "newProject")}
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2 glow-blue px-10 text-lg"
                  onClick={() => window.location.href = getLoginUrl()}
                >
                  <Zap className="w-5 h-5" />
                  {t(lang, "getStarted")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="font-black text-white" style={{ fontFamily: "'Share Tech Mono', monospace" }}>SOAR AI</span>
              <span className="text-slate-500 text-sm">
                {lang === "ar" ? "منصة المخططات المعمارية الذكية" : "Intelligent Architectural Blueprint Platform"}
              </span>
            </div>
            <div className="dimension-marker text-slate-500">
              © 2026 SOAR AI // ALL RIGHTS RESERVED
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
