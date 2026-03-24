import Image from "next/image";

type LogoItem = { name: string; src: string };

export function LogoStrip({ items, className = "" }: { items: LogoItem[]; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-8 ${className}`}>
      {items.map((item) => (
        <div
          key={item.name}
          className="flex h-12 min-w-[100px] max-w-[140px] flex-1 items-center justify-center px-2 sm:h-14 sm:max-w-[160px]"
          title={item.name}
        >
          <Image
            src={item.src}
            alt={`${item.name} logo`}
            width={160}
            height={48}
            className="h-8 w-auto max-w-full object-contain opacity-75 transition hover:opacity-100 dark:brightness-0 dark:invert"
          />
        </div>
      ))}
    </div>
  );
}
