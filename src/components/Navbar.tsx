"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "Начало", href: "/" },
  { label: "За нас", href: "/about" },
  { label: "Промоции", href: "/promo" },
  { label: "Каталог", href: "/#catalog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const solidNav = !isHome || scrolled;
  const desktopLinkClass = `text-[13px] xl:text-sm font-bold uppercase tracking-[0.18em] transition-colors ${
    solidNav ? "text-slate-900 hover:text-orange-600" : "text-white hover:text-orange-300"
  }`;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav 
      id="main-navbar" 
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${
        solidNav 
        ? "bg-white/92 backdrop-blur-md shadow-xl py-4 border-b border-gray-100" 
        : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex min-w-fit items-center gap-4 group">
          <div className="flex flex-col">
            <span className={`font-black text-[2rem] leading-none tracking-[-0.06em] transition-colors ${solidNav ? "text-slate-950" : "text-white"}`}>
              ASTRALIS
            </span>
            <span className={`text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.34em] mt-1 transition-colors ${solidNav ? "text-orange-600" : "text-orange-300"}`}>
              Контейнери
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8 xl:gap-10">
          {LINKS.map((link) => (
            <Link 
              key={link.label}
              href={link.href}
              className={desktopLinkClass}
            >
              {link.label}
            </Link>
          ))}
          <Link 
            href="/#contacts"
            className={`px-8 py-4 rounded-full text-[13px] font-bold uppercase tracking-[0.18em] transition-all shadow-2xl active:scale-95 ${
              solidNav 
              ? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20" 
              : "bg-white/95 hover:bg-white text-slate-950 shadow-black/15"
            }`}
          >
            Свържи се
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setOpen(!open)} className={`lg:hidden p-2 transition-colors ${solidNav ? "text-gray-900" : "text-white"}`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            {open ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white p-8 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in slide-in-from-top duration-500 border-t border-gray-50">
          {LINKS.map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setOpen(false)} className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-900 py-3 border-b border-gray-50 last:border-0">
              {link.label}
            </Link>
          ))}
          <Link href="/#contacts" onClick={() => setOpen(false)} className="bg-orange-600 text-white p-5 rounded-full text-center font-bold uppercase tracking-[0.18em] text-[13px] shadow-xl shadow-orange-600/20 mt-2">
            Свържи се
          </Link>
        </div>
      )}
    </nav>
  );
}
