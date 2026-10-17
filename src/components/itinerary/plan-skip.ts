/**
 * Chỗ người dùng bấm "Xoá" trong lịch: gạch ngang, tiền vé / ăn của chỗ đó trừ khỏi chi phí ngày
 * và cả chuyến; bấm "Giữ lại" thì như cũ. Chỉ trừ tiền của chính chỗ đó — chặng đi lại, phát
 * sinh giữ như ước (lịch không xếp lại giờ). Lưu trong trình duyệt theo lượt lập + phương án.
 */

import type { ItineraryItem, ItineraryOption } from "@/lib/itinerary"

/** Khoá một chỗ trong lịch: ngày + mã chỗ (không có mã thì vị trí trong ngày). */
export function skipKey(
  day: number,
  item: ItineraryItem,
  index: number
): string {
  return `${day}:${item.place_id ?? `#${index}`}`
}

const minus = (v: number, by: number) => Math.max(0, v - by)
const minusOpt = (v: number | undefined, by: number) =>
  v == null ? v : Math.max(0, v - by)

/** Tiền cả nhóm của một chỗ đúng như server cộng vào `Day.cost` (giữa = price, thấp / cao =
 * price_min / price_max, chưa có thì 0), nên trừ ra khớp từng đồng. */
function priceOf(item: ItineraryItem): [number, number, number] {
  return [item.price ?? 0, item.price_min ?? 0, item.price_max ?? 0]
}

export type SkipCut = { count: number; low: number; high: number }

/** Phương án sau khi xoá các chỗ `keys` (item có `skipped`, tiền đã trừ) và tổng đã bớt. */
export function withSkipped(
  option: ItineraryOption,
  keys: string[],
  groupSize?: number
): [ItineraryOption, SkipCut] {
  const cut: SkipCut = { count: 0, low: 0, high: 0 }
  if (keys.length === 0) return [option, cut]
  const skip = new Set(keys)
  let tickets = 0
  let food = 0
  // Tên chỗ đã xoá / còn đi, để bỏ khỏi danh sách "giá ước" chỗ không còn đi.
  const gone = new Set<string>()
  const kept = new Set<string>()
  const days = option.days.map((day) => {
    const own = { tickets: 0, food: 0, low: 0, high: 0 }
    const items = day.items.map((item, i) => {
      if (
        (item.type !== "visit" && item.type !== "meal") ||
        !skip.has(skipKey(day.day, item, i))
      ) {
        kept.add(item.name)
        return item
      }
      gone.add(item.name)
      const [mid, low, high] = priceOf(item)
      own[item.type === "visit" ? "tickets" : "food"] += mid
      own.low += low
      own.high += high
      cut.count += 1
      return { ...item, skipped: true }
    })
    tickets += own.tickets
    food += own.food
    cut.low += own.low
    cut.high += own.high
    const c = day.cost
    return {
      ...day,
      items,
      cost: c && {
        ...c,
        tickets: minus(c.tickets, own.tickets),
        food: minus(c.food, own.food),
        total: minus(c.total, own.tickets + own.food),
        total_min: minusOpt(c.total_min, own.low),
        total_max: minusOpt(c.total_max, own.high),
      },
    }
  })
  const mid = tickets + food
  const cb = option.cost_breakdown
  // Mỗi người = tổng / số người như server; lộ trình cũ không có số người thì suy từ tổng.
  const n = Math.max(
    1,
    groupSize ??
      (cb && cb.per_person > 0 ? Math.round(cb.total / cb.per_person) : 1)
  )
  const each = (v: number | undefined, total: number | undefined) =>
    v == null || total == null ? v : Math.round(total / n)
  const total = cb && minus(cb.total, mid)
  const totalMin = cb && minusOpt(cb.total_min, cut.low)
  const totalMax = cb && minusOpt(cb.total_max, cut.high)
  return [
    {
      ...option,
      days,
      total_cost:
        option.total_cost == null ? null : minus(option.total_cost, mid),
      estimated_prices: option.estimated_prices?.filter(
        (name) => !gone.has(name) || kept.has(name)
      ),
      cost_breakdown: cb && {
        ...cb,
        tickets: minus(cb.tickets, tickets),
        food: minus(cb.food, food),
        total: total ?? 0,
        total_min: totalMin,
        total_max: totalMax,
        per_person: each(cb.per_person, total) ?? 0,
        per_person_min: each(cb.per_person_min, totalMin),
        per_person_max: each(cb.per_person_max, totalMax),
      },
    },
    cut,
  ]
}

/** Chỗ đã bỏ, theo phương án; đọc / ghi trình duyệt (chặn lưu thì vẫn dùng được trong phiên). */
export function loadSkipped(key: string): Record<string, string[]> {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "{}")
    return v && typeof v === "object" && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export function saveSkipped(key: string, value: Record<string, string[]>) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Trình duyệt chặn lưu: vẫn bỏ / giữ được trong phiên này.
  }
}
