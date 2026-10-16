"use client"

/**
 * Form "Điền thông tin chuyến đi" của trang chat — đúng bảng ô ở bước 1 của trang thiết kế
 * "Pipeline lập lộ trình" (chuyến ở 1 nơi). Nền giấy, chữ mực như prototype Hành Trình AI.
 *
 * Trợ lý chat tự điền sẵn từ cuộc trò chuyện (`prefill`). Ô nào để trống thì KHÔNG gửi: LLM
 * service đọc lời nhắn để điền (bước 2), vẫn thiếu thì hỏi lại 1 lượt (bước 4) ngay trong chat.
 * Bắt buộc: điểm đến, ngày đi, ngày về, số người.
 */

import * as React from "react"
import { Dialog } from "radix-ui"
import {
  CircleAlert,
  LoaderCircle,
  Minus,
  Plus,
  Route,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import type { TripInfo, TripState } from "@/lib/api"
import {
  ARRIVAL_BUCKETS,
  BUDGET_UNITS,
  NAP_OPTIONS,
  GROUP_TYPES,
  MUST_BUCKETS,
  NEEDS,
  PRIORITIES,
  PURPOSES,
  SPEND_STYLES,
  TRAVEL_MODES,
  WALKING,
  type BusySlot,
  type MustVisit,
  type Purpose,
  type TripForm,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { conflictsOf, type Conflict } from "./trip-conflicts"

const MAX_DAYS = 7
const PLACES = [
  "Đà Lạt",
  "Đà Nẵng",
  "Hội An",
  "Huế",
  "Hà Nội",
  "Nha Trang",
  "Phú Quốc",
  "Sa Pa",
]
const BUDGETS = [3, 5, 8, 12, 20, 30]

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

function daysBetween(a: string, b: string): number {
  return (
    Math.round(
      (+new Date(`${b}T00:00:00`) - +new Date(`${a}T00:00:00`)) / 86_400_000
    ) + 1
  )
}

function emptyForm(): TripForm {
  const start = addDays(isoDate(new Date()), 7)
  return {
    destination: "",
    start_date: start,
    end_date: addDays(start, 2),
    group_size: 2,
    budget: null,
    budget_unit: "group_trip",
    message: "",
    group_type: null,
    kids_under_6: 0,
    kids_6_12: 0,
    seniors_65: 0,
    wheelchair_users: 0,
    required_needs: [],
    busy_slots: [],
    night_out: false,
    nap: "auto",
    purposes: [],
    interests: "",
    priority: null,
    spend_style: "normal",
    travel_mode: null,
    arrival_time: null,
    departure_time: null,
    night_return_time: null,
    wake_time: null,
    walking_level: null,
    must_visits: [],
    needs_note: "",
    stay_booked: null,
  }
}

/** Bỏ ô trống trước khi gửi: LLM service coi ô có trong body là "user đã điền". */
const DRAFT_PREFIX = "ailusion:trip-draft:"

/** Form đã gửi (chỉ ô đã điền) -> form đủ ô để hiện lại. */
function fromSaved(saved: TripForm | null | undefined): TripForm | null {
  return saved ? { ...emptyForm(), ...saved } : null
}

function readDraft(key?: string): TripForm | null {
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key)
    return raw ? { ...emptyForm(), ...(JSON.parse(raw) as TripForm) } : null
  } catch {
    return null
  }
}

function writeDraft(key: string | undefined, form: TripForm) {
  if (!key) return
  try {
    window.localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(form))
  } catch {
    // Trình duyệt chặn lưu (chế độ riêng tư…): bỏ qua, chỉ mất bản nháp.
  }
}

function clearDraft(key?: string) {
  if (!key) return
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + key)
  } catch {
    // như trên
  }
}

function toRequest(f: TripForm): TripForm {
  const out: Record<string, unknown> = {}
  const musts = (f.must_visits ?? [])
    .map((m) => ({ ...m, name: m.name.trim() }))
    .filter((m) => m.name)
  for (const [k, v] of Object.entries({ ...f, must_visits: musts })) {
    if (v === null || v === undefined || v === "") continue
    if (Array.isArray(v) && v.length === 0) continue
    if (typeof v === "number" && v === 0 && k !== "group_size") continue
    if (k === "night_out" && v === false) continue
    if (k === "nap" && v === "auto") continue
    if (k === "spend_style" && v === "normal") continue
    if (k === "budget_unit" && !f.budget) continue
    out[k] = v
  }
  return out as TripForm
}

/** Ngân sách quy về cả đoàn, cả chuyến (đơn vị trợ lý chat dùng). */
function groupBudget(f: TripForm): number | null {
  // Chọn khoảng "trên 10 triệu" ở câu hỏi lại: chỉ có mức dưới.
  const budget = f.budget || f.budget_min
  if (!budget) return null
  const days = daysBetween(f.start_date, f.end_date)
  if (f.budget_unit === "person_trip") return budget * f.group_size
  if (f.budget_unit === "person_day") return budget * f.group_size * days
  return budget
}

/** Form chat -> TripInfo, để trợ lý chat nhớ đúng bản người dùng đã xác nhận. */
function toTripInfo(f: TripForm): TripInfo {
  const purposeInterest: Record<string, string> = {
    relax: "Nghỉ dưỡng",
    food: "Ẩm thực",
    culture: "Văn hoá, lịch sử",
    adventure: "Phiêu lưu",
    shopping: "Mua sắm",
    fun: "Về đêm",
  }
  const persona = {
    saving: "p1",
    comfort: "p2",
    leisure: "p3",
    short_time: "p4",
    many_places: null,
  } as const
  const adults = Math.max(
    0,
    f.group_size -
      (f.kids_under_6 ?? 0) -
      (f.kids_6_12 ?? 0) -
      (f.seniors_65 ?? 0)
  )
  return {
    persona: f.priority ? persona[f.priority] : null,
    destination: f.destination.trim() || null,
    start_date: f.start_date,
    days: daysBetween(f.start_date, f.end_date),
    adults,
    children: (f.kids_under_6 ?? 0) + (f.kids_6_12 ?? 0),
    seniors: f.seniors_65 ?? 0,
    group_type: f.group_type ?? null,
    budget_million: groupBudget(f)
      ? Math.round((groupBudget(f)! / 1_000_000) * 10) / 10
      : null,
    budget_hard: f.budget ? f.spend_style === "luxury_within_budget" : null,
    access: [
      ...((f.wheelchair_users ?? 0) > 0 ? ["Có người dùng xe lăn"] : []),
      ...((f.required_needs ?? []).includes("vegetarian") ? ["Ăn chay"] : []),
    ],
    interests: (f.purposes ?? [])
      .map((p) => purposeInterest[p])
      .filter(Boolean),
    transport: null,
    pace: null,
    must_visits: (f.must_visits ?? [])
      .map((m) => ({ ...m, name: m.name.trim() }))
      .filter((m) => m.name),
  }
}

/** Đổ thông tin trợ lý chat đã ghi vào form. Mục chưa nhắc tới giữ nguyên. */
function fromTripInfo(
  f: TripForm,
  info: TripInfo
): { form: TripForm; filled: number } {
  const next: TripForm = { ...f }
  let filled = 0
  if (info.destination?.trim()) {
    next.destination = info.destination.trim()
    filled += 1
  }
  if (info.start_date && /^\d{4}-\d{2}-\d{2}$/.test(info.start_date)) {
    next.start_date = info.start_date
    filled += 1
  }
  const days = info.days
    ? Math.min(MAX_DAYS, Math.max(1, info.days))
    : daysBetween(f.start_date, f.end_date)
  next.end_date = addDays(next.start_date, days - 1)
  if (info.days) filled += 1
  if (info.adults !== null || info.children !== null || info.seniors !== null) {
    next.kids_6_12 = info.children ?? 0
    next.seniors_65 = info.seniors ?? 0
    next.group_size = Math.max(
      1,
      (info.adults ?? 0) + (info.children ?? 0) + (info.seniors ?? 0)
    )
    if (info.children || info.seniors) next.group_type = "family"
    else if (next.group_size === 1) next.group_type = "solo"
    filled += 1
  }
  // Trợ lý đã hiểu "đi cùng ai" từ cuộc trò chuyện ("2 vợ chồng" -> cặp đôi): dùng luôn, để
  // pipeline không hỏi lại câu H1.
  if (info.group_type && GROUP_TYPES.some((g) => g.id === info.group_type)) {
    next.group_type = info.group_type as TripForm["group_type"]
    filled += 1
  }
  if (info.budget_million) {
    const total = Math.round(info.budget_million * 1_000_000)
    // Vẫn là ngân sách user đã chọn theo người / theo ngày: giữ nguyên cách nhập đó.
    const same = Math.abs((groupBudget(next) ?? 0) - total) < 100_000
    if (!same) {
      next.budget = total
      next.budget_unit = "group_trip"
    }
    filled += 1
  }
  // p1 "khám phá tiết kiệm" không đổ vào ưu tiên: form không còn lựa chọn "Tiết kiệm" (đã có
  // ngân sách).
  if (info.persona && info.persona !== "p1") {
    const priority = {
      p2: "comfort",
      p3: "leisure",
      p4: "short_time",
    } as const
    next.priority = priority[info.persona as keyof typeof priority] ?? null
    filled += 1
  }
  const purposeOf: Record<string, Purpose> = {
    "Nghỉ dưỡng": "relax",
    Biển: "relax",
    "Thiên nhiên": "relax",
    "Ẩm thực": "food",
    "Văn hoá, lịch sử": "culture",
    "Phiêu lưu": "adventure",
    "Mua sắm": "shopping",
    "Về đêm": "fun",
  }
  const purposes = [
    ...new Set(info.interests.map((i) => purposeOf[i]).filter(Boolean)),
  ].slice(0, 2)
  if (purposes.length) {
    next.purposes = purposes
    filled += 1
  }
  const rest = info.interests.filter((i) => !purposeOf[i])
  if (rest.length) next.interests = rest.join(", ")
  if (info.access.includes("Có người dùng xe lăn")) {
    next.wheelchair_users = 1
    filled += 1
  }
  if (info.access.includes("Ăn chay"))
    next.required_needs = [
      ...new Set([...(next.required_needs ?? []), "vegetarian"]),
    ]
  const notes = info.access.filter((a) =>
    ["Dị ứng hải sản", "Hạn chế leo dốc, bậc thang", "Cần nghỉ trưa"].includes(
      a
    )
  )
  if (notes.length)
    next.message = [next.message, notes.join(", ")].filter(Boolean).join(". ")
  const mode = {
    motorbike: "motorbike",
    grab: "taxi",
    private: "car",
    public: "bus",
  } as const
  if (info.transport)
    next.travel_mode = mode[info.transport as keyof typeof mode] ?? null
  if (info.must_visits?.length) {
    next.must_visits = info.must_visits.map((m) => ({
      name: m.name,
      day: m.day ?? null,
      time: m.time ?? null,
    }))
    filled += 1
  }
  return { form: next, filled }
}

// ---------------------------------------------------------------- khối dựng

// Mọi ô điền (ô chữ, ngày, giờ, bộ tăng giảm) cùng cao h-11, cùng nền và viền.
const INPUT =
  "h-11 w-full min-w-0 rounded-[10px] border border-trip-line-2 bg-trip-sheet px-3 text-[15px] text-trip-ink outline-none placeholder:text-trip-ink-3 focus-visible:border-trip-fill focus-visible:ring-[3px] focus-visible:ring-trip-fill/20"

/** Nhóm chip xếp lưới đều cột (ô rộng tối thiểu `min` px), không còn chip lẻ loi cuối dòng. */
function ChipGrid({
  min,
  children,
}: {
  min: number
  children: React.ReactNode
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
      }}
    >
      {children}
    </div>
  )
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-trip-line bg-trip-sheet p-4 shadow-xs sm:p-5">
      <header className="grid gap-0.5">
        <h3 className="text-[15.5px] font-bold text-trip-ink">{title}</h3>
        {hint && <p className="text-[13px] text-trip-ink-3">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

function Field({
  label,
  htmlFor,
  missing = false,
  children,
}: {
  label: string
  htmlFor?: string
  missing?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-[13.5px] font-semibold text-trip-ink-2"
      >
        {label}
        {missing && (
          <span className="rounded-md bg-trip-seal-bg px-1.5 py-px text-[11.5px] font-semibold text-trip-seal">
            cần điền
          </span>
        )}
      </label>
      {children}
    </div>
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
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-trip-fill/25",
        on
          ? "border-trip-fill bg-trip-fill font-semibold text-trip-on-fill"
          : "border-trip-line-2 bg-trip-sheet text-trip-ink hover:border-trip-fill/50 hover:bg-trip-sheet-2"
      )}
    >
      {children}
    </button>
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
      <div className="flex h-11 w-full items-center justify-between rounded-[10px] border border-trip-line-2 bg-trip-sheet">
        <button
          type="button"
          className="grid h-full w-11 place-items-center rounded-[9px] text-trip-ink hover:bg-trip-sheet-2 disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Giảm ${label.toLowerCase()}`}
        >
          <Minus className="size-4" />
        </button>
        <output
          id={id}
          aria-live="polite"
          className="min-w-[34px] text-center font-num text-[17px] font-semibold text-trip-ink"
        >
          {value}
        </output>
        <button
          type="button"
          className="grid h-full w-11 place-items-center rounded-[9px] text-trip-ink hover:bg-trip-sheet-2 disabled:opacity-30"
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

/** Giờ: chọn buổi nhanh hoặc nhập giờ cụ thể. Trống = để máy tạm đoán, có ghi rõ. */
function TimeField({
  id,
  label,
  value,
  onChange,
  buckets = false,
}: {
  id: string
  label: string
  value: string | null | undefined
  onChange: (v: string | null) => void
  buckets?: boolean
}) {
  const isTime = !!value && /^\d{2}:\d{2}$/.test(value)
  return (
    <Field label={label} htmlFor={id}>
      <div className="grid gap-2">
        {buckets && (
          <div className="grid grid-cols-3 gap-2">
            {ARRIVAL_BUCKETS.map((b) => (
              <Chip
                key={b.id}
                on={value === b.id}
                onClick={() => onChange(value === b.id ? null : b.id)}
              >
                {b.label}
              </Chip>
            ))}
          </div>
        )}
        <input
          id={id}
          type="time"
          value={isTime ? (value as string) : ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={INPUT}
        />
      </div>
    </Field>
  )
}

function toggle<T>(list: T[], item: T, max = 99): T[] {
  if (list.includes(item)) return list.filter((x) => x !== item)
  return list.length >= max ? list : [...list, item]
}

type Prefill = "idle" | "loading" | "error" | { filled: number }

// ---------------------------------------------------------------- form

export function TripFormSheet({
  open,
  onOpenChange,
  onPlan,
  prefill,
  saved,
  draftKey,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Lập lộ trình": form gửi pipeline (chỉ ô đã điền), và bản TripInfo để trợ lý chat nhớ. */
  onPlan: (form: TripForm, info: TripInfo) => void
  prefill?: { key: string; load: () => Promise<TripState> } | null
  /** Form đã gửi lần lập lộ trình gần nhất (BE lưu): điền lại đủ mọi ô khi mở lại. */
  saved?: TripForm | null
  /** Khoá bản nháp trong trình duyệt (mã hội thoại, "new" khi chưa có). */
  draftKey?: string
}) {
  // Bản nháp chưa gửi (đóng form / tải lại trang không mất) > form đã gửi lần trước > form trống.
  const [form, setForm] = React.useState<TripForm>(
    () => readDraft(draftKey) ?? fromSaved(saved) ?? emptyForm()
  )
  // Người dùng đã sửa form (từ đó lưu bản nháp, không bị form đã gửi ghi đè).
  const [touched, setTouched] = React.useState(false)
  // Tin nhắn tải sau khi form đã dựng (mở hội thoại cũ): chưa sửa gì thì lấy form đã gửi.
  const [seenSaved, setSeenSaved] = React.useState(saved)
  if (saved !== seenSaved) {
    setSeenSaved(saved)
    const next = fromSaved(saved)
    if (!touched && next && !readDraft(draftKey)) setForm(next)
  }
  React.useEffect(() => {
    if (touched) writeDraft(draftKey, form)
  }, [form, draftKey, touched])
  const [prefillState, setPrefillState] = React.useState<Prefill>("idle")
  const readKey = React.useRef<string | null>(null)
  // Điều trợ lý đã ghi từ chat, để hỏi lại khi form khác đi; mâu thuẫn người dùng chọn giữ nguyên.
  const [chatInfo, setChatInfo] = React.useState<TripInfo | null>(null)
  const [kept, setKept] = React.useState<string[]>([])
  const set = <K extends keyof TripForm>(key: K, value: TripForm[K]) => {
    setTouched(true)
    setForm((f) => ({
      ...f,
      [key]: value,
      // Tự nhập / đổi cách tính ngân sách thì bỏ khoảng đã chọn ở câu hỏi lại.
      ...(key === "budget" || key === "budget_unit"
        ? { budget_min: null }
        : {}),
    }))
  }

  const days = daysBetween(form.start_date, form.end_date)
  // Bắt buộc trước khi lập lộ trình: đi đâu, ngày đi / về, mấy người, ngân sách bao nhiêu.
  const pastStart = form.start_date < isoDate(new Date())
  const missing = [
    !form.destination.trim() && "điểm đến",
    pastStart && "ngày đi (không được trước hôm nay)",
    (days < 1 || days > MAX_DAYS) && `ngày về (tối đa ${MAX_DAYS} ngày)`,
    form.group_size < 1 && "số người",
    !((form.budget ?? 0) > 0 || (form.budget_min ?? 0) > 0) && "ngân sách",
  ].filter((x): x is string => Boolean(x))
  const conflicts = conflictsOf(form, chatInfo).filter(
    (c) => !kept.includes(c.id)
  )
  function resolve(c: Conflict, i: number) {
    const o = c.options[i]
    setTouched(true)
    if (o.apply) setForm(o.apply)
    else setKept((k) => [...k, c.id])
  }
  // Ô gõ ngân sách tuỳ ý (triệu): giữ chữ user gõ ("6,5"); bấm mức có sẵn thì ô trống lại.
  const [budgetText, setBudgetText] = React.useState("")
  const budgetMillion = form.budget
    ? Math.round(form.budget / 100_000) / 10
    : null
  const budgets =
    budgetMillion && !BUDGETS.includes(budgetMillion)
      ? [...BUDGETS, budgetMillion].sort((a, b) => a - b)
      : BUDGETS

  const prefillKey = prefill?.key ?? null
  const loadPrefill = React.useEffectEvent(() => prefill?.load())
  React.useEffect(() => {
    if (!open || !prefillKey || readKey.current === prefillKey) return
    readKey.current = prefillKey
    let cancelled = false
    let finished = false
    void (async () => {
      setPrefillState("loading")
      try {
        const state = await loadPrefill()
        if (cancelled || !state) return
        finished = true
        setChatInfo(state.info)
        setForm((f) => fromTripInfo(f, state.info).form)
        setPrefillState({
          filled: fromTripInfo(emptyForm(), state.info).filled,
        })
      } catch {
        if (cancelled) return
        readKey.current = null
        setPrefillState("error")
      }
    })()
    return () => {
      cancelled = true
      if (!finished && readKey.current === prefillKey) readKey.current = null
    }
  }, [open, prefillKey])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (missing.length || conflicts.length) return
    onPlan(toRequest(form), toTripInfo(form))
    // Đã gửi: form nằm trong tin nhắn lộ trình (BE lưu), bỏ bản nháp.
    clearDraft(draftKey)
    clearDraft("new")
    setTouched(false)
    onOpenChange(false)
  }

  const busy = form.busy_slots ?? []
  const musts = form.must_visits ?? []
  const setMust = (i: number, patch: Partial<MustVisit>) =>
    set(
      "must_visits",
      musts.map((m, j) => (j === i ? { ...m, ...patch } : m))
    )

  const setBusy = (i: number, patch: Partial<BusySlot>) =>
    set(
      "busy_slots",
      busy.map((b, j) => (j === i ? { ...b, ...patch } : b))
    )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby="trip-form-desc"
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[22px] border border-trip-line bg-trip-sheet text-trip-ink shadow-2xl will-change-transform outline-none data-[state=closed]:animate-out data-[state=closed]:duration-150 data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:duration-200 data-[state=open]:slide-in-from-bottom sm:bottom-4 sm:rounded-[22px]"
        >
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
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
                  Điền càng đủ thì máy càng ít phải đoán. Ô nào không chắc cứ để
                  trống — mình sẽ đọc lời nhắn, còn thiếu thì hỏi lại 1 lần.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-trip-line bg-trip-sheet text-trip-ink-2 outline-none hover:text-trip-ink focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Dialog.Close>
            </header>

            <PrefillNote state={prefillState} />

            <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto bg-trip-paper px-4 py-4 sm:px-5">
              <Panel title="Chuyến đi">
                <Field
                  label="Điểm đến"
                  htmlFor="tf-dest"
                  missing={!form.destination.trim()}
                >
                  <input
                    id="tf-dest"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Ví dụ: Đà Nẵng"
                    className={INPUT}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {PLACES.map((p) => (
                    <Chip
                      key={p}
                      on={form.destination === p}
                      onClick={() =>
                        set("destination", form.destination === p ? "" : p)
                      }
                    >
                      {p}
                    </Chip>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Ngày đi" htmlFor="tf-start" missing={pastStart}>
                    <input
                      id="tf-start"
                      type="date"
                      min={isoDate(new Date())}
                      value={form.start_date}
                      onChange={(e) => {
                        const start = e.target.value
                        if (!start) return
                        setTouched(true)
                        setForm((f) => ({
                          ...f,
                          start_date: start,
                          end_date: addDays(
                            start,
                            Math.max(
                              0,
                              daysBetween(f.start_date, f.end_date) - 1
                            )
                          ),
                        }))
                      }}
                      className={INPUT}
                    />
                  </Field>
                  <Field
                    label="Ngày về"
                    htmlFor="tf-end"
                    missing={days < 1 || days > MAX_DAYS}
                  >
                    <input
                      id="tf-end"
                      type="date"
                      min={form.start_date}
                      max={addDays(form.start_date, MAX_DAYS - 1)}
                      value={form.end_date}
                      onChange={(e) =>
                        e.target.value && set("end_date", e.target.value)
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Stepper
                    id="tf-size"
                    label="Số người"
                    value={form.group_size}
                    min={1}
                    max={30}
                    onChange={(v) => set("group_size", v)}
                  />
                </div>
                <Field
                  label="Ngân sách (triệu đồng)"
                  htmlFor="tf-budget"
                  missing={!(form.budget && form.budget > 0)}
                >
                  <ChipGrid min={52}>
                    {budgets.map((b) => (
                      <Chip
                        key={b}
                        on={budgetMillion === b}
                        onClick={() => {
                          setBudgetText("")
                          set(
                            "budget",
                            budgetMillion === b ? null : b * 1_000_000
                          )
                        }}
                      >
                        <span className="font-num font-semibold">{b}</span>
                      </Chip>
                    ))}
                  </ChipGrid>
                  <input
                    id="tf-budget"
                    inputMode="decimal"
                    value={budgetText}
                    onChange={(e) => {
                      const text = e.target.value.replace(/[^\d.,]/g, "")
                      setBudgetText(text)
                      const v = Number(text.replace(",", "."))
                      set("budget", v > 0 ? Math.round(v * 1_000_000) : null)
                    }}
                    placeholder="Số khác, VD 6,5"
                    className={cn(INPUT, "max-w-[180px]")}
                  />
                </Field>
                {form.budget ? (
                  <ChipGrid min={160}>
                    {BUDGET_UNITS.map((u) => (
                      <Chip
                        key={u.id}
                        on={form.budget_unit === u.id}
                        onClick={() => set("budget_unit", u.id)}
                      >
                        {u.label}
                      </Chip>
                    ))}
                  </ChipGrid>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Chỗ ở đã đặt (nếu có)" htmlFor="tf-stay">
                    <input
                      id="tf-stay"
                      value={form.stay_booked ?? ""}
                      onChange={(e) =>
                        set("stay_booked", e.target.value || null)
                      }
                      placeholder="Tên hoặc địa chỉ"
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Đi lại tại chỗ bằng">
                    <ChipGrid min={110}>
                      {TRAVEL_MODES.map((m) => (
                        <Chip
                          key={m.id}
                          on={form.travel_mode === m.id}
                          onClick={() =>
                            set(
                              "travel_mode",
                              form.travel_mode === m.id ? null : m.id
                            )
                          }
                        >
                          {m.label}
                        </Chip>
                      ))}
                    </ChipGrid>
                  </Field>
                </div>
              </Panel>

              <Panel
                title="Địa điểm muốn đi"
                hint="Chỗ bạn nhất định muốn ghé. Chọn ngày, giờ nếu đã có hẹn; để “bất kỳ” thì máy tự xếp cho hợp đường."
              >
                <div className="grid gap-2">
                  {musts.map((m, i) => (
                    <MustRow
                      key={i}
                      value={m}
                      days={Math.max(1, days)}
                      onChange={(patch) => setMust(i, patch)}
                      onRemove={() =>
                        set(
                          "must_visits",
                          musts.filter((_, j) => j !== i)
                        )
                      }
                    />
                  ))}
                  {musts.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        set("must_visits", [
                          ...musts,
                          { name: "", day: null, time: null },
                        ])
                      }
                      className="justify-self-start rounded-[10px] border border-dashed border-trip-line-2 px-3 py-2 text-[13.5px] font-semibold text-trip-ink-2 hover:border-trip-ink-3"
                    >
                      + Thêm địa điểm
                    </button>
                  )}
                </div>
              </Panel>

              <Panel
                title="Đi cùng ai"
                hint="Để máy biết đoàn cần gì: chỗ cho trẻ, nhà vệ sinh, lối xe lăn, giờ về."
              >
                <ChipGrid min={104}>
                  {GROUP_TYPES.map((g) => (
                    <Chip
                      key={g.id}
                      on={form.group_type === g.id}
                      onClick={() =>
                        set(
                          "group_type",
                          form.group_type === g.id ? null : g.id
                        )
                      }
                    >
                      {g.label}
                    </Chip>
                  ))}
                </ChipGrid>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stepper
                    id="tf-k6"
                    label="Trẻ dưới 6 tuổi"
                    value={form.kids_under_6 ?? 0}
                    min={0}
                    max={10}
                    onChange={(v) => set("kids_under_6", v)}
                  />
                  <Stepper
                    id="tf-k12"
                    label="Trẻ 6–12 tuổi"
                    value={form.kids_6_12 ?? 0}
                    min={0}
                    max={10}
                    onChange={(v) => set("kids_6_12", v)}
                  />
                  <Stepper
                    id="tf-s65"
                    label="Từ 65 tuổi"
                    value={form.seniors_65 ?? 0}
                    min={0}
                    max={10}
                    onChange={(v) => set("seniors_65", v)}
                  />
                  <Stepper
                    id="tf-wc"
                    label="Ngồi xe lăn"
                    value={form.wheelchair_users ?? 0}
                    min={0}
                    max={5}
                    onChange={(v) => set("wheelchair_users", v)}
                  />
                </div>
                <Field label="Nhu cầu bắt buộc">
                  <div className="flex flex-wrap gap-2">
                    {NEEDS.map((n) => (
                      <Chip
                        key={n.id}
                        on={(form.required_needs ?? []).includes(n.id)}
                        onClick={() =>
                          set(
                            "required_needs",
                            toggle(form.required_needs ?? [], n.id)
                          )
                        }
                      >
                        {n.label}
                      </Chip>
                    ))}
                  </div>
                  <input
                    aria-label="Nhu cầu khác"
                    value={form.needs_note ?? ""}
                    onChange={(e) => set("needs_note", e.target.value)}
                    placeholder="Nhu cầu khác, VD: không ăn cay, ông đi lại khó, cần chỗ đỗ ô tô"
                    className={INPUT}
                  />
                </Field>
              </Panel>

              <Panel
                title="Khung giờ"
                hint="Để trống thì ngày bắt đầu 08:00, ngày cuối về 15:00; giờ về buổi tối sẽ hỏi lại (chưa biết thì 20:00)."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TimeField
                    id="tf-arr"
                    label="Giờ đến ngày đầu"
                    value={form.arrival_time}
                    onChange={(v) => set("arrival_time", v)}
                    buckets
                  />
                  <TimeField
                    id="tf-dep"
                    label="Giờ khởi hành về ngày cuối"
                    value={form.departure_time}
                    onChange={(v) => set("departure_time", v)}
                    buckets
                  />
                  <TimeField
                    id="tf-wake"
                    label="Giờ thức dậy"
                    value={form.wake_time}
                    onChange={(v) => set("wake_time", v)}
                  />
                  <TimeField
                    id="tf-night"
                    label="Tối cần về chỗ ở trước"
                    value={form.night_return_time}
                    onChange={(v) => set("night_return_time", v)}
                  />
                </div>
                <Field label="Nghỉ trưa (ngày đi từ sáng sớm tới tối)">
                  <ChipGrid min={130}>
                    {NAP_OPTIONS.map((o) => (
                      <Chip
                        key={o.id}
                        on={(form.nap ?? "auto") === o.id}
                        onClick={() => set("nap", o.id)}
                      >
                        {o.label}
                      </Chip>
                    ))}
                  </ChipGrid>
                </Field>
                <Field label="Lịch bận">
                  <div className="grid gap-2">
                    {busy.map((b, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-trip-line bg-trip-paper p-2"
                      >
                        <select
                          aria-label="Ngày bận"
                          value={b.day}
                          onChange={(e) =>
                            setBusy(i, { day: Number(e.target.value) })
                          }
                          className={cn(INPUT, "w-[110px]")}
                        >
                          {Array.from({ length: Math.max(1, days) }, (_, d) => (
                            <option key={d} value={d + 1}>
                              Ngày {d + 1}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label="Từ giờ"
                          type="time"
                          value={b.busy_start}
                          onChange={(e) =>
                            setBusy(i, { busy_start: e.target.value })
                          }
                          className={cn(INPUT, "w-[120px]")}
                        />
                        <span className="text-sm text-trip-ink-3">đến</span>
                        <input
                          aria-label="Đến giờ"
                          type="time"
                          value={b.busy_end ?? ""}
                          onChange={(e) =>
                            setBusy(i, { busy_end: e.target.value || null })
                          }
                          className={cn(INPUT, "w-[120px]")}
                        />
                        {!b.busy_end && (
                          <span className="text-[12.5px] text-trip-ink-3">
                            chưa biết giờ xong
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Xoá lịch bận"
                          onClick={() =>
                            set(
                              "busy_slots",
                              busy.filter((_, j) => j !== i)
                            )
                          }
                          className="ml-auto grid size-9 place-items-center rounded-lg text-trip-ink-3 hover:text-trip-seal"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        set("busy_slots", [
                          ...busy,
                          { day: 1, busy_start: "17:00", busy_end: null },
                        ])
                      }
                      className="justify-self-start rounded-[10px] border border-dashed border-trip-line-2 px-3 py-2 text-[13.5px] font-semibold text-trip-ink-2 hover:border-trip-ink-3"
                    >
                      + Thêm lịch bận
                    </button>
                  </div>
                </Field>
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]">
                  <input
                    type="checkbox"
                    className="size-5 accent-trip-fill"
                    checked={!!form.night_out}
                    onChange={(e) => set("night_out", e.target.checked)}
                  />
                  Có đi chơi đêm
                </label>
              </Panel>

              <Panel
                title="Mục đích"
                hint="Chọn tối đa 2, theo thứ tự quan trọng."
              >
                <div className="flex flex-wrap gap-2">
                  {PURPOSES.map((p) => {
                    const idx = (form.purposes ?? []).indexOf(p.id)
                    return (
                      <Chip
                        key={p.id}
                        on={idx >= 0}
                        onClick={() =>
                          set("purposes", toggle(form.purposes ?? [], p.id, 2))
                        }
                      >
                        {idx >= 0 && (
                          <span className="font-num text-[13px]">
                            {idx + 1}
                          </span>
                        )}
                        {p.label}
                      </Chip>
                    )
                  })}
                </div>
                <Field label="Sở thích, từ khoá" htmlFor="tf-int">
                  <input
                    id="tf-int"
                    value={form.interests ?? ""}
                    onChange={(e) => set("interests", e.target.value)}
                    placeholder="Ví dụ: hải sản, biển, cà phê view"
                    className={INPUT}
                  />
                </Field>
                {(form.purposes ?? []).includes("adventure") && (
                  <Field label="Đi bộ được tầm nào">
                    <ChipGrid min={130}>
                      {WALKING.map((w) => (
                        <Chip
                          key={w.id}
                          on={form.walking_level === w.id}
                          onClick={() =>
                            set(
                              "walking_level",
                              form.walking_level === w.id ? null : w.id
                            )
                          }
                        >
                          {w.label}
                        </Chip>
                      ))}
                    </ChipGrid>
                  </Field>
                )}
              </Panel>

              <Panel
                title="Khi phải chọn, bạn ưu tiên"
                hint="Bỏ trống thì máy tự suy ra từ đoàn và giờ rảnh."
              >
                <div
                  role="radiogroup"
                  aria-label="Ưu tiên"
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {PRIORITIES.map((p) => {
                    const on = form.priority === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set("priority", on ? null : p.id)}
                        className={cn(
                          "grid gap-0.5 rounded-xl text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/30",
                          on
                            ? "border-2 border-trip-fill bg-trip-sheet px-[12px] py-[10px]"
                            : "border border-trip-line-2 bg-trip-sheet px-[13px] py-[11px] hover:border-trip-fill/50"
                        )}
                      >
                        <b className="text-[15px]">{p.label}</b>
                        <span className="text-[13px] text-trip-ink-3">
                          {p.note}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <Field label="Mức chi">
                  <ChipGrid min={150}>
                    {SPEND_STYLES.map((s) => (
                      <Chip
                        key={s.id}
                        on={(form.spend_style ?? "normal") === s.id}
                        onClick={() => set("spend_style", s.id)}
                      >
                        {s.label}
                      </Chip>
                    ))}
                  </ChipGrid>
                </Field>
              </Panel>

              <Panel
                title="Lời nhắn"
                hint="Viết tự do điều form chưa có, ví dụ “ông bà đi lại chậm”, “ngày 2 dự tiệc từ 5 giờ chiều”."
              >
                <textarea
                  aria-label="Lời nhắn"
                  value={form.message ?? ""}
                  onChange={(e) => set("message", e.target.value)}
                  rows={3}
                  className={cn(INPUT, "h-auto py-2.5")}
                />
              </Panel>
            </div>

            <footer className="grid gap-2 border-t border-trip-line bg-trip-sheet px-5 py-3">
              {conflicts.length > 0 && (
                <ConflictList items={conflicts} onPick={resolve} />
              )}
              {missing.length > 0 && (
                <p
                  role="status"
                  className="text-[13px] font-semibold text-trip-seal"
                >
                  Điền nốt {missing.join(", ")} để lập lộ trình.
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] text-trip-ink-2">
                  <b className="font-num text-[19px] text-trip-ink">
                    {Math.max(0, days)}
                  </b>{" "}
                  ngày ·{" "}
                  <b className="font-num text-[19px] text-trip-ink">
                    {form.group_size}
                  </b>{" "}
                  người
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft(draftKey)
                      setTouched(false)
                      setForm(emptyForm())
                      setKept([])
                    }}
                    className="min-h-11 rounded-[10px] px-2.5 text-sm font-semibold text-trip-ink-3 outline-none hover:text-trip-ink max-sm:hidden"
                  >
                    Làm lại
                  </button>
                  <button
                    type="submit"
                    disabled={missing.length > 0 || conflicts.length > 0}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-trip-fill px-5 text-[15px] font-semibold text-trip-on-fill outline-none hover:bg-trip-fill/90 focus-visible:ring-[3px] focus-visible:ring-trip-sky/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Route className="size-4" />
                    Lập lộ trình
                  </button>
                </div>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Một dòng "Địa điểm muốn đi": tên, ngày (hoặc bất kỳ), giờ (bất kỳ / buổi / giờ cụ thể). */
function MustRow({
  value,
  days,
  onChange,
  onRemove,
}: {
  value: MustVisit
  days: number
  onChange: (patch: Partial<MustVisit>) => void
  onRemove: () => void
}) {
  const bucket = MUST_BUCKETS.some((b) => b.id === value.time)
  const timeMode = !value.time ? "" : bucket ? value.time : "clock"
  return (
    <div className="grid gap-2 rounded-xl border border-trip-line bg-trip-paper p-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input
        aria-label="Tên địa điểm"
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Ví dụ: Bà Nà Hills, Bếp Hên"
        className={INPUT}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Ngày"
          value={value.day ?? ""}
          onChange={(e) =>
            onChange({ day: e.target.value ? Number(e.target.value) : null })
          }
          className={cn(INPUT, "w-[130px]")}
        >
          <option value="">Ngày bất kỳ</option>
          {Array.from({ length: days }, (_, d) => (
            <option key={d} value={d + 1}>
              Ngày {d + 1}
            </option>
          ))}
        </select>
        <select
          aria-label="Giờ"
          value={timeMode}
          onChange={(e) => {
            const v = e.target.value
            onChange({ time: v === "clock" ? "19:00" : v || null })
          }}
          className={cn(INPUT, "w-[130px]")}
        >
          <option value="">Giờ bất kỳ</option>
          {MUST_BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
          <option value="clock">Giờ cụ thể</option>
        </select>
        {timeMode === "clock" && (
          <input
            aria-label="Tới lúc"
            type="time"
            value={value.time ?? ""}
            onChange={(e) => onChange({ time: e.target.value || null })}
            className={cn(INPUT, "w-[120px]")}
          />
        )}
        <button
          type="button"
          aria-label="Xoá địa điểm"
          onClick={onRemove}
          className="ml-auto grid size-9 place-items-center rounded-lg text-trip-ink-3 hover:text-trip-seal"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Các chỗ chưa khớp: mỗi chỗ một dòng, bấm chọn cách xử lý thì dòng đó biến mất. */
function ConflictList({
  items,
  onPick,
}: {
  items: Conflict[]
  onPick: (c: Conflict, option: number) => void
}) {
  return (
    <div
      role="alert"
      className="grid max-h-[34dvh] gap-2 overflow-y-auto rounded-xl border border-trip-warn-dot/40 bg-trip-warn-bg p-3"
    >
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-trip-ink">
        <CircleAlert className="size-4 shrink-0 text-trip-warn-dot" />
        {items.length} chỗ chưa khớp — chọn giúp mình trước khi lập lộ trình
      </p>
      {items.map((c) => (
        <div key={c.id} className="grid gap-1.5">
          <p className="text-[13.5px] leading-snug text-trip-ink-2">{c.text}</p>
          <div className="flex flex-wrap gap-1.5">
            {c.options.map((o, i) => (
              <button
                key={o.label}
                type="button"
                onClick={() => onPick(c, i)}
                className={cn(
                  "min-h-8 rounded-lg px-3 text-[13px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/30",
                  o.keep
                    ? "border border-trip-line-2 bg-trip-sheet text-trip-ink-2 hover:border-trip-ink-3"
                    : "bg-trip-fill text-trip-on-fill hover:bg-trip-fill/90"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PrefillNote({ state }: { state: Prefill }) {
  if (state === "idle") return null
  if (typeof state === "object" && state.filled === 0) return null
  return (
    <p
      role="status"
      className="flex items-center gap-2 border-b border-trip-line bg-trip-sheet-2 px-5 py-2.5 text-[13.5px] text-trip-ink-2"
    >
      {state === "loading" ? (
        <>
          <LoaderCircle className="size-4 shrink-0 animate-spin text-trip-ink-3" />
          Đang đọc cuộc trò chuyện để điền sẵn…
        </>
      ) : state === "error" ? (
        "Chưa đọc được cuộc trò chuyện, bạn điền tay giúp mình nhé."
      ) : (
        <>
          <Sparkles className="size-4 shrink-0 text-trip-jade" />
          <span>
            Đã điền sẵn{" "}
            <b className="font-num text-[15px] text-trip-ink">{state.filled}</b>{" "}
            mục từ cuộc trò chuyện. Xem lại rồi gửi nhé.
          </span>
        </>
      )}
    </p>
  )
}
