import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Voice Agent MVP",
  description: "Production-oriented multilingual voice agent on Vercel",
  applicationName: "Voice Agent",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <PwaRegister />
        <header className="sticky top-0 z-50 border-b border-slate-700/70 bg-slate-950/70 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
            <Link href="/" className="text-sm font-semibold tracking-wide text-slate-100 hover:text-white">
              Voice Agent
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium text-slate-300">
              <Link href="/about" className="hover:text-white">
                About Us
              </Link>
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
