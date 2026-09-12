import Image from "next/image";

/**
 * Round team portrait. All headshots are pre-cropped to the same square
 * framing (`public/team-*.jpg`) so the three profiles look consistent.
 * Falls back to initials when someone has no photo yet.
 */
export function Avatar({
  photo,
  initials,
  name,
  role,
  size,
}: {
  photo: string | null;
  initials: string;
  name: string;
  role: string;
  size: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {photo ? (
        <Image
          src={photo}
          alt={`${name}, ${role}`}
          fill
          className="rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
          sizes={`${size}px`}
        />
      ) : (
        <div
          aria-label={`${name}, ${role}`}
          role="img"
          className="flex h-full w-full items-center justify-center rounded-full bg-zinc-200 font-medium text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
          style={{ fontSize: size / 3 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
