"use client"

/**
 * Kết quả pipeline lập lộ trình (bước 17) trong khung chat:
 * - status "need_info": các câu hỏi lại (bước 4), mỗi câu là nút bấm; bấm thì gửi lại form.
 * - status "ok": 3 phương án, mỗi cái nói rõ hơn 2 cái kia ở đâu, đang giả định gì; lịch theo giờ,
 *   chi tiết phương án theo tab (lịch, bản đồ, chi phí, thời tiết, hành lý — xem plan-panel.tsx),
 *   chỗ ở; vượt ngân sách thì hiện 2 lựa chọn (máy không tự cắt). Ngân sách thấp so với mặt bằng
 *   giá của điểm đến (theo mức chi đã chọn) thì báo ngay đầu kết quả, kèm bảng 3 mức.
 */

import * as React from "react"
import {
  AlertTriangle,
  BedDouble,
  Check,
  CircleHelp,
  Info,
  Quote,
  Sparkles,
} from "lucide-react"

import {
  isItineraryResult,
  money,
  trieu,
  type BudgetLevel,
  type BudgetLevelRow,
  type ItineraryResult,
  type TripForm,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { PlanPanel } from "./plan-panel"
import { forPeople, trieuRange } from "./plan-shared"
import { TraceIds } from "@/components/trace-ids"

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
      {result.budget_level && (
        <BudgetLevelCard level={result.budget_level} onOpenForm={onOpenForm} />
      )}
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
        className="grid gap-2.5 sm:grid-cols-3"
      >
        {result.options.map((o) => (
          <OptionCard
            key={o.id}
            option={o}
            on={o.id === option.id}
            recommended={o.id === chosen}
            onSelect={() => setSelected(o.id)}
            groupSize={result.group_size}
          />
        ))}
      </div>
      {/* Phương án đề xuất đã được giải thích ở đoạn trên (`result.why`): chỉ giải thích
          thêm khi đang xem phương án khác. */}
      {option.explanation && option.id !== chosen && (
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
      <div className="flex items-center gap-1 text-[12px] text-trip-ink-3">
        <p>
          {result.stats.llm_calls} lượt LLM · {result.stats.tool_calls} lượt gọi
          tool
          {result.stats.cost_usd != null
            ? ` · khoảng ${result.stats.cost_usd.toFixed(3)} USD`
            : ""}
          {result.stats.seconds
            ? ` · ${Math.round(result.stats.seconds)} giây`
            : ""}
        </p>
        <TraceIds threadId={result.thread_id} runId={result.trace_run_id} />
      </div>
    </div>
  )
}

/** 162500 -> "163 nghìn" (giá quán mỗi người, gọn hơn "162.500 đ" trong cột hẹp). */
function nghin(v: number): string {
  return `${Math.round(v / 1000).toLocaleString("vi-VN")} nghìn`
}

/** Các hàng của bảng mức chi: tên hàng (kèm đơn vị) và số của từng mức. */
const LEVEL_ROWS: [string, (l: BudgetLevelRow) => string][] = [
  ["Cả chuyến", (l) => trieu(l.total)],
  ["Phòng / đêm", (l) => trieu(l.stay_night)],
  ["Quán / người", (l) => nghin(l.meal)],
]

/**
 * Ngân sách so với mặt bằng giá của điểm đến, ở đầu kết quả: lời báo theo mức chi user chọn và
 * bảng 3 mức (tiết kiệm / thường gặp / sang), mức đem so với ngân sách được tô nổi, ngân sách
 * quy về cả đoàn cả chuyến kèm phép tính. Dưới cả mức tiết kiệm thì màu cảnh báo; thiếu hoặc dư
 * ngân sách thì có nút sửa form.
 */
function BudgetLevelCard({
  level,
  onOpenForm,
}: {
  level: BudgetLevel
  onOpenForm: () => void
}) {
  const warn = level.severity === "warn"
  return (
    <div
      className={cn(
        "grid gap-2.5 rounded-xl border-[1.5px] p-3 text-[14px]",
        warn
          ? "border-trip-seal bg-trip-seal-bg"
          : "border-trip-sky bg-trip-sky-bg"
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 font-bold",
          warn ? "text-trip-seal" : "text-trip-sky"
        )}
      >
        {warn ? (
          <AlertTriangle className="size-4 shrink-0" />
        ) : (
          <Info className="size-4 shrink-0" />
        )}
        {level.title}
      </p>
      <p className="text-trip-ink-2">{level.text}</p>
      {/* Đơn vị nằm ở tên hàng để ô chỉ còn số ngắn: vừa cả màn hình điện thoại. */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              <th scope="col" />
              {level.levels.map((l) => (
                <th
                  key={l.key}
                  scope="col"
                  className={cn(
                    "rounded-t-lg px-2 pt-1.5 pb-1 text-left align-bottom font-semibold",
                    l.key === level.target && "bg-trip-sheet"
                  )}
                >
                  {l.label}
                  <span className="block text-[11px] font-normal text-trip-ink-3 italic">
                    {l.basis}
                    {l.key === level.target ? " · đem so" : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVEL_ROWS.map(([name, cell], i) => (
              <tr key={name}>
                <th
                  scope="row"
                  className="py-1 pr-2 text-left font-normal whitespace-nowrap text-trip-ink-3"
                >
                  {name}
                </th>
                {level.levels.map((l) => (
                  <td
                    key={l.key}
                    className={cn(
                      "px-2 py-1 font-num whitespace-nowrap",
                      i === 0 && "text-[15px] font-semibold",
                      l.key === level.target && "bg-trip-sheet",
                      l.key === level.target &&
                        i === LEVEL_ROWS.length - 1 &&
                        "rounded-b-lg"
                    )}
                  >
                    {cell(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(level.budget_text || level.budget != null) && (
        <p className="text-[13px] text-trip-ink-2">
          Ngân sách của bạn:{" "}
          <b className="font-num">{level.budget_text ?? trieu(level.budget)}</b>
        </p>
      )}
      <p className="text-[12px] text-trip-ink-3">{level.scope}</p>
      {(warn || level.kind === "surplus") && (
        <button
          type="button"
          onClick={onOpenForm}
          className="justify-self-start rounded-lg border border-trip-seal px-3 py-1.5 text-sm font-semibold text-trip-seal"
        >
          Sửa trong form
        </button>
      )}
    </div>
  )
}

/**
 * Thẻ một phương án: tên + nhãn "Đề xuất" cùng hàng (giá các thẻ thẳng hàng nhau), giá ước
 * lớn với đơn vị nhỏ, các điểm mạnh dạng chip. Thẻ đang xem có viền màu chính và dấu tích.
 */
function OptionCard({
  option: o,
  on,
  recommended,
  onSelect,
  groupSize,
}: {
  option: ItineraryResult["options"][number]
  on: boolean
  recommended: boolean
  onSelect: () => void
  groupSize?: number
}) {
  const cb = o.cost_breakdown
  // Có khoảng "từ–đến" thì hiện khoảng, lộ trình cũ thì một con số.
  const text =
    cb?.total_min != null && cb.total_max != null
      ? trieuRange(cb.total_min, cb.total_max)
      : trieu(o.total_cost)
  const [amount, unit] = text.endsWith(" tr")
    ? [text.slice(0, -3), "triệu"]
    : [text, ""]
  // Không hơn hẳn phương án nào ở mặt nào thì không gắn nhãn (trước đây ghi nhầm "lịch dự phòng").
  const strengths = o.better_at
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onSelect}
      className={cn(
        "group relative grid min-w-0 content-start gap-2.5 rounded-2xl border bg-trip-sheet p-3.5 text-left transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-trip-fill/30",
        on
          ? "border-trip-fill bg-accent/40 shadow-[0_8px_24px_-14px_rgb(58_86_197/0.55)] ring-1 ring-trip-fill"
          : "border-trip-line hover:-translate-y-0.5 hover:border-trip-fill/40 hover:shadow-[0_8px_20px_-16px_rgb(18_23_53/0.35)]"
      )}
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-trip-ink">
          {o.name}
        </span>
        {recommended && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            <Sparkles className="size-3" />
            Đề xuất
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
            on
              ? "border-trip-fill bg-trip-fill text-trip-on-fill"
              : "border-trip-line-2 text-transparent"
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </span>

      <span className="grid gap-0.5">
        <span className="text-[11.5px] font-medium text-trip-ink-3">
          Ước tính {forPeople(groupSize)}
        </span>
        <span
          className="flex items-baseline gap-1 text-trip-ink"
          title={
            o.estimated_prices?.length
              ? `Có giá ước (chưa có giá thật): ${o.estimated_prices.join(", ")}`
              : "Khoảng ước, gồm cả phát sinh"
          }
        >
          <span className="font-display text-[24px] leading-none font-bold tracking-tight">
            {amount}
          </span>
          {unit && (
            <span className="text-[13px] font-semibold text-trip-ink-3">
              {unit}
            </span>
          )}
        </span>
      </span>

      {strengths.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {strengths.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-trip-sheet-2 px-2 py-0.5 text-[11.5px] font-medium text-trip-ink-2"
            >
              <Check className="size-3 text-trip-jade" strokeWidth={2.6} />
              {s}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}
