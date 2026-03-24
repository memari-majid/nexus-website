import Image from "next/image";

type Item = { name: string; src: string };

export function PartnerLogoStrip({ items }: { items: Item[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-6 sm:gap-x-8">
      {items.map((item) => (
        <div
          key={item.name}
          className="flex h-12 max-w-[min(200px,85vw)] items-center justify-center sm:h-14"
        >
          <Image
            src={item.src}
            alt={`${item.name} logo`}
            width={220}
            height={48}
            className="h-7 w-auto max-h-8 object-contain opacity-85 transition hover:opacity-100 dark:brightness-0 dark:invert"
          />
        </div>
      ))}
    </div>
  );
}
