import Link from "next/link";
import { Avatar } from "@/app/components/Avatar";
import { TeamCredential } from "@/app/components/TeamCredential";
import type { Person } from "@/lib/people";

export function TeamCard({ person, compact = false }: { person: Person; compact?: boolean }) {
  const Heading = compact ? "h3" : "h2";
  return (
    <article className={`flex h-full min-w-0 flex-col items-center text-center ${compact ? "px-4" : "rounded-[2rem] bg-white px-6 py-12 dark:bg-zinc-900/60"}`}>
      <Link href={`/about/${person.slug}`} aria-label={`Meet ${person.teamName}`}>
        <Avatar photo={person.photo} initials={person.initials} name={person.teamName}
          role={person.role} size={compact ? 156 : 180} scale={person.portraitScale} />
      </Link>
      <Heading className={`mt-7 flex min-h-8 items-center justify-center font-semibold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}>{person.teamName}</Heading>
      <p className="mt-2 flex min-h-10 items-center justify-center text-sm leading-5 text-zinc-500 dark:text-zinc-400">{person.role}</p>
      <p className="mt-1 flex min-h-10 items-center justify-center text-sm leading-5 text-zinc-500 dark:text-zinc-400">{person.experience}</p>
      <div className="mt-2 flex h-8 items-center justify-center"><TeamCredential person={person} /></div>
      <Link href={`/about/${person.slug}`} className="quiet-link mt-5">Experience &amp; background <span aria-hidden>→</span></Link>
    </article>
  );
}
