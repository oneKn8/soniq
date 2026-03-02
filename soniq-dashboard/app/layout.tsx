import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soniq - AI Voice Agent for Business",
  description:
    "Never miss a call. Soniq handles your business calls 24/7 with human-like AI. Book appointments, answer questions, and grow your business.",
  keywords: [
    "AI voice agent",
    "business phone",
    "automated calls",
    "appointment booking",
    "customer service",
  ],
  authors: [{ name: "Soniq" }],
  openGraph: {
    title: "Soniq - AI Voice Agent for Business",
    description:
      "Never miss a call. Soniq handles your business calls 24/7 with human-like AI.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
