"use client"

/**
 * Màn chờ lúc lập lộ trình, bằng lời thường cho người không rành kỹ thuật: đang ở bước nào
 * trong 5 bước, đã chờ bao lâu, thường mất bao lâu. Nhật ký kỹ thuật (PlanTrace: node, agent,
 * công cụ) vẫn có ở dưới, thu gọn.
 */

import * as React from "react"
import { Check, Circle, LoaderCircle } from "lucide-react"

import type { PlanEvent } from "@/lib/api"
import { cn } from "@/lib/utils"

import { buildTrace, NODES, type Phase } from "./plan-trace-model"

const STAGES: { phase: Phase; title: string; hint: string }[] = [
  {
    phase: "intake",
    title: "Đọc yêu cầu của bạn",
    hint: "Đoàn đi, ngày giờ, ngân sách, nhu cầu riêng",
  },
  {
    phase: "search",
    title: "Tìm chỗ ở, chỗ chơi, quán ăn",
    hint: "Bỏ chỗ đóng cửa, quá xa hoặc không hợp đoàn",
  },
  {
    phase: "schedule",
    title: "Xếp lịch từng ngày",
    hint: "Đủ bữa, kịp giờ mở cửa, không đi quá mệt",
  },
  {
    phase: "decide",
    title: "So sánh, chọn phương án hợp nhất",
    hint: "Cân tiền, đường đi và độ thoải mái",
  },
  {
    phase: "deliver",
    title: "Hoàn thiện lộ trình",
    hint: "Bản đồ, chi phí, đồ cần mang",
  },
]
// Đo chạy thật (chuyến 3 ngày) mất 80–125 giây; quá mốc này thì nói thêm là sắp xong.
const USUAL_SECONDS = 120

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function PlanLoading({
  events,
  destination,
}: {
  events: PlanEvent[]
  destination: string
}) {
  const [now, setNow] = React.useState(() => Date.now() / 1000)
  const [shown] = React.useState(() => Date.now() / 1000)
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(timer)
  }, [])

  const { steps } = React.useMemo(() => buildTrace(events), [events])
  // Bước xa nhất đã tới: Planner sửa lịch thì nhật ký quay lại bước trước, thanh không lùi.
  const stage = steps.reduce((most, step) => {
    const phase = NODES[step.node]?.phase
    const at = STAGES.findIndex((s) => s.phase === phase)
    return Math.max(most, at)
  }, 0)
  const elapsed = now - (steps[0]?.start || shown)
  const current = STAGES[stage]

  return (
    <section
      aria-label="Đang lập lộ trình"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-trip-line bg-trip-sheet p-4"
    >
      <div className="flex items-start gap-3">
        <LoaderCircle
          aria-hidden
          className="mt-0.5 size-5 shrink-0 animate-spin text-trip-jade motion-reduce:animate-none"
        />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="text-[15px] font-bold text-trip-ink">
            Đang lập lộ trình cho chuyến {destination}
          </p>
          <p className="text-[13.5px] leading-snug text-trip-ink-2">
            {elapsed < USUAL_SECONDS
              ? "Thường mất 1–2 phút. Bạn cứ để trang mở, lộ trình sẽ hiện ngay tại đây."
              : "Chuyến nhiều ngày, nhiều chỗ nên lâu hơn một chút — sắp xong rồi."}
          </p>
        </div>
        <span
          className="shrink-0 font-num text-sm text-trip-ink-3"
          title="Thời gian đã chờ"
        >
          {clock(elapsed)}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Tiến độ lập lộ trình"
        aria-valuemin={0}
        aria-valuemax={STAGES.length}
        aria-valuenow={stage + 1}
        aria-valuetext={`Bước ${stage + 1}/${STAGES.length}: ${current.title}`}
        className="h-1.5 overflow-hidden rounded-full bg-trip-sheet-2"
      >
        <div
          className="h-full rounded-full bg-trip-jade transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${((stage + 0.5) / STAGES.length) * 100}%` }}
        />
      </div>

      <ol className="grid gap-2">
        {STAGES.map((s, i) => {
          const done = i < stage
          const active = i === stage
          return (
            <li
              key={s.phase}
              aria-current={active ? "step" : undefined}
              className="flex items-start gap-2.5"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                  done && "bg-trip-jade text-white",
                  active && "bg-trip-jade-bg text-trip-jade",
                  !done && !active && "text-trip-ink-3"
                )}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : active ? (
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Circle className="size-3" />
                )}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span
                  className={cn(
                    "text-[14px] leading-snug",
                    active
                      ? "font-bold text-trip-ink"
                      : done
                        ? "text-trip-ink-2"
                        : "text-trip-ink-3"
                  )}
                >
                  {s.title}
                  <span className="sr-only">
                    {done ? " (xong)" : active ? " (đang làm)" : " (chưa tới)"}
                  </span>
                </span>
                {active && (
                  <span className="text-[12.5px] leading-snug text-trip-ink-3">
                    {s.hint}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {`Bước ${stage + 1} trên ${STAGES.length}: ${current.title}`}
      </p>
    </section>
  )
}
