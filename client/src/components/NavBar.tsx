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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home, LayoutDashboard, FolderPlus, Images, User, LogOut,
  Globe, Menu, X, ChevronDown, Zap
} from "lucide-react";
import { useState } from "react";

export default function NavBar() {
  const { lang, setLang, isRTL } = useLang();
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { logout(); window.location.href = "/"; },
  });

  const navLinks = [
    { href: "/", label: t(lang, "home"), icon: Home },
    ...(isAuthenticated ? [
      { href: "/dashboard", label: t(lang, "dashboard"), icon: LayoutDashboard },
      { href: "/projects/new", label: t(lang, "newProject"), icon: FolderPlus },
      { href: "/gallery", label: t(lang, "gallery"), icon: Images },
    ] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl"
      style={{ background: "oklch(0.11 0.04 240 / 0.92)" }}>
      {/* Top accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60" />

      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-lg border border-blue-400/40 bg-blue-500/10" />
              <Zap className="w-5 h-5 text-blue-400 relative z-10" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-white text-lg tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                SOAR AI
              </span>
              <span className="text-blue-400/70 text-[9px] tracking-widest uppercase dimension-marker hidden sm:block">
                {lang === "ar" ? "منصة المخططات المعمارية" : "Architectural Blueprint Platform"}
              </span>
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
                      ? "text-blue-300 bg-blue-500/15 border border-blue-500/30"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="gap-1.5 text-slate-300 hover:text-white hover:bg-white/5 border border-border/50 text-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ar" ? "EN" : "عربي"}
            </Button>

            {/* User menu or login */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-slate-300 hover:text-white hover:bg-white/5 border border-border/50">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-blue-500/20 text-blue-300 text-xs font-bold">
                        {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm max-w-24 truncate">{user.name}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48 bg-card border-border">
                  <Link href="/profile">
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      {t(lang, "profile")}
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="w-4 h-4" />
                    {t(lang, "logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold gap-1.5 glow-blue"
                onClick={() => window.location.href = getLoginUrl()}
              >
                {t(lang, "login")}
              </Button>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
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
                    location === href ? "text-blue-300 bg-blue-500/15" : "text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
