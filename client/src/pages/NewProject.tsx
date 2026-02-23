import { useState, useRef } from "react";
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
import {
  MapPin, Building2, Ruler, ChevronRight, ChevronLeft,
  Zap, CheckCircle, Mic, ArrowRight, ArrowLeft
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
  numberOfRooms: string;
  numberOfFloors: string;
  parkingSpaces: string;
  additionalRequirements: string;
};

const defaultForm: FormData = {
  name: "", description: "",
  landArea: "", landWidth: "", landLength: "", landCoordinates: "", landShape: "rectangular",
  buildingRatio: "60", floorAreaRatio: "2", maxFloors: "4",
  frontSetback: "4", backSetback: "3", sideSetback: "2",
  buildingType: "residential", numberOfRooms: "4", numberOfFloors: "2",
  parkingSpaces: "2", additionalRequirements: "",
};

export default function NewProject() {
  const { isAuthenticated } = useAuth();
  const { lang, isRTL } = useLang();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const ArrowNext = isRTL ? ChevronLeft : ChevronRight;
  const ArrowPrev = isRTL ? ChevronRight : ChevronLeft;

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success(lang === "ar" ? "تم إنشاء المشروع بنجاح!" : "Project created successfully!");
      navigate(`/projects/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
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

  const set = (key: keyof FormData, value: string) => setForm(f => ({ ...f, [key]: value }));

  const steps = [
    { id: 0, label: lang === "ar" ? "معلومات المشروع" : "Project Info", icon: Building2 },
    { id: 1, label: t(lang, "landData"), icon: MapPin },
    { id: 2, label: t(lang, "regulatoryConstraints"), icon: Ruler },
    { id: 3, label: t(lang, "userRequirements"), icon: Building2 },
  ];

  const handleVoiceParsed = (parsed: Partial<FormData>) => {
    setForm(f => ({ ...f, ...parsed }));
    toast.success(lang === "ar" ? "تم تعبئة البيانات من الصوت!" : "Data filled from voice!");
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error(lang === "ar" ? "الرجاء إدخال اسم المشروع" : "Please enter a project name");
      return;
    }
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
      numberOfRooms: form.numberOfRooms ? parseInt(form.numberOfRooms) : undefined,
      numberOfFloors: form.numberOfFloors ? parseInt(form.numberOfFloors) : undefined,
      parkingSpaces: form.parkingSpaces ? parseInt(form.parkingSpaces) : undefined,
      additionalRequirements: form.additionalRequirements || undefined,
    });
  };

  return (
    <div className="min-h-screen pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="dimension-marker text-blue-400">// NEW PROJECT //</div>
          <h1 className="text-3xl font-black text-white">{t(lang, "createProject")}</h1>
          <p className="text-slate-400">{lang === "ar" ? "أدخل بيانات المشروع لتوليد المخطط المعماري الأولي" : "Enter project data to generate the preliminary architectural blueprint"}</p>
        </div>

        {/* Voice Input Banner */}
        <div className="blueprint-card rounded-lg p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Mic className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{t(lang, "voiceInput")}</div>
              <div className="text-slate-400 text-xs">{t(lang, "voiceHint")}</div>
            </div>
          </div>
          <VoiceInput lang={lang} onParsed={handleVoiceParsed} />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map(({ id, label, icon: Icon }, idx) => (
            <div key={id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${
                  step === id
                    ? "bg-blue-500/20 border border-blue-500/50 text-blue-300"
                    : step > id
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border border-border/40 text-slate-500"
                }`}
              >
                {step > id ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="hidden sm:block truncate">{label}</span>
                <span className="sm:hidden">{id + 1}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`w-4 h-px flex-shrink-0 ${step > id ? "bg-emerald-500/40" : "bg-border/40"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="blueprint-card cad-corner rounded-xl p-8 space-y-6">
          {/* Step 0: Project Info */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                {lang === "ar" ? "معلومات المشروع" : "Project Information"}
              </h2>
              <div className="space-y-2">
                <Label className="text-slate-300">{t(lang, "projectName")} *</Label>
                <Input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder={lang === "ar" ? "مثال: فيلا سكنية - حي النرجس" : "e.g. Residential Villa - Al-Narjis District"}
                  className="bg-input border-border text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t(lang, "projectDesc")}</Label>
                <Textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder={lang === "ar" ? "وصف مختصر للمشروع..." : "Brief project description..."}
                  className="bg-input border-border text-white placeholder:text-slate-500 min-h-24"
                />
              </div>
            </div>
          )}

          {/* Step 1: Land Data */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                {t(lang, "landData")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "landArea")}</Label>
                  <Input type="number" value={form.landArea} onChange={e => set("landArea", e.target.value)}
                    placeholder="500" className="bg-input border-border text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "landShape")}</Label>
                  <Select value={form.landShape} onValueChange={v => set("landShape", v)}>
                    <SelectTrigger className="bg-input border-border text-white">
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
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "landWidth")}</Label>
                  <Input type="number" value={form.landWidth} onChange={e => set("landWidth", e.target.value)}
                    placeholder="20" className="bg-input border-border text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "landLength")}</Label>
                  <Input type="number" value={form.landLength} onChange={e => set("landLength", e.target.value)}
                    placeholder="25" className="bg-input border-border text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t(lang, "landCoordinates")}</Label>
                <Input value={form.landCoordinates} onChange={e => set("landCoordinates", e.target.value)}
                  placeholder="24.7136, 46.6753" className="bg-input border-border text-white placeholder:text-slate-500" />
              </div>

              {/* Land preview */}
              {form.landWidth && form.landLength && (
                <div className="mt-4 p-4 rounded-lg border border-border/40 bg-white/3">
                  <div className="dimension-marker text-blue-400 mb-3">{lang === "ar" ? "معاينة الأرض" : "Land Preview"}</div>
                  <div className="flex items-center justify-center">
                    <div className="relative border-2 border-blue-400/60 bg-blue-500/5"
                      style={{
                        width: `${Math.min(200, parseFloat(form.landWidth) * 8)}px`,
                        height: `${Math.min(160, parseFloat(form.landLength) * 8)}px`,
                      }}>
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 dimension-marker text-blue-400">{form.landWidth}m</span>
                      <span className="absolute top-1/2 -translate-y-1/2 -end-12 dimension-marker text-blue-400">{form.landLength}m</span>
                      <span className="absolute inset-0 flex items-center justify-center dimension-marker text-blue-300">
                        {form.landArea || (parseFloat(form.landWidth) * parseFloat(form.landLength)).toFixed(0)} m²
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Regulatory */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Ruler className="w-5 h-5 text-yellow-400" />
                {t(lang, "regulatoryConstraints")}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "buildingRatio")}</Label>
                  <Input type="number" value={form.buildingRatio} onChange={e => set("buildingRatio", e.target.value)}
                    placeholder="60" min="0" max="100" className="bg-input border-border text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "floorAreaRatio")}</Label>
                  <Input type="number" value={form.floorAreaRatio} onChange={e => set("floorAreaRatio", e.target.value)}
                    placeholder="2.0" step="0.1" className="bg-input border-border text-white" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-slate-300">{t(lang, "maxFloors")}</Label>
                  <Input type="number" value={form.maxFloors} onChange={e => set("maxFloors", e.target.value)}
                    placeholder="4" min="1" className="bg-input border-border text-white" />
                </div>
              </div>
              <div className="border-t border-border/40 pt-4">
                <Label className="text-slate-300 mb-3 block">{lang === "ar" ? "الإرتدادات (م)" : "Setbacks (m)"}</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs">{t(lang, "frontSetback")}</Label>
                    <Input type="number" value={form.frontSetback} onChange={e => set("frontSetback", e.target.value)}
                      placeholder="4" className="bg-input border-border text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs">{t(lang, "backSetback")}</Label>
                    <Input type="number" value={form.backSetback} onChange={e => set("backSetback", e.target.value)}
                      placeholder="3" className="bg-input border-border text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs">{t(lang, "sideSetback")}</Label>
                    <Input type="number" value={form.sideSetback} onChange={e => set("sideSetback", e.target.value)}
                      placeholder="2" className="bg-input border-border text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Requirements */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                {t(lang, "userRequirements")}
              </h2>
              <div className="space-y-2">
                <Label className="text-slate-300">{t(lang, "buildingType")}</Label>
                <Select value={form.buildingType} onValueChange={v => set("buildingType", v)}>
                  <SelectTrigger className="bg-input border-border text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {(["residential","commercial","mixed","industrial","governmental","educational","healthcare"] as const).map(type => (
                      <SelectItem key={type} value={type}>{t(lang, type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "numberOfRooms")}</Label>
                  <Input type="number" value={form.numberOfRooms} onChange={e => set("numberOfRooms", e.target.value)}
                    placeholder="4" min="1" className="bg-input border-border text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "numberOfFloors")}</Label>
                  <Input type="number" value={form.numberOfFloors} onChange={e => set("numberOfFloors", e.target.value)}
                    placeholder="2" min="1" className="bg-input border-border text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">{t(lang, "parkingSpaces")}</Label>
                  <Input type="number" value={form.parkingSpaces} onChange={e => set("parkingSpaces", e.target.value)}
                    placeholder="2" min="0" className="bg-input border-border text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">{t(lang, "additionalRequirements")}</Label>
                <Textarea
                  value={form.additionalRequirements}
                  onChange={e => set("additionalRequirements", e.target.value)}
                  placeholder={lang === "ar" ? "مثال: مطبخ مفتوح، غرفة خادمة، مصلى، مسبح..." : "e.g. Open kitchen, maid room, prayer room, pool..."}
                  className="bg-input border-border text-white placeholder:text-slate-500 min-h-24"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="gap-2 border-border/60 text-slate-300 hover:text-white"
            >
              <ArrowPrev className="w-4 h-4" />
              {t(lang, "previous")}
            </Button>

            <span className="dimension-marker text-slate-500">
              {t(lang, "step")} {step + 1} {t(lang, "of")} {steps.length}
            </span>

            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                className="gap-2 bg-blue-500 hover:bg-blue-400 text-white"
              >
                {t(lang, "next")}
                <ArrowNext className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createProject.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold glow-accent"
              >
                <Zap className="w-4 h-4" />
                {createProject.isPending ? t(lang, "loading") : t(lang, "saveProject")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
