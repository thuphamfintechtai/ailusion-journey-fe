import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

import markSrc from "../../public/brand/ailusion-mark.png"

/** Hình chữ A của logo Ailusion (cắt từ logo gốc, nền trong suốt). */
export function BrandMark({
  className,
  framed = false,
}: {
  className?: string
  /** Đặt trong vòng tròn trắng, dùng làm ảnh đại diện của trợ lý. */
  framed?: boolean
}) {
  if (framed) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-border",
          className
        )}
      >
        <Image src={markSrc} alt="" className="h-auto w-[62%]" />
      </span>
    )
  }
  return (
    <Image
      src={markSrc}
      alt=""
      aria-hidden
      priority
      className={cn("h-8 w-auto shrink-0", className)}
    />
  )
}

export function Brand({
  href = "/",
  className,
  tone = "default",
}: {
  href?: string
  className?: string
  /** `light` khi đặt trên nền tối (thanh bên, chân trang, ảnh). */
  tone?: "default" | "light"
}) {
  return (
    <Link
      href={href}
      aria-label="Ailusion Journey, về trang chủ"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
    >
      <BrandMark />
      <span className="grid leading-none">
        <span
          className={cn(
            "font-display text-[19px] font-extrabold tracking-[0.04em] uppercase",
            tone === "light" ? "text-white" : "text-foreground"
          )}
        >
          Ailusion
        </span>
        <span
          className={cn(
            "mt-1 text-[9.5px] font-bold tracking-[0.5em] uppercase",
            tone === "light" ? "text-sun" : "text-brand"
          )}
        >
          Journey
        </span>
      </span>
    </Link>
  )
}
