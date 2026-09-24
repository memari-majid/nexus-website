import Image from "next/image";

/**
 * Round team portrait. Preserve the supplied image and frame portrait originals
 * in CSS; retain extra image detail for high-density displays and browser zoom.
 * Falls back to initials when someone has no photo yet.
 */
export function Avatar({
  photo,
  initials,
  name,
  role,
  size,
  scale = 1,
}: {
  photo: string | null;
  initials: string;
  name: string;
  role: string;
  size: number;
  scale?: number;
}) {
  const resolution = Math.max(Math.ceil(size * scale * 3), 640);

  return (
    <div className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700" style={{ width: size, height: size }}>
      {photo ? (
        <Image
          src={photo}
          alt={`${name}, ${role}`}
          width={resolution}
          height={resolution}
          quality={95}
          className="h-full w-full object-cover object-[50%_30%]"
          style={{ transform: `scale(${scale})`, transformOrigin: "50% 0%" }}
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
