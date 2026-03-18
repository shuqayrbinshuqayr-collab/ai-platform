import { useAuth } from "@/_core/hooks/useAuth";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/NavBar";
import { useLocation } from "wouter";
import {
  Zap, ArrowRight, LayoutGrid, Image, FolderOpen,
  MapPin, Brain, Download, CheckCircle, Crown,
  Building2, Home as HomeIcon, Star, Upload, Search, Users
} from "lucide-react";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();

  const features = [
    {
      icon: MapPin,
      title: lang === "ar" ? "تحليل الأرض بالذكاء الاصطناعي" : "AI Land Analysis",
      desc: lang === "ar"
        ? "حدد موقع أرضك على الخريطة أو أدخل رقم الصك، ويقوم الذكاء الاصطناعي بتحليل الاشتراطات التنظيمية تلقائياً"
        : "Pin your land on the map or enter the deed number, and AI automatically analyzes regulatory requirements",
    },
    {
      icon: Brain,
      title: lang === "ar" ? "توليد 6 مفاهيم معمارية" : "Generate 6 Concepts",
      desc: lang === "ar"
        ? "بعد إدخال متطلباتك يتم توليد 6 مخططات معمارية مختلفة لتختار منها الأنسب لمشروعك"
        : "After entering your requirements, 6 different architectural concepts are generated for you to choose from",
    },
    {
      icon: Download,
      title: lang === "ar" ? "تحميل بصيغ احترافية" : "Professional Export",
      desc: lang === "ar"
        ? "حمّل مخططاتك بصيغة Revit أو AutoCAD، أو اطلب مراجعة رسمية من فريق SOAR"
        : "Download blueprints in Revit or AutoCAD format, or request official review from the SOAR team",
    },
  ];

  const buildingTypes = [
    { icon: HomeIcon, label: lang === "ar" ? "فيلا سكنية" : "Residential Villa" },
    { icon: Building2, label: lang === "ar" ? "مبنى سكني" : "Residential Building" },
  ];

  const stats = [
    { value: "6+", label: lang === "ar" ? "مفاهيم لكل مشروع" : "Concepts per project" },
    { value: "30s", label: lang === "ar" ? "وقت التوليد" : "Generation time" },
    { value: "100%", label: lang === "ar" ? "متوافق مع الاشتراطات" : "Regulatory compliant" },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(oklch(0.70 0.19 45) 1px, transparent 1px), linear-gradient(90deg, oklch(0.70 0.19 45) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Orange radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-8">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary tracking-wide">
                {lang === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI-Powered Design"}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
              {lang === "ar" ? (
                <>
                  مخططات معمارية<br />
                  <span className="text-orange-gradient">ذكية في ثوانٍ</span>
                </>
              ) : (
                <>
                  Smart Architectural<br />
                  <span className="text-orange-gradient">Blueprints in Seconds</span>
                </>
              )}
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {lang === "ar"
                ? "منصة SOAR.AI تحلل بيانات الأرض والاشتراطات التنظيمية لتوليد مخططات معمارية أولية احترافية تسرّع مرحلة التصميم الأولي"
                : "SOAR.AI analyzes land data and regulatory constraints to generate professional preliminary architectural blueprints that accelerate the initial design phase"}
            </p>

            {/* CTA — Three main actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16 max-w-3xl mx-auto w-full">
              {/* 1. Start new project */}
              <button
                onClick={() => isAuthenticated ? navigate("/projects/new") : (window.location.href = getLoginUrl())}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 hover:border-primary transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:bg-primary/30 transition-all">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-black text-white text-sm">{lang === "ar" ? "ابدأ مشروع جديد" : "Start New Project"}</div>
                  <div className="text-xs text-muted-foreground mt-1">{lang === "ar" ? "توليد مخططات بالذكاء الاصطناعي" : "AI-powered blueprint generation"}</div>
                </div>
              </button>
              {/* 2. Gallery */}
              <button
                onClick={() => navigate("/gallery")}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <LayoutGrid className="w-6 h-6 text-white/70" />
                </div>
                <div className="text-center">
                  <div className="font-black text-white text-sm">{lang === "ar" ? "معرض المخططات" : "Blueprint Gallery"}</div>
                  <div className="text-xs text-muted-foreground mt-1">{lang === "ar" ? "استعرض المشاريع السابقة" : "Browse previous projects"}</div>
                </div>
              </button>
              {/* 3. Upload & Analyze */}
              <button
                onClick={() => navigate("/analyze")}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                  <Upload className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-center">
                  <div className="font-black text-white text-sm">{lang === "ar" ? "رفع مخطط للتحليل" : "Upload & Analyze"}</div>
                  <div className="text-xs text-muted-foreground mt-1">{lang === "ar" ? "اكتشف ما ينقص مخططك" : "Discover what your plan is missing"}</div>
                </div>
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8">
              {stats.map((s) => (
                <div key={s.value} className="text-center">
                  <div className="text-3xl font-black text-primary">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      {/* ─── 4 Versions Roadmap Preview ─── */}
      <section className="py-20 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-sm font-semibold">{lang === "ar" ? "رؤية SOAR.AI" : "SOAR.AI Vision"}</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-3">
              {lang === "ar" ? "من الأرض إلى التنفيذ — 4 مراحل متكاملة" : "From Land to Execution — 4 Integrated Phases"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {lang === "ar" ? "SOAR.AI تبني منظومة متكاملة تأخذك من تحليل الأرض حتى تنفيذ المشروع" : "SOAR.AI builds an integrated ecosystem taking you from land analysis to project execution"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
            {[
              { v: "V1", status: "live", titleAr: "المخططات المعمارية", titleEn: "Architectural Blueprints", yearAr: "متاح الآن", yearEn: "Live Now", audienceAr: "أصحاب الأراضي · المكاتب الهندسية", audienceEn: "Land Owners · Engineering Offices" },
              { v: "V2", status: "soon", titleAr: "الحزمة الهندسية الكاملة", titleEn: "Full Engineering Package", yearAr: "2026", yearEn: "2026", audienceAr: "المكاتب الهندسية · أصحاب المشاريع", audienceEn: "Engineering Offices · Project Owners" },
              { v: "V3", status: "soon", titleAr: "الاعتماد الرسمي", titleEn: "Official Certification", yearAr: "2026", yearEn: "2026", audienceAr: "أصحاب المشاريع · المكاتب المعتمدة", audienceEn: "Project Owners · Certified Offices" },
              { v: "V4", status: "future", titleAr: "التسعير والتنفيذ", titleEn: "Pricing & Execution", yearAr: "2027", yearEn: "2027", audienceAr: "الأفراد · المطورون العقاريون", audienceEn: "Individuals · Real Estate Developers" },
            ].map(({ v, status, titleAr, titleEn, yearAr, yearEn, audienceAr, audienceEn }) => (
              <div key={v} className={`soar-card p-5 relative overflow-hidden ${
                status === "live" ? "border-primary/50" : status === "soon" ? "border-white/10" : "border-white/5"
              }`}>
                {status === "live" && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {lang === "ar" ? "متاح" : "LIVE"}
                    </span>
                  </div>
                )}
                <div className={`text-2xl font-black mb-2 ${
                  status === "live" ? "text-primary" : status === "soon" ? "text-gray-500" : "text-gray-700"
                }`}>{v}</div>
                <h3 className={`font-bold text-sm mb-1 ${
                  status === "live" ? "text-white" : "text-gray-500"
                }`}>{lang === "ar" ? titleAr : titleEn}</h3>
                <p className="text-[11px] text-gray-600 mb-2">{lang === "ar" ? audienceAr : audienceEn}</p>
                <p className={`text-xs font-semibold ${
                  status === "live" ? "text-primary" : "text-gray-600"
                }`}>{lang === "ar" ? yearAr : yearEn}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a href="/roadmap" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
              {lang === "ar" ? "عرض خارطة الطريق الكاملة" : "View Full Roadmap"}
              <span>→</span>
            </a>
          </div>
        </div>
      </section>
      {/* ─── How it works ─── */}
      <section className="py-20 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white mb-3">
              {lang === "ar" ? "كيف يعمل SOAR.AI؟" : "How SOAR.AI Works"}
            </h2>
            <p className="text-muted-foreground">
              {lang === "ar" ? "4 خطوات بسيطة من الأرض إلى المخطط" : "4 simple steps from land to blueprint"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                icon: MapPin,
                title: lang === "ar" ? "تحديد الأرض" : "Identify Land",
                desc: lang === "ar" ? "حدد موقع أرضك على خريطة Google أو أدخل رقم الصك" : "Pin your land on Google Maps or enter the deed number",
              },
              {
                step: "02",
                icon: Brain,
                title: lang === "ar" ? "تحليل الذكاء الاصطناعي" : "AI Analysis",
                desc: lang === "ar" ? "يحلل الذكاء الاصطناعي الاشتراطات التنظيمية ومساحة الأرض" : "AI analyzes regulatory requirements and land area",
              },
              {
                step: "03",
                icon: LayoutGrid,
                title: lang === "ar" ? "إدخال المتطلبات" : "Enter Requirements",
                desc: lang === "ar" ? "حدد نوع المبنى والغرف والمرافق والواجهة المطلوبة" : "Specify building type, rooms, amenities, and desired facade",
              },
              {
                step: "04",
                icon: Download,
                title: lang === "ar" ? "توليد وتحميل" : "Generate & Download",
                desc: lang === "ar" ? "اختر من 6 مفاهيم معمارية وحمّل بصيغة Revit أو AutoCAD" : "Choose from 6 concepts and download in Revit or AutoCAD",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="soar-card p-6 relative">
                <div className="text-5xl font-black text-primary/10 absolute top-4 right-4">{step}</div>
                <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Building Types ─── */}
      <section className="py-16 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-white mb-2">
              {lang === "ar" ? "أنواع المباني المدعومة" : "Supported Building Types"}
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {buildingTypes.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-border/60 bg-card/50 text-sm font-semibold text-foreground">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-white mb-3">
              {lang === "ar" ? "لماذا SOAR.AI؟" : "Why SOAR.AI?"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="soar-card p-7">
                <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section className="py-20 border-t border-border/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">
              {lang === "ar" ? "خطط الاشتراك" : "Subscription Plans"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <div className="soar-card p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-black text-xl text-white">{lang === "ar" ? "مجاني" : "Free"}</div>
                  <div className="text-2xl font-black text-foreground mt-1">{lang === "ar" ? "مجاناً" : "Free"}</div>
                </div>
                <div className="status-free px-3 py-1 rounded-full text-xs font-bold">FREE</div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {(lang === "ar"
                  ? ["مشروعان فقط", "مخططان يومياً", "تحليل الأرض", "توليد 6 مفاهيم"]
                  : ["2 projects only", "2 blueprints/day", "Land analysis", "6 concept generation"]
                ).map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-white/30 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full border-border/60 text-foreground hover:border-primary/50 hover:bg-primary/5"
                variant="outline"
              >
                {isAuthenticated ? (lang === "ar" ? "خطتك الحالية" : "Current Plan") : (lang === "ar" ? "ابدأ مجاناً" : "Start Free")}
              </Button>
            </div>
            {/* احترافي */}
            <div className="soar-card p-7 border-primary/40 glow-orange-sm relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="pro-badge flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {lang === "ar" ? "الأكثر شعبية" : "Most Popular"}
                </span>
              </div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-black text-xl text-white">{lang === "ar" ? "احترافي" : "Professional"}</div>
                  <div className="text-2xl font-black text-primary mt-1">{lang === "ar" ? "٥٠٠ ريال" : "SAR 500"}<span className="text-sm text-muted-foreground font-normal">/{lang === "ar" ? "شهر" : "mo"}</span></div>
                </div>
                <div className="status-pro px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" />PRO
                </div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {(lang === "ar"
                  ? ["مخططات غير محدودة", "مشاريع غير محدودة", "محرر المخططات التفاعلي", "تصدير DXF لـ AutoCAD", "نظام التعلم الذاتي", "دعم فني ذو أولوية"]
                  : ["Unlimited blueprints", "Unlimited projects", "Interactive editor", "DXF export for AutoCAD", "Self-learning AI", "Priority support"]
                ).map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2"
                onClick={() => navigate("/pricing")}
              >
                <Crown className="w-4 h-4" />
                {lang === "ar" ? "اشترك الآن" : "Subscribe Now"}
              </Button>
            </div>
            {/* مختص */}
            <div className="soar-card p-7 border-purple-500/40 relative" style={{boxShadow: "0 0 20px rgba(168,85,247,0.08)"}}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-black text-xl text-white">{lang === "ar" ? "مختص" : "Specialist"}</div>
                  <div className="text-2xl font-black text-purple-400 mt-1">{lang === "ar" ? "٢٠٠٠ ريال" : "SAR 2,000"}<span className="text-sm text-muted-foreground font-normal">/{lang === "ar" ? "شهر" : "mo"}</span></div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Users className="w-3 h-3" />{lang === "ar" ? "٣ مستخدمين" : "3 Users"}
                </div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {(lang === "ar"
                  ? ["كل مزايا الاحترافي", "حتى ٣ مستخدمين", "لوحة إدارة المكتب", "مشاريع مشتركة للفريق", "تقارير امتثال تفصيلية", "دعم فني ٢٤/٧"]
                  : ["All Professional features", "Up to 3 users", "Office management dashboard", "Shared team projects", "Detailed compliance reports", "24/7 priority support"]
                ).map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
                onClick={() => navigate("/pricing")}
              >
                <Users className="w-4 h-4" />
                {lang === "ar" ? "اشترك الآن" : "Subscribe Now"}
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* ─── CTA ─── */}
      {!isAuthenticated && (
        <section className="py-20 border-t border-border/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center soar-card p-12 border-primary/20">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4">
                {lang === "ar" ? "ابدأ مشروعك الآن" : "Start Your Project Now"}
              </h2>
              <p className="text-muted-foreground mb-8">
                {lang === "ar"
                  ? "انضم إلى SOAR.AI وابدأ في توليد مخططاتك المعمارية الاحترافية مجاناً"
                  : "Join SOAR.AI and start generating your professional architectural blueprints for free"}
              </p>
              <Button
                size="lg"
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-10 h-12 gap-2 glow-orange"
              >
                <Zap className="w-5 h-5" />
                {lang === "ar" ? "ابدأ مجاناً" : "Get Started Free"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                <path d="M3 10.5L12 3l9 7.5V21H3V10.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-primary"/>
              </svg>
            </div>
            <span className="font-black text-sm text-white">SOAR<span className="text-primary">.AI</span></span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 SOAR.AI — {lang === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved"}
          </p>
        </div>
      </footer>
    </div>
  );
}
