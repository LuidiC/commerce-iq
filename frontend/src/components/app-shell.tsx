"use client";

import {
  BarChart3,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Clock3,
  Menu,
  PackageSearch,
  Store,
  UsersRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";

const navItems = [
  { key: "overview", href: "/", icon: CircleGauge },
  { key: "sales", href: "/sales", icon: BarChart3 },
  { key: "customers", href: "/customers", icon: UsersRound },
  { key: "products", href: "/products", icon: PackageSearch },
  { key: "sellers", href: "/sellers", icon: Store },
  { key: "retention", href: "/retention", icon: Clock3 },
  { key: "delivery", href: "/delivery", icon: Box }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale, setLocale, message } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">{message.common.skipToContent}</a>
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`} aria-label={message.common.primaryNavigation}>
        <div className="brand-row">
          <Link href="/" className="brand" aria-label={message.common.home}>
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span className="brand-copy"><strong>Commerce</strong><b>IQ</b></span>
          </Link>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label={message.common.closeMenu}>
            <X size={18} />
          </button>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={active ? "nav-item is-active" : "nav-item"}
                title={message.nav[item.key]}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{message.nav[item.key]}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-meta">
          <span className="status-dot" />
          <div><strong>Olist dataset</strong><span>2016 — 2018</span></div>
        </div>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={message.common.toggleNavigation}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>
      {mobileOpen && <button className="sidebar-backdrop" aria-label={message.common.closeMenu} onClick={() => setMobileOpen(false)} />}
      <div className="content-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label={message.common.openMenu}>
            <Menu size={20} />
          </button>
          <div className="topbar-context">
            <span className="status-dot" />
            <span>{message.common.realData}</span>
          </div>
          <div className="locale-switch" aria-label={message.common.language}>
            <button className={locale === "pt-BR" ? "is-active" : ""} onClick={() => setLocale("pt-BR")} aria-pressed={locale === "pt-BR"}>PT</button>
            <span />
            <button className={locale === "en-US" ? "is-active" : ""} onClick={() => setLocale("en-US")} aria-pressed={locale === "en-US"}>EN</button>
          </div>
        </header>
        <main id="main-content" className="main-content">{children}</main>
        <footer className="footer">
          <span>{message.common.dataSource}</span>
          <span>CC BY-NC-SA 4.0</span>
        </footer>
      </div>
    </div>
  );
}
