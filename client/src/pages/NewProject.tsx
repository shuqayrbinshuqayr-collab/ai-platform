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
import VoiceInput from "@/components/VoiceInput";
import { MapView } from "@/components/Map";
import {
  MapPin, Building2, Ruler, ChevronRight, ChevronLeft,
  Zap, CheckCircle, Mic, Home as HomeIcon,
  Plus, Minus, Brain, ArrowRight
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
  landArea: "", landWidth: "", landLength: "", landCoordinates: "", landShape: "rectangular",
  buildingRatio: "60", floorAreaRatio: "2", maxFloors: "4",
  frontSetback: "4", backSetback: "3", sideSetback: "2",
  buildingType: "residential", numberOfFloors: "2",
  parkingSpaces: "2", additionalRequirements: "",
  bedrooms: 4, bathrooms: 3, kitchens: 1, diningRooms: 1,
  livingRooms: 1, majlis: 1, maidRooms: 1, laundryRooms: 1,
  driverRooms: 0, annexes: 0, elevators: 0, garages: 1,
  entrances: 1, clubRooms: 0, balconies: 2,
  facadeStyle: "modern",
};

const facades = [
  { id: "modern", label: { ar: "عصري", en: "Modern" } },
  { id: "classic", label: { ar: "كلاسيكي", en: "Classic" } },
  { id: "contemporary", label: { ar: "معاصر", en: "Contemporary" } },
  { id: "arabic", label: { ar: "عربي تراثي", en: "Arabic Heritage" } },
  { id: "minimalist", label: { ar: "بسيط مينيمالي", en: "Minimalist" } },
  { id: "mediterranean", label: { ar: "متوسطي", en: "Mediterranean" } },
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
  const [mapReady, setMapReady] = useState(false);
  const [landMarker, setLandMarker] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const ArrowNext = isRTL ? ChevronLeft : ChevronRight;
  const ArrowPrev = isRTL ? ChevronRight : ChevronLeft;

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success(lang === "ar" ? "تم إنشاء المشروع — ارفع وثائق الأرض" : "Project created — upload land documents");
      navigate(`/projects/${data.id}/upload`);
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
    { id: 1, label: lang === "ar" ? "الاشتراطات" : "Regulations", icon: Ruler },
    { id: 2, label: lang === "ar" ? "متطلبات المبنى" : "Building Needs", icon: Building2 },
    { id: 3, label: lang === "ar" ? "الواجهة والتفاصيل" : "Facade & Details", icon: HomeIcon },
  ];

  const handleVoiceParsed = (parsed: Partial<FormData>) => {
    setForm(f => ({ ...f, ...parsed }));
    toast.success(lang === "ar" ? "تم تعبئة البيانات من الصوت!" : "Data filled from voice!");
  };

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
    // Add click listener to place marker
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setLandMarker({ lat, lng });
      set("landCoordinates", `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      // Remove old marker
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: lang === "ar" ? "موقع الأرض" : "Land Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "oklch(0.70 0.19 45)",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error(lang === "ar" ? "الرجاء إدخال اسم المشروع" : "Please enter a project name");
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

    createProject.mutate({
      name: form.name,
      description: form.description || undefined,
      landArea: form.landArea ? parseFloat(form.landArea) : undefined,
      landWidth: form.landWidth ? parseFloat(form.landWidth) : undefined,
      landLength: form.landLength ? parseFloat(form.landLength) : undefined,
      landCoordinates: form.landCoordinates || undefined,
      landShape: (form.landShape as any) || undefined,
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
            placeholder={lang === "ar" ? "مثال: فيلا سكنية - حي النرجس" : "e.g. Residential Villa - Al-Narjis"}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Voice Input */}
        <div className="soar-card rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-foreground font-semibold text-sm">{t(lang, "voiceInput")}</div>
              <div className="text-muted-foreground text-xs">{t(lang, "voiceHint")}</div>
            </div>
          </div>
          <VoiceInput lang={lang} onParsed={handleVoiceParsed} />
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

              {/* Building type selector */}
              <div>
                <Label className="text-muted-foreground text-sm mb-3 block">{lang === "ar" ? "نوع المبنى" : "Building Type"}</Label>
                <div className="flex gap-3">
                  {[
                    { val: "residential", icon: Building2, ar: "مبنى سكني", en: "Residential Building" },
                    { val: "villa", icon: HomeIcon, ar: "فيلا سكنية", en: "Residential Villa" },
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

              {/* Google Map */}
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">
                  {lang === "ar" ? "حدد موقع الأرض على الخريطة (انقر للتحديد)" : "Pin land location on map (click to mark)"}
                </Label>
                <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: 280 }}>
                  <MapView
                    onMapReady={handleMapReady}
                    initialCenter={{ lat: 24.7136, lng: 46.6753 }}
                    initialZoom={12}
                  />
                </div>
                {landMarker && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {lang === "ar" ? "تم تحديد الموقع:" : "Location marked:"} {landMarker.lat.toFixed(5)}, {landMarker.lng.toFixed(5)}
                  </div>
                )}
              </div>

              {/* Land dimensions */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "المساحة (م²)" : "Area (m²)"}</Label>
                  <Input type="number" value={form.landArea} onChange={e => set("landArea", e.target.value)}
                    placeholder="500" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "العرض (م)" : "Width (m)"}</Label>
                  <Input type="number" value={form.landWidth} onChange={e => set("landWidth", e.target.value)}
                    placeholder="20" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "الطول (م)" : "Length (m)"}</Label>
                  <Input type="number" value={form.landLength} onChange={e => set("landLength", e.target.value)}
                    placeholder="25" className="bg-input border-border text-foreground" />
                </div>
              </div>

              {/* Land shape */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">{lang === "ar" ? "شكل الأرض" : "Land Shape"}</Label>
                <Select value={form.landShape} onValueChange={v => set("landShape", v)}>
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="rectangular">{t(lang, "rectangular")}</SelectItem>
                    <SelectItem value="square">{t(lang, "square")}</SelectItem>
                    <SelectItem value="irregular">{t(lang, "irregular")}</SelectItem>
                    <SelectItem value="L-shape">{t(lang, "lShape")}</SelectItem>
                    <SelectItem value="T-shape">{t(lang, "tShape")}</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* ─── Step 1: Regulatory ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" />
                {lang === "ar" ? "الاشتراطات التنظيمية" : "Regulatory Requirements"}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "نسبة البناء (%)" : "Building Ratio (%)"}</Label>
                  <Input type="number" value={form.buildingRatio} onChange={e => set("buildingRatio", e.target.value)}
                    placeholder="60" min="0" max="100" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "معامل البناء (FAR)" : "Floor Area Ratio (FAR)"}</Label>
                  <Input type="number" value={form.floorAreaRatio} onChange={e => set("floorAreaRatio", e.target.value)}
                    placeholder="2.0" step="0.1" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "عدد الأدوار المسموح" : "Max Floors Allowed"}</Label>
                  <Input type="number" value={form.maxFloors} onChange={e => set("maxFloors", e.target.value)}
                    placeholder="4" min="1" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">{lang === "ar" ? "عدد الأدوار المطلوبة" : "Number of Floors"}</Label>
                  <Input type="number" value={form.numberOfFloors} onChange={e => set("numberOfFloors", e.target.value)}
                    placeholder="2" min="1" className="bg-input border-border text-foreground" />
                </div>
              </div>

              <div className="border-t border-border/40 pt-4">
                <Label className="text-muted-foreground text-sm mb-3 block">{lang === "ar" ? "الإرتدادات (م)" : "Setbacks (m)"}</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: "frontSetback" as keyof FormData, ar: "أمامي", en: "Front" },
                    { key: "backSetback" as keyof FormData, ar: "خلفي", en: "Back" },
                    { key: "sideSetback" as keyof FormData, ar: "جانبي", en: "Side" },
                  ].map(({ key, ar, en }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">{lang === "ar" ? ar : en}</Label>
                      <Input type="number" value={form[key] as string} onChange={e => set(key, e.target.value)}
                        placeholder="3" className="bg-input border-border text-foreground" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance preview */}
              {form.buildingRatio && form.landArea && (
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="text-xs text-primary font-mono mb-2">{lang === "ar" ? "// تقدير الامتثال //" : "// COMPLIANCE ESTIMATE //"}</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">{lang === "ar" ? "مساحة البناء المسموحة:" : "Allowed build area:"}</span>
                      <span className="text-primary font-bold ms-1">
                        {(parseFloat(form.landArea) * parseFloat(form.buildingRatio) / 100).toFixed(0)} m²
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{lang === "ar" ? "إجمالي المساحة البنائية:" : "Total floor area:"}</span>
                      <span className="text-primary font-bold ms-1">
                        {(parseFloat(form.landArea) * parseFloat(form.floorAreaRatio || "2")).toFixed(0)} m²
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                {facades.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set("facadeStyle", id)}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      form.facadeStyle === id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {/* Facade icon placeholder */}
                    <div className="w-full h-16 rounded-lg mb-2 border border-current/20 flex items-center justify-center bg-current/5">
                      <HomeIcon className="w-8 h-8 opacity-40" />
                    </div>
                    <span className="text-xs font-semibold">{lang === "ar" ? label.ar : label.en}</span>
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
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="gap-2 border-border/60 text-muted-foreground hover:text-foreground"
            >
              <ArrowPrev className="w-4 h-4" />
              {t(lang, "previous")}
            </Button>

            <span className="text-xs text-muted-foreground font-mono">
              {step + 1} / {steps.length}
            </span>

            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
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
