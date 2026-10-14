import type { Metadata } from "next"
import localFont from "next/font/local"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"

import "./globals.css"

// Font nằm trong repo (SIL OFL, src/fonts). next/font/google tải font lúc build; Google đôi khi
// trả URL có dấu & và Turbopack của Next 16 làm next build fail.
// Raleway cho tiêu đề, Be Vietnam Pro cho chữ thường (dấu tiếng Việt rõ), Dancing Script cho vài
// dòng chữ viết tay trên ảnh.
const body = localFont({
  src: [
    {
      path: "../fonts/BeVietnamPro-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/BeVietnamPro-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/BeVietnamPro-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    { path: "../fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
})

const heading = localFont({
  src: "../fonts/Raleway-Variable.ttf",
  variable: "--font-heading",
  weight: "100 900",
  display: "swap",
})

const hand = localFont({
  src: "../fonts/DancingScript-Variable.ttf",
  variable: "--font-hand",
  weight: "400 700",
  display: "swap",
})

// Số lớn trên trang lộ trình (giá, giờ, ngày trên tờ lịch) — chữ hẹp, dễ đọc khi in to.
const numeric = localFont({
  src: [
    {
      path: "../fonts/BarlowCondensed-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/BarlowCondensed-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-numeric",
  display: "swap",
})

const code = localFont({
  src: "../fonts/JetBrainsMono-Variable.ttf",
  variable: "--font-code",
  weight: "100 800",
  display: "swap",
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
