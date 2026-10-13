"use client"

import Link from "next/link"

import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

const LINKS = [
  { href: "#diem-den", label: "Điểm đến" },
  { href: "#phong-cach", label: "Phong cách đi" },
  { href: "#cach-hoat-dong", label: "Cách hoạt động" },
]

export function SiteNav() {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />

        <nav
          aria-label="Trang chủ"
          className="hidden items-center gap-1 md:flex"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative px-3 py-2 text-sm font-semibold text-foreground/75 outline-none after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-sea after:transition-transform hover:text-primary hover:after:scale-x-100 focus-visible:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Giữ chỗ trong lúc đọc phiên để nút không nhảy. */}
        <div className="flex min-w-40 items-center justify-end gap-2">
          {loading ? null : user ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/chat?form=1">Lập lộ trình</Link>
              </Button>
              <Button asChild>
                <Link href="/chat">Mở trợ lý</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Bắt đầu</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
