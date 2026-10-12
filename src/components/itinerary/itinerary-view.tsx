"use client"

/**
 * Kết quả pipeline lập lộ trình (bước 17) trong khung chat:
 * - status "need_info": các câu hỏi lại (bước 4), mỗi câu là nút bấm; bấm thì gửi lại form.
 * - status "ok": 3 phương án, mỗi cái nói rõ hơn 2 cái kia ở đâu, đang giả định gì; lịch theo giờ,
 *   chi tiết phương án theo tab (lịch, bản đồ, chi phí, thời tiết, hành lý — xem plan-panel.tsx),
 *   chỗ ở; vượt ngân sách thì hiện 2 lựa chọn (máy không tự cắt).
 */

import * as React from "react"
import { AlertTriangle, BedDouble, CircleHelp, Info, Quote } from "lucide-react"

import {
  isItineraryResult,
  money,
  trieu,
  type ItineraryResult,
  type TripForm,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { PlanPanel } from "./plan-panel"
import { trieuRange } from "./plan-shared"

const FIELD_NAMES: Record<string, string> = {
  group_type: "đi cùng ai",
  purposes: "mục đích",
  priority: "ưu tiên",
  busy_slots: "lịch bận",
  budget: "ngân sách",
  kids_under_6: "trẻ dưới 6",
  seniors_65: "người từ 65",
  interests: "sở thích",
  spend_style: "mức chi",
}

export function ItineraryView({
  result,
  onAnswer,
  onOpenForm,
}: {
  result: ItineraryResult
  /** Bấm một lựa chọn của câu hỏi lại: các ô form cần điền thêm, rồi gửi lại. */
  onAnswer: (set: Partial<TripForm>) => void
  onOpenForm: () => void
}) {
  // Dữ liệu không đúng dạng hiện tại (VD lộ trình lưu từ pipeline cũ): không dựng, tránh sập trang.
  if (!isItineraryResult(result)) return null
  if (result.status === "need_info")
    return (
      <Questions result={result} onAnswer={onAnswer} onOpenForm={onOpenForm} />
    )
  return <Options result={result} onOpenForm={onOpenForm} />
}

function Questions({
  result,
  onAnswer,
  onOpenForm,
}: {
  result: ItineraryResult
  onAnswer: (set: Partial<TripForm>) => void
  onOpenForm: () => void
}) {
  const [answers, setAnswers] = React.useState<
    Record<string, Partial<TripForm>>
  >({})
  const done = result.questions.every(
    (q) => answers[q.id] || q.choices.length === 0
  )
  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <CircleHelp className="size-4 text-trip-sky" />
        Mình cần thêm vài thông tin để lập lộ trình cho đúng:
      </p>
      {result.questions.map((q) => (
        <div
          key={q.id}
          className="grid gap-2 rounded-xl border border-trip-line bg-trip-sheet p-3"
        >
          <p className="text-[14.5px] font-bold">{q.text}</p>
          {q.choices.length ? (
            <div className="flex flex-wrap gap-1.5">
              {q.choices.map((c) => {
                const on = answers[q.id] === c.set
                return (
                  <button
                    key={c.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: c.set }))}
                    className={cn(
                      "min-h-[38px] rounded-full border px-3 text-sm",
                      on
                        ? "border-trip-fill bg-trip-fill font-semibold text-trip-on-fill"
                        : "border-trip-line-2 bg-trip-paper hover:border-trip-ink-3"
                    )}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenForm}
              className="justify-self-start text-sm font-semibold text-trip-sky underline"
            >
              Điền trong form
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!done}
          onClick={() => onAnswer(Object.assign({}, ...Object.values(answers)))}
          className="min-h-11 rounded-[10px] bg-trip-fill px-5 text-[15px] font-semibold text-trip-on-fill disabled:opacity-40"
        >
          Lập lộ trình
        </button>
        <button
          type="button"
          onClick={onOpenForm}
          className="min-h-11 rounded-[10px] border border-trip-line-2 px-4 text-sm font-semibold"
        >
          Mở lại form
        </button>
      </div>
    </div>
  )
}

function Options({
  result,
  onOpenForm,
}: {
  result: ItineraryResult
  onOpenForm: () => void
}) {
  const chosen = result.chosen ?? result.options[0]?.id
  const [selected, setSelected] = React.useState(chosen)
  const option =
    result.options.find((o) => o.id === selected) ?? result.options[0]
  if (!option) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {result.profile && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-full bg-trip-fill px-2.5 py-0.5 font-semibold text-trip-on-fill">
            Nhóm {result.profile.group} · {result.profile.group_name}
          </span>
          <span className="text-trip-ink-3">
            luật {result.profile.rule} · rảnh{" "}
            {result.profile.days.map((d) => d.free_minutes).join(" / ")} phút
          </span>
        </div>
      )}
      {result.why && (
        <p className="text-[15.5px] leading-relaxed">{result.why}</p>
      )}

      {result.ask_user && (
        <div className="grid gap-2 rounded-xl border-[1.5px] border-trip-seal bg-trip-seal-bg p-3 text-[14px] text-trip-seal">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" />
            Tổng tiền vượt ngân sách {money(result.ask_user.over)}
          </p>
          <p className="text-trip-ink-2">
            Máy không tự cắt bớt. Bạn chọn: (a) mỗi ngày đổi sang lịch rẻ nhất
            mà vẫn đi được ({result.ask_user.cheaper_days.join(", ")}), hoặc (b)
            giữ nguyên và chi thêm. Muốn đổi thì sửa ngân sách hoặc mức chi
            trong form.
          </p>
          <button
            type="button"
            onClick={onOpenForm}
            className="justify-self-start rounded-lg border border-trip-seal px-3 py-1.5 text-sm font-semibold"
          >
            Sửa trong form
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Phương án"
        className="grid grid-cols-3 gap-2"
      >
        {result.options.map((o) => {
          const on = o.id === option.id
          const cb = o.cost_breakdown
          // Có khoảng "từ–đến" thì hiện khoảng, lộ trình cũ thì một con số.
          const range =
            cb?.total_min != null && cb.total_max != null
              ? trieuRange(cb.total_min, cb.total_max)
              : null
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setSelected(o.id)
              }}
              className={cn(
                "grid min-w-0 content-start gap-0.5 rounded-xl border p-2.5 text-left transition-colors",
                on
                  ? "border-2 border-trip-fill bg-trip-sheet"
                  : "border-trip-line bg-trip-sheet hover:bg-trip-sheet-2"
              )}
            >
              <span className="text-[13.5px] font-bold">{o.name}</span>
              {o.id === chosen && (
                <span className="justify-self-start rounded-[5px] bg-trip-fill px-1.5 text-[11.5px] leading-[18px] font-bold text-trip-on-fill">
                  Đề xuất
                </span>
              )}
              <span
                className={cn(
                  "font-num leading-tight font-semibold",
                  range
                    ? "text-[17px] sm:text-[22px]"
                    : "text-[22px] sm:text-[26px]"
                )}
              >
                {range || o.estimated_prices?.length ? (
                  <span
                    className="mr-0.5 font-normal text-trip-ink-3"
                    title={
                      o.estimated_prices?.length
                        ? `Có giá ước (chưa có giá thật): ${o.estimated_prices.join(", ")}`
                        : "Khoảng ước, gồm cả phát sinh"
                    }
                    aria-label="khoảng"
                  >
                    ≈
                  </span>
                ) : null}
                {range ?? trieu(o.total_cost)}
              </span>
              <span className="text-[11.5px] leading-snug text-trip-ink-3 sm:text-[12.5px]">
                {o.better_at.join(" · ") || "lịch dự phòng"}
              </span>
            </button>
          )
        })}
      </div>
      {option.explanation && (
        <p className="rounded-xl bg-trip-sheet px-3.5 py-2.5 text-[14.5px] text-trip-ink-2">
          {option.explanation}
        </p>
      )}

      {result.stay && (
        <div className="flex items-center gap-3 rounded-xl border border-trip-line bg-trip-sheet px-3.5 py-2.5 text-[14px]">
          <BedDouble className="size-5 shrink-0 text-trip-ink-3" />
          <span className="min-w-0 flex-1">
            <b>{result.stay.name}</b>
            {result.stay.booked ? " · đã đặt" : ""}
            {result.stay.price_per_night
              ? ` · ${money(result.stay.price_per_night)}/đêm`
              : ""}
          </span>
          {result.stay.total ? (
            <span className="font-num font-semibold">
              {trieu(result.stay.total)}
            </span>
          ) : null}
        </div>
      )}

      <PlanPanel result={result} option={option} />

      {(result.guesses.length > 0 || result.understood.length > 0) && (
        <div className="grid gap-1.5 rounded-xl bg-trip-sheet px-3.5 py-3 text-[13.5px] text-trip-ink-2">
          {result.guesses.length > 0 && (
            <p className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
              <span>
                <b>Đang giả định:</b> {result.guesses.join("; ")}.{" "}
                <button
                  type="button"
                  onClick={onOpenForm}
                  className="font-semibold underline"
                >
                  Sửa
                </button>
              </span>
            </p>
          )}
          {result.understood.map((u) => (
            <p key={`${u.field}-${u.value}`} className="flex gap-2">
              <Quote className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
              <span>
                Hiểu {FIELD_NAMES[u.field] ?? u.field} từ câu “{u.quote}”
              </span>
            </p>
          ))}
        </div>
      )}
      {result.notes.length > 0 && (
        <ul className="grid gap-1 text-[13px] text-trip-ink-3">
          {result.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-trip-ink-3">
        {result.stats.llm_calls} lượt LLM · {result.stats.tool_calls} lượt gọi
        tool
        {result.stats.cost_usd != null
          ? ` · khoảng ${result.stats.cost_usd.toFixed(3)} USD`
          : ""}
        {result.stats.seconds
          ? ` · ${Math.round(result.stats.seconds)} giây`
          : ""}
      </p>
    </div>
  )
}
