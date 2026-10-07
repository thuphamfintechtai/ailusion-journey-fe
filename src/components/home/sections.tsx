"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Baby,
  BriefcaseBusiness,
  Clock,
  Heart,
  History,
  MessageCircleHeart,
  Palmtree,
  Users,
  Wallet,
} from "lucide-react"

import { Brand } from "@/components/brand"
import { DESTINATIONS, HERO_SLIDES, PHOTOS, photoUrl } from "@/lib/destinations"

import { usePlanTrip } from "./use-plan-trip"

// ------------------------------------------------------------------ heading

export function SectionTitle({
  kicker,
  title,
  children,
}: {
  kicker: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto grid max-w-2xl justify-items-center gap-3 text-center">
      <p className="font-script text-2xl text-primary">{kicker}</p>
      <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <span aria-hidden className="h-1 w-16 rounded-full bg-sea" />
      {children && (
        <p className="leading-relaxed text-muted-foreground">{children}</p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ why us

const REASONS = [
  {
    icon: MessageCircleHeart,
    title: "Nói chuyện như với bạn",
    body: "Kể bằng lời bình thường: đi đâu, mấy ngày, với ai. Thiếu gì trợ lý sẽ hỏi lại.",
  },
  {
    icon: Wallet,
    title: "Vừa túi tiền",
    body: "Cho biết ngân sách, trợ lý chia ra ăn, ở, đi lại và chọn chỗ hợp với số tiền đó.",
  },
  {
    icon: Baby,
    title: "Hợp người đi cùng",
    body: "Có bé nhỏ, có ông bà hay đi cùng nhóm bạn, lịch trình được xếp theo sức của cả đoàn.",
  },
  {
    icon: History,
    title: "Lưu lại mọi chuyến",
    body: "Mỗi cuộc trò chuyện được lưu theo tài khoản, quay lại chỉnh lịch trình lúc nào cũng được.",
  },
]

export function WhyUs() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 pb-20 sm:px-6">
      <SectionTitle
        kicker="Vì sao chọn chúng tôi"
        title="Lên kế hoạch dễ như nhắn tin"
      >
        Không cần mở chục tab so sánh. Bạn kể, trợ lý ráp thành lịch trình từng
        ngày.
      </SectionTitle>

      <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="grid justify-items-center gap-3 text-center"
          >
            <span className="grid size-16 place-items-center rounded-full bg-accent text-primary ring-8 ring-accent/40">
              <Icon className="size-7" />
            </span>
            <h3 className="mt-2 font-display text-lg font-bold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ------------------------------------------------------------------ promo

export function SeasonPromo() {
  const planTrip = usePlanTrip()
  const photo = PHOTOS.mucangchai

  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src={photoUrl(photo, 1920)}
        alt={photo.alt}
        fill
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sea-deep/90 via-primary/75 to-primary/40" />

      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="grid max-w-2xl gap-3 text-white">
          <p className="font-script text-2xl text-white/90">
            Mùa đẹp nhất trong năm
          </p>
          <h2 className="font-display text-3xl font-extrabold text-sun sm:text-5xl">
            Mùa lúa chín Mù Cang Chải
          </h2>
          <p className="text-white/90">
            Cuối tháng 9 đến đầu tháng 10, ruộng bậc thang ở Chế Cu Nha, La Pán
            Tẩn chuyển vàng. Đường từ Hà Nội khoảng 280 km, đi xe khách giường
            nằm hoặc tự lái qua đèo Khau Phạ.
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-white">
            <span className="text-sm text-white/80">Gợi ý:</span>
            <span className="font-display text-2xl font-bold">
              3 ngày 2 đêm
            </span>
            <span className="text-sm text-white/80">từ Hà Nội</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            planTrip(
              "Lên lịch trình 3 ngày 2 đêm từ Hà Nội đi Mù Cang Chải mùa lúa chín cho 2 người, đi xe khách."
            )
          }
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-brand px-8 text-sm font-bold tracking-wide text-white uppercase shadow-lg transition-colors outline-none hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-white/60"
        >
          Lên lịch trình này
          <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  )
}

// ------------------------------------------------------------- destinations

export function Destinations() {
  const planTrip = usePlanTrip()

  return (
    <section id="diem-den" className="scroll-mt-20 bg-muted py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle kicker="Đi đâu bây giờ?" title="Điểm đến được yêu thích">
          Chọn một nơi, trợ lý sẽ gợi ý lịch trình theo số ngày và số người của
          bạn.
        </SectionTitle>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d) => {
            const photo = PHOTOS[d.photo]
            return (
              <article
                key={d.id}
                className="group flex flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border transition-shadow hover:shadow-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={photoUrl(photo)}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow">
                    {d.days}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {d.region}
                  </p>
                  <h3 className="font-display text-xl font-bold">{d.name}</h3>
                  <p className="text-sm text-muted-foreground">{d.blurb}</p>
                  <button
                    type="button"
                    onClick={() =>
                      planTrip(
                        `Lên lịch trình ${d.name} ${d.days} cho 2 người lớn. Gợi ý điểm tham quan, món nên ăn và chỗ ở.`
                      )
                    }
                    className="mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-3 text-sm font-semibold text-primary outline-none hover:gap-2.5 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    Gợi ý lịch trình
                    <ArrowRight className="size-4 transition-all" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- styles

/** Bốn kiểu chuyến đi (archetype P1–P4 trong rule framework), viết theo lời của khách. */
const STYLES = [
  {
    icon: Users,
    title: "Đi nhóm, tiết kiệm",
    body: "Gom điểm gần nhau, ăn quán địa phương, lịch dày để đi được nhiều nhất.",
    prompt:
      "Nhóm 4 bạn sinh viên muốn đi Đà Lạt 3 ngày, ngân sách 1,5 triệu/người. Lịch dày cũng được.",
  },
  {
    icon: Heart,
    title: "Gia đình, thoải mái",
    body: "Ít đi bộ, ít đổi xe, có nghỉ trưa và về khách sạn sớm.",
    prompt:
      "Gia đình có ông bà và bé 4 tuổi đi Huế 3 ngày, cần lịch nhẹ nhàng, ít đi bộ, có nghỉ trưa.",
  },
  {
    icon: Palmtree,
    title: "Nghỉ dưỡng, tận hưởng",
    body: "Ít điểm nhưng đẹp và yên tĩnh, ăn ngon, không chạy lịch.",
    prompt:
      "Cặp đôi muốn nghỉ dưỡng Phú Quốc 4 ngày, thích chỗ yên tĩnh, đồ ăn ngon, không muốn chạy lịch.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Công tác, tranh thủ",
    body: "Xếp vào các khoảng rảnh, luôn chừa thời gian di chuyển và giờ bay.",
    prompt:
      "Mình đi công tác Đà Nẵng, rảnh tối thứ 5 và sáng thứ 6, bay về lúc 14h thứ 6. Nên đi đâu?",
  },
]

export function TravelStyles() {
  const planTrip = usePlanTrip()

  return (
    <section
      id="phong-cach"
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6"
    >
      <SectionTitle kicker="Mỗi nhóm một kiểu" title="Đi theo cách của bạn">
        Cùng một điểm đến, nhóm bạn sinh viên và gia đình có ông bà cần hai lịch
        trình rất khác nhau.
      </SectionTitle>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STYLES.map(({ icon: Icon, title, body, prompt }) => (
          <button
            key={title}
            type="button"
            onClick={() => planTrip(prompt)}
            className="group grid content-start gap-3 rounded-xl border bg-card p-6 text-left transition-all outline-none hover:-translate-y-1 hover:border-sea hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="grid size-12 place-items-center rounded-lg bg-brand text-white">
              <Icon className="size-6" />
            </span>
            <h3 className="font-display text-lg font-bold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
            <span className="mt-1 rounded-md bg-muted px-3 py-2 text-xs leading-snug text-muted-foreground italic">
              “{prompt}”
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Thử câu này
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- steps

const STEPS = [
  {
    title: "Kể về chuyến đi",
    body: "Điểm đến, số ngày, ai đi cùng, ngân sách.",
  },
  {
    title: "Trợ lý hỏi thêm",
    body: "Còn thiếu điều gì quan trọng, trợ lý hỏi lại trước khi xếp lịch.",
  },
  {
    title: "Nhận lịch trình",
    body: "Từng buổi đi đâu, ăn gì, ở đâu, đi lại thế nào.",
  },
  {
    title: "Chỉnh đến khi ưng",
    body: "Muốn đổi điểm hay giảm chi phí, cứ nhắn tiếp.",
  },
]

export function HowItWorks() {
  return (
    <section id="cach-hoat-dong" className="scroll-mt-20 bg-secondary py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle
          kicker="Chỉ 4 bước"
          title="Từ một tin nhắn tới cả chuyến đi"
        />
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative grid content-start gap-2">
              <span className="font-display text-5xl font-extrabold text-sea/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex justify-center">
          <Link
            href="/register"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-primary px-8 text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-sm transition-colors outline-none hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Clock className="size-4" />
            Bắt đầu trong 1 phút
          </Link>
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- footer

export function SiteFooter() {
  const credited = Object.values(PHOTOS)
  const videos = HERO_SLIDES.flatMap((s) => (s.video ? [s.video] : []))
  return (
    <footer className="bg-sea-deep text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="grid content-start gap-4">
          <Brand tone="light" />
          <p className="max-w-sm text-sm leading-relaxed">
            Trợ lý AI giúp bạn lên lịch trình du lịch trong nước theo đúng nhóm
            người, số ngày và ngân sách.
          </p>
        </div>
        <div className="grid content-start gap-3">
          <h3 className="font-display font-bold text-white">Điểm đến</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {DESTINATIONS.map((d) => (
              <li key={d.id}>
                <a href="#diem-den" className="hover:text-white">
                  {d.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-3">
          <h3 className="font-display font-bold text-white">Tài khoản</h3>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/login" className="hover:text-white">
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-white">
                Đăng ký
              </Link>
            </li>
            <li>
              <Link href="/forgot-password" className="hover:text-white">
                Quên mật khẩu
              </Link>
            </li>
            <li>
              <Link href="/chat" className="hover:text-white">
                Mở trợ lý
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <details className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60 sm:px-6">
          <summary className="cursor-pointer hover:text-white">
            Ảnh và video: Wikimedia Commons. Xem tác giả và giấy phép
          </summary>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {credited.map((p) => (
              <li key={p.path}>
                <a
                  href={p.page}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-2 hover:text-white hover:underline"
                >
                  {p.alt}
                </a>{" "}
                · {p.author} · {p.license}
              </li>
            ))}
            {videos.map((v) => (
              <li key={v.src}>
                <a
                  href={v.page}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-2 hover:text-white hover:underline"
                >
                  Video vịnh Hạ Long
                </a>{" "}
                · {v.author} · {v.license}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  )
}
