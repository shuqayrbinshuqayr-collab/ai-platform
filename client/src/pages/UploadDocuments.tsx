import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface UploadDocumentsProps {
  projectId: number;
}

interface ExtractedDeed {
  deedNumber?: string;
  plotNumber?: string;
  blockNumber?: string;
  planNumber?: string;
  neighborhoodName?: string;
  districtName?: string;
  cityName?: string;
  landArea?: number;
  propertyType?: string;
  landWidth?: number;
  landLength?: number;
  northLength?: number;
  southLength?: number;
  eastLength?: number;
  westLength?: number;
  northSetback?: number;
  southSetback?: number;
  eastSetback?: number;
  westSetback?: number;
  landShape?: string;
  ownerName?: string;
  deedDate?: string;
  notes?: string;
}

interface ExtractedBuildingCode {
  zoningCode?: string;
  allowedUses?: string;
  buildingRatio?: number;
  floorAreaRatio?: number;
  maxFloors?: number;
  maxHeight?: number;
  frontSetback?: number;
  backSetback?: number;
  sideSetback?: number;
  parkingRequirements?: string;
  specialConditions?: string;
  neighborhoodName?: string;
  municipalityName?: string;
  plotNumber?: string;
  blockNumber?: string;
  planNumber?: string;
}

export default function UploadDocuments({ projectId }: UploadDocumentsProps) {
  const [, navigate] = useLocation();
  const [deedFile, setDeedFile] = useState<File | null>(null);
  const [buildingCodeFile, setBuildingCodeFile] = useState<File | null>(null);
  const [deedUploading, setDeedUploading] = useState(false);
  const [buildingCodeUploading, setBuildingCodeUploading] = useState(false);
  const [extractedDeed, setExtractedDeed] = useState<ExtractedDeed | null>(null);
  const [extractedCode, setExtractedCode] = useState<ExtractedBuildingCode | null>(null);

  const deedInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const extractDeed = trpc.documents.extractDeed.useMutation();
  const extractBuildingCode = trpc.documents.extractBuildingCode.useMutation();
  const updateProject = trpc.projects.update.useMutation();

  // Upload file to S3 via server
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url as string;
  };

  const handleDeedUpload = async (file: File) => {
    setDeedFile(file);
    setDeedUploading(true);
    try {
      const url = await uploadFile(file);
      const result = await extractDeed.mutateAsync({ fileUrl: url, projectId });
      if (result.success) {
        setExtractedDeed(result.extracted);
        toast.success(`✅ تم استخراج بيانات الصك — الحي: ${result.extracted.neighborhoodName ?? "—"} | المساحة: ${result.extracted.landArea ?? "—"} م²`);
      } else {
        toast.error("⚠️ لم يتمكن النظام من قراءة الصك — تأكد أن الملف واضح وغير مشفر");
      }
    } catch {
      toast.error("خطأ في رفع الملف");
    } finally {
      setDeedUploading(false);
    }
  };

  const handleBuildingCodeUpload = async (file: File) => {
    setBuildingCodeFile(file);
    setBuildingCodeUploading(true);
    try {
      const url = await uploadFile(file);
      const result = await extractBuildingCode.mutateAsync({ fileUrl: url, projectId });
      if (result.success) {
        setExtractedCode(result.extracted);
        toast.success(`✅ تم استخراج نظام البناء — منطقة التقسيم: ${result.extracted.zoningCode ?? "—"} | نسبة البناء: ${result.extracted.buildingRatio ?? "—"}%`);
      } else {
        toast.error("⚠️ لم يتمكن النظام من قراءة نظام البناء");
      }
    } catch {
      toast.error("خطأ في رفع الملف");
    } finally {
      setBuildingCodeUploading(false);
    }
  };

  const handleSkip = () => {
    navigate(`/projects/${projectId}/requirements`);
  };

  const handleContinue = () => {
    navigate(`/projects/${projectId}/requirements`);
  };

  const canContinue = extractedDeed || extractedCode;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white" dir="rtl">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0f172a] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#f97316] font-bold text-xl">SOAR.AI</span>
            <span className="text-white/40">|</span>
            <span className="text-white/60 text-sm">رفع وثائق المشروع</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span className="w-6 h-6 rounded-full bg-[#f97316] text-white text-xs flex items-center justify-center font-bold">1</span>
            <span className="text-[#f97316]">الوثائق</span>
            <span className="mx-2">←</span>
            <span className="w-6 h-6 rounded-full bg-white/10 text-white/40 text-xs flex items-center justify-center">2</span>
            <span>الاحتياجات</span>
            <span className="mx-2">←</span>
            <span className="w-6 h-6 rounded-full bg-white/10 text-white/40 text-xs flex items-center justify-center">3</span>
            <span>التوليد</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">رفع وثائق الأرض</h1>
          <p className="text-white/50 text-lg">ارفع الملفين وسيستخرج النظام كل البيانات تلقائياً بدون إدخال يدوي</p>
          <p className="text-white/30 text-sm mt-2">الملفات اختيارية — يمكنك تخطي هذه الخطوة وإدخال البيانات يدوياً</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Deed Upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center">
                <span className="text-[#f97316] text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">صك الأرض</h3>
                <p className="text-white/40 text-xs">من وزارة العدل (ناجز)</p>
              </div>
              <Badge variant="outline" className="mr-auto border-white/20 text-white/40 text-xs">اختياري</Badge>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                deedFile
                  ? "border-[#f97316]/60 bg-[#f97316]/5"
                  : "border-white/20 hover:border-white/40 bg-white/5"
              }`}
              onClick={() => deedInputRef.current?.click()}
            >
              <input
                ref={deedInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleDeedUpload(e.target.files[0])}
              />
              {deedUploading ? (
                <div className="py-4">
                  <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white/60 text-sm">جاري استخراج البيانات...</p>
                </div>
              ) : deedFile && extractedDeed ? (
                <div className="py-2">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-400 text-xl">✓</span>
                  </div>
                  <p className="text-green-400 font-semibold text-sm mb-1">تم الاستخراج بنجاح</p>
                  <p className="text-white/40 text-xs">{deedFile.name}</p>
                </div>
              ) : (
                <div className="py-4">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-white/60 text-sm mb-1">اضغط لرفع صك الأرض</p>
                  <p className="text-white/30 text-xs">PDF أو صورة</p>
                </div>
              )}
            </div>

            {/* Extracted Deed Data */}
            {extractedDeed && (
              <Card className="mt-3 bg-[#0f172a] border-[#f97316]/20">
                <CardContent className="p-4">
                  <p className="text-[#f97316] text-xs font-bold mb-3">البيانات المستخرجة تلقائياً</p>
                  <div className="space-y-1.5 text-xs">
                    {extractedDeed.cityName && <div className="flex justify-between"><span className="text-white/40">المدينة</span><span className="text-white">{extractedDeed.cityName}</span></div>}
                    {(extractedDeed.neighborhoodName || extractedDeed.districtName) && <div className="flex justify-between"><span className="text-white/40">الحي</span><span className="text-white">{extractedDeed.neighborhoodName || extractedDeed.districtName}</span></div>}
                    {extractedDeed.planNumber && <div className="flex justify-between"><span className="text-white/40">رقم المخطط</span><span className="text-white">{extractedDeed.planNumber}</span></div>}
                    {extractedDeed.plotNumber && <div className="flex justify-between"><span className="text-white/40">رقم القطعة</span><span className="text-white">{extractedDeed.plotNumber}</span></div>}
                    {extractedDeed.propertyType && <div className="flex justify-between"><span className="text-white/40">نوع العقار</span><span className="text-white">{extractedDeed.propertyType}</span></div>}
                    {extractedDeed.landArea && <div className="flex justify-between"><span className="text-white/40">المساحة</span><span className="text-[#f97316] font-bold">{extractedDeed.landArea} م²</span></div>}
                    {(extractedDeed.northLength || extractedDeed.southLength) && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-white/30 text-xs mb-1">أبعاد الأرض</p>
                        {extractedDeed.northLength && <div className="flex justify-between"><span className="text-white/40">شمالاً</span><span className="text-white">{extractedDeed.northLength} م</span></div>}
                        {extractedDeed.southLength && <div className="flex justify-between"><span className="text-white/40">جنوباً</span><span className="text-white">{extractedDeed.southLength} م</span></div>}
                        {extractedDeed.eastLength && <div className="flex justify-between"><span className="text-white/40">شرقاً</span><span className="text-white">{extractedDeed.eastLength} م</span></div>}
                        {extractedDeed.westLength && <div className="flex justify-between"><span className="text-white/40">غرباً</span><span className="text-white">{extractedDeed.westLength} م</span></div>}
                      </div>
                    )}
                    {(extractedDeed.northSetback || extractedDeed.southSetback) && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-white/30 text-xs mb-1">الارتدادات</p>
                        {extractedDeed.northSetback && <div className="flex justify-between"><span className="text-white/40">أمامي</span><span className="text-[#f97316]">{extractedDeed.northSetback} م</span></div>}
                        {extractedDeed.southSetback && <div className="flex justify-between"><span className="text-white/40">خلفي</span><span className="text-[#f97316]">{extractedDeed.southSetback} م</span></div>}
                        {extractedDeed.eastSetback && <div className="flex justify-between"><span className="text-white/40">جانبي شرق</span><span className="text-[#f97316]">{extractedDeed.eastSetback} م</span></div>}
                        {extractedDeed.westSetback && <div className="flex justify-between"><span className="text-white/40">جانبي غرب</span><span className="text-[#f97316]">{extractedDeed.westSetback} م</span></div>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Building Code Upload */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <span className="text-blue-400 text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">نظام البناء</h3>
                <p className="text-white/40 text-xs">من أمانة الرياض — الخرائط المكانية</p>
              </div>
              <Badge variant="outline" className="mr-auto border-white/20 text-white/40 text-xs">اختياري</Badge>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                buildingCodeFile
                  ? "border-blue-500/60 bg-blue-500/5"
                  : "border-white/20 hover:border-white/40 bg-white/5"
              }`}
              onClick={() => codeInputRef.current?.click()}
            >
              <input
                ref={codeInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleBuildingCodeUpload(e.target.files[0])}
              />
              {buildingCodeUploading ? (
                <div className="py-4">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white/60 text-sm">جاري استخراج الاشتراطات...</p>
                </div>
              ) : buildingCodeFile && extractedCode ? (
                <div className="py-2">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-400 text-xl">✓</span>
                  </div>
                  <p className="text-green-400 font-semibold text-sm mb-1">تم الاستخراج بنجاح</p>
                  <p className="text-white/40 text-xs">{buildingCodeFile.name}</p>
                </div>
              ) : (
                <div className="py-4">
                  <div className="text-4xl mb-3">🏛️</div>
                  <p className="text-white/60 text-sm mb-1">اضغط لرفع نظام البناء</p>
                  <p className="text-white/30 text-xs">PDF أو صورة</p>
                </div>
              )}
            </div>

            {/* Extracted Building Code Data */}
            {extractedCode && (
              <Card className="mt-3 bg-[#0f172a] border-blue-500/20">
                <CardContent className="p-4">
                  <p className="text-blue-400 text-xs font-bold mb-3">الاشتراطات المستخرجة تلقائياً</p>
                  <div className="space-y-1.5 text-xs">
                    {extractedCode.zoningCode && <div className="flex justify-between"><span className="text-white/40">منطقة التقسيم</span><span className="text-blue-400 font-bold">{extractedCode.zoningCode}</span></div>}
                    {extractedCode.allowedUses && <div className="flex justify-between"><span className="text-white/40">الاستخدام</span><span className="text-white">{extractedCode.allowedUses}</span></div>}
                    {extractedCode.buildingRatio && <div className="flex justify-between"><span className="text-white/40">نسبة البناء</span><span className="text-white">{extractedCode.buildingRatio}%</span></div>}
                    {extractedCode.maxFloors && <div className="flex justify-between"><span className="text-white/40">الأدوار المسموحة</span><span className="text-white">{extractedCode.maxFloors}</span></div>}
                    {extractedCode.frontSetback && <div className="flex justify-between"><span className="text-white/40">الارتداد الأمامي</span><span className="text-white">{extractedCode.frontSetback} م</span></div>}
                    {extractedCode.backSetback && <div className="flex justify-between"><span className="text-white/40">الارتداد الخلفي</span><span className="text-white">{extractedCode.backSetback} م</span></div>}
                    {extractedCode.sideSetback && <div className="flex justify-between"><span className="text-white/40">الارتداد الجانبي</span><span className="text-white">{extractedCode.sideSetback} م</span></div>}
                    {extractedCode.floorAreaRatio && <div className="flex justify-between"><span className="text-white/40">معامل البناء</span><span className="text-white">{extractedCode.floorAreaRatio}</span></div>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#f97316]/10 border border-[#f97316]/20 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-[#f97316] text-xl mt-0.5">⚡</span>
            <div>
              <p className="text-[#f97316] font-semibold text-sm mb-1">كيف يعمل النظام؟</p>
              <p className="text-white/60 text-sm">
                بعد رفع الملفين، يقرأ النظام تلقائياً كل البيانات ويملأ حقول المشروع بدون أي إدخال يدوي.
                ثم تنتقل لخطوة إدخال احتياجات العميل (عدد الغرف، المتطلبات الخاصة) وتضغط توليد المخططات.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="border-white/20 text-white/60 hover:text-white hover:border-white/40 px-8"
          >
            تخطي — إدخال يدوي
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`px-10 py-3 font-bold text-base ${
              canContinue
                ? "bg-[#f97316] hover:bg-[#ea6c0a] text-white"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {canContinue ? "متابعة ← إدخال الاحتياجات" : "ارفع ملفاً للمتابعة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
