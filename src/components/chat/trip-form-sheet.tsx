"use client"

/**
 * Form "Điền thông tin chuyến đi", bắt chước form nhập của prototype Hành Trình AI (nền giấy,
 * chữ mực, nút đang chọn tô mực, số in font hẹp). Mở dạng bảng trượt lên cạnh ô chat; bấm gửi
 * thì gom các lựa chọn thành một câu hỏi bằng lời cho trợ lý.
 *
 * Các khối nhỏ (Panel, Chip, Stepper...) viết lại ở đây thay vì dùng chung với trang /plan,
 * để trang chat không phụ thuộc vào code của trang đó.
 */

import * as React from "react"
import { Dialog } from "radix-ui"
import { Minus, Plus, Send, X } from "lucide-react"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------- dữ liệu form

type Persona = "p1" | "p2" | "p3" | "p4"
type BudgetMode = "hard" | "flex"
type Pace = "slow" | "normal" | "packed"
type Transport = "motorbike" | "grab" | "private" | "public"

type TripForm = {
  persona: Persona | null
  destination: string
  startDate: string
  days: number
  adults: number
  children: number
  seniors: number
  budget: number | null
  budgetMode: BudgetMode
  access: string[]
  interests: string[]
  transport: Transport | null
  pace: Pace
}

const DEFAULT_FORM: TripForm = {
  persona: null,
  destination: "",
  startDate: "",
  days: 3,
  adults: 2,
  children: 0,
  seniors: 0,
  budget: null,
  budgetMode: "flex",
  access: [],
  interests: [],
  transport: null,
  pace: "normal",
}

const PERSONAS: { id: Persona; code: string; name: string; desc: string }[] = [
  {
    id: "p1",
    code: "P1",
    name: "Khám phá tiết kiệm",
    desc: "Đi được nhiều nơi nhất trong ngân sách có hạn",
  },
  {
    id: "p2",
    code: "P2",
    name: "Thoải mái, dễ tiếp cận",
    desc: "Đi nhẹ nhàng, an toàn, không mệt",
  },
  {
    id: "p3",
    code: "P3",
    name: "Thư giãn, trải nghiệm",
    desc: "Ít điểm nhưng chất lượng cao",
  },
  {
    id: "p4",
    code: "P4",
    name: "Quỹ thời gian hạn chế",
    desc: "Tranh thủ giờ trống, không trễ lịch chính",
  },
]

const PLACES = [
  "Đà Lạt",
  "Hà Nội",
  "Đà Nẵng",
  "Hội An",
  "Huế",
  "Nha Trang",
  "Phú Quốc",
  "Sa Pa",
]
const BUDGETS = [3, 5, 8, 12, 20, 30]
const ACCESS = [
  "Hạn chế leo dốc, bậc thang",
  "Có người dùng xe lăn",
  "Cần nghỉ trưa",
  "Ăn chay",
  "Dị ứng hải sản",
]
const INTERESTS = [
  "Thiên nhiên",
  "Ẩm thực",
  "Văn hoá, lịch sử",
  "Chụp ảnh, check-in",
  "Cà phê",
  "Nghỉ dưỡng",
  "Phiêu lưu",
  "Biển",
  "Mua sắm",
  "Về đêm",
]
const TRANSPORTS: { id: Transport; label: string; note: string }[] = [
  { id: "motorbike", label: "Xe máy tự lái", note: "Linh hoạt, rẻ" },
  { id: "grab", label: "Grab hoặc taxi", note: "Tiện cho nhóm nhỏ" },
  { id: "private", label: "Xe riêng có tài xế", note: "Hợp gia đình đông" },
  { id: "public", label: "Đi bộ và xe buýt", note: "Rẻ nhất" },
]
const PACES: { id: Pace; label: string }[] = [
  { id: "slow", label: "Thong thả" },
  { id: "normal", label: "Vừa phải" },
  { id: "packed", label: "Đi nhiều nơi" },
]

/** Gom form thành câu hỏi bằng lời, để trợ lý đọc như người dùng tự gõ. */
function toPrompt(f: TripForm): string {
  const people = [
    `${f.adults} người lớn`,
    f.children > 0 && `${f.children} trẻ dưới 12 tuổi`,
    f.seniors > 0 && `${f.seniors} người lớn tuổi`,
  ].filter(Boolean)
  const when = f.startDate
    ? ` từ ngày ${new Date(f.startDate).toLocaleDateString("vi-VN")}`
    : ""
  const lines = [
    `Lên lịch trình ${f.destination.trim() || "một điểm đến phù hợp"} ${f.days} ngày cho ${people.join(", ")}${when}.`,
  ]
  const persona = PERSONAS.find((p) => p.id === f.persona)
  if (persona)
    lines.push(
      `Kiểu chuyến đi: ${persona.name.toLowerCase()} (${persona.desc.toLowerCase()}).`
    )
  if (f.budget)
    lines.push(
      `Ngân sách khoảng ${f.budget} triệu cho cả đoàn, ${f.budgetMode === "hard" ? "không được vượt" : "có thể linh hoạt"}.`
    )
  if (f.access.length)
    lines.push(`Yêu cầu bắt buộc: ${f.access.join(", ").toLowerCase()}.`)
  if (f.interests.length)
    lines.push(`Sở thích: ${f.interests.join(", ").toLowerCase()}.`)
  const transport = TRANSPORTS.find((t) => t.id === f.transport)
  if (transport) lines.push(`Di chuyển bằng ${transport.label.toLowerCase()}.`)
  if (f.pace !== "normal")
    lines.push(
      f.pace === "slow"
        ? "Muốn lịch thong thả, ít điểm."
        : "Muốn đi được nhiều nơi, lịch dày cũng được."
    )
  return lines.join("\n")
}

/** Số nhóm đã chỉnh khác mặc định, hiện ở thanh dưới như prototype. */
function filledGroups(f: TripForm): number {
  return [
    f.persona !== null,
    f.destination.trim() !== "",
    f.startDate !== "" || f.days !== DEFAULT_FORM.days,
    f.adults !== DEFAULT_FORM.adults || f.children > 0 || f.seniors > 0,
    f.budget !== null,
    f.access.length > 0,
    f.interests.length > 0,
    f.transport !== null || f.pace !== "normal",
  ].filter(Boolean).length
}
const GROUPS = 8

// ---------------------------------------------------------------- khối dựng

const INPUT =
  "h-11 w-full min-w-0 rounded-[10px] border border-trip-line-2 bg-trip-paper px-3 text-[15px] text-trip-ink outline-none placeholder:text-trip-ink-3 focus-visible:border-trip-ink-3 focus-visible:ring-[3px] focus-visible:ring-trip-sky/25"

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-trip-line bg-trip-sheet-2 p-4 sm:p-5">
      <h3 className="text-[15.5px] font-bold text-trip-ink">{title}</h3>
      {children}
    </section>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[13.5px] font-semibold text-trip-ink-2"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function Divider({
  kind,
  children,
}: {
  kind: "hard" | "soft"
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-2.5 text-[13px] font-bold",
        kind === "hard" ? "text-trip-seal" : "text-trip-ink-3"
      )}
    >
      <span
        className={cn(
          "h-0 w-5 border-t-2",
          kind === "hard"
            ? "border-trip-seal"
            : "border-dashed border-trip-ink-3"
        )}
      />
      {children}
    </p>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[38px] items-center rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/30",
        on
          ? "border-trip-ink bg-trip-ink font-semibold text-trip-on-ink"
          : "border-trip-line-2 bg-trip-sheet text-trip-ink hover:border-trip-ink-3"
      )}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-[3px] justify-self-start rounded-[10px] border border-trip-line-2 bg-trip-paper p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "min-h-[38px] rounded-[7px] px-3 text-[14.5px] font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/30",
            value === o.id
              ? "bg-trip-ink text-trip-on-ink"
              : "text-trip-ink-2 hover:bg-trip-sheet-2"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="inline-flex items-center justify-self-start rounded-[10px] border border-trip-line-2 bg-trip-paper">
        <button
          type="button"
          className="grid size-[42px] place-items-center rounded-[9px] text-trip-ink disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Giảm ${label.toLowerCase()}`}
        >
          <Minus className="size-4" />
        </button>
        <output
          id={id}
          aria-live="polite"
          className="min-w-[34px] text-center font-num text-[23px] font-semibold text-trip-ink"
        >
          {value}
        </output>
        <button
          type="button"
          className="grid size-[42px] place-items-center rounded-[9px] text-trip-ink disabled:opacity-30"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Tăng ${label.toLowerCase()}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </Field>
  )
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

// ---------------------------------------------------------------- form

export function TripFormSheet({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Câu hỏi đã ghép từ form. */
  onSubmit: (prompt: string) => void
}) {
  const [form, setForm] = React.useState<TripForm>(DEFAULT_FORM)
  const set = <K extends keyof TripForm>(key: K, value: TripForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  const filled = filledGroups(form)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit(toPrompt(form))
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby="trip-form-desc"
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[22px] border border-trip-line bg-trip-sheet text-trip-ink shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:bottom-4 sm:rounded-[22px]"
        >
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            {/* Đầu form */}
            <header className="flex items-start justify-between gap-3 border-b border-trip-line px-5 pt-4 pb-3.5">
              <div className="grid gap-1">
                <span
                  aria-hidden
                  className="mx-auto mb-1 h-1 w-10 rounded-full bg-trip-line-2 sm:hidden"
                />
                <Dialog.Title className="text-[19px] leading-tight font-extrabold tracking-tight">
                  Kể cho mình về chuyến đi của bạn
                </Dialog.Title>
                <Dialog.Description
                  id="trip-form-desc"
                  className="text-[14px] text-trip-ink-2"
                >
                  Điền những gì bạn biết, phần còn lại để mặc định. Trợ lý sẽ
                  hỏi thêm khi cần.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-trip-line bg-trip-sheet text-trip-ink-2 outline-none hover:text-trip-ink focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Dialog.Close>
            </header>

            {/* Thân form */}
            <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto bg-trip-paper px-4 py-4 sm:px-5">
              <div className="grid gap-2.5">
                <p className="text-[15px] font-bold">Bạn đi theo kiểu nào?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERSONAS.map((p) => {
                    const on = form.persona === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("persona", on ? null : p.id)}
                        className={cn(
                          "grid gap-0.5 rounded-[14px] text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/30",
                          on
                            ? "border-2 border-trip-ink bg-trip-sheet px-[13px] py-[11px]"
                            : "border border-trip-line bg-trip-sheet px-3.5 py-3 hover:border-trip-ink-3"
                        )}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <b className="text-[15px]">{p.name}</b>
                          <span
                            className={cn(
                              "rounded-[5px] border px-1.5 font-num text-[13px] leading-[18px]",
                              on
                                ? "border-trip-seal text-trip-seal"
                                : "border-trip-line-2 text-trip-ink-3"
                            )}
                          >
                            {p.code}
                          </span>
                        </span>
                        <span className="text-[13px] leading-snug text-trip-ink-3">
                          {p.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Panel title="Chuyến đi">
                <Field label="Điểm đến" htmlFor="tf-dest">
                  <input
                    id="tf-dest"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Ví dụ: Đà Lạt"
                    className={INPUT}
                  />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {PLACES.map((place) => (
                    <Chip
                      key={place}
                      on={form.destination === place}
                      onClick={() =>
                        set(
                          "destination",
                          form.destination === place ? "" : place
                        )
                      }
                    >
                      {place}
                    </Chip>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Ngày đi" htmlFor="tf-date">
                    <input
                      id="tf-date"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                      className={INPUT}
                    />
                  </Field>
                  <Stepper
                    id="tf-days"
                    label="Số ngày"
                    value={form.days}
                    min={1}
                    max={14}
                    onChange={(v) => set("days", v)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stepper
                    id="tf-adults"
                    label="Người lớn"
                    value={form.adults}
                    min={1}
                    max={20}
                    onChange={(v) => set("adults", v)}
                  />
                  <Stepper
                    id="tf-kids"
                    label="Trẻ dưới 12 tuổi"
                    value={form.children}
                    min={0}
                    max={10}
                    onChange={(v) => set("children", v)}
                  />
                  <Stepper
                    id="tf-seniors"
                    label="Người lớn tuổi"
                    value={form.seniors}
                    min={0}
                    max={10}
                    onChange={(v) => set("seniors", v)}
                  />
                </div>
              </Panel>

              <Divider kind="hard">Yêu cầu bắt buộc</Divider>

              <Panel title="Ngân sách">
                <Field label="Tổng ngân sách cả đoàn">
                  <div className="flex flex-wrap gap-1.5">
                    {BUDGETS.map((b) => (
                      <Chip
                        key={b}
                        on={form.budget === b}
                        onClick={() =>
                          set("budget", form.budget === b ? null : b)
                        }
                      >
                        <span className="font-num text-[16px] font-semibold">
                          {b}
                        </span>
                        &nbsp;triệu
                      </Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Mức độ">
                  <Segmented
                    label="Mức độ ngân sách"
                    value={form.budgetMode}
                    onChange={(v) => set("budgetMode", v)}
                    options={[
                      { id: "hard", label: "Không được vượt" },
                      { id: "flex", label: "Có thể linh hoạt" },
                    ]}
                  />
                </Field>
              </Panel>

              <Panel title="Khả năng tiếp cận">
                <p className="-mt-2 text-[13.5px] text-trip-ink-3">
                  Các yêu cầu này luôn được đáp ứng. Thông tin chỉ dùng cho
                  chuyến đi này.
                </p>
                <div className="grid gap-0.5">
                  {ACCESS.map((a, i) => (
                    <label
                      key={a}
                      htmlFor={`tf-acc-${i}`}
                      className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]"
                    >
                      <input
                        id={`tf-acc-${i}`}
                        type="checkbox"
                        className="size-5 shrink-0 accent-trip-ink"
                        checked={form.access.includes(a)}
                        onChange={() => set("access", toggle(form.access, a))}
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </Panel>

              <Divider kind="soft">Ưu tiên cá nhân</Divider>

              <Panel title="Sở thích">
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map((it) => (
                    <Chip
                      key={it}
                      on={form.interests.includes(it)}
                      onClick={() =>
                        set("interests", toggle(form.interests, it))
                      }
                    >
                      {it}
                    </Chip>
                  ))}
                </div>
              </Panel>

              <Panel title="Phương tiện và nhịp độ">
                <div
                  role="radiogroup"
                  aria-label="Phương tiện"
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {TRANSPORTS.map((t) => {
                    const on = form.transport === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set("transport", on ? null : t.id)}
                        className={cn(
                          "grid min-h-11 gap-0.5 rounded-xl text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/30",
                          on
                            ? "border-2 border-trip-ink bg-trip-sheet px-[12px] py-[10px]"
                            : "border border-trip-line-2 bg-trip-paper px-[13px] py-[11px] hover:border-trip-ink-3"
                        )}
                      >
                        <b className="text-[15px]">{t.label}</b>
                        <span className="text-[13px] leading-snug text-trip-ink-3">
                          {t.note}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <Field label="Nhịp độ">
                  <Segmented
                    label="Nhịp độ"
                    value={form.pace}
                    onChange={(v) => set("pace", v)}
                    options={PACES}
                  />
                </Field>
              </Panel>
            </div>

            {/* Thanh dưới, như cta-bar của prototype */}
            <footer className="flex items-center justify-between gap-3 border-t border-trip-line bg-trip-sheet px-5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="hidden gap-1 sm:flex" aria-hidden>
                  {Array.from({ length: GROUPS }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-[7px] w-4 rounded",
                        i < filled ? "bg-trip-jade" : "bg-trip-line"
                      )}
                    />
                  ))}
                </span>
                <span className="text-[13.5px] text-trip-ink-2">
                  <span className="max-sm:hidden">Đã chỉnh </span>
                  <b className="font-num text-[19px] text-trip-ink">{filled}</b>
                  /{GROUPS}
                  <span className="max-sm:hidden"> nhóm</span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm(DEFAULT_FORM)}
                  className="min-h-11 rounded-[10px] px-3 text-sm font-semibold text-trip-ink-3 outline-none hover:text-trip-ink focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
                >
                  Làm lại
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-trip-ink px-5 text-[15px] font-semibold text-trip-on-ink outline-none hover:bg-trip-ink/90 focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
                >
                  <Send className="size-4" />
                  Gửi cho trợ lý
                </button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
