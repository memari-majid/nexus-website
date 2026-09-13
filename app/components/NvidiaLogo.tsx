/**
 * NVIDIA eye mark, rendered monochrome in `currentColor` so it sits quietly in
 * both themes rather than imitating NVIDIA's brand lockup.
 *
 * Trademark care: the mark identifies the Deep Learning Institute workshops we
 * are certified to teach — it must never be placed so it reads as an NVIDIA
 * endorsement, partnership, or co-branding of Nexus. Always keep the
 * `TRADEMARK_NOTICE` below visible on any page that shows this mark.
 */

export const TRADEMARK_NOTICE =
  "NVIDIA, the NVIDIA logo, and NVIDIA Deep Learning Institute are trademarks and/or registered trademarks of NVIDIA Corporation, used here to identify the workshops we are certified to teach. Nexus AI Solutions LLC is an independent business and is not a partner of, sponsored by, or endorsed by NVIDIA.";

/** Compact form for the site footer. Owner prefers just the credential line. */
export const TRADEMARK_SHORT = "NVIDIA DLI Certified Instructor";

export function NvidiaLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="NVIDIA"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <title>NVIDIA</title>
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
    </svg>
  );
}
