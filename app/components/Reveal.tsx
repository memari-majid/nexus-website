"use client";

import { useEffect, useRef, useState } from "react";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/**
 * Fades a block in the first time it is scrolled into view.
 *
 * The resting state is visible. The state the fade starts from lives in
 * `app/globals.css` behind `html.js`, a class the one-line script in
 * `app/layout.tsx` sets before the page paints, so the copy inside a Reveal is
 * readable when scripting is off and when the bundle never arrives, with no
 * flash for everyone else. Reduced motion drops the hidden state in the same
 * stylesheet, so nothing waits on an observer that only fires on scroll.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
