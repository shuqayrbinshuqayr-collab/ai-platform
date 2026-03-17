import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload, Search, FileImage, CheckCircle, AlertTriangle,
  Lightbulb, Loader2, ArrowRight, X, Building2,
  ShieldAlert, Star
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Section parser ─────────────────────────────────────────────────────────
function parseReportSections(report: string, lang: "ar" | "en") {
  const sections = [
    {
      key: "description",
      arTitle: "وصف المخطط",
      enTitle: "Blueprint Description",
      icon: Building2,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      key: "strengths",
      arTitle: "نقاط القوة",
      enTitle: "Strengths",
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      key: "deficiencies",
      arTitle: "النواقص المعمارية",
      enTitle: "Architectural Deficiencies",
      icon: AlertTriangle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 border-yellow-500/20",
    },
    {
      key: "violations",
      arTitle: "التعارضات مع الكود السعودي",
      enTitle: "Saudi Building Code Conflicts",
      icon: ShieldAlert,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
    {
      key: "recommendations",
      arTitle: "التوصيات",
      enTitle: "Recommendations",
      icon: Lightbulb,
      color: "text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
    },
  ];

  // Try to extract each section from the report
  const result: { section: typeof sections[0]; content: string }[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const title = lang === "ar" ? s.arTitle : s.enTitle;
    const nextTitle = i < sections.length - 1
      ? (lang === "ar" ? sections[i + 1].arTitle : sections[i + 1].enTitle)
      : null;
    const regex = nextTitle
      ? new RegExp(`(?:\\*\\*${title}\\*\\*|${title})[:\\s]*([\\s\\S]*?)(?=\\*\\*${nextTitle}\\*\\*|${nextTitle}|$)`, "i")
      : new RegExp(`(?:\\*\\*${title}\\*\\*|${title})[:\\s]*([\\s\\S]*)`, "i");
    const match = report.match(regex);
    if (match?.[1]?.trim()) {
      result.push({ section: s, content: match[1].trim() });
    }
  }
  // If parsing failed, return the full report as one block
  if (result.length === 0) {
    return null;
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function BlueprintAnalyzer() {
  const { lang, isRTL } = useLang();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = trpc.blueprints.analyze.useMutation({
    onSuccess: (data) => {
      setReport(typeof data.report === "string" ? data.report : "");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Upload via REST /api/upload
  const uploadToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.url as string;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(lang === "ar" ? "يرجى رفع ملف صورة فقط (PNG, JPG, PDF)" : "Please upload an image file (PNG, JPG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(lang === "ar" ? "حجم الملف يجب أن يكون أقل من 10 ميجابايت" : "File size must be less than 10MB");
      return;
    }
    setImageFile(file);
    setReport(null);
    setUploadedUrl(null);
    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to S3 via REST
    setIsUploading(true);
    try {
      const url = await uploadToServer(file);
      setUploadedUrl(url);
    } catch (err: any) {
      toast.error(lang === "ar" ? "فشل رفع الملف: " + err.message : "Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleFileChange(fakeEvent);
    }
  };

  const handleAnalyze = () => {
    if (!uploadedUrl) {
      toast.error(lang === "ar" ? "يرجى انتظار رفع الصورة أولاً" : "Please wait for the image to upload first");
      return;
    }
    analyzeMutation.mutate({ imageUrl: uploadedUrl, lang });
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadedUrl(null);
    setReport(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parsedSections = report ? parseReportSections(report, lang) : null;
  const isLoading = analyzeMutation.isPending;

  return (
    <div className="min-h-screen bg-background pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-10 max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 mb-5">
            <Search className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold text-purple-400">
              {lang === "ar" ? "تحليل المخططات بالذكاء الاصطناعي" : "AI Blueprint Analysis"}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            {lang === "ar" ? "ارفع مخططك وحلّله فوراً" : "Upload & Analyze Your Blueprint"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            {lang === "ar"
              ? "يقوم الذكاء الاصطناعي بتحليل مخططك المعماري ويكشف النواقص والتعارضات مع الكود السعودي للبناء (BCSA) ويقدم توصيات عملية للتحسين"
              : "Our AI analyzes your architectural blueprint to reveal deficiencies, Saudi Building Code (BCSA) conflicts, and provides practical improvement recommendations"}
          </p>
        </div>

        {/* Upload Area */}
        {!imagePreview ? (
          <div
            className="border-2 border-dashed border-purple-500/30 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-500/60 hover:bg-purple-500/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">
              {lang === "ar" ? "اسحب المخطط هنا أو انقر للرفع" : "Drag blueprint here or click to upload"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {lang === "ar" ? "PNG, JPG, JPEG — حتى 10 ميجابايت" : "PNG, JPG, JPEG — up to 10MB"}
            </p>
            <Button variant="outline" className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10">
              <FileImage className="w-4 h-4 me-2" />
              {lang === "ar" ? "اختر ملفاً" : "Choose File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview + Actions */}
            <div className="bg-card border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white truncate max-w-xs">{imageFile?.name}</span>
                  {isUploading && (
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {lang === "ar" ? "جاري الرفع..." : "Uploading..."}
                    </span>
                  )}
                  {uploadedUrl && !isUploading && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {lang === "ar" ? "تم الرفع" : "Uploaded"}
                    </span>
                  )}
                </div>
                <button onClick={handleReset} className="text-muted-foreground hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex justify-center bg-black/20">
                <img
                  src={imagePreview}
                  alt="Blueprint preview"
                  className="max-h-80 max-w-full object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Analyze Button */}
            {!report && (
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 gap-2"
                onClick={handleAnalyze}
                disabled={isLoading || isUploading || !uploadedUrl}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {lang === "ar" ? "جاري التحليل... قد يستغرق 30 ثانية" : "Analyzing... may take 30 seconds"}
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    {lang === "ar" ? "حلّل المخطط الآن" : "Analyze Blueprint Now"}
                    <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-400" />
                {lang === "ar" ? "تقرير التحليل" : "Analysis Report"}
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/60 hover:bg-white/5"
                onClick={handleReset}
              >
                {lang === "ar" ? "تحليل مخطط آخر" : "Analyze Another"}
              </Button>
            </div>

            {parsedSections ? (
              <div className="space-y-4">
                {parsedSections.map(({ section, content }) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.key} className={`rounded-xl border p-5 ${section.bg}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={`w-4 h-4 ${section.color}`} />
                        <h3 className={`font-bold text-sm ${section.color}`}>
                          {lang === "ar" ? section.arTitle : section.enTitle}
                        </h3>
                      </div>
                      <div className="text-sm text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
                        <Streamdown>{content}</Streamdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback: show full report as markdown
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <div className="text-sm text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none">
                  <Streamdown>{report}</Streamdown>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                className="border-white/20 text-white/70 hover:bg-white/5 gap-2"
                onClick={handleReset}
              >
                <Upload className="w-4 h-4" />
                {lang === "ar" ? "رفع مخطط آخر" : "Upload Another Blueprint"}
              </Button>
            </div>
          </div>
        )}

        {/* Info boxes */}
        {!report && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              {
                icon: Building2,
                color: "text-blue-400",
                bg: "bg-blue-500/10 border-blue-500/20",
                titleAr: "وصف المخطط",
                titleEn: "Blueprint Description",
                descAr: "نوع المبنى، الغرف، التوزيع العام",
                descEn: "Building type, rooms, general layout",
              },
              {
                icon: ShieldAlert,
                color: "text-red-400",
                bg: "bg-red-500/10 border-red-500/20",
                titleAr: "الكود السعودي",
                titleEn: "Saudi Building Code",
                descAr: "ارتدادات، ارتفاعات، نسب البناء، مواقف",
                descEn: "Setbacks, heights, FAR, parking",
              },
              {
                icon: Lightbulb,
                color: "text-orange-400",
                bg: "bg-orange-500/10 border-orange-500/20",
                titleAr: "توصيات التحسين",
                titleEn: "Improvement Tips",
                descAr: "اقتراحات عملية مرتبة حسب الأولوية",
                descEn: "Practical suggestions ordered by priority",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.titleAr} className={`rounded-xl border p-4 ${item.bg}`}>
                  <Icon className={`w-5 h-5 ${item.color} mb-2`} />
                  <div className={`font-bold text-sm ${item.color} mb-1`}>
                    {lang === "ar" ? item.titleAr : item.titleEn}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lang === "ar" ? item.descAr : item.descEn}
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
