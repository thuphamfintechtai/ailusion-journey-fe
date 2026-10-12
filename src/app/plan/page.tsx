"use client"

/**
 * Trang lập lộ trình riêng (ngoài trang chat): điền form -> theo dõi tiến độ -> xem phương án.
 * Form, khung kết quả và tiến độ dùng chung với trang chat (components/itinerary/).
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Pencil,
  TriangleAlert,
} from "lucide-react"

import { Brand } from "@/components/brand"
import { ItineraryView } from "@/components/itinerary/itinerary-view"
import { PlanTrace } from "@/components/itinerary/plan-trace"
import { TripFormSheet } from "@/components/itinerary/trip-form-sheet"
import {
  ApiError,
  newPlanThreadId,
  plan,
  streamPlanEvents,
  type PlanEvent,
} from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { ItineraryResult, TripForm } from "@/lib/itinerary"

type Stage = "form" | "running" | "result"

export default function PlanPage() {
  const { token, loading, authorized } = useAuth()
  const router = useRouter()

  const [formOpen, setFormOpen] = React.useState(true)
  // Form đã gửi cho kết quả đang xem: câu hỏi lại điền thêm vào đây rồi gửi lại.
  const [sent, setSent] = React.useState<TripForm | null>(null)
  const [stage, setStage] = React.useState<Stage>("form")
  const [events, setEvents] = React.useState<PlanEvent[]>([])
  const [result, setResult] = React.useState<ItineraryResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    if (!loading && !token) router.replace("/login")
  }, [loading, token, router])

  // Rời trang giữa chừng thì đóng stream tiến độ.
  React.useEffect(() => () => abortRef.current?.abort(), [])

  async function submit(form: TripForm) {
    if (!token) return
    const threadId = newPlanThreadId()
    const abort = new AbortController()
    abortRef.current?.abort()
    abortRef.current = abort

    setFormOpen(false)
    setError(null)
    setEvents([])
    setSent(form)
    setStage("running")
    window.scrollTo({ top: 0, behavior: "smooth" })

    // Tiến độ chạy song song với request chính; lỗi ở đây không ảnh hưởng kết quả.
    void (async () => {
      for await (const event of streamPlanEvents(token, threadId, abort.signal))
        setEvents((prev) => [...prev, event])
    })()

    try {
      setResult(await authorized((t) => plan.create(t, form, threadId)))
      setStage("result")
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không lập được lộ trình, vui lòng thử lại."
      )
      setStage("form")
    } finally {
      // Để stream kịp nhận sự kiện kết thúc rồi mới đóng.
      setTimeout(() => abort.abort(), 1500)
    }
  }

  if (loading || !token) {
    return (
      <main className="flex flex-1 items-center justify-center bg-trip-paper p-6">
        <Loader2
          className="size-6 animate-spin text-trip-ink-3"
          aria-label="Đang tải"
        />
      </main>
    )
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-trip-paper text-trip-ink">
      <header className="sticky top-0 z-30 border-b border-trip-line bg-trip-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link
            href="/"
            className="grid size-9 place-items-center rounded-[10px] text-trip-ink-2 hover:bg-trip-sheet-2"
            aria-label="Về trang chủ"
          >
            <ArrowLeft className="size-[18px]" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.5px] font-bold">Lập lộ trình</p>
            <p className="truncate text-[12.5px] text-trip-ink-3">
              {sent
                ? `${sent.destination}, ${sent.start_date} → ${sent.end_date}, ${sent.group_size} người`
                : "Điền thông tin, hệ thống xếp tối đa ba phương án theo giờ"}
            </p>
          </div>
          {stage !== "running" && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-trip-line-2 bg-trip-sheet px-3 text-[13.5px] font-semibold"
            >
              <Pencil className="size-4" />
              <span className="max-sm:sr-only">Thông tin chuyến đi</span>
            </button>
          )}
          <Link
            href="/chat"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-trip-line-2 bg-trip-sheet px-3 text-[13.5px] font-semibold"
          >
            <MessageCircle className="size-4" />
            <span className="max-sm:sr-only">Trò chuyện</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-4 pt-6 pb-10">
        {error && (
          <p
            role="alert"
            className="flex gap-2 rounded-xl border-[1.5px] border-trip-seal bg-trip-seal-bg px-4 py-3 text-[14.5px] text-trip-seal"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {stage === "form" && (
          <div className="grid gap-3">
            <Brand />
            <h1 className="font-display text-[clamp(26px,5vw,36px)] leading-tight font-extrabold tracking-tight">
              Kể cho mình về chuyến đi của bạn
            </h1>
            <p className="max-w-[60ch] text-[16px] text-trip-ink-2">
              Hệ thống tìm địa điểm, chỗ ở và thời tiết thật, chạy thử từng lịch
              theo giờ mở cửa và quãng đường, rồi giải thích vì sao chọn phương
              án hợp với bạn nhất.
            </p>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-trip-fill px-5 text-[15px] font-semibold text-trip-on-fill"
            >
              <Pencil className="size-4" />
              Điền thông tin chuyến đi
            </button>
          </div>
        )}

        {stage === "running" && <PlanTrace events={events} running />}

        {stage === "result" && result && (
          <>
            <ItineraryView
              result={result}
              onAnswer={(set) => sent && void submit({ ...sent, ...set })}
              onOpenForm={() => setFormOpen(true)}
            />
            <PlanTrace events={events} running={false} collapsible />
          </>
        )}
      </main>

      <TripFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onPlan={(form) => void submit(form)}
      />
    </div>
  )
}
