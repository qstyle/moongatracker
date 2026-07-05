import { useLenis } from "lenis/react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

export function ScrollNav({
  dir,
  label,
  className,
}: {
  dir: "up" | "down"
  label: string
  className?: string
}) {
  const lenis = useLenis()

  function go() {
    if (typeof window === "undefined") return
    const vh = window.innerHeight
    const cur = Math.round(window.scrollY / vh)
    const y = Math.max(0, (cur + (dir === "down" ? 1 : -1)) * vh)
    if (lenis) lenis.scrollTo(y, { duration: 0.9, lock: true })
    else window.scrollTo({ top: y, behavior: "smooth" })
  }

  const Chevron = dir === "down" ? ChevronDown : ChevronUp

  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        "flex flex-col items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {dir === "up" && <Chevron className="size-5 animate-bounce" />}
      <span>{label}</span>
      {dir === "down" && <Chevron className="size-5 animate-bounce" />}
    </button>
  )
}
