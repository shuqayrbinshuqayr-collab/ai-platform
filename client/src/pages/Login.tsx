import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({ email, password, name });
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message ?? "حدث خطأ، حاول مجددًا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src="/soar-logo.png" alt="SOAR.AI" style={{ height: "60px", width: "auto", mixBlendMode: "screen" }} />
          </div>
          <p className="text-gray-400 mt-2 text-sm">منصة التصميم المعماري الذكي</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl">
          {/* Google Button */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full border border-gray-700 rounded-lg py-3 px-4 text-white hover:bg-gray-800 transition-colors mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>المتابعة بـ Google</span>
          </a>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm">أو</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-700 mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            {mode === "register" && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">الاسم</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">كلمة المرور</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "6 أحرف على الأقل" : "كلمة المرور"}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition-colors"
            >
              {loading
                ? "جارٍ التحميل..."
                : mode === "login"
                ? "تسجيل الدخول"
                : "إنشاء حساب"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
