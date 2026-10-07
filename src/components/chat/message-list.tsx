"use client"

import * as React from "react"
import Image from "next/image"
import {
  ArrowUpRight,
  Check,
  Copy,
  Hotel,
  RotateCcw,
  Route,
  UtensilsCrossed,
} from "lucide-react"

import { BrandMark } from "@/components/brand"
import { DESTINATIONS, PHOTOS, photoUrl } from "@/lib/destinations"

import { Markdown } from "./markdown"

export type DisplayMessage = {
  role: "human" | "ai"
  content: string
  /** Đang nhận stream — hiện con trỏ nhấp nháy ở cuối. */
  pending?: boolean
}

type Props = {
  messages: DisplayMessage[]
  /** Tên để chào ở màn trống. */
  userName?: string | null
  /** Gửi một câu hỏi có sẵn (gợi ý ở màn trống, câu hỏi tiếp theo). */
  onSuggest: (prompt: string) => void
  /** Gửi lại câu hỏi cuối khi nó chưa có câu trả lời (luồng trước bị ngắt giữa chừng). */
  onRetry: (prompt: string) => void
  busy: boolean
}

/** Cách đáy trong khoảng này thì vẫn coi là đang "bám đáy" để tự cuộn theo stream. */
const STICK_TO_BOTTOM_PX = 120

/** Hỏi tiếp sau một câu trả lời, để chỉnh lịch trình mà không phải gõ. */
const FOLLOW_UPS = [
  "Giảm chi phí xuống còn khoảng 2/3",
  "Thêm 1 ngày nữa",
  "Gợi ý chỗ ở cụ thể",
  "Đổi sang lịch nhẹ nhàng hơn",
  "Món nên ăn ở mỗi điểm",
]

export function MessageList({
  messages,
  userName,
  onSuggest,
  onRetry,
  busy,
}: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Tự cuộn xuống khi có nội dung mới, trừ khi người dùng đã cuộn lên đọc lại.
  React.useEffect(() => {
    const bottom = bottomRef.current
    const scroller = bottom?.closest<HTMLElement>("[data-scroll-container]")
    if (!bottom || !scroller) return
    const distance =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    const last = messages[messages.length - 1]
    if (
      distance < STICK_TO_BOTTOM_PX ||
      last?.role === "human" ||
      (last?.pending && !last.content)
    )
      bottom.scrollIntoView({ block: "end" })
  }, [messages])

  if (messages.length === 0)
    return <EmptyState userName={userName} onSuggest={onSuggest} />

  const lastAi = messages.findLastIndex((m) => m.role === "ai")
  const last = messages[messages.length - 1]
  const unanswered = !busy && last.role === "human" ? last.content : null

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-6 sm:px-6">
      {messages.map((message, index) =>
        message.role === "human" ? (
          // Danh sách chỉ nối thêm ở cuối, không sắp xếp lại, nên index đủ ổn định.
          <UserMessage key={index} content={message.content} />
        ) : (
          <AssistantMessage
            key={index}
            message={message}
            followUps={
              index === lastAi && !busy && !message.pending ? FOLLOW_UPS : []
            }
            onSuggest={onSuggest}
          />
        )
      )}
      {unanswered && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-sea/40 bg-card px-5 py-4 text-sm">
          <span className="text-muted-foreground">
            Câu hỏi này chưa có câu trả lời, có thể lần trước bị ngắt giữa
            chừng.
          </span>
          <button
            type="button"
            onClick={() => onRetry(unanswered)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <RotateCcw className="size-3.5" />
            Hỏi lại
          </button>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex animate-in justify-end duration-300 fade-in slide-in-from-bottom-2">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-gradient-to-br from-sea to-primary px-5 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-white shadow-md shadow-primary/20">
        {content}
      </div>
    </div>
  )
}

function AssistantMessage({
  message,
  followUps,
  onSuggest,
}: {
  message: DisplayMessage
  followUps: string[]
  onSuggest: (prompt: string) => void
}) {
  const isWaiting = message.pending && !message.content

  return (
    <div className="flex animate-in gap-3 duration-300 fade-in slide-in-from-bottom-2 sm:gap-4">
      <BrandMark framed className="mt-1" />
      <div className="grid min-w-0 flex-1 gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold">Ailusion</span>
          <span className="text-xs text-muted-foreground">Trợ lý du lịch</span>
        </div>

        <div className="rounded-2xl rounded-tl-md border bg-card px-5 py-4 text-[15px] leading-relaxed break-words text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(10_79_85/0.18)] sm:px-6 sm:py-5">
          {isWaiting ? (
            <Thinking />
          ) : (
            <>
              <Markdown>{message.content}</Markdown>
              {message.pending && (
                <span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-full bg-sea align-middle" />
              )}
            </>
          )}
        </div>

        {!message.pending && message.content && (
          <CopyButton text={message.content} />
        )}

        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {followUps.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSuggest(prompt)}
                className="inline-flex items-center gap-1 rounded-full border border-sea/30 bg-accent/60 px-3.5 py-1.5 text-[13px] font-medium text-accent-foreground transition-colors outline-none hover:border-sea hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                {prompt}
                <ArrowUpRight className="size-3.5 opacity-60" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => setCopied(true),
          () => {}
        )
      }
      className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      {copied ? (
        <Check className="size-3.5 text-primary" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  )
}

/** Chỉ để người dùng biết trợ lý đang làm việc; không phản ánh bước thật của backend. */
const THINKING_HINTS = [
  "Đang đọc yêu cầu của bạn",
  "Đang chọn điểm đến phù hợp",
  "Đang xếp lịch theo ngày",
]

function Thinking() {
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    const timer = window.setInterval(
      () => setStep((s) => Math.min(s + 1, THINKING_HINTS.length - 1)),
      1800
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div role="status" className="flex items-center gap-3 py-1">
      <span className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-2 animate-bounce rounded-full bg-sea"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span
        key={step}
        className="animate-in text-sm text-muted-foreground duration-500 fade-in"
      >
        {THINKING_HINTS[step]}…
      </span>
    </div>
  )
}

// ---------------------------------------------------------------- empty state

const QUICK_DESTINATIONS = ["hoi-an", "da-lat", "phu-quoc", "ha-giang"]

const INTENTS = [
  {
    icon: Route,
    label: "Lịch trình",
    prompt:
      "Lên lịch trình Đà Nẵng – Hội An 4 ngày 3 đêm cho 2 người lớn, ngân sách 8 triệu mỗi người.",
  },
  {
    icon: Hotel,
    label: "Chỗ ở",
    prompt:
      "Gợi ý khách sạn 3–4 sao gần biển ở Nha Trang cho gia đình 2 lớn 1 bé, khoảng 1,5 triệu mỗi đêm.",
  },
  {
    icon: UtensilsCrossed,
    label: "Ăn uống",
    prompt:
      "Ở Huế nên ăn gì trong 2 ngày? Gợi ý món và quán theo từng bữa, giá bình dân.",
  },
]

function EmptyState({
  userName,
  onSuggest,
}: {
  userName?: string | null
  onSuggest: (prompt: string) => void
}) {
  const firstName = userName?.trim().split(/\s+/).pop()
  const banner = PHOTOS.halong

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <div className="relative isolate overflow-hidden rounded-3xl bg-sea-deep px-6 py-10 text-white shadow-xl shadow-sea-deep/20 sm:px-10 sm:py-14">
        <Image
          src={photoUrl(banner, 1920)}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 896px, 100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sea-deep/90 via-sea-deep/60 to-sea-deep/10" />
        <p className="font-script text-2xl text-sun">
          {firstName ? `Xin chào, ${firstName}!` : "Xin chào!"}
        </p>
        <h1 className="mt-2 max-w-lg font-display text-3xl leading-tight font-extrabold sm:text-4xl">
          Chuyến tiếp theo của bạn sẽ là đâu?
        </h1>
        <p className="mt-3 max-w-md text-white/85">
          Kể điểm đến, số ngày, ai đi cùng và ngân sách. Trợ lý sẽ lên lịch
          trình từng buổi cho bạn.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {INTENTS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSuggest(prompt)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/25 backdrop-blur-md transition-colors outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Hoặc chọn nhanh một điểm đến
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_DESTINATIONS.map((id) => {
            const d = DESTINATIONS.find((x) => x.id === id)
            if (!d) return null
            const photo = PHOTOS[d.photo]
            return (
              <button
                key={d.id}
                type="button"
                onClick={() =>
                  onSuggest(
                    `Lên lịch trình ${d.name} ${d.days} cho 2 người lớn. Gợi ý điểm tham quan, món nên ăn và chỗ ở.`
                  )
                }
                className="group relative isolate aspect-[4/3] overflow-hidden rounded-2xl text-left shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:aspect-[3/4]"
              >
                <Image
                  src={photoUrl(photo)}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 220px, 50vw"
                  className="-z-10 object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 grid gap-0.5 p-4 text-white">
                  <span className="text-[11px] font-medium tracking-wide text-white/75 uppercase">
                    {d.days}
                  </span>
                  <span className="font-display text-lg leading-tight font-bold">
                    {d.name}
                  </span>
                </div>
                <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="size-4" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
