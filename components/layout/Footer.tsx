// components/footer.tsx

import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t py-6 sm:py-10">
      <div className="container flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row">

        <div>
          <h3 className="text-lg font-semibold">
            Minutely
          </h3>

          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            AI-powered meeting intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">
            Features
          </Link>

          <Link href="#" className="hover:text-foreground transition-colors">
            Pricing
          </Link>

          <Link href="#" className="hover:text-foreground transition-colors">
            Docs
          </Link>

          <Link href="#" className="hover:text-foreground transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}