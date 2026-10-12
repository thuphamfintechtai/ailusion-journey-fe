"use client"

import * as React from "react"
import Image from "next/image"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  CalendarPlus,
  Check,
  Copy,
  Hotel,
  RotateCcw,
  Route,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { BrandMark } from "@/components/brand"
import { ItineraryView } from "@/components/itinerary/itinerary-view"
import { PlanTrace } from "@/components/itinerary/plan-trace"
import type { PlanEvent } from "@/lib/api"
import type { ItineraryResult, TripForm } from "@/lib/itinerary"

import { DESTINATIONS, PHOTOS, photoUrl } from "@/lib/destinations"
import { cn } from "@/lib/utils"

import { Markdown } from "./markdown"

export type DisplayMessage = {
  role: "human" | "ai"
  content: string
  /** Đang nhận stream — hiện con trỏ nhấp nháy ở cuối. */
  pending?: boolean
  /** Trả lời thất bại: hiện thẻ lỗi kèm nút thử lại câu hỏi này. */
  error?: { message: string; prompt: string }
  /**
   * Lộ trình lập từ form ngay trong cuộc trò chuyện: đang chạy thì hiện tiến độ, xong thì
   * hiện lộ trình đầy đủ (phương án, lịch theo giờ, bản đồ) kèm các bước đã chạy.
   */
  plan?: {
    id: string
    form: TripForm
    events: PlanEvent[]
    result?: ItineraryResult
    error?: string
  }
}

type Props = {
  messages: DisplayMessage[]
  /** Tên để chào ở màn trống. */
  userName?: string | null
  /** Gửi một câu hỏi có sẵn (gợi ý ở màn trống, câu hỏi tiếp theo). */
  onSuggest: (prompt: string) => void
  /** Gửi lại một câu hỏi chưa có câu trả lời (lỗi, hoặc luồng trước bị ngắt giữa chừng). */
  onRetry: (prompt: string) => void
  /** Mở form chuyến đi (sửa thông tin để lập lại lộ trình). */
  onOpenForm: () => void
  /** Trả lời câu hỏi lại của pipeline: điền thêm vào form của lượt đó rồi gửi lại. */
  onAnswerPlan: (form: TripForm) => void
  busy: boolean
}

/** Cách đáy trong khoảng này thì vẫn coi là đang "bám đáy" để tự cuộn theo stream. */
const STICK_TO_BOTTOM_PX = 120
/** Cách đáy quá khoảng này thì hiện nút "xuống cuối". */
const SHOW_JUMP_PX = 480

/** Hỏi tiếp sau một lịch trình, để chỉnh mà không phải gõ. */
const FOLLOW_UPS: { icon: LucideIcon; label: string; prompt: string }[] = [
  {
    icon: Wallet,
    label: "Tiết kiệm hơn",
    prompt: "Giảm tổng chi phí xuống còn khoảng 2/3, giữ các điểm chính.",
  },
  {
    icon: CalendarPlus,
    label: "Thêm 1 ngày",
    prompt: "Thêm 1 ngày nữa vào lịch trình.",
  },
  {
    icon: Hotel,
    label: "Gợi ý chỗ ở",
    prompt: "Gợi ý chỗ ở cụ thể cho lịch trình này, kèm khu vực và mức giá.",
  },
  {
    icon: UtensilsCrossed,
    label: "Món nên ăn",
    prompt: "Gợi ý món nên ăn và quán cụ thể ở từng điểm trong lịch trình.",
  },
]

export function MessageList({
  messages,
  userName,
  onSuggest,
  onRetry,
  onOpenForm,
  onAnswerPlan,
  busy,
}: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const [farFromBottom, setFarFromBottom] = React.useState(false)

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

  React.useEffect(() => {
    const scroller = bottomRef.current?.closest<HTMLElement>(
      "[data-scroll-container]"
    )
    if (!scroller) return
    const onScroll = () =>
      setFarFromBottom(
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight >
          SHOW_JUMP_PX
      )
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [messages.length])

  if (messages.length === 0)
    return <EmptyState userName={userName} onSuggest={onSuggest} />

  const lastAi = messages.findLastIndex((m) => m.role === "ai")
  const last = messages[messages.length - 1]
  const unanswered = !busy && last.role === "human" ? last.content : null

  return (
    // Mọi tin nhắn bám một cột rộng: trợ lý sát mép trái, người dùng sát mép phải. Lộ trình dùng
    // hết bề ngang; khung chữ giữ tối đa TEXT_MAX cho dòng không quá dài.
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 px-4 pt-8 pb-10 sm:px-6">
      {messages.map((message, index) =>
        message.role === "human" ? (
          // Danh sách chỉ nối thêm ở cuối, không sắp xếp lại, nên index đủ ổn định.
          <UserMessage key={index} content={message.content} />
        ) : (
          <AssistantMessage
            key={index}
            message={message}
            regenerate={
              index === lastAi && !busy && !message.pending
                ? regenerateOf(messages, index, onSuggest, onAnswerPlan)
                : undefined
            }
            followUps={
              index === lastAi &&
              !busy &&
              !message.pending &&
              !message.error &&
              looksLikePlan(message.content)
                ? FOLLOW_UPS
                : []
            }
            onSuggest={onSuggest}
            onRetry={onRetry}
            onOpenForm={onOpenForm}
            onAnswerPlan={onAnswerPlan}
          />
        )
      )}

      {unanswered && (
        <div className={TEXT_MAX}>
          <ErrorCard
            title="Câu hỏi này chưa có câu trả lời"
            message="Có thể lần trước bị ngắt giữa chừng."
            retryLabel="Hỏi lại"
            onRetry={() => onRetry(unanswered)}
          />
        </div>
      )}

      <div ref={bottomRef} />

      {farFromBottom && (
        <button
          type="button"
          onClick={() =>
            bottomRef.current?.scrollIntoView({
              block: "end",
              behavior: "smooth",
            })
          }
          className="sticky bottom-4 mx-auto -mt-6 inline-flex animate-in items-center gap-1.5 rounded-full bg-foreground/90 px-3.5 py-2 text-xs font-semibold text-background shadow-lg backdrop-blur outline-none fade-in slide-in-from-bottom-2 hover:bg-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <ArrowDown className="size-3.5" />
          Xuống cuối
        </button>
      )}
    </div>
  )
}

/**
 * "Tạo lại" cho câu trả lời cuối: lộ trình thì lập lại bằng đúng form đó, câu chữ thì hỏi lại
 * câu ngay trước. Câu hỏi được gửi lại như tin mới, khớp với lịch sử đã lưu.
 */
function regenerateOf(
  messages: DisplayMessage[],
  index: number,
  onSuggest: (prompt: string) => void,
  onAnswerPlan: (form: TripForm) => void
): (() => void) | undefined {
  const plan = messages[index].plan
  if (plan) return () => onAnswerPlan(plan.form)
  const asked = messages[index - 1]
  if (asked?.role !== "human" || messages[index].error) return undefined
  return () => onSuggest(asked.content)
}

/** Bề ngang tối đa của khung chữ, để dòng vừa mắt đọc. */
const TEXT_MAX = "w-full max-w-3xl"

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex animate-in justify-end duration-300 fade-in slide-in-from-bottom-2">
      <div className="max-w-[min(80%,42rem)] rounded-[22px] rounded-br-md bg-brand px-5 py-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-white shadow-lg shadow-primary/20">
        {content}
      </div>
    </div>
  )
}

function AssistantMessage({
  message,
  regenerate,
  followUps,
  onSuggest,
  onRetry,
  onOpenForm,
  onAnswerPlan,
}: {
  message: DisplayMessage
  /** Có thì hiện nút "Tạo lại" (chỉ câu trả lời cuối, lúc không bận). */
  regenerate?: () => void
  followUps: typeof FOLLOW_UPS
  onSuggest: (prompt: string) => void
  onRetry: (prompt: string) => void
  onOpenForm: () => void
  onAnswerPlan: (form: TripForm) => void
}) {
  const isWaiting = message.pending && !message.content
  const error = message.error

  return (
    <div
      className={cn(
        "w-full",
        "flex animate-in gap-3 duration-300 fade-in slide-in-from-bottom-2 sm:gap-4"
      )}
    >
      <BrandMark framed className="mt-0.5 hidden sm:grid" />
      <div
        className={cn(
          "grid min-w-0 flex-1 gap-2.5",
          !message.plan?.result && "max-w-3xl"
        )}
      >
        <div className="flex items-center gap-2">
          <BrandMark framed className="size-6 sm:hidden" />
          <span className="font-display text-sm font-bold">Ailusion</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-foreground uppercase">
            Trợ lý du lịch
          </span>
        </div>

        {message.plan ? (
          <PlanBubble
            plan={message.plan}
            onOpenForm={onOpenForm}
            onAnswer={onAnswerPlan}
          />
        ) : error ? (
          <ErrorCard
            title="Trợ lý chưa trả lời được"
            message={error.message}
            retryLabel="Thử lại"
            onRetry={() => onRetry(error.prompt)}
          />
        ) : (
          <div className="rounded-2xl bg-card px-5 py-4 text-[15px] leading-[1.7] break-words text-card-foreground shadow-[0_1px_2px_rgb(18_23_53/0.05),0_12px_32px_-16px_rgb(18_23_53/0.18)] ring-1 ring-border/70 sm:px-7 sm:py-6">
            {isWaiting ? (
              <Thinking />
            ) : (
              <>
                <Markdown>{message.content}</Markdown>
                {message.pending && (
                  <span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-full bg-primary align-middle" />
                )}
              </>
            )}
          </div>
        )}

        {!message.pending && message.content && !error && (
          <div className="flex items-center gap-1">
            <CopyButton text={message.content} />
            {regenerate && (
              <button
                type="button"
                onClick={regenerate}
                title={
                  message.plan
                    ? "Lập lại lộ trình bằng form này"
                    : "Hỏi lại câu trước"
                }
                className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <RotateCcw className="size-3.5" />
                Tạo lại
              </button>
            )}
          </div>
        )}

        {followUps.length > 0 && (
          <div className="mt-1 grid gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Chỉnh tiếp lịch trình
            </p>
            <div className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              {followUps.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSuggest(prompt)}
                  title={prompt}
                  className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground shadow-xs ring-1 ring-border transition-all outline-none hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <span className="grid size-6 place-items-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-brand group-hover:text-white">
                    <Icon className="size-3.5" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Lộ trình trong cuộc trò chuyện: tiến độ khi đang chạy, lộ trình đầy đủ khi xong. */
function PlanBubble({
  plan,
  onOpenForm,
  onAnswer,
}: {
  plan: NonNullable<DisplayMessage["plan"]>
  onOpenForm: () => void
  onAnswer: (form: TripForm) => void
}) {
  if (plan.error)
    return (
      <ErrorCard
        title="Chưa lập được lộ trình"
        message={plan.error}
        retryLabel="Mở lại form"
        onRetry={onOpenForm}
      />
    )
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-2xl bg-trip-paper p-3 text-trip-ink ring-1 ring-border/70 sm:p-4">
      {plan.result ? (
        <>
          {plan.events.length > 0 && (
            <PlanTrace events={plan.events} running={false} collapsible />
          )}
          <ItineraryView
            result={plan.result}
            onAnswer={(set) => onAnswer({ ...plan.form, ...set })}
            onOpenForm={onOpenForm}
          />
        </>
      ) : (
        <PlanTrace events={plan.events} running />
      )}
    </div>
  )
}

function ErrorCard({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string
  message: string
  retryLabel: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background outline-none hover:bg-foreground/90 focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <RotateCcw className="size-3.5" />
        {retryLabel}
      </button>
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

/**
 * Theo đúng thứ tự một lượt chat ở service LLM: đọc tin nhắn, ghi thông tin chuyến đi vào form
 * (chỉ khi tin có thông tin chuyến đi), rồi soạn câu trả lời. Chuyển bước theo thời gian ước
 * lượng — stream chat không gửi bước thật; lập lộ trình có khung tiến độ riêng (PlanTrace).
 */
const THINKING_HINTS = [
  "Đang đọc tin nhắn của bạn",
  "Đang ghi thông tin chuyến đi",
  "Đang soạn câu trả lời",
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
  const name = greetingName(userName)
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
          {name ? `Xin chào, ${name}!` : "Xin chào!"}
        </p>
        <h1 className="mt-2 max-w-lg font-display text-3xl leading-tight font-extrabold sm:text-4xl">
          Chuyến tiếp theo của bạn sẽ là đâu?
        </h1>
        <p className="mt-3 max-w-md text-white/85">
          Kể điểm đến, số ngày, ai đi cùng và ngân sách, hoặc bấm{" "}
          <b className="font-semibold text-white">Điền thông tin chuyến đi</b>{" "}
          cạnh ô chat. Trợ lý sẽ lên lịch trình từng buổi cho bạn.
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

/**
 * Tên để chào. Tên tiếng Việt đặt tên gọi ở cuối ("Nguyễn Văn An" -> "An"), nhưng từ cuối
 * không phải chữ (vd. "Test 2") thì chào bằng cả họ tên cho khỏi kỳ.
 */
function greetingName(fullName?: string | null): string | null {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
  const last = words[words.length - 1]
  if (!last) return null
  return /^\p{L}+$/u.test(last) ? last : words.join(" ")
}

/**
 * Câu trả lời có phải một lịch trình không (để hiện các nút "chỉnh tiếp"). Câu trợ lý hỏi
 * lại thông tin còn thiếu thì không: chưa có gì để chỉnh.
 */
function looksLikePlan(content: string): boolean {
  if (/(?:^|\n)\s*(?:#+\s*|\*\*)?\s*(?:ngày|day)\s*\d/i.test(content))
    return true
  const bullets = content.match(/^\s*(?:[-*+]|\d+\.)\s+/gm)?.length ?? 0
  return bullets >= 4 && content.length > 500
}
