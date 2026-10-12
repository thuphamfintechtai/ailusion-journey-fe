"use client"

/** Tab "Bản đồ": một ngày hoặc cả chuyến (mỗi ngày một màu), phóng to toàn màn hình, chú thích. */

import * as React from "react"
import dynamic from "next/dynamic"
import { ExternalLink, Maximize2, Minimize2, Utensils } from "lucide-react"

import type {
  AltMode,
  ItineraryDay,
  ItineraryItem,
  ItineraryResult,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import type { MapDay } from "./day-map"
import { PlaceSheet } from "./plan-place"
import {
  ALT_MODES,
  DayPills,
  TabIntro,
  altModeOf,
  altsOf,
  dayColor,
} from "./plan-shared"

const DayMap = dynamic(() => import("./day-map"), {
  ssr: false,
})

export function MapTab({
  days,
  dayIndex,
  onDay,
  stay,
  destination,
}: {
  days: ItineraryDay[]
  dayIndex: number
  onDay: (i: number) => void
  stay: ItineraryResult["stay"]
  destination: string
}) {
  const [all, setAll] = React.useState(false)
  const [open, setOpen] = React.useState<ItineraryItem | null>(null)
  const day = days[dayIndex] ?? days[0]
  // Giữ nguyên mảng giữa các lần render để bản đồ không vẽ lại.
  const mapDays = React.useMemo<MapDay[]>(
    () =>
      all
        ? days.map((d, i) => ({ day: d, color: dayColor(i) }))
        : day
          ? [{ day, color: dayColor(days.indexOf(day)) }]
          : [],
    [all, days, day]
  )
  const box = React.useRef<HTMLDivElement>(null)
  // Trình duyệt không có Fullscreen API (iPhone Safari…): phủ khung cố định lên cả màn hình.
  const [native, setNative] = React.useState(false)
  const [overlay, setOverlay] = React.useState(false)
  const big = native || overlay

  React.useEffect(() => {
    const sync = () => setNative(document.fullscreenElement === box.current)
    document.addEventListener("fullscreenchange", sync)
    return () => document.removeEventListener("fullscreenchange", sync)
  }, [])
  React.useEffect(() => {
    if (!overlay) return
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOverlay(false)
    document.addEventListener("keydown", esc)
    return () => document.removeEventListener("keydown", esc)
  }, [overlay])

  const toggle = () => {
    if (native) return void document.exitFullscreen().catch(() => {})
    if (overlay) return setOverlay(false)
    const el = box.current
    if (el && document.fullscreenEnabled && el.requestFullscreen)
      el.requestFullscreen().catch(() => setOverlay(true))
    else setOverlay(true)
  }

  if (!day) return null
  const btn =
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[10px] border border-trip-line-2 bg-trip-sheet px-3 text-[13px] font-semibold hover:bg-trip-sheet-2"

  return (
    <div className="grid gap-3">
      <TabIntro>Vị trí và thứ tự đi trong ngày.</TabIntro>
      <div
        ref={box}
        className={cn(
          "grid gap-3",
          big &&
            "fixed inset-0 z-50 grid-rows-[auto_minmax(0,1fr)] bg-trip-paper p-3 sm:p-4"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DayPills
            days={days}
            value={dayIndex}
            onChange={(i) => {
              setAll(false)
              onDay(i)
            }}
            dots
            all={{ on: all, onSelect: () => setAll(true) }}
          />
          <div className="ml-auto flex gap-1.5">
            {!all && day.maps_url && (
              <a
                href={day.maps_url}
                target="_blank"
                rel="noopener"
                className={cn(btn, "text-trip-sky")}
              >
                Google Maps ngày {day.day}
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-pressed={big}
              className={btn}
            >
              {big ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
              {big ? "Thu nhỏ" : "Phóng to"}
            </button>
          </div>
        </div>
        <DayMap
          days={mapDays}
          stay={stay}
          label={all ? "Bản đồ cả chuyến" : `Bản đồ ngày ${day.day}`}
          className={big ? "h-full" : "h-[min(65vh,600px)]"}
          onSelect={setOpen}
        />
      </div>
      <RideTimes days={mapDays} />
      <Legend days={mapDays} />
      <PlaceSheet
        item={open}
        destination={destination}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}

/** Phương tiện chính của ngày: loại xuất hiện nhiều nhất trong các chặng (bỏ xe buýt). */
function dayMode(day: ItineraryDay): AltMode | null {
  const count = new Map<AltMode, number>()
  for (const item of day.items) {
    const m = altModeOf(item.travel_mode)
    if (m) count.set(m, (count.get(m) ?? 0) + 1)
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/**
 * "Thời gian di chuyển": tổng phút ngồi xe của ngày bằng phương tiện đã chọn, rồi nếu đổi
 * phương tiện khác. Đi bộ không có tổng ngày mà chặng có số đi bộ thì ghi "chỉ chặng ngắn".
 * Lộ trình cũ không có các trường này thì ẩn.
 */
function RideTimes({ days }: { days: MapDay[] }) {
  const rows = days.flatMap(({ day, color }) => {
    const ride = day.metrics.ride_min
    const mode = dayMode(day)
    const alts = altsOf(day.ride_alt, mode)
    const shortWalk =
      mode !== "walk" &&
      !alts.some((a) => a.mode === "walk") &&
      day.items.some((it) =>
        altsOf(it.travel_alt, null).some((a) => a.mode === "walk")
      )
    if (ride == null && alts.length === 0) return []
    return [{ day, color, ride, mode, alts, shortWalk }]
  })
  if (rows.length === 0) return null
  const many = days.length > 1
  return (
    <section className="grid gap-2 rounded-xl border border-trip-line bg-trip-paper p-3">
      <h3 className="text-[14px] font-bold">Thời gian di chuyển</h3>
      <ul className="grid gap-1.5">
        {rows.map(({ day, color, ride, mode, alts, shortWalk }) => {
          const Icon = mode ? ALT_MODES[mode].icon : null
          return (
            <li
              key={day.plan_id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]"
            >
              {many && (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: `var(${color})` }}
                  />
                  Ngày {day.day}
                </span>
              )}
              {ride != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-trip-sky/10 px-2.5 py-0.5 font-semibold text-trip-sky">
                  {Icon && <Icon className="size-3.5" />}
                  {mode ? `${cap(ALT_MODES[mode].label)} ` : "Ngồi xe "}
                  <span className="font-num">{ride} phút</span>
                </span>
              )}
              {(alts.length > 0 || shortWalk) && (
                <span className="text-trip-ink-3">
                  {[
                    ...alts.map(
                      (a) =>
                        `${cap(ALT_MODES[a.mode].label)} ~${a.minutes} phút`
                    ),
                    shortWalk ? "Đi bộ chỉ chặng ngắn" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Chặng tới điểm này: "11 phút xe máy · ~13 phút ô tô · 25 phút đi bộ". */
function legText(item: ItineraryItem): string | null {
  if (item.travel_min <= 0) return null
  const mode = altModeOf(item.travel_mode)
  return [
    `${item.travel_min} phút${mode ? ` ${ALT_MODES[mode].label}` : ""}`,
    ...altsOf(item.travel_alt, mode).map(
      (a) =>
        `${a.mode === "walk" ? "" : "~"}${a.minutes} phút ${ALT_MODES[a.mode].label}`
    ),
  ].join(" · ")
}

/** Chú thích dưới bản đồ: số thứ tự (hoặc biểu tượng bữa ăn), tên, giờ; khớp số trên ghim. */
function Legend({ days }: { days: MapDay[] }) {
  return (
    <div className="grid gap-3">
      {days.map(({ day, color }) => {
        let n = 0
        const rows = day.items.flatMap((item) => {
          if (item.type !== "visit" && item.type !== "meal") return []
          const pinned = item.lat !== null && item.lng !== null
          const label = item.type === "visit" && pinned ? String(++n) : null
          return [{ item, label }]
        })
        if (rows.length === 0) return null
        return (
          <section key={day.plan_id} className="grid gap-1.5">
            {days.length > 1 && (
              <h4 className="flex items-center gap-1.5 text-[13px] font-semibold">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: `var(${color})` }}
                />
                Ngày {day.day} · {day.weekday}
              </h4>
            )}
            <ol className="grid gap-x-4 gap-y-1 text-[13.5px] sm:grid-cols-2">
              {rows.map(({ item, label }, i) => (
                <li
                  key={`${item.start}-${i}`}
                  className="flex min-w-0 items-start gap-2"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full font-num text-[11px] font-semibold text-white",
                      item.type === "meal" && "bg-trip-food"
                    )}
                    style={
                      item.type === "meal"
                        ? undefined
                        : { background: `var(${color})` }
                    }
                  >
                    {item.type === "meal" ? (
                      <Utensils className="size-3" />
                    ) : (
                      (label ?? "·")
                    )}
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate">{item.name}</span>
                    {legText(item) && (
                      <span className="truncate text-[12px] text-trip-ink-3">
                        {legText(item)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-num text-[12.5px] text-trip-ink-3">
                    {item.start}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
