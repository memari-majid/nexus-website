import { NvidiaLogo, TRADEMARK_NOTICE, TRADEMARK_SHORT } from "@/app/components/NvidiaLogo";
import { MAJID } from "@/lib/majid";

/**
 * Credential badge for the founder's **individual** NVIDIA certification.
 *
 * The only true relationship is that the founder is personally certified by
 * NVIDIA to teach Deep Learning Institute workshops. So the label carries the
 * two accurate titles and nothing else — never "partner", "sponsored by",
 * "authorized", or any wording that reads as an NVIDIA endorsement of Nexus.
 * The badge links to NVIDIA's own instructor directory so a visitor can check
 * the claim at the source.
 *
 * Any page that renders this badge must also render `NvidiaTrademark` (the
 * homepage footer already carries the short form).
 */

export const NVIDIA_CREDENTIAL =
  "NVIDIA Deep Learning Institute Certified Instructor · University Ambassador";

export function NvidiaBadge({
  variant = "outline",
  className = "",
}: {
  /** `quiet` for the hero and footer, `outline` for page bodies. */
  variant?: "quiet" | "outline";
  className?: string;
}) {
  const shell =
    variant === "outline"
      ? "rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      : "";

  return (
    <a
      href={MAJID.nvidiaInstructorDirectory}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${NVIDIA_CREDENTIAL} — verify in the NVIDIA Certified Instructor Directory`}
      className={`inline-flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 ${shell} ${className}`}
    >
      <NvidiaLogo className="nvidia-mark h-4 w-4 shrink-0" />
      <span className="text-left">{NVIDIA_CREDENTIAL}</span>
    </a>
  );
}

/** Trademark notice required on every page that shows the NVIDIA mark. */
export function NvidiaTrademark({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "short";
  className?: string;
}) {
  return (
    <p className={`text-xs leading-relaxed text-zinc-500 dark:text-zinc-500 ${className}`}>
      {variant === "full" ? TRADEMARK_NOTICE : TRADEMARK_SHORT}
    </p>
  );
}
