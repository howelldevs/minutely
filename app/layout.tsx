import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/providers/ThemeProviders"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://meetric.vercel.app"),
  title: {
    default: "Meetric",
    template: "%s | Meetric",
  },
  description:
    "AI-powered meeting intelligence platform that transforms transcripts into summaries, action items, decisions, and live task boards using Qwen AI.",
  keywords: [
    "Qwen AI",
    "AI meeting assistant",
    "meeting summaries",
    "meeting intelligence",
    "AI action items",
    "transcript analysis",
    "voice note AI",
    "productivity AI",
  ],
  authors: [{ name: "HowellDevs" }],
  creator: "HowellDevs",
  openGraph: {
    title: "Meetric",
    description: "Turn meetings into structured action plans with Qwen AI.",
    url: "https://meetric.vercel.app",
    siteName: "Meetric",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meetric",
    description: "AI-powered meeting intelligence built with Qwen AI.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn(
          "h-full scroll-smooth antialiased",
          geistSans.variable,
          geistMono.variable,
          inter.variable,
          "font-sans"
        )}
        data-scroll-behavior="smooth"
      >
        <body className="min-h-screen overflow-x-hidden bg-background text-foreground">
          <div className="pointer-events-none fixed inset-0 -z-50 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-125 w-125 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 h-75 w-75 rounded-full bg-primary/5 blur-[100px]" />
            <div className="absolute right-1/4 top-1/3 h-62.5 w-62.5 rounded-full bg-primary/5 blur-[100px]" />
          </div>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}