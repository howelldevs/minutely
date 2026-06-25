"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { History } from "lucide-react"
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "../theme-toggle"

export default function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-x-0 top-3 sm:top-5 z-50 flex justify-center px-3 sm:px-4"
    >
      <div className="relative flex h-14 sm:h-16 w-full max-w-5xl items-center justify-between overflow-hidden rounded-2xl border border-border/60 bg-background/65 px-3 sm:px-5 shadow-2xl backdrop-blur-xl">

        <div className="absolute inset-0 -z-10 bg-linear-to-r from-primary/5 via-transparent to-primary/5" />

        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative flex items-center justify-center overflow-hidden rounded-xl">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
            <Image
              src="/logo.png"
              alt="Minutely Logo"
              width={120}
              height={120}
              className="relative h-8 sm:h-10 w-auto object-contain"
            />
          </div>
          <span className="logo hidden text-base sm:text-lg tracking-wide md:inline-block">
            Minutely
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 sm:gap-8 md:flex">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative text-xs sm:text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/upload" className="shrink-0">
            <Button className="rounded-xl px-2.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
              <span className="hidden sm:inline">Upload</span>
              <span className="inline sm:hidden">+</span>
            </Button>
          </Link>
          <AuthButton />
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  )
}

function AuthButton() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return (
      <>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8 rounded-xl",
            },
          }}
        />
        <Link href="/history" className="shrink-0">
          <Button variant="ghost" className="hidden items-center gap-2 rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm sm:inline-flex">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </Link>
      </>
    )
  }

  return (
    <SignInButton mode="modal">
      <Button variant="ghost" className="hidden rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm sm:inline-flex">
        Login
      </Button>
    </SignInButton>
  )
}