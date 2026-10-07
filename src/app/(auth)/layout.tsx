import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MapPin } from "lucide-react"

import { Brand } from "@/components/brand"
import { PHOTOS, photoUrl } from "@/lib/destinations"

/** Khung chung cho đăng nhập, đăng ký, quên và đặt lại mật khẩu. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-2">
      <PhotoPanel />

      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <Brand className="lg:invisible" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" />
            Trang chủ
          </Link>
        </div>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
    </div>
  )
}

function PhotoPanel() {
  const photo = PHOTOS.hoian
  return (
    <aside className="relative hidden overflow-hidden bg-sea-deep lg:block">
      <Image
        src={photoUrl(photo, 1920)}
        alt={photo.alt}
        fill
        priority
        sizes="50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-sea-deep/90 via-sea-deep/20 to-sea-deep/50" />

      <div className="relative flex h-full flex-col justify-between p-10 text-white">
        <Brand tone="light" />

        <div className="grid max-w-md gap-4">
          <p className="font-script text-3xl text-sun">Khám phá Việt Nam</p>
          <p className="font-display text-4xl leading-tight font-extrabold">
            Mỗi chuyến đi bắt đầu từ một câu hỏi.
          </p>
          <p className="text-white/85">
            “Đi Hội An 3 ngày, 2 người lớn 1 bé, ngân sách 10 triệu thì nên đi
            đâu, ở đâu?” Trợ lý trả lời bằng một lịch trình cụ thể.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/70">
            <MapPin className="size-3.5" />
            Phố cổ Hội An, Quảng Nam
          </p>
        </div>
      </div>
    </aside>
  )
}
