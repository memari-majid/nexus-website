import Image from "next/image";

type Item = { name: string; src: string };

export function PartnerLogoStrip({ items }: { items: Item[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-8 sm:gap-x-10 sm:gap-y-10">
      {items.map((item) => (
        <div
          key={item.name}
          className="flex min-h-[52px] items-center justify-center px-2 sm:min-h-[60px]"
        >
          <Image
            src={item.src}
            alt={`${item.name} logo`}
            width={320}
            height={72}
            sizes="(max-width: 640px) 45vw, 200px"
            className="h-10 w-auto max-h-10 object-contain opacity-90 transition hover:opacity-100 sm:h-12 sm:max-h-12 dark:brightness-0 dark:invert"
          />
        </div>
      ))}
    </div>
  );
}
