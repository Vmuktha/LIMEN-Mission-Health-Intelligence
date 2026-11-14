import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LIMEN | Neuroadaptive Mission Readiness & Recovery Intelligence",
    template: "%s | LIMEN",
  },
  description:
    "LIMEN is a browser-local research prototype for studying sensorimotor adaptation across altered-gravity transitions. It is not a clinical diagnostic tool, does not measure brain activity, and is not endorsed by NASA or any other organisation.",
  applicationName: "LIMEN",
  category: "science",
  openGraph: {
    type: "website",
    siteName: "LIMEN",
    title: "LIMEN | Neuroadaptive Mission Readiness & Recovery Intelligence",
    description:
      "A browser-local research prototype for studying sensorimotor adaptation and readaptation across gravity transitions.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
