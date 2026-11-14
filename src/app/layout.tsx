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
    default: "LIMEN | Mission Health Intelligence",
    template: "%s | LIMEN",
  },
  description:
    "LIMEN is a mission health intelligence research prototype connecting mission context, self-reported observations, visuomotor performance and retrospective evidence. Descriptive only; not a diagnostic or NASA-endorsed system.",
  applicationName: "LIMEN",
  category: "science",
  openGraph: {
    type: "website",
    siteName: "LIMEN",
    title: "LIMEN | Mission Health Intelligence",
    description:
      "A browser-local research prototype connecting mission context, self-reported observations, visuomotor performance and retrospective biological evidence across mission transitions.",
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
