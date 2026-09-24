"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import type { ChatUIMessage } from "@/lib/chat-ui";

/**
 * One conversation, two shells. The inline section on the homepage and the
 * floating panel render the same transcript from this module, so a visitor
 * who starts in the page and then opens the panel keeps their conversation
 * and their approval cards.
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

/* ---------- Floating panel ---------- */

/**
 * Whether the floating panel is open. The inline section watches this: both
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

/* ---------- Inline section visibility ---------- */

/**
 * Whether the inline chat frame is in the viewport. The fixed launcher and
 * the scroll-to-top button watch this: on a phone both sit exactly where the
 * frame's Send button and its right-hand chips land, so a thumb on Send opened
 * the panel instead. While the frame is on screen they step out of the way
 * below `sm`; the frame is the same conversation the launcher would open.
 */
const demoInViewStore = createStore(false);

export const subscribeDemoInView = demoInViewStore.subscribe;

export function readDemoInView(): boolean {
  return demoInViewStore.get();
}

export function serverDemoInView(): boolean {
  return false;
}

export function setDemoInView(inView: boolean): void {
  demoInViewStore.set(inView);
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
    let detail = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (typeof j.error === "string") detail = j.error;
    } catch {
      // A proxy may return plain text or HTML, not the route's JSON body.
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res;
}

function createChat(): Chat<ChatUIMessage> {
  return new Chat<ChatUIMessage>({
    // The body carries the messages and nothing else: the route runs one
    // model and the client does not get to name it.
    transport: new DefaultChatTransport<ChatUIMessage>({
      api: "/api/chat",
      fetch: chatFetch,
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
