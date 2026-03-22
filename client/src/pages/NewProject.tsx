import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import {
  MapPin, Building2, Ruler, ChevronRight, ChevronLeft,
  Zap, CheckCircle, Home as HomeIcon,
  Plus, Minus, Brain, ArrowRight, Upload, FileText, X
} from "lucide-react";

type FormData = {
  name: string;
  description: string;
  // Land
  landArea: string;
  landWidth: string;
  landLength: string;
  landCoordinates: string;
  landShape: string;
  neighborhoodName: string;
  // Regulatory
  buildingRatio: string;
  floorAreaRatio: string;
  maxFloors: string;
  frontSetback: string;
  backSetback: string;
  sideSetback: string;
  // Requirements
  buildingType: string;
  numberOfFloors: string;
  parkingSpaces: string;
  additionalRequirements: string;
  // Detailed rooms
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  diningRooms: number;
  livingRooms: number;
  majlis: number;
  maidRooms: number;
  laundryRooms: number;
  driverRooms: number;
  annexes: number;
  elevators: number;
  garages: number;
  entrances: number;
  clubRooms: number;
  balconies: number;
  // Facade
  facadeStyle: string;
};

const defaultForm: FormData = {
  name: "", description: "",
  landArea: "300", landWidth: "15", landLength: "20", landCoordinates: "", landShape: "rectangular", neighborhoodName: "",
  buildingRatio: "60", floorAreaRatio: "2", maxFloors: "4",
  frontSetback: "", backSetback: "", sideSetback: "",
  buildingType: "", numberOfFloors: "2",
  parkingSpaces: "2", additionalRequirements: "",
  bedrooms: 4, bathrooms: 3, kitchens: 1, diningRooms: 1,
  livingRooms: 1, majlis: 1, maidRooms: 1, laundryRooms: 1,
  driverRooms: 0, annexes: 0, elevators: 0, garages: 1,
  entrances: 1, clubRooms: 0, balconies: 2,
  facadeStyle: "modern",
};

const facades = [
  { id: "modern",        img: "modern.webp",       label: { ar: "عصري",           en: "Modern" } },
  { id: "classic",       img: "classic.jpg",        label: { ar: "كلاسيكي",        en: "Classic" } },
  { id: "contemporary",  img: "contemporary.jpg",   label: { ar: "معاصر",           en: "Contemporary" } },
  { id: "arabic",        img: "najdi.jpg",          label: { ar: "نجدي",            en: "Arabic Heritage" } },
  { id: "minimalist",    img: "minimal.jpg",        label: { ar: "بسيط مينيمالي",  en: "Minimalist" } },
  { id: "mediterranean", img: "mediterranean.jpg",  label: { ar: "متوسطي",          en: "Mediterranean" } },
];

function Counter({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center font-bold text-foreground text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function NewProject() {
  const { isAuthenticated } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [landInputMode, setLandInputMode] = useState<"choose" | "documents" | "manual">("choose");
  const [deedFile, setDeedFile] = useState<File | null>(null);
  const [buildingCodeFile, setBuildingCodeFile] = useState<File | null>(null);
  const [uploadingDeed, setUploadingDeed] = useState(false);
  const [uploadingCode, setUploadingCode] = useState(false);
  const [deedUploaded, setDeedUploaded] = useState(false);
  const [buildingCodeUploaded, setBuildingCodeUploaded] = useState(false);
  const deedInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const ArrowNext = isRTL ? ChevronLeft : ChevronRight;
  const ArrowPrev = isRTL ? ChevronRight : ChevronLeft;

  const handleDocUpload = async (file: File, type: "deed" | "buildingCode", projectId?: number) => {
    const setUploading = type === "deed" ? setUploadingDeed : setUploadingCode;
    const setUploaded = type === "deed" ? setDeedUploaded : setBuildingCodeUploaded;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      if (projectId) fd.append("projectId", String(projectId));
      const res = await fetch("/api/upload/document", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      setUploaded(true);
      toast.success(lang === "ar" ? (type === "deed" ? "تم رفع الصك بنجاح" : "تم رفع نظام البناء بنجاح") : (type === "deed" ? "Deed uploaded" : "Building code uploaded"));
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ في الرفع" : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success(lang === "ar" ? "تم إنشاء المشروع — جاري توليد المخططات" : "Project created — generating blueprints");
      navigate(`/projects/${data.id}/generate`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <NavBar />
        <div className="soar-card rounded-xl p-12 text-center space-y-6 max-w-md">
          <Zap className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-white">{lang === "ar" ? "يجب تسجيل الدخول أولاً" : "Login Required"}</h2>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => window.location.href = getLoginUrl()}>
            {t(lang, "login")}
          </Button>
        </div>
      </div>
    );
  }

  const set = (key: keyof FormData, value: string | number) => setForm(f => ({ ...f, [key]: value }));

  const steps = [
    { id: 0, label: lang === "ar" ? "تحديد الأرض" : "Land Location", icon: MapPin },
    // Step 1 (Regulations) is processed automatically in backend — hidden from user
    { id: 2, label: lang === "ar" ? "متطلبات المبنى" : "Building Needs", icon: Building2 },
    { id: 3, label: lang === "ar" ? "الواجهة والتفاصيل" : "Facade & Details", icon: HomeIcon },
  ];


  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error(lang === "ar" ? "الرجاء إدخال اسم المشروع" : "Please enter a project name");
      return;
    }
    const lw = form.landWidth ? parseFloat(form.landWidth) : 0;
    const ll = form.landLength ? parseFloat(form.landLength) : 0;
    if (lw > 0 && ll > 0 && (lw < 10 || ll < 15)) {
      toast.error(lang === "ar"
        ? "أبعاد الأرض صغيرة جداً — الحد الأدنى 10م عرض × 15م عمق"
        : "Plot too small — minimum 10m width × 15m depth");
      return;
    }
    const additionalReqs = [
      form.additionalRequirements,
      `bedrooms:${form.bedrooms}`,
      `bathrooms:${form.bathrooms}`,
      `kitchens:${form.kitchens}`,
      `diningRooms:${form.diningRooms}`,
      `livingRooms:${form.livingRooms}`,
      `majlis:${form.majlis}`,
      `maidRooms:${form.maidRooms}`,
      `laundryRooms:${form.laundryRooms}`,
      `driverRooms:${form.driverRooms}`,
      `annexes:${form.annexes}`,
      `elevators:${form.elevators}`,
      `garages:${form.garages}`,
      `entrances:${form.entrances}`,
      `clubRooms:${form.clubRooms}`,
      `balconies:${form.balconies}`,
      `facadeStyle:${form.facadeStyle}`,
    ].filter(Boolean).join("|");

    console.error("SUBMIT LAND:", { landWidth: form.landWidth, landLength: form.landLength, landArea: form.landArea });
    createProject.mutate({
      name: form.name,
      description: form.description || undefined,
      landArea: form.landArea ? parseFloat(form.landArea) : undefined,
      landWidth: form.landWidth ? parseFloat(form.landWidth) : undefined,
      landLength: form.landLength ? parseFloat(form.landLength) : undefined,
      landCoordinates: form.landCoordinates || undefined,
      landShape: (form.landShape as any) || undefined,
      neighborhoodName: form.neighborhoodName || undefined,
      buildingRatio: form.buildingRatio ? parseFloat(form.buildingRatio) : undefined,
      floorAreaRatio: form.floorAreaRatio ? parseFloat(form.floorAreaRatio) : undefined,
      maxFloors: form.maxFloors ? parseInt(form.maxFloors) : undefined,
      frontSetback: form.frontSetback ? parseFloat(form.frontSetback) : undefined,
      backSetback: form.backSetback ? parseFloat(form.backSetback) : undefined,
      sideSetback: form.sideSetback ? parseFloat(form.sideSetback) : undefined,
      buildingType: (form.buildingType as any) || undefined,
      numberOfRooms: form.bedrooms,
      numberOfFloors: form.numberOfFloors ? parseInt(form.numberOfFloors) : undefined,
      parkingSpaces: form.parkingSpaces ? parseInt(form.parkingSpaces) : undefined,
      additionalRequirements: additionalReqs,
    });
  };

  const roomFields: { key: keyof FormData; labelAr: string; labelEn: string }[] = [
    { key: "bedrooms", labelAr: "غرف النوم", labelEn: "Bedrooms" },
    { key: "bathrooms", labelAr: "دورات المياه", labelEn: "Bathrooms" },
    { key: "kitchens", labelAr: "المطابخ", labelEn: "Kitchens" },
    { key: "diningRooms", labelAr: "غرف الطعام", labelEn: "Dining Rooms" },
    { key: "livingRooms", labelAr: "الصالات", labelEn: "Living Rooms" },
    { key: "majlis", labelAr: "المجالس", labelEn: "Majlis" },
    { key: "maidRooms", labelAr: "غرف الخدم", labelEn: "Maid Rooms" },
    { key: "laundryRooms", labelAr: "غرف الغسيل", labelEn: "Laundry Rooms" },
    { key: "driverRooms", labelAr: "غرف السائقين", labelEn: "Driver Rooms" },
    { key: "annexes", labelAr: "الملاحق", labelEn: "Annexes" },
    { key: "elevators", labelAr: "المصاعد", labelEn: "Elevators" },
    { key: "garages", labelAr: "الكراجات", labelEn: "Garages" },
    { key: "entrances", labelAr: "المداخل", labelEn: "Entrances" },
    { key: "clubRooms", labelAr: "غرف النادي", labelEn: "Club Rooms" },
    { key: "balconies", labelAr: "البلكونات", labelEn: "Balconies" },
  ];

  return (
    <div className="min-h-screen pt-16 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs text-primary font-mono mb-1 opacity-70">// NEW PROJECT //</div>
          <h1 className="text-3xl font-black text-white">{lang === "ar" ? "مشروع جديد" : "New Project"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "أدخل بيانات المشروع لتوليد 6 مخططات معمارية" : "Enter project data to generate 6 architectural concepts"}
          </p>
        </div>

        {/* Project name (always visible) */}
        <div className="soar-card rounded-xl p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-4 h-4 text-primary" />
            <Label className="text-foreground font-semibold">{lang === "ar" ? "اسم المشروع *" : "Project Name *"}</Label>
          </div>
          <Input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder={lang === "ar" ? "مثال: فيلا - حي النرجس" : "e.g. Villa - Al-Narjis"}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />

          {/* Building type */}
          <div className="mt-4">
            <Label className="text-muted-foreground text-sm mb-3 block">{lang === "ar" ? "نوع المبنى *" : "Building Type *"}</Label>
            <div className="flex gap-3">
              {[
                { val: "residential", icon: Building2, ar: "عمارة", en: "Residential Building" },
                { val: "villa", icon: HomeIcon, ar: "فيلا", en: "Residential Villa" },
              ].map(({ val, icon: Icon, ar, en }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("buildingType", val)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    form.buildingType === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{lang === "ar" ? ar : en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {steps.map(({ id, label, icon: Icon }, idx) => (
            <div key={id} className="flex items-center gap-1.5 flex-1">
              <button
                onClick={() => setStep(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 border ${
                  step === id
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : step > id
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-secondary/30 border-border/40 text-muted-foreground"
                }`}
              >
                {step > id ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="hidden sm:block truncate">{label}</span>
                <span className="sm:hidden">{id + 1}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`w-3 h-px flex-shrink-0 ${step > id ? "bg-green-500/40" : "bg-border/40"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="soar-card rounded-xl p-7 space-y-6">

          {/* ─── Step 0: Land Location ─── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {lang === "ar" ? "تحديد موقع الأرض" : "Land Location"}
              </h2>

              {/* ─── Land Input Mode Selector ─── */}
              {landInputMode === "choose" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {lang === "ar" ? "كيف تريد إدخال بيانات الأرض؟" : "How would you like to enter land data?"}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Option 1: Upload Documents */}
                    <button
                      type="button"
                      onClick={() => setLandInputMode("documents")}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-center group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-all">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground mb-1">
                          {lang === "ar" ? "رفع الوثائق" : "Upload Documents"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lang === "ar" ? "صك الأرض + نظام البناء" : "Land deed + building code"}
                        </div>
                        <div className="text-[10px] text-primary mt-1 font-semibold">
                          {lang === "ar" ? "✓ ملء تلقائي بالكامل" : "✓ Auto-fill everything"}
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Manual Entry */}
                    <button
                      type="button"
                      onClick={() => setLandInputMode("manual")}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border/50 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 transition-all text-center group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-secondary/40 border border-border/40 flex items-center justify-center group-hover:bg-secondary/60 transition-all">
                        <Ruler className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground mb-1">
                          {lang === "ar" ? "إدخال يدوي" : "Manual Entry"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lang === "ar" ? "أدخل المساحة والأبعاد" : "Enter area & dimensions"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {lang === "ar" ? "لا تملك الوثائق الآن" : "Don't have documents yet"}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Documents Mode ─── */}
              {landInputMode === "documents" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setLandInputMode("choose")}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" />
                      {lang === "ar" ? "تغيير الطريقة" : "Change method"}
                    </button>
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-xs text-primary font-semibold">
                      {lang === "ar" ? "رفع الوثائق" : "Upload Documents"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {lang === "ar" ? "النظام سيستخرج تلقائياً:" : "System will auto-extract:"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {(lang === "ar"
                        ? ["المساحة والأبعاد", "الحي والموقع", "نسبة البناء", "الارتفاعات المسموحة", "الارتدادات", "منطقة التقسيم"]
                        : ["Area & dimensions", "Neighborhood & location", "Building ratio", "Allowed heights", "Setbacks", "Zoning area"]
                      ).map(item => (
                        <div key={item} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Deed Upload */}
                    <div>
                      <input ref={deedInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setDeedFile(f); handleDocUpload(f, "deed"); }
                        }} />
                      <button type="button" onClick={() => deedInputRef.current?.click()}
                        className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          deedUploaded
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-dashed border-border/50 bg-secondary/20 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        }`}>
                        {uploadingDeed ? (
                          <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                        ) : deedUploaded ? (
                          <CheckCircle className="w-7 h-7" />
                        ) : (
                          <Upload className="w-7 h-7" />
                        )}
                        <span className="text-xs font-bold">
                          {deedUploaded ? (lang === "ar" ? "✓ تم رفع الصك" : "✓ Deed Uploaded")
                            : uploadingDeed ? (lang === "ar" ? "جاري الرفع..." : "Uploading...")
                            : (lang === "ar" ? "صك الأرض" : "Land Deed")}
                        </span>
                        <span className="text-[10px] opacity-60">{lang === "ar" ? "PDF أو صورة" : "PDF or image"}</span>
                        {deedFile && !uploadingDeed && (
                          <span className="text-[10px] opacity-50 truncate max-w-full">{deedFile.name}</span>
                        )}
                      </button>
                    </div>

                    {/* Building Code Upload */}
                    <div>
                      <input ref={codeInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setBuildingCodeFile(f); handleDocUpload(f, "buildingCode"); }
                        }} />
                      <button type="button" onClick={() => codeInputRef.current?.click()}
                        className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          buildingCodeUploaded
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-dashed border-border/50 bg-secondary/20 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        }`}>
                        {uploadingCode ? (
                          <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                        ) : buildingCodeUploaded ? (
                          <CheckCircle className="w-7 h-7" />
                        ) : (
                          <Upload className="w-7 h-7" />
                        )}
                        <span className="text-xs font-bold">
                          {buildingCodeUploaded ? (lang === "ar" ? "✓ تم رفع نظام البناء" : "✓ Code Uploaded")
                            : uploadingCode ? (lang === "ar" ? "جاري الرفع..." : "Uploading...")
                            : (lang === "ar" ? "نظام البناء" : "Building Code")}
                        </span>
                        <span className="text-[10px] opacity-60">{lang === "ar" ? "من البلدية أو الأمانة" : "From municipality / authority"}</span>
                        {buildingCodeFile && !uploadingCode && (
                          <span className="text-[10px] opacity-50 truncate max-w-full">{buildingCodeFile.name}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {(deedUploaded || buildingCodeUploaded) && (
                    <div className="flex items-center gap-2 text-xs text-primary p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      {lang === "ar"
                        ? "سيتم استخراج البيانات تلقائياً وتطبيقها على المخطط في الخلفية"
                        : "Data will be extracted automatically and applied to the blueprint in the background"}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Manual Mode ─── */}
              {landInputMode === "manual" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setLandInputMode("choose")}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" />
                      {lang === "ar" ? "تغيير الطريقة" : "Change method"}
                    </button>
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-xs text-muted-foreground font-semibold">
                      {lang === "ar" ? "إدخال يدوي" : "Manual Entry"}
                    </span>
                  </div>

              {/* Neighborhood / address */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">
                  {lang === "ar" ? "الحي أو العنوان" : "Neighborhood / Address"}
                </Label>
                <Input
                  value={form.neighborhoodName ?? ""}
                  onChange={e => set("neighborhoodName", e.target.value)}
                  placeholder={lang === "ar" ? "مثال: حي النرجس، الرياض" : "e.g. Al-Narjis, Riyadh"}
                  className="bg-input border-border text-foreground"
                />
              </div>

              {/* Land dimensions — area computed silently */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "عرض الأرض (م)" : "Land Width (m)"}</Label>
                  <Input type="number" min="1" value={form.landWidth}
                    onChange={e => {
                      const w = e.target.value;
                      const l = form.landLength;
                      const area = parseFloat(w) > 0 && parseFloat(l) > 0 ? String(parseFloat(w) * parseFloat(l)) : form.landArea;
                      setForm(f => ({ ...f, landWidth: w, landArea: area }));
                    }}
                    placeholder="15" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "طول الأرض (م)" : "Land Length (m)"}</Label>
                  <Input type="number" min="1" value={form.landLength}
                    onChange={e => {
                      const l = e.target.value;
                      const w = form.landWidth;
                      const area = parseFloat(w) > 0 && parseFloat(l) > 0 ? String(parseFloat(w) * parseFloat(l)) : form.landArea;
                      setForm(f => ({ ...f, landLength: l, landArea: area }));
                    }}
                    placeholder="20" className="bg-input border-border text-foreground" />
                </div>
              </div>


              {/* Setbacks — from building permit or land deed */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground text-xs font-semibold">
                    {lang === "ar" ? "الارتدادات (م)" : "Setbacks (m)"}
                  </Label>
                </div>
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-400 mb-2">
                  {lang === "ar"
                    ? "أدخل الارتدادات من رخصة البناء أو الصك — تختلف حسب البلدية وليس المدينة"
                    : "Enter setbacks from your building permit (رخصة البناء) or land deed (صك) — varies by municipality"}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{lang === "ar" ? "أمامي" : "Front"}</Label>
                    <Input type="number" step="0.5" value={form.frontSetback}
                      onChange={e => set("frontSetback", e.target.value)}
                      placeholder={lang === "ar" ? "م" : "m"}
                      className="bg-input border-border text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{lang === "ar" ? "خلفي" : "Back"}</Label>
                    <Input type="number" step="0.5" value={form.backSetback}
                      onChange={e => set("backSetback", e.target.value)}
                      placeholder={lang === "ar" ? "م" : "m"}
                      className="bg-input border-border text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">{lang === "ar" ? "جانبي" : "Side"}</Label>
                    <Input type="number" step="0.5" value={form.sideSetback}
                      onChange={e => set("sideSetback", e.target.value)}
                      placeholder={lang === "ar" ? "م" : "m"}
                      className="bg-input border-border text-foreground" />
                  </div>
                </div>
              </div>

              {/* Land preview */}
              {form.landWidth && form.landLength && (
                <div className="p-4 rounded-lg border border-border/40 bg-secondary/20">
                  <div className="text-xs text-primary font-mono mb-3">{lang === "ar" ? "// معاينة الأرض //" : "// LAND PREVIEW //"}</div>
                  <div className="flex items-center justify-center py-4">
                    <div className="relative border-2 border-primary/60 bg-primary/5"
                      style={{
                        width: `${Math.min(200, parseFloat(form.landWidth) * 8)}px`,
                        height: `${Math.min(160, parseFloat(form.landLength) * 8)}px`,
                      }}>
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-primary font-mono">{form.landWidth}m</span>
                      <span className="absolute top-1/2 -translate-y-1/2 -end-12 text-xs text-primary font-mono">{form.landLength}m</span>
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-primary font-bold">
                        {form.landArea || (parseFloat(form.landWidth) * parseFloat(form.landLength)).toFixed(0)} m²
                      </span>
                    </div>
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
          )}

          {/* Step 1 (Regulations) — processed silently in backend, not shown to user */}

          {/* ─── Step 2: Building Requirements ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {lang === "ar" ? "متطلبات المبنى" : "Building Requirements"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "بناءً على مساحة الأرض والاشتراطات، يتم تحديد العدد المسموح لكل قسم تلقائياً"
                  : "Based on land area and regulations, allowed counts per section are determined automatically"}
              </p>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {roomFields.map(({ key, labelAr, labelEn }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{lang === "ar" ? labelAr : labelEn}</span>
                    <Counter
                      value={form[key] as number}
                      onChange={(v) => set(key, v)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <Label className="text-muted-foreground text-xs">{lang === "ar" ? "متطلبات إضافية" : "Additional Requirements"}</Label>
                <Textarea
                  value={form.additionalRequirements}
                  onChange={e => set("additionalRequirements", e.target.value)}
                  placeholder={lang === "ar" ? "مثال: مطبخ مفتوح، مصلى، مسبح، جلسة خارجية..." : "e.g. Open kitchen, prayer room, pool, outdoor seating..."}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground min-h-20 text-sm"
                />
              </div>
            </div>
          )}

          {/* ─── Step 3: Facade & Details ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HomeIcon className="w-5 h-5 text-primary" />
                {lang === "ar" ? "اختيار الواجهة" : "Facade Selection"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lang === "ar"
                  ? "اختر شكل الواجهة المطلوب — يتم بناء المخطط بناءً على الواجهة المختارة"
                  : "Choose the desired facade style — the blueprint is built based on the selected facade"}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {facades.map(({ id, img, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set("facadeStyle", id)}
                    className={`rounded-xl border-2 transition-all text-center overflow-hidden ${
                      form.facadeStyle === id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/50 hover:border-primary/40"
                    }`}
                  >
                    <img
                      src={`/facades/${img}`}
                      className="w-full h-36 object-cover"
                      alt={label.ar}
                    />
                    <div className={`py-2 px-2 text-xs font-semibold ${
                      form.facadeStyle === id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}>
                      {lang === "ar" ? label.ar : label.en}
                    </div>
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="text-xs text-primary font-mono">{lang === "ar" ? "// ملخص المشروع //" : "// PROJECT SUMMARY //"}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "المساحة:" : "Area:"}</span>
                    <span className="text-foreground font-semibold">{form.landArea || "—"} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "الأدوار:" : "Floors:"}</span>
                    <span className="text-foreground font-semibold">{form.numberOfFloors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "غرف النوم:" : "Bedrooms:"}</span>
                    <span className="text-foreground font-semibold">{form.bedrooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "الحمامات:" : "Bathrooms:"}</span>
                    <span className="text-foreground font-semibold">{form.bathrooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "الواجهة:" : "Facade:"}</span>
                    <span className="text-primary font-semibold">{facades.find(f => f.id === form.facadeStyle)?.[lang === "ar" ? "label" : "label"]?.[lang as "ar" | "en"]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "ar" ? "نوع المبنى:" : "Type:"}</span>
                    <span className="text-foreground font-semibold capitalize">{form.buildingType}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => {
                // Skip step 1 (regulations) — handled in backend
                const prevStep = step === 2 ? 0 : Math.max(0, step - 1);
                setStep(prevStep);
              }}
              disabled={step === 0}
              className="gap-2 border-border/60 text-muted-foreground hover:text-foreground"
            >
              <ArrowPrev className="w-4 h-4" />
              {t(lang, "previous")}
            </Button>

            <span className="text-xs text-muted-foreground font-mono">
              {steps.findIndex(s => s.id === step) + 1} / {steps.length}
            </span>

            {step < steps[steps.length - 1].id ? (
              <Button
                onClick={() => {
                  // Skip step 1 (regulations) — handled in backend
                  const nextStep = step === 0 ? 2 : Math.min(3, step + 1);
                  setStep(nextStep);
                }}
                disabled={
                  // Always require building type selection
                  (step === 0 && !form.buildingType) ||
                  // Step 0: must select a mode, and fulfill that mode's requirements
                  (step === 0 && landInputMode === "choose") ||
                  (step === 0 && landInputMode === "manual" && (!form.landWidth || !form.landLength)) ||
                  (step === 0 && landInputMode === "documents" && !deedUploaded && !buildingCodeUploaded) ||
                  // Step 2: must have at least 1 bedroom and 1 bathroom
                  (step === 2 && (form.bedrooms < 1 || form.bathrooms < 1))
                }
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {t(lang, "next")}
                <ArrowNext className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createProject.isPending}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold glow-orange"
              >
                <Brain className="w-4 h-4" />
                {createProject.isPending
                  ? (lang === "ar" ? "جاري الإنشاء..." : "Creating...")
                  : (lang === "ar" ? "توليد المخططات" : "Generate Blueprints")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
