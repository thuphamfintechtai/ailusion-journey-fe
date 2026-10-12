"use client"

/**
 * Kết quả pipeline lập lộ trình (bước 17) trong khung chat:
 * - status "need_info": các câu hỏi lại (bước 4), mỗi câu là nút bấm; bấm thì gửi lại form.
 * - status "ok": 3 phương án, mỗi cái nói rõ hơn 2 cái kia ở đâu, đang giả định gì; lịch theo giờ,
 *   bản đồ, cảnh báo, chỗ ở; vượt ngân sách thì hiện 2 lựa chọn (máy không tự cắt).
 */

import * as React from "react"
import dynamic from "next/dynamic"
import {
  AlertTriangle,
  BedDouble,
  Bus,
  CircleHelp,
  ExternalLink,
  Info,
  MapPin,
  Quote,
  Utensils,
} from "lucide-react"

import {
  isItineraryResult,
  money,
  trieu,
  type ItineraryDay,
  type ItineraryResult,
  type TripForm,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

const DayMap = dynamic(() => import("./day-map"), {
  ssr: false,
})

const STATUS: Record<ItineraryDay["status"], { label: string; cls: string }> = {
  ok: { label: "Đi được", cls: "bg-trip-jade-bg text-trip-jade" },
  risky: { label: "Sát giờ nếu ở lâu", cls: "bg-trip-warn-bg text-trip-warn" },
  warn: { label: "Cần lưu ý", cls: "bg-trip-warn-bg text-trip-warn" },
  fail: { label: "Không đi được", cls: "bg-trip-seal-bg text-trip-seal" },
}

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
                        ? "border-trip-ink bg-trip-ink font-semibold text-trip-on-ink"
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
          className="min-h-11 rounded-[10px] bg-trip-ink px-5 text-[15px] font-semibold text-trip-on-ink disabled:opacity-40"
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
  const [dayIndex, setDayIndex] = React.useState(0)
  const option =
    result.options.find((o) => o.id === selected) ?? result.options[0]
  if (!option) return null
  const day = option.days[dayIndex] ?? option.days[0]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {result.profile && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-full bg-trip-ink px-2.5 py-0.5 font-semibold text-trip-on-ink">
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
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setSelected(o.id)
                setDayIndex(0)
              }}
              className={cn(
                "grid min-w-0 content-start gap-0.5 rounded-xl border p-2.5 text-left transition-colors",
                on
                  ? "border-2 border-trip-ink bg-trip-sheet"
                  : "border-trip-line bg-trip-sheet hover:bg-trip-sheet-2"
              )}
            >
              <span className="text-[13.5px] font-bold">{o.name}</span>
              {o.id === chosen && (
                <span className="justify-self-start rounded-[5px] bg-trip-ink px-1.5 text-[11.5px] leading-[18px] font-bold text-trip-on-ink">
                  Đề xuất
                </span>
              )}
              <span className="font-num text-[22px] leading-tight font-semibold sm:text-[26px]">
                {o.estimated_prices?.length ? (
                  <span
                    className="mr-0.5 font-normal text-trip-ink-3"
                    title={`Có giá ước (chưa có giá thật): ${o.estimated_prices.join(", ")}`}
                    aria-label="khoảng"
                  >
                    ≈
                  </span>
                ) : null}
                {trieu(o.total_cost)}
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

      <div
        role="tablist"
        aria-label="Ngày"
        className="flex gap-1.5 overflow-x-auto"
      >
        {option.days.map((d, i) => (
          <button
            key={d.plan_id}
            type="button"
            role="tab"
            aria-selected={i === dayIndex}
            onClick={() => setDayIndex(i)}
            className={cn(
              "shrink-0 rounded-[10px] border px-3 py-1.5 text-[13.5px] font-semibold",
              i === dayIndex
                ? "border-trip-ink bg-trip-ink text-trip-on-ink"
                : "border-trip-line-2 bg-trip-sheet"
            )}
          >
            Ngày {d.day} · {d.weekday}
          </button>
        ))}
      </div>

      {day && <DayView day={day} result={result} />}

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

function DayView({
  day,
  result,
}: {
  day: ItineraryDay
  result: ItineraryResult
}) {
  const status = STATUS[day.status]
  return (
    <section className="grid gap-3 rounded-2xl border border-trip-line bg-trip-sheet p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span
          className={cn("rounded-full px-2.5 py-0.5 font-semibold", status.cls)}
        >
          {status.label}
        </span>
        {day.weather && <span className="text-trip-ink-3">{day.weather}</span>}
        {day.metrics.ride_min != null && (
          <span className="text-trip-ink-3">
            ngồi xe {day.metrics.ride_min} phút
          </span>
        )}
        {day.maps_url && (
          <a
            href={day.maps_url}
            target="_blank"
            rel="noopener"
            className="ml-auto inline-flex items-center gap-1 font-semibold text-trip-sky"
          >
            Google Maps <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <DayMap day={day} stay={result.stay} />
      <ol className="grid gap-0">
        {day.items.map((item, i) => (
          <li
            key={`${item.start}-${i}`}
            className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-2"
          >
            <span className="font-num text-[17px] font-semibold">
              {item.start}
            </span>
            <div className="grid gap-0.5">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                {item.type === "meal" ? (
                  <Utensils className="size-4 text-trip-food" />
                ) : item.type === "visit" ? (
                  <MapPin className="size-4" />
                ) : (
                  <BedDouble className="size-4 text-trip-ink-3" />
                )}
                {item.name}
                {item.type !== "start" &&
                  item.type !== "back" &&
                  item.end !== item.start && (
                    <span className="font-num text-[13px] font-normal text-trip-ink-3">
                      → {item.end}
                    </span>
                  )}
              </p>
              {(item.type === "visit" || item.type === "meal") && (
                <p className="flex flex-wrap gap-x-3 text-[12.5px] text-trip-ink-3">
                  {item.travel_min > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Bus className="size-3.5" />
                      {item.travel_min} phút
                    </span>
                  )}
                  <span>
                    {item.price == null
                      ? "chưa có giá"
                      : item.price === 0
                        ? "miễn phí"
                        : `${money(item.price)} cả đoàn`}
                  </span>
                  {item.rating_floor != null && (
                    <span>{item.rating_floor.toFixed(1)}★ tin được</span>
                  )}
                  {item.stay_by === "ước theo loại" && (
                    <span>thời gian ở ước theo loại</span>
                  )}
                  {item.matches_purpose && (
                    <span className="text-trip-jade">hợp mục đích</span>
                  )}
                  {item.wait_min > 0 && (
                    <span>chờ mở cửa {item.wait_min} phút</span>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {(day.issues.length > 0 || day.unchecked.length > 0) && (
        <ul className="grid gap-1 rounded-xl bg-trip-warn-bg px-3 py-2 text-[13px] text-trip-ink-2">
          {day.issues.map((x) => (
            <li key={x}>⚠️ {x}</li>
          ))}
          {day.unchecked.map((x) => (
            <li key={x}>• {x}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
