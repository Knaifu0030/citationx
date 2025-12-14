import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CitationX | Legal Research Workspace",
  description: "Secure legal research frontend for CitationX powered by Next.js and Tailwind CSS.",
  metadataBase: new URL("https://citationx.app"),
  openGraph: {
    title: "CitationX | Legal Research Workspace",
    description:
      "Source-first legal research UI with citation tracking, dark mode, and production-ready scaffolding.",
    url: "https://citationx.app",
    siteName: "CitationX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CitationX | Legal Research Workspace",
    description: "Source-first legal research UI with citation tracking and dark mode.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
