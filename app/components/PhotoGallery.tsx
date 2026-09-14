"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Photo = { src: string; width: number; height: number; alt: string };

export function PhotoGallery({ photos }: { photos: readonly Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = selected !== null;
  const photo = selected === null ? null : photos[selected];

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const { scrollX, scrollY } = window;
    const body = document.body;
    const properties = ["position", "top", "left", "width", "overflow", "padding-right"];
    const previous = properties.map((name) => [name, body.style.getPropertyValue(name)] as const);
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.paddingRight = `${padding + gutter}px`;
    dialog.showModal();

    return () => {
      dialog.close();
      for (const [name, value] of previous) {
        if (value) body.style.setProperty(name, value);
        else body.style.removeProperty(name);
      }
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const close = () => setSelected(null);
  const move = (step: number) => setSelected((index) => index === null ? null : (index + step + photos.length) % photos.length);
  const control = "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

  return (
    <>
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
        {photos.map((item, index) => (
          <button key={item.src} type="button" aria-label={`Enlarge photo: ${item.alt}`} aria-haspopup="dialog"
            onClick={(event) => { openerRef.current = event.currentTarget; setSelected(index); }}
            className={`group relative block cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:rounded-3xl ${index === 0 ? "sm:col-span-2" : ""}`}>
            <Image src={item.src} alt={item.alt} width={item.width} height={item.height} quality={95}
              sizes={index === 0 ? "(max-width: 1100px) 92vw, 1024px" : "(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 504px"}
              className="h-auto w-full" />
            <span aria-hidden="true" className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg>
            </span>
          </button>
        ))}
      </div>

      <dialog ref={dialogRef} aria-label="Workshop photos" aria-describedby="gallery-photo-caption"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "Tab") {
            const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
          if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        }}
        className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto overscroll-contain border-0 bg-zinc-950/95 p-4 text-white outline-none backdrop:bg-black/80 open:flex open:flex-col sm:p-6">
        {photo && <>
          <div className="flex shrink-0 items-center justify-between gap-4 pt-[env(safe-area-inset-top)]">
            <p aria-live="polite" aria-atomic="true" className="text-sm text-zinc-300">Photo {(selected ?? 0) + 1} of {photos.length}</p>
            <button type="button" autoFocus onClick={close} className={control} aria-label="Close photo viewer">
              Close <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="m6 6 12 12M6 18 18 6" /></svg>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4"
            onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
            <Image key={photo.src} src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} quality={95}
              sizes="(max-width: 640px) 100vw, 95vw" loading="eager"
              className="h-auto max-h-[calc(100dvh-14rem)] w-auto max-w-full object-contain" />
          </div>
          <div className="mx-auto flex w-full max-w-4xl shrink-0 items-center justify-between gap-4 pb-[env(safe-area-inset-bottom)]">
            <button type="button" onClick={() => move(-1)} aria-label="Previous photo" className={control}>
              <span aria-hidden="true">←</span><span className="hidden sm:inline">Previous</span>
            </button>
            <p id="gallery-photo-caption" aria-live="polite" aria-atomic="true" className="max-w-xl text-center text-sm leading-relaxed text-zinc-300">{photo.alt}</p>
            <button type="button" onClick={() => move(1)} aria-label="Next photo" className={control}>
              <span className="hidden sm:inline">Next</span><span aria-hidden="true">→</span>
            </button>
          </div>
        </>}
      </dialog>
    </>
  );
}
