import Image from "next/image";

type LogoItem = { name: string; src: string };

type Variant = "mono" | "color";

const imgMono =
  "h-10 w-auto max-h-10 max-w-full object-contain opacity-85 transition hover:opacity-100 sm:h-12 sm:max-h-12 dark:brightness-0 dark:invert";

const imgColor =
  "h-10 w-auto max-h-10 max-w-full object-contain opacity-90 transition hover:opacity-100 sm:h-12 sm:max-h-12 dark:opacity-95 dark:hover:opacity-100";

export function LogoStrip({
  items,
  className = "",
  variant = "mono",
}: {
  items: LogoItem[];
  className?: string;
  variant?: Variant;
}) {
  const imgClass = variant === "color" ? imgColor : imgMono;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-10 sm:gap-x-10 ${className}`}>
      {items.map((item) => (
        <div
          key={item.name}
          className="flex min-h-[52px] min-w-[120px] max-w-[200px] flex-1 items-center justify-center px-3 sm:min-h-[60px] sm:min-w-[140px] sm:max-w-[220px]"
          title={item.name}
        >
          <Image
            src={item.src}
            alt={`${item.name} logo`}
            width={220}
            height={64}
            sizes="(max-width: 640px) 40vw, 180px"
            className={imgClass}
          />
        </div>
      ))}
    </div>
  );
}
