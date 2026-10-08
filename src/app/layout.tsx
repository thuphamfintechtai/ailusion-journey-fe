import type { Metadata } from "next"
import {
  Barlow_Condensed,
  Be_Vietnam_Pro,
  Dancing_Script,
  JetBrains_Mono,
  Raleway,
} from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"

import "./globals.css"

// Raleway cho tiêu đề, Be Vietnam Pro cho chữ thường (dấu tiếng Việt rõ), Dancing Script cho vài
// dòng chữ viết tay trên ảnh.
const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
})

const heading = Raleway({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
})

const hand = Dancing_Script({
  variable: "--font-hand",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
})

// Số lớn trên trang lộ trình (giá, giờ, ngày trên tờ lịch) — chữ hẹp, dễ đọc khi in to.
const numeric = Barlow_Condensed({
  variable: "--font-numeric",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
})

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin", "vietnamese"],
})

export const metadata: Metadata = {
  title: "Ailusion Journey",
  description: "Trợ lý lập kế hoạch du lịch Việt Nam",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${body.variable} ${heading.variable} ${hand.variable} ${numeric.variable} ${code.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
