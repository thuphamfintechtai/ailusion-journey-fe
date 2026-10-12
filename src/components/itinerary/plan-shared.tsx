"use client"

/** Phần dùng chung giữa các tab của khung phương án: chọn ngày, màu ngày, phương tiện. */

import * as React from "react"
import { Bike, Bus, Car, CarTaxiFront, Footprints, Route } from "lucide-react"

import {
  money,
  type AltMode,
  type ItineraryDay,
  type ItineraryItem,
  type TravelAlt,
  type TravelMode,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

/** Mỗi ngày một màu (biến CSS), lặp lại khi chuyến dài hơn bảng màu. */
const DAY_COLORS = [
  "--trip-sky",
  "--trip-seal",
  "--trip-jade",
  "--trip-lotus",
  "--trip-canbang",
  "--trip-warn-dot",
]

export function dayColor(i: number): string {
  return DAY_COLORS[i % DAY_COLORS.length]
}

export const MODES: Record<TravelMode, { label: string; icon: typeof Bike }> = {
  motorbike: { label: "Xe máy", icon: Bike },
  car: { label: "Ô tô", icon: Car },
  taxi: { label: "Taxi", icon: Car },
  bus: { label: "Xe buýt", icon: Bus },
}

export function modeOf(mode: TravelMode | null | undefined) {
  return mode ? MODES[mode] : { label: null, icon: Route }
}

/** Phương tiện để so thời gian (không có phương tiện công cộng); `emoji` dùng cho nhãn trên bản đồ. */
export const ALT_MODES: Record<
  AltMode,
  { label: string; emoji: string; icon: typeof Bike }
> = {
  motorbike: { label: "xe máy", emoji: "🛵", icon: Bike },
  car: { label: "ô tô", emoji: "🚗", icon: Car },
  taxi: { label: "gọi xe", emoji: "🚕", icon: CarTaxiFront },
  walk: { label: "đi bộ", emoji: "🚶", icon: Footprints },
}

/** Phương tiện của chặng đổi sang bảng so thời gian; xe buýt thì bỏ. */
export function altModeOf(mode: TravelMode | null | undefined): AltMode | null {
  return mode && mode !== "bus" ? mode : null
}

/** Danh sách so thời gian hợp lệ: bỏ phương tiện lạ, số phút không dương, và phương tiện đang dùng. */
export function altsOf(
  alts: TravelAlt[] | null | undefined,
  chosen: AltMode | null
): TravelAlt[] {
  if (!Array.isArray(alts)) return []
  return alts.filter(
    (a) =>
      a &&
      Object.hasOwn(ALT_MODES, a.mode) &&
      a.mode !== chosen &&
      typeof a.minutes === "number" &&
      a.minutes > 0
  )
}

export function km(v: number): string {
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} km`
}

/** Khoảng [thấp, cao] từ min/max; thiếu một đầu thì lấy giá đơn `fallback`. */
export function rangeOf(
  min: number | null | undefined,
  max: number | null | undefined,
  fallback?: number | null
): [number, number] | null {
  const lo = min ?? fallback ?? max
  const hi = max ?? fallback ?? min
  if (lo == null || hi == null) return null
  return lo <= hi ? [lo, hi] : [hi, lo]
}

const vnd = (v: number) => Math.round(v).toLocaleString("vi-VN")
const tr = (v: number) =>
  (v / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })

/** "120.000–150.000 đ"; hai đầu bằng nhau thì "120.000 đ". */
export function moneyRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  const r = rangeOf(min, max)
  if (!r) return "chưa có giá"
  const [lo, hi] = r.map(vnd)
  return lo === hi ? `${lo} đ` : `${lo}–${hi} đ`
}

/** Như `moneyRange` nhưng theo triệu: "1,45–1,72 tr". */
export function trieuRange(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  const r = rangeOf(min, max)
  if (!r) return "—"
  const [lo, hi] = r.map(tr)
  return lo === hi ? `${lo} tr` : `${lo}–${hi} tr`
}

/** "2026-12-20" → "20/12". */
export function ddmm(date: string): string {
  const [, m, d] = date.split("-")
  return m && d ? `${Number(d)}/${Number(m)}` : date
}

/** Dòng mô tả ngắn đầu mỗi tab. */
export function TabIntro({ children }: { children: React.ReactNode }) {
  return <p className="text-[13.5px] text-trip-ink-3">{children}</p>
}

/** Hàng nút chọn ngày; `all` thêm nút "Cả chuyến" đứng đầu, `dots` hiện chấm màu của ngày. */
export function DayPills({
  days,
  value,
  onChange,
  dots = false,
  all,
}: {
  days: ItineraryDay[]
  value: number
  onChange: (i: number) => void
  dots?: boolean
  all?: { on: boolean; onSelect: () => void }
}) {
  const pill = (on: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[13.5px] font-semibold",
      on
        ? "border-trip-fill bg-trip-fill text-trip-on-fill"
        : "border-trip-line-2 bg-trip-sheet hover:bg-trip-sheet-2"
    )
  return (
    <div
      role="group"
      aria-label="Chọn ngày"
      className="flex min-w-0 gap-1.5 overflow-x-auto"
    >
      {all && (
        <button
          type="button"
          aria-pressed={all.on}
          onClick={all.onSelect}
          className={pill(all.on)}
        >
          Cả chuyến
        </button>
      )}
      {days.map((d, i) => {
        const on = !all?.on && i === value
        return (
          <button
            key={d.plan_id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(i)}
            className={pill(on)}
          >
            {dots && (
              <span
                aria-hidden
                className="size-2 rounded-full ring-1 ring-white/70"
                style={{ background: `var(${dayColor(i)})` }}
              />
            )}
            Ngày {d.day}
            {!dots && ` · ${d.weekday}`}
          </button>
        )
      })}
    </div>
  )
}

/** Số người và cách đi của lộ trình, dùng chung cho các tab (lộ trình cũ không có). */
export const TripContext = React.createContext<{
  groupSize?: number
  party?: string | null
}>({})

export function useTrip() {
  return React.useContext(TripContext)
}

/** "cho 2 người"; chưa biết số người thì "cả nhóm". */
export function forPeople(n?: number) {
  return n ? `cho ${n} người` : "cả nhóm"
}

/** Phần xe của `travel_party`: "2 người · 1 xe máy (2 người/xe)" -> "1 xe máy". */
export function vehiclesOf(party?: string | null) {
  return party?.split(" · ")[1]?.replace(/\s*\(.*\)$/, "") ?? null
}

/** Giá ngắn của một điểm: mỗi người nếu có khoảng; chợ / mua sắm thì không ước. */
export function priceText(item: ItineraryItem, groupSize?: number): string {
  if (item.price_note && item.price_pp_min == null && !item.price)
    return "tuỳ nhu cầu mua sắm"
  if (item.price_pp_min != null) {
    if (item.price_pp_max == null) return `từ ${money(item.price_pp_min)}/người`
    const pp = moneyRange(item.price_pp_min, item.price_pp_max)
    return `${item.price_pp_min !== item.price_pp_max ? "~" : ""}${pp}/người`
  }
  const price = rangeOf(item.price_min, item.price_max, item.price)
  if (price == null) return "chưa có giá"
  if (price[1] === 0) return "miễn phí"
  return `${price[0] !== price[1] ? "~" : ""}${moneyRange(...price)} ${forPeople(groupSize)}`
}
