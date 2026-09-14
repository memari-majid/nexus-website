import { MAJID } from "@/lib/majid";

export function StudentFeedback() {
  const feedback = MAJID.studentFeedback;
  return (
    <section id="student-feedback" aria-labelledby="student-feedback-heading" className="mx-auto mt-16 max-w-3xl scroll-mt-24 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <h2 id="student-feedback-heading" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">{feedback.headline}</h2>
      <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-6 text-center">
        {feedback.ratings.map((rating) => (
          <div key={rating.label} className="flex flex-col">
            <dt className="order-2 mt-3 text-sm text-zinc-600 dark:text-zinc-400">{rating.label}</dt>
            <dd className="text-4xl font-semibold tracking-tight sm:text-5xl">{rating.score}<span className="ml-1 text-base font-normal text-zinc-500 dark:text-zinc-400">/5</span></dd>
          </div>
        ))}
      </dl>
      <p className="mx-auto mt-5 max-w-lg text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{feedback.ratingsContext}</p>
      <p className="mx-auto mt-10 max-w-lg text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{feedback.context}</p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {feedback.quotes.map((quote) => (
          <figure key={quote}>
            <blockquote className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">“{quote}”</blockquote>
            <figcaption className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Anonymous course student</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
