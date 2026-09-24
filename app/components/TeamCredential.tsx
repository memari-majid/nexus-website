import Image from "next/image";
import { NvidiaBadge } from "@/app/components/NvidiaBadge";
import type { Person } from "@/lib/people";

/** Individual credentials only, kept with their explicit coursework labels. */
export function TeamCredential({ person }: {
  person: Pick<Person, "nvidiaCertified" | "expertiseHighlight" | "expertiseLogo">;
}) {
  if (person.nvidiaCertified) return <NvidiaBadge variant="quiet" logoSize={24} />;
  if (!person.expertiseHighlight) return null;
  return (
    <span className="inline-flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      {person.expertiseLogo && (
        <Image src={person.expertiseLogo.src} alt={person.expertiseLogo.alt}
          width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />
      )}
      <span>{person.expertiseHighlight}</span>
    </span>
  );
}
