import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useAuth } from "@/hooks/use-auth";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import {
  LayoutDashboard,
  Store,
  Package,
  Handshake,
  Globe,
  FileText,
  Layers,
  DollarSign,
  Scale,
  Shield,
  Target,
  TrendingUp,
  Radio,
  BookOpen,
  Activity,
  History,
  CheckCircle,
  Sun,
  Moon,
  LogOut,
  KeyRound,
  User,
  Users,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "overview",
    items: [
      { label: "dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "retailers & products",
    items: [
      { label: "retailers", href: "/retailers", icon: Store },
      { label: "products", href: "/products", icon: Package },
      { label: "offers", href: "/offers", icon: Handshake },
    ],
  },
  {
    title: "commercial",
    items: [
      { label: "countries", href: "/countries", icon: Globe },
      { label: "deals", href: "/deals", icon: FileText },
      { label: "volume tiers", href: "/tiers", icon: Layers },
      { label: "gs pricing", href: "/pricing", icon: DollarSign },
    ],
  },
  {
    title: "engines",
    items: [
      { label: "equivalence", href: "/equivalence", icon: Scale },
      { label: "value protection", href: "/protection", icon: Shield },
      { label: "deal scoring", href: "/scoring", icon: Target },
    ],
  },
  {
    title: "data feeds",
    items: [
      { label: "carbon markets", href: "/markets", icon: TrendingUp },
      { label: "c2050 feed", href: "/streams", icon: Radio },
      { label: "regulatory", href: "/regulatory", icon: BookOpen },
    ],
  },
  {
    title: "audit",
    items: [
      { label: "system status", href: "/status", icon: Activity },
      { label: "change log", href: "/changelog", icon: History },
      { label: "approvals", href: "/approvals", icon: CheckCircle },
    ],
  },
  {
    title: "system",
    items: [
      { label: "user management", href: "/users", icon: Users },
    ],
  },
];

interface SidebarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Sidebar({ darkMode, onToggleDarkMode }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <aside className="w-56 h-screen flex flex-col bg-[#1a2a14] dark:bg-[#0f1a0a] text-green-100/80 shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-green-900/40">
        <div className="w-7 h-7 rounded bg-[#6ab023] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="0.5" fill="white" />
            <rect x="9" y="2" width="5" height="5" rx="0.5" fill="white" opacity="0.7" />
            <rect x="2" y="9" width="5" height="5" rx="0.5" fill="white" opacity="0.7" />
            <rect x="9" y="9" width="5" height="5" rx="0.5" fill="white" opacity="0.5" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-green-50 lowercase tracking-tight">
          my green squares
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-green-100/30 font-medium">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[13px] lowercase transition-colors cursor-pointer",
                        active
                          ? "bg-green-800/40 text-green-50 border-l-2 border-[#6ab023] -ml-0.5 pl-2"
                          : "text-green-100/60 hover:text-green-100/90 hover:bg-green-800/20"
                      )}
                      data-testid={`nav-${item.label.replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-2 border-t border-green-900/40 space-y-1">
        {user && (
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <User className="h-4 w-4 text-green-100/40 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-green-100/80 truncate lowercase">{user.displayName}</div>
              <div className="text-[10px] text-green-100/30 lowercase">{user.role.replace("_", " ")}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowPasswordDialog(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 w-full rounded text-[13px] text-green-100/60 hover:text-green-100/90 hover:bg-green-800/20 transition-colors lowercase"
          data-testid="button-change-password"
        >
          <KeyRound className="h-4 w-4" />
          change password
        </button>
        <button
          onClick={onToggleDarkMode}
          className="flex items-center gap-2 px-2.5 py-1.5 w-full rounded text-[13px] text-green-100/60 hover:text-green-100/90 hover:bg-green-800/20 transition-colors lowercase"
          data-testid="button-dark-mode"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {darkMode ? "light mode" : "dark mode"}
        </button>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-2.5 py-1.5 w-full rounded text-[13px] text-red-400/70 hover:text-red-400 hover:bg-red-900/20 transition-colors lowercase"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          sign out
        </button>
      </div>

      {/* Attribution */}
      <div className="border-t border-green-900/40">
        <PerplexityAttribution />
      </div>

      {/* Change password dialog */}
      <ChangePasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />
    </aside>
  );
}
