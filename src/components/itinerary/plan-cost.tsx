"use client"

/** Tab "Chi phí": "Cả chuyến" (tổng theo khoản so với ngân sách) hoặc từng ngày tiêu vào đâu. */

import * as React from "react"
import {
  BedDouble,
  Bike,
  Car,
  CircleAlert,
  Info,
  MapPin,
  Utensils,
} from "lucide-react"

import {
  money,
  trieu,
  type ExtraItem,
  type ItineraryDay,
  type ItineraryOption,
  type ItineraryResult,
  type TransportOption,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import {
  DayPills,
  TabIntro,
  ddmm,
  km,
  modeOf,
  moneyRange,
  forPeople,
  rangeOf,
  trieuRange,
  useTrip,
  vehiclesOf,
} from "./plan-shared"

const PARTS = [
  { key: "stay", label: "Chỗ ở", cls: "bg-trip-stay" },
  { key: "tickets", label: "Vé tham quan", cls: "bg-trip-tickets" },
  { key: "food", label: "Ăn uống", cls: "bg-trip-food" },
  { key: "transport", label: "Di chuyển", cls: "bg-trip-move" },
  { key: "rental", label: "Thuê xe", cls: "bg-trip-canbang" },
  { key: "extras", label: "Phát sinh", cls: "bg-trip-inter" },
] as const

/** Khoảng tiền lớn theo triệu, nhỏ theo đồng; hai đầu bằng nhau thì một số. */
function bigRange([lo, hi]: [number, number]): string {
  return lo === hi ? money(lo) : trieuRange(lo, hi)
}

type Part = (typeof PARTS)[number]["key"]
type Split = Partial<Record<Part, number>>

export function CostTab({
  option,
  stay,
}: {
  option: ItineraryOption
  stay: ItineraryResult["stay"]
}) {
  const { groupSize, party } = useTrip()
  // null = "Cả chuyến", số = vị trí ngày.
  const [sel, setSel] = React.useState<number | null>(null)
  const day = sel == null ? null : option.days[sel]
  return (
    <div className="grid gap-4">
      <TabIntro>
        Ước tính {forPeople(groupSize)}: cả chuyến hoặc từng ngày.
      </TabIntro>
      {party && (
        <p className="-mt-2 text-[13px] text-trip-ink-2">
          Di chuyển: <b className="font-semibold">{party}</b>
        </p>
      )}
      <DayPills
        days={option.days}
        value={sel ?? 0}
        onChange={setSel}
        all={{ on: sel == null, onSelect: () => setSel(null) }}
      />
      {day ? (
        <DayCost
          key={day.plan_id}
          day={day}
          stay={stay}
          // Không có chi phí ngày từ LLM: đêm cuối chuyến không tính tiền phòng.
          night={sel != null && sel < option.days.length - 1}
        />
      ) : (
        <TripCost option={option} />
      )}
    </div>
  )
}

/** "Cả chuyến": tổng, mỗi người, ngân sách, chia theo khoản, phát sinh, so hãng xe. */
function TripCost({ option }: { option: ItineraryOption }) {
  const cb = option.cost_breakdown
  const total = rangeOf(
    cb?.total_min,
    cb?.total_max,
    cb?.total ?? option.total_cost
  )
  const perPerson = cb
    ? rangeOf(cb.per_person_min, cb.per_person_max, cb.per_person)
    : null
  const estimated = cb?.estimated ?? !!option.estimated_prices?.length
  return (
    <>
      <div className="grid gap-3 rounded-xl border border-trip-line bg-trip-paper p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Tổng chuyến"
            value={total ? bigRange(total) : money(null)}
            sub={
              total && total[0] !== total[1]
                ? `ước giữa ${trieuRange((total[0] + total[1]) / 2, null)}`
                : undefined
            }
            big
          />
          {perPerson && (
            <Stat label="Mỗi người" value={moneyRange(...perPerson)} />
          )}
          {cb?.budget && total ? (
            <Budget range={total} budget={cb.budget} />
          ) : null}
        </div>
        {cb && <SplitBar split={cb} />}
        {estimated && (
          <p className="flex gap-1.5 text-[12.5px] text-trip-ink-3">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Có giá ước (chưa có giá thật)
            {option.estimated_prices?.length
              ? `: ${option.estimated_prices.join(", ")}`
              : ""}
            .
          </p>
        )}
      </div>

      {cb?.extra_items?.length ? (
        <Extras
          items={cb.extra_items}
          pct={[cb.extras_pct_min, cb.extras_pct_max]}
          notes={cb.extras_notes ?? []}
        />
      ) : null}

      {cb?.transport_options?.length ? (
        <Compare options={cb.transport_options} />
      ) : null}
    </>
  )
}

/** Thanh chia theo khoản và chú thích; lộ trình cũ không có "Phát sinh" thì bỏ khoản đó. */
function SplitBar({ split }: { split: Split }) {
  // Khoản không phải lộ trình nào cũng có (phát sinh, thuê xe) thì bỏ khi bằng 0.
  const parts = PARTS.filter(
    (p) => (p.key !== "extras" && p.key !== "rental") || split[p.key]
  )
  const sum = parts.reduce((t, p) => t + (split[p.key] ?? 0), 0)
  if (sum <= 0) return null
  return (
    <>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-trip-sheet-2"
        role="img"
        aria-label={parts
          .map(
            (p) =>
              `${p.label} ${Math.round(((split[p.key] ?? 0) / sum) * 100)}%`
          )
          .join(", ")}
      >
        {parts.map((p) =>
          (split[p.key] ?? 0) > 0 ? (
            <span
              key={p.key}
              className={p.cls}
              style={{ width: `${((split[p.key] ?? 0) / sum) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <ul
        className={cn(
          "grid grid-cols-2 gap-x-4 gap-y-2",
          parts.length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4"
        )}
      >
        {parts.map((p) => (
          <li key={p.key} className="grid gap-0.5">
            <span className="flex items-center gap-1.5 text-[12.5px] text-trip-ink-3">
              <span aria-hidden className={cn("size-2 rounded-full", p.cls)} />
              {p.label}
            </span>
            <span className="font-num text-[15px] font-semibold">
              {money(split[p.key] ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Phát sinh cả chuyến: để dành theo % chi phí vì không tính trước được (thuế, mưa làm giá xe
 * tăng, hư xe, gửi xe, ăn vặt...). Có ghi chú lý do thì hiện danh sách lý do thay cho từng ngày.
 */
function Extras({
  items,
  pct,
  notes,
}: {
  items: ExtraItem[]
  pct: [number | undefined, number | undefined]
  notes: string[]
}) {
  const [low, high] = pct
  const min = items.reduce((s, x) => s + x.min, 0)
  const max = items.reduce((s, x) => s + x.max, 0)
  const share =
    low != null && high != null && high > 0
      ? `${Math.round(low * 100)}–${Math.round(high * 100)}%`
      : null
  return (
    <section className="grid gap-2 rounded-xl border border-trip-line bg-trip-paper p-3 sm:p-4">
      <header className="flex items-start gap-3">
        <span className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="text-[14.5px] font-bold">
            Chi phí phát sinh{share ? ` · ${share} chi phí` : ""}
          </h3>
          <p className="text-[12.5px] text-trip-ink-3">
            Không tính trước được từng khoản, nên hãy để dư khoảng này ngoài các
            chi phí trên.
          </p>
        </span>
        <span className="shrink-0 text-right font-num text-[15px] font-semibold">
          {moneyRange(min, max)}
        </span>
      </header>
      {notes.length ? (
        <ul className="grid gap-1 text-[13px] text-trip-ink-2">
          {notes.map((n) => (
            <li key={n} className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-trip-inter" />
              {n}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-1">
          {items.map((x) => (
            <li
              key={x.label}
              className="flex items-start gap-2.5 border-b border-trip-line py-1.5 text-[13.5px] last:border-0"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-trip-inter" />
              <span className="grid min-w-0 flex-1">
                <span>{x.label}</span>
                {x.reason && (
                  <span className="text-[12px] text-trip-ink-3">
                    {x.reason}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right font-num font-semibold">
                {moneyRange(x.min, x.max)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** So sánh tiền gọi xe cả chuyến giữa các hãng (cùng các chặng của phương án), rẻ trước. */
function Compare({ options }: { options: TransportOption[] }) {
  const [all, setAll] = React.useState(false)
  const cheapest = options[0]?.total ?? 0
  const shown = all ? options : options.slice(0, 6)
  return (
    <section className="grid gap-2 rounded-xl border border-trip-line bg-trip-paper p-3 sm:p-4">
      <header className="grid gap-0.5">
        <h3 className="text-[14.5px] font-bold">Gọi xe cả chuyến theo hãng</h3>
        <p className="text-[12.5px] text-trip-ink-3">
          Cùng các chặng của phương án này, theo bảng giá công bố của từng hãng.
          Chưa gồm phụ phí giờ cao điểm, phí chờ và khuyến mãi.
        </p>
      </header>
      <ul className="grid gap-1">
        {shown.map((o) => {
          const Icon = o.kind === "bike" ? Bike : Car
          const extra = o.total - cheapest
          return (
            <li
              key={`${o.brand}-${o.service}`}
              className="flex items-center gap-2.5 border-b border-trip-line py-1.5 text-[13.5px] last:border-0"
            >
              <Icon className="size-4 shrink-0 text-trip-ink-3" />
              <span className="min-w-0 flex-1 truncate">
                <b>{o.brand}</b>{" "}
                <span className="text-trip-ink-3">
                  · {o.service}
                  {o.vehicles > 1 ? ` × ${o.vehicles} xe` : ""}
                </span>
              </span>
              {extra > 0 ? (
                <span className="font-num text-[12px] text-trip-ink-3">
                  +{money(extra)}
                </span>
              ) : (
                <span className="rounded bg-trip-jade-bg px-1.5 text-[11.5px] font-semibold text-trip-jade">
                  rẻ nhất
                </span>
              )}
              <span className="w-24 text-right font-num font-semibold">
                {money(o.total)}
              </span>
            </li>
          )
        })}
      </ul>
      {options.length > 6 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="justify-self-start text-[12.5px] font-semibold text-trip-sky"
        >
          {all ? "Thu gọn" : `Xem cả ${options.length} lựa chọn`}
        </button>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  sub,
  big = false,
}: {
  label: string
  value: string
  sub?: string
  big?: boolean
}) {
  return (
    <div className="grid content-start gap-0.5">
      <span className="text-[12.5px] text-trip-ink-3">{label}</span>
      <span
        className={cn(
          "font-num leading-tight font-semibold",
          big ? "text-[24px]" : "text-[18px]"
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="font-num text-[12.5px] text-trip-ink-3">{sub}</span>
      )}
    </div>
  )
}

/** So ngân sách theo đầu cao của khoảng: chỉ đầu cao vượt thì "có thể vượt". */
function Budget({
  range: [lo, hi],
  budget,
}: {
  range: [number, number]
  budget: number
}) {
  const ratio = hi / budget
  const over = ratio > 1
  return (
    <div className="col-span-2 grid content-start gap-1 sm:col-span-1">
      <span className="text-[12.5px] text-trip-ink-3">
        So với ngân sách {trieu(budget)}
      </span>
      <span
        className={cn(
          "font-num text-[15px] font-semibold",
          over && "text-trip-warn"
        )}
      >
        {lo > budget
          ? `Vượt ${moneyRange(lo - budget, hi - budget)}`
          : over
            ? `Có thể vượt tới ${money(hi - budget)}`
            : `Còn ít nhất ${money(budget - hi)}`}
      </span>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-trip-sheet-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="Đã dùng ngân sách"
      >
        <div
          className={cn(
            "h-full rounded-full",
            over ? "bg-trip-warn-dot" : "bg-trip-jade"
          )}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
    </div>
  )
}

type Line = {
  key: string
  icon: typeof MapPin
  iconCls: string
  name: string
  note?: string
  amount: [number, number] | null
  part: Part
  extra?: boolean
  /** Chữ thay cho số tiền (VD chặng tự lái "trong tiền thuê xe"). */
  label?: string
}

/** Các khoản của một ngày theo thứ tự đi: chặng xe, điểm/bữa, rồi tiền phòng đêm đó. */
function linesOf(
  day: ItineraryDay,
  stay: ItineraryResult["stay"],
  night: boolean,
  vehicles: string | null
): Line[] {
  const lines: Line[] = []
  const rent = day.cost?.rental_max
  if (rent) {
    const mode = modeOf(day.items.find((x) => x.travel_mode)?.travel_mode)
    lines.push({
      key: "rental",
      icon: mode.icon,
      iconCls: "text-trip-canbang",
      name: `Thuê ${mode.label?.toLowerCase() ?? "xe"} + xăng trong ngày`,
      note: day.cost?.rental_note ?? undefined,
      amount: [day.cost?.rental_min ?? rent, rent],
      part: "rental",
    })
  }
  // Tên điểm vừa rời, để mỗi chặng ghi rõ "A → B".
  let from = stay?.name ?? "chỗ ở"
  day.items.forEach((item, i) => {
    const travel = rangeOf(
      item.travel_cost_min,
      item.travel_cost_max,
      item.travel_cost
    )
    if (travel) {
      const mode = modeOf(item.travel_mode)
      lines.push({
        key: `leg-${i}`,
        icon: mode.icon,
        iconCls: "text-trip-move",
        name: `${from} → ${
          item.type === "back"
            ? `${stay?.name ?? "chỗ ở"} (về chỗ ở)`
            : item.name
        }`,
        note: [
          vehicles ?? mode.label ?? null,
          item.travel_min > 0 ? `${item.travel_min} phút` : null,
          item.travel_km ? km(item.travel_km) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        amount: travel,
        part: "transport",
      })
    }
    if (item.type === "visit" || item.type === "meal") {
      from = item.name
      const meal = item.type === "meal"
      lines.push({
        key: `item-${i}`,
        icon: meal ? Utensils : MapPin,
        iconCls: meal ? "text-trip-food" : "text-trip-tickets",
        name: item.name,
        // Quán: khoảng giá mỗi người; chợ / mua sắm: không ước tiền mua sắm.
        note: item.price_note ?? item.category ?? undefined,
        amount:
          item.price_note && item.price_pp_min == null && !item.price
            ? null
            : rangeOf(item.price_min, item.price_max, item.price),
        label:
          item.price_note && item.price_pp_min == null && !item.price
            ? "không ước tính"
            : undefined,
        part: meal ? "food" : "tickets",
      })
    }
  })
  const stayCost = day.cost
    ? day.cost.stay
    : night
      ? (stay?.price_per_night ?? 0)
      : 0
  if (stay && stayCost > 0)
    lines.push({
      key: "stay",
      icon: BedDouble,
      iconCls: "text-trip-stay",
      name: `Đêm ở ${stay.name}`,
      amount: [stayCost, stayCost],
      part: "stay",
    })
  day.cost?.extra_items?.forEach((x, i) =>
    lines.push({
      key: `extra-${i}`,
      icon: CircleAlert,
      iconCls: "text-trip-inter",
      name: x.label,
      note: x.reason || undefined,
      amount: [x.min, x.max],
      part: "extras",
      extra: true,
    })
  )
  return lines
}

/** Một chặng "A → B" (đi lại + vé / ăn ở B), hoặc nhóm "Cả ngày" (thuê xe, đêm ở, phát sinh). */
type Group = {
  key: string
  /** Số thứ tự chặng; nhóm "Cả ngày" thì null. */
  index: number | null
  title: string
  time?: string
  lines: Line[]
}

function groupsOf(
  day: ItineraryDay,
  stay: ItineraryResult["stay"],
  lines: Line[],
  vehicles: string | null
): Group[] {
  const home = stay?.name ?? "chỗ ở"
  const byKey = new Map(lines.map((l) => [l.key, l]))
  const groups: Group[] = []
  let from = home
  day.items.forEach((item, i) => {
    if (item.type === "start") return
    const back = item.type === "back"
    const to = back ? `${home} (về chỗ ở)` : item.name
    const mode = modeOf(item.travel_mode)
    const leg = byKey.get(`leg-${i}`)
    const own: Line[] = []
    if (leg) own.push({ ...leg, name: "Đi lại" })
    else if (item.travel_min > 0 || item.travel_km)
      // Tự lái: chặng không tính tiền riêng, đã nằm trong "thuê xe + xăng" của ngày.
      own.push({
        key: `leg-${i}`,
        icon: mode.icon,
        iconCls: "text-trip-move",
        name: "Đi lại",
        note: [
          vehicles ?? mode.label ?? null,
          item.travel_min > 0 ? `${item.travel_min} phút` : null,
          item.travel_km ? km(item.travel_km) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        amount: null,
        part: "transport",
        label: day.cost?.rental_max ? "trong tiền thuê xe" : "—",
      })
    const place = byKey.get(`item-${i}`)
    if (place)
      own.push({
        ...place,
        name: item.type === "meal" ? "Ăn uống" : "Tham quan",
      })
    if (own.length)
      groups.push({
        key: `g-${i}`,
        index: groups.length + 1,
        title: `${from} → ${to}`,
        time: item.start,
        lines: own,
      })
    if (!back) from = item.name
  })
  const daily = lines.filter(
    (l) => ["rental", "stay"].includes(l.key) || l.key.startsWith("extra-")
  )
  if (daily.length)
    groups.push({ key: "g-day", index: null, title: "Cả ngày", lines: daily })
  return groups
}

/** Cộng (thấp, cao) các khoản của một nhóm; khoản chưa có giá tính 0. */
function sumOf(lines: Line[]): [number, number] {
  return lines.reduce<[number, number]>(
    ([lo, hi], l) => [lo + (l.amount?.[0] ?? 0), hi + (l.amount?.[1] ?? 0)],
    [0, 0]
  )
}

/** "Ngày N": tổng của ngày, chia theo khoản, rồi từng chặng "A → B" theo thứ tự đi. */
function DayCost({
  day,
  stay,
  night,
}: {
  day: ItineraryDay
  stay: ItineraryResult["stay"]
  night: boolean
}) {
  const vehicles = vehiclesOf(useTrip().party)
  const lines = linesOf(day, stay, night, vehicles)
  // Không có chi phí ngày từ LLM thì cộng các khoản ở dưới (lấy giữa khoảng cho thanh chia).
  const total = day.cost
    ? rangeOf(day.cost.total_min, day.cost.total_max, day.cost.total)
    : rangeOf(
        lines.reduce((s, l) => s + (l.amount?.[0] ?? 0), 0),
        lines.reduce((s, l) => s + (l.amount?.[1] ?? 0), 0)
      )
  const split: Split =
    day.cost ??
    lines.reduce<Split>((acc, l) => {
      const mid = l.amount ? (l.amount[0] + l.amount[1]) / 2 : 0
      acc[l.part] = (acc[l.part] ?? 0) + mid
      return acc
    }, {})
  return (
    <>
      <div className="grid gap-3 rounded-xl border border-trip-line bg-trip-paper p-3 sm:p-4">
        <Stat
          label={`Ngày ${day.day} · ${day.weekday} ${ddmm(day.date)}`}
          value={total ? bigRange(total) : money(null)}
          big
        />
        <SplitBar split={split} />
      </div>
      {lines.length > 0 ? (
        <ol className="relative grid gap-2.5 before:absolute before:top-4 before:bottom-4 before:left-[15px] before:w-0.5 before:bg-trip-line">
          {groupsOf(day, stay, lines, vehicles).map((g) => {
            const [lo, hi] = sumOf(g.lines)
            return (
              <li
                key={g.key}
                className="relative grid grid-cols-[32px_1fr] gap-3"
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 mt-2.5 grid size-8 place-items-center rounded-full text-[13px] font-bold ring-4 ring-trip-paper",
                    g.index == null
                      ? "bg-trip-sheet-2 text-trip-ink-3"
                      : "bg-trip-fill text-trip-on-fill"
                  )}
                >
                  {g.index ?? "Σ"}
                </span>
                <div className="min-w-0 rounded-xl border border-trip-line bg-trip-sheet">
                  <div className="flex items-start gap-3 border-b border-trip-line px-3.5 py-2.5">
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="text-[14px] leading-snug font-semibold text-trip-ink">
                        {g.title}
                      </span>
                      {g.time && (
                        <span className="text-[12px] text-trip-ink-3">
                          Tới lúc {g.time}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right font-num text-[14px] font-bold">
                      {hi > 0 ? moneyRange(lo, hi) : "0 đ"}
                    </span>
                  </div>
                  <ul className="divide-y divide-trip-line/70 px-3.5">
                    {g.lines.map((l) => {
                      const Icon = l.icon
                      return (
                        <li
                          key={l.key}
                          className="flex items-center gap-2.5 py-2 text-[13px]"
                        >
                          <Icon className={cn("size-4 shrink-0", l.iconCls)} />
                          <span className="grid min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-trip-ink-2">
                                {l.name}
                              </span>
                              {l.extra && (
                                <span className="shrink-0 rounded bg-trip-sheet-2 px-1.5 text-[11px] font-semibold text-trip-ink-3">
                                  phát sinh
                                </span>
                              )}
                            </span>
                            {l.note && (
                              <span className="text-[12px] text-trip-ink-3">
                                {l.note}
                              </span>
                            )}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-num",
                              l.amount?.[1]
                                ? "font-semibold"
                                : "text-trip-ink-3"
                            )}
                          >
                            {l.label ??
                              (l.amount == null
                                ? "chưa có giá"
                                : l.amount[1] === 0
                                  ? "miễn phí"
                                  : moneyRange(...l.amount))}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-trip-line px-3.5 py-2.5 text-[13px] text-trip-ink-3">
          Ngày này chưa có khoản chi nào.
        </p>
      )}
    </>
  )
}
