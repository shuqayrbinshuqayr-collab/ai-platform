import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import { User, Building2, Phone, Globe, Zap, Save } from "lucide-react";

export default function Profile() {
  const { isAuthenticated, user } = useAuth();
  const { lang, setLang, isRTL } = useLang();

  const [officeName, setOfficeName] = useState(user?.officeName ?? "");
  const [officePhone, setOfficePhone] = useState(user?.officePhone ?? "");

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم حفظ الملف الشخصي!" : "Profile saved!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
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

  const handleSave = () => {
    updateProfile.mutate({
      officeName: officeName || undefined,
      officePhone: officePhone || undefined,
      preferredLang: lang,
    });
  };

  return (
    <div className="min-h-screen pt-16" dir={isRTL ? "rtl" : "ltr"}>
      <NavBar />
      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="dimension-marker text-blue-400">// PROFILE //</div>
          <h1 className="text-3xl font-black text-white">{t(lang, "profile")}</h1>
        </div>

        {/* User Info Card */}
        <div className="blueprint-card cad-corner rounded-xl p-6 mb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-2xl font-black text-blue-300">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{user?.name}</div>
              <div className="text-slate-400 text-sm">{user?.email}</div>
              <div className="dimension-marker text-blue-400 text-xs mt-1">
                {user?.role === "admin" ? "ADMIN" : "ENGINEERING OFFICE"}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="blueprint-card cad-corner rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            {lang === "ar" ? "معلومات المكتب الهندسي" : "Engineering Office Information"}
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                {t(lang, "officeName")}
              </Label>
              <Input
                value={officeName}
                onChange={e => setOfficeName(e.target.value)}
                placeholder={lang === "ar" ? "مثال: مكتب الإبداع الهندسي" : "e.g. Creative Engineering Office"}
                className="bg-input border-border text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                {t(lang, "officePhone")}
              </Label>
              <Input
                value={officePhone}
                onChange={e => setOfficePhone(e.target.value)}
                placeholder="+966 5X XXX XXXX"
                className="bg-input border-border text-white placeholder:text-slate-500"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                {t(lang, "language")}
              </Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setLang("ar")}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    lang === "ar"
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-white/5 border-border/40 text-slate-400 hover:text-white"
                  }`}
                >
                  {t(lang, "arabic")} (العربية)
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    lang === "en"
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-white/5 border-border/40 text-slate-400 hover:text-white"
                  }`}
                >
                  {t(lang, "english")} (English)
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold gap-2 glow-blue"
          >
            <Save className="w-4 h-4" />
            {updateProfile.isPending ? t(lang, "loading") : t(lang, "saveProfile")}
          </Button>
        </div>
      </div>
    </div>
  );
}
