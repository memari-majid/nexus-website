import { MAJID } from "@/lib/majid";

export function StudentFeedback() {
  const feedback = MAJID.studentFeedback;
  return (
    <section id="student-feedback" aria-labelledby="student-feedback-heading" className="mx-auto mt-16 max-w-3xl scroll-mt-24 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <h2 id="student-feedback-heading" className="max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{feedback.headline}</h2>

      <div className="mt-7 rounded-3xl bg-zinc-100 px-5 py-7 dark:bg-zinc-900/70 sm:px-8 sm:py-8">
        <dl className="grid grid-cols-2 divide-x divide-zinc-300/70 text-center dark:divide-zinc-700/70">
          {feedback.ratings.map((rating) => (
            <div key={rating.label} className="flex min-w-0 flex-col px-3 sm:px-5">
              <dt className="order-2 mx-auto mt-3 max-w-40 text-sm leading-snug text-zinc-600 dark:text-zinc-400">{rating.label}</dt>
              <dd className="whitespace-nowrap text-4xl font-semibold tabular-nums tracking-[-0.05em] sm:text-5xl">{rating.score}<span className="ml-1.5 text-sm font-normal tracking-normal text-zinc-500 dark:text-zinc-400">/5</span></dd>
            </div>
          ))}
        </dl>
        <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{feedback.ratingsContext}</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {feedback.quotes.map((quote) => (
          <figure key={quote} className="flex flex-col rounded-3xl border border-zinc-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-7">
            <span aria-hidden="true" className="mb-3 h-6 select-none font-serif text-5xl leading-none text-zinc-300 dark:text-zinc-600">“</span>
            <blockquote className="flex-1 text-base leading-relaxed text-zinc-800 dark:text-zinc-200">{quote}</blockquote>
            <figcaption className="mt-6 text-xs font-medium text-zinc-500 dark:text-zinc-400">Anonymous course student</figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-4 px-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{feedback.context}</p>
    </section>
  );
}
