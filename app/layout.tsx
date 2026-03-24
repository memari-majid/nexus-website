import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus AI Solutions LLC — IT Consulting & Digital Services",
  description:
    "Utah-based IT consulting firm specializing in strategic technology planning, system integration, and digital transformation. Led by Dr. Majid Memari.",
  openGraph: {
    title: "Nexus AI Solutions LLC",
    description:
      "IT Consulting & Digital Services — strategic technology planning, system integration, and digital transformation.",
    url: "https://nexusaisolution.net",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
