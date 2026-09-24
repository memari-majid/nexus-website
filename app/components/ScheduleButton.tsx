"use client";

import { openChat } from "@/lib/chat-events";

/**
 * Reusable "Ask our AI" CTA. Opens the ChatWidget via the
 * open-chat event so it works from Server Components (hero, workshop page)
 * without prop-drilling the widget's open state.
 */
export function ScheduleButton({
  children = "Ask our AI",
  variant = "primary",
  className = "",
}: {
  children?: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openChat}
      className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`}
    >
      {children}
    </button>
  );
}
