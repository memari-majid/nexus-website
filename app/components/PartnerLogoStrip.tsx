import Image from "next/image";

type Item = { name: string; src: string };

/**
 * Logos are loaded from `/public/logos/partners` (domain favicons + Wikimedia where noted in HomePageContent).
 */
export function PartnerLogoStrip({ items }: { items: Item[] }) {
  return (
    <ul className="mx-auto grid max-w-6xl list-none grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li
          key={item.name}
          className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200/90 bg-zinc-50/90 px-4 py-6 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60"
        >
          <div className="flex min-h-[112px] w-full items-center justify-center rounded-xl bg-white px-4 py-4 shadow-inner ring-1 ring-zinc-200/90 dark:bg-zinc-100 sm:min-h-[128px]">
            <Image
              src={item.src}
              alt=""
              width={320}
              height={120}
              sizes="(max-width: 640px) 88vw, 260px"
              className="max-h-24 w-auto max-w-full object-contain sm:max-h-28"
            />
          </div>
          <p className="text-center text-[13px] font-semibold leading-snug tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-sm">
            {item.name}
          </p>
        </li>
      ))}
    </ul>
  );
}
