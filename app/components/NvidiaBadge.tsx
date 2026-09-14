import { NvidiaLogo } from "@/app/components/NvidiaLogo";
import { DLI } from "@/lib/dli";
import { MAJID } from "@/lib/majid";

/**
 * Public NVIDIA title on this commercial site: Certified Instructor.
 * Do not show University Ambassador or a free-campus offer here.
 */

export const NVIDIA_CREDENTIAL = DLI.instructorTitle;

export function NvidiaBadge({
  variant = "outline",
  className = "",
}: {
  /** `quiet` for the footer, `outline` for the hero. */
  variant?: "quiet" | "outline";
  className?: string;
}) {
  const shell =
    variant === "outline"
      ? "rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      : "";

  return (
    <a
      href={MAJID.nvidiaInstructorDirectory}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${DLI.instructorTitle}, NVIDIA Certified Instructor Directory`}
      className={`inline-flex items-center justify-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 ${shell} ${className}`}
    >
      <NvidiaLogo className="nvidia-mark h-4 w-4 shrink-0" />
      <span>Certified Instructor</span>
    </a>
  );
}
