"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { FALLBACK_MODEL_ID } from "@/lib/chat-models";
import { MODEL_STORAGE_KEY, isChatModelId, type ChatUIMessage } from "@/lib/chat-ui";

/**
 * One conversation, two shells. The inline demo on the homepage and the
 * floating panel render the same transcript from this module, so a visitor
 * who starts in the page and then opens the panel keeps their conversation,
 * their model pick, and their approval cards.
 *
 * Everything the SDK needs goes on the `Chat` instance, never on the
 * `useChat` call: `@ai-sdk/react` builds its own options only when no `chat`
 * is passed, so `transport`, `sendAutomaticallyWhen` and the callbacks would
 * typecheck and then be dropped at runtime.
 *
 * `Chat` is imported from `@ai-sdk/react`. The `ai` package does not export it.
 */

type Listener = () => void;

type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  subscribe: (listener: Listener) => () => void;
};

function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set: (next: T) => {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/* ---------- Model ---------- */

/**
 * The page opens on the cheaper model. The picker still offers all four, and
 * a visitor's pick is remembered, but the default a homepage visitor spends
 * is the fallback one (AGENTS.md 9.3: do not change this without changing the
 * rest of the cost posture).
 */
const modelStore = createStore<string>(FALLBACK_MODEL_ID);

export const subscribeModel = modelStore.subscribe;

export function readModelId(): string {
  return modelStore.get();
}

/** Server and first-paint snapshot. Constant, so hydration cannot mismatch. */
export function serverModelId(): string {
  return FALLBACK_MODEL_ID;
}

/** Only ids in the allowlist land, so a stale stored value cannot leak through. */
export function chooseModel(id: string): void {
  if (!isChatModelId(id)) return;
  modelStore.set(id);
  try {
    window.localStorage.setItem(MODEL_STORAGE_KEY, id);
  } catch {
    /* storage unavailable */
  }
}

/** Reads the saved pick once mounted. Storage can be blocked, so never throws. */
export function hydrateModel(): void {
  try {
    const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (isChatModelId(stored)) modelStore.set(stored);
  } catch {
    /* storage unavailable */
  }
}

/* ---------- Floating panel ---------- */

/**
 * Whether the floating panel is open. The inline demo watches this: both
 * shells render the same transcript, so only one of them may hold a live
 * region that talks.
 */
const panelStore = createStore(false);

export const subscribePanel = panelStore.subscribe;

export function readPanelOpen(): boolean {
  return panelStore.get();
}

export function serverPanelOpen(): boolean {
  return false;
}

export function setPanelOpen(open: boolean): void {
  panelStore.set(open);
}

/* ---------- Transport ---------- */

/**
 * Surfaces the route's error body as the error message. Without this the SDK
 * reports a bare status code and the visitor never learns that the chat is
 * rate limited, over budget, or simply not configured.
 */
async function chatFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await globalThis.fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: string };
      if (typeof j.error === "string") throw new Error(j.error);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
    }
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res;
}

function createChat(): Chat<ChatUIMessage> {
  return new Chat<ChatUIMessage>({
    // The body is read on every send, so the automatic re-send after an
    // approval carries whatever the picker holds at that moment.
    transport: new DefaultChatTransport<ChatUIMessage>({
      api: "/api/chat",
      fetch: chatFetch,
      body: () => ({ model: modelStore.get() }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
}

let shared: Chat<ChatUIMessage> | undefined;

/**
 * The one conversation, on the client. Server renders get a throwaway
 * instance instead of a module singleton, which would otherwise be shared
 * across requests.
 */
export function sharedChat(): Chat<ChatUIMessage> {
  if (typeof window === "undefined") return createChat();
  shared ??= createChat();
  return shared;
}
