import { Link, useLocation } from "wouter";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, LayoutDashboard, FolderPlus, Images, User, LogOut,
  Globe, Menu, X, ChevronDown, Crown, Zap, Map, Upload
} from "lucide-react";
import { useState } from "react";

export default function NavBar() {
  const { lang, setLang, isRTL } = useLang();
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: subscription } = trpc.subscription.get.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = subscription?.plan === "solo" || subscription?.plan === "office";

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { logout(); window.location.href = "/"; },
  });

  const navLinks = [
    { href: "/", label: t(lang, "home"), icon: Home },
    { href: "/roadmap", label: lang === "ar" ? "خارطة الطريق" : "Roadmap", icon: Map },
    ...(isAuthenticated ? [
      { href: "/dashboard", label: t(lang, "dashboard"), icon: LayoutDashboard },
      { href: "/projects/new", label: t(lang, "newProject"), icon: FolderPlus },
      { href: "/gallery", label: t(lang, "gallery"), icon: Images },
      { href: "/analyze", label: lang === "ar" ? "رفع مخطط" : "Analyze", icon: Upload },
    ] : []),
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl"
      style={{ background: "oklch(0.09 0.008 240 / 0.95)" }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Top orange accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg border border-primary/40 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
              {/* SOAR house icon */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 relative z-10" fill="none">
                <path d="M3 10.5L12 3l9 7.5V21H3V10.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="text-primary"/>
                <path d="M9 21V15h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="text-primary"/>
              </svg>
            </div>
            <div className="flex items-baseline leading-none">
              <span className="font-black text-white text-lg tracking-tight">SOAR</span>
              <span className="text-primary text-sm font-black tracking-tight">.AI</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1.5 text-sm font-medium transition-all ${
                    location === href
                      ? "text-primary bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-xs font-semibold"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ar" ? "EN" : "عربي"}
            </button>

            {isAuthenticated && user ? (
              <>
                {/* Pro badge or upgrade */}
                {isPro ? (
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30">
                    <Crown className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-black text-primary">PRO</span>
                  </div>
                ) : (
                  <Link href="/pricing">
                    <Button size="sm" className="hidden sm:flex gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3">
                      <Zap className="w-3.5 h-3.5" />
                      {lang === "ar" ? "ترقية" : "Upgrade"}
                    </Button>
                  </Link>
                )}

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 hover:border-primary/40 transition-all">
                      <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-black text-primary">
                          {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                        </span>
                      </div>
                      <span className="hidden sm:block text-sm text-foreground max-w-24 truncate">{user.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-52 bg-card border-border">
                    <div className="px-3 py-2.5 border-b border-border/50">
                      <div className="text-sm font-semibold text-foreground truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      {isPro && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-primary" />
                          <span className="text-xs text-primary font-bold">PRO Member</span>
                        </div>
                      )}
                    </div>
                    <Link href="/dashboard">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        {t(lang, "dashboard")}
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/profile">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        {t(lang, "profile")}
                      </DropdownMenuItem>
                    </Link>
                    {!isPro && (
                      <Link href="/pricing">
                        <DropdownMenuItem className="gap-2 cursor-pointer text-primary focus:text-primary">
                          <Crown className="w-4 h-4" />
                          {lang === "ar" ? "ترقية إلى Pro" : "Upgrade to Pro"}
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="w-4 h-4" />
                      {t(lang, "logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
                onClick={() => window.location.href = getLoginUrl()}
              >
                <Zap className="w-3.5 h-3.5" />
                {t(lang, "login")}
              </Button>
            )}

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl">
          <div className="container py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-2 ${
                    location === href ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
            {!isAuthenticated && (
              <Button
                className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
                onClick={() => window.location.href = getLoginUrl()}
              >
                <Zap className="w-4 h-4" />
                {t(lang, "login")}
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
