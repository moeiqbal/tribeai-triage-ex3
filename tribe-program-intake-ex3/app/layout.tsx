import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Intake Triage",
  description: "Submit project intakes and get AI-generated triage: summary, tags, and a risk checklist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex gap-4 border-b border-zinc-200 p-4">
          <a href="/" className="font-semibold">Intake Triage</a>
          <a href="/intakes/new" className="underline">New intake</a>
        </header>
        {children}
      </body>
    </html>
  );
}
