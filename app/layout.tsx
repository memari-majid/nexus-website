import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { PAGE_COPY } from "@/lib/seo";
import { SITE, SITE_URL } from "@/lib/site";

/** One title for the default, Open Graph, and Twitter cards. */
const DEFAULT_TITLE = PAGE_COPY.home.title;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Nexus AI Solutions",
  },
  description: SITE.description,
  authors: [{ name: "Majid Memari", url: "https://www.majidmemari.com" }],
  keywords: [
    "Nexus AI Solutions",
    "NVIDIA DLI workshop",
    "NVIDIA Deep Learning Institute training",
    "NVIDIA Certified Instructor",
    "generative AI workshop for teams",
    "agentic AI training",
    "AI consulting United States",
    "nationwide AI team training",
    "AI Solution Architect",
    "Gen AI",
    "RAG",
    "AI agents",
    "Majid Memari",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: SITE.description,
    url: SITE_URL,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE.description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

/**
 * `interactiveWidget` is deliberately left at the browser default
 * (`resizes-visual`). `resizes-content` would shrink the layout viewport when
 * the on-screen keyboard opens, and every `dvh` length on the site resolves
 * against it: the chat sheet, the inline demo cap, and the `scroll-padding-top`
 * on `html`. Focusing the contact form would then re-lay-out the whole page
 * behind the keyboard, which is a worse trade than the pan the default does.
 * The chat sheet already clears the keyboard by other means: it is a flex
 * column with one scroller, so the composer is pinned inside whatever height
 * it is given.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Marks the document as scripted, before the first paint. Anything that hides
 * content until JavaScript moves it, which today is the scroll reveal, is
 * gated on this class in `app/globals.css`, so a visitor with scripting off,
 * or one whose bundle never arrives, reads the copy instead of a blank
 * section.
 */
const SCRIPTING_FLAG = "document.documentElement.classList.add('js')";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-w-0 overflow-x-hidden antialiased">
        <script dangerouslySetInnerHTML={{ __html: SCRIPTING_FLAG }} />
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
