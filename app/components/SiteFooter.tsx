import Link from "next/link";
import { TRADEMARK_SHORT, TRADEMARK_NOTICE } from "@/app/components/NvidiaLogo";
import { SITE } from "@/lib/site";

const LINKS = [
  { label: "Consulting", href: "/#consulting" },
  { label: "Training", href: "/nvidia-dli-workshops" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/70 px-6 pb-24 pt-10 dark:border-zinc-800/70 sm:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {SITE.name} · {TRADEMARK_SHORT}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-zinc-900 dark:hover:text-zinc-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-5 max-w-6xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{TRADEMARK_NOTICE}</p>
    </footer>
  );
}
