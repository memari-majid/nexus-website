import { DLI } from "@/lib/dli";
import { MAJID } from "@/lib/majid";

export function AcademicWorkshopAnnouncement({ compact = false }: { compact?: boolean }) {
  const event = DLI.academicEvent;
  return (
    <aside id="university-workshop" aria-labelledby="university-workshop-heading" className={`mx-auto rounded-[2rem] bg-zinc-100 px-6 text-center dark:bg-zinc-900 ${compact ? "mt-12 max-w-2xl py-8" : "mt-20 max-w-4xl py-12 sm:mt-24 sm:px-12"}`}>
      <p className="eyebrow">Academic event</p>
      <h2 id="university-workshop-heading" className={`mt-4 font-semibold tracking-tight ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}>{event.headline}</h2>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{event.date} · {event.time}<br />{event.location} · {event.format}</p>
      <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">{event.audience}</p>
      {!compact && <details className="group mx-auto mt-4 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
        <summary className="cursor-pointer underline decoration-zinc-300 underline-offset-4 dark:decoration-zinc-600">Who can attend</summary>
        <div className="mt-4 space-y-2 leading-relaxed">
          <p>{DLI.workshop.title} · Hosted by {MAJID.name}</p>
          <p>{event.prerequisites}</p>
          <p>{event.registration}</p>
        </div>
      </details>}
      <a href={event.url} target="_blank" rel="noopener noreferrer" className="quiet-link mt-5">Details &amp; registration <span aria-hidden>↗</span></a>
    </aside>
  );
}
