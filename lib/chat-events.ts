/** Decoupled signal to open the site chat widget from any component. */
export const OPEN_CHAT_EVENT = "nexus:open-chat";

/** Dispatch from a click handler to open the ChatWidget. No-op during SSR. */
export function openChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}
