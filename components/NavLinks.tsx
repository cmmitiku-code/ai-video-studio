"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "גלריה", auth: false },
  { href: "/create", label: "יצירה", auth: false },
  { href: "/my", label: "הסרטונים שלי", auth: true },
  { href: "/pricing", label: "מחירים", auth: false },
];

export default function NavLinks({ className = "", loggedIn }: { className?: string; loggedIn: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={`items-center gap-1 ${className}`}>
      {LINKS.filter((l) => !l.auth || loggedIn).map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
              active ? "bg-surface-2 text-white" : "text-muted hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
