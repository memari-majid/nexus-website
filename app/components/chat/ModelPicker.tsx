"use client";

import { CHAT_MODELS, findModel } from "@/lib/chat-models";

/**
 * Visitor-facing model picker. Lives in its own toolbar row under the chat
 * header, never in the header, so 360 px phones do not overflow. Prices are
 * the public gateway list prices from `lib/chat-models.ts`.
 */
export function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const current = findModel(value);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <label
        htmlFor="chat-model"
        className="shrink-0 text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
      >
        Model
      </label>
      <select
        id="chat-model"
        value={value}
        disabled={disabled}
        title={current?.note}
        onChange={(e) => {
          const id = e.target.value;
          if (findModel(id)) onChange(id);
        }}
        className="min-w-0 flex-1 truncate rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 focus:border-brand-600 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {CHAT_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} · ${m.inputPerM} in / ${m.outputPerM} out per 1M
          </option>
        ))}
      </select>
    </div>
  );
}
