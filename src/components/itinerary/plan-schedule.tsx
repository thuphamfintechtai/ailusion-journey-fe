"use client"

/** Tab "Lịch trình": từng điểm theo giờ, giữa hai điểm là chặng đi (phương tiện, phút, km, tiền). */

import * as React from "react"
import {
  BedDouble,
  ChevronRight,
  ExternalLink,
  MapPin,
  Route,
  TriangleAlert,
  Utensils,
} from "lucide-react"

import type { ItineraryDay, ItineraryItem } from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { PlaceSheet } from "./plan-place"
import {
  DayPills,
  TabIntro,
  km,
  modeOf,
  moneyRange,
  priceText,
  rangeOf,
  useTrip,
  vehiclesOf,
} from "./plan-shared"

const STATUS: Record<ItineraryDay["status"], { label: string; cls: string }> = {
  ok: { label: "Đi được", cls: "bg-trip-jade-bg text-trip-jade" },
  risky: { label: "Sát giờ nếu ở lâu", cls: "bg-trip-warn-bg text-trip-warn" },
  warn: { label: "Cần lưu ý", cls: "bg-trip-warn-bg text-trip-warn" },
  fail: { label: "Không đi được", cls: "bg-trip-seal-bg text-trip-seal" },
}

export function ScheduleTab({
  days,
  dayIndex,
  onDay,
  destination,
}: {
  days: ItineraryDay[]
  dayIndex: number
  onDay: (i: number) => void
  destination?: string | null
}) {
  const [open, setOpen] = React.useState<ItineraryItem | null>(null)
  const day = days[dayIndex] ?? days[0]
  if (!day) return null
  const status = STATUS[day.status]
  return (
    <div className="grid gap-3">
      <TabIntro>
        Từng buổi, giờ đến, thời gian ở và đường đi giữa các điểm.
      </TabIntro>
      <DayPills days={days} value={dayIndex} onChange={onDay} />
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
      {day.area_note && (
        <p className="flex gap-2 text-[13px] text-trip-ink-2">
          <Route className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
          <span>{day.area_note}</span>
        </p>
      )}
      {/* Lịch dài thì cuộn trong khung, để thẻ lộ trình không kéo dài cả khung chat. */}
      <ol
        aria-label={`Lịch ngày ${day.day}`}
        className="-mr-1 grid max-h-[min(70vh,640px)] content-start gap-0 overflow-y-auto overscroll-contain pr-1"
      >
        {day.items.map((item, i) => (
          <React.Fragment key={`${item.start}-${i}`}>
            {i > 0 && <LegRow item={item} />}
            <li className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-2">
              <span className="font-num text-[17px] font-semibold">
                {item.start}
              </span>
              {item.type === "visit" || item.type === "meal" ? (
                <PlaceCard item={item} onOpen={() => setOpen(item)} />
              ) : (
                <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                  <BedDouble className="size-4 text-trip-ink-3" />
                  {item.name}
                </p>
              )}
            </li>
          </React.Fragment>
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
      <PlaceSheet
        item={open}
        destination={destination}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}

/** Chặng từ điểm trước tới điểm này; phần nào chưa biết thì bỏ. */
function LegRow({ item }: { item: ItineraryItem }) {
  const mode = modeOf(item.travel_mode)
  const vehicles = vehiclesOf(useTrip().party)
  const cost = rangeOf(
    item.travel_cost_min,
    item.travel_cost_max,
    item.travel_cost
  )
  const parts = [
    vehicles ?? mode.label,
    item.travel_min > 0 ? `${item.travel_min} phút` : null,
    item.travel_km != null && item.travel_km > 0 ? km(item.travel_km) : null,
    cost && cost[1] > 0 ? `~${moneyRange(...cost)}` : null,
  ].filter(Boolean)
  if (parts.length === 0 || (parts.length === 1 && mode.label)) return null
  const Icon = mode.icon
  return (
    <li
      className="grid grid-cols-[52px_minmax(0,1fr)] gap-3"
      aria-label="Đường đi"
    >
      <span
        aria-hidden
        className="ml-[18px] border-l-2 border-dotted border-trip-line-2"
      />
      <p className="flex items-center gap-1.5 py-0.5 text-[12.5px] text-trip-ink-3">
        <Icon className="size-3.5 shrink-0" />
        {parts.join(" · ")}
      </p>
    </li>
  )
}

/** Một điểm tham quan / bữa ăn, chỉ phần cốt lõi; lý do chọn, giới thiệu, lưu ý nằm ở chi tiết. */
function PlaceCard({
  item,
  onOpen,
}: {
  item: ItineraryItem
  onOpen: () => void
}) {
  const meal = item.type === "meal"
  const Icon = meal ? Utensils : MapPin
  const meta = [
    item.category,
    item.rating != null
      ? `${item.rating.toFixed(1)}★${item.reviews ? ` (${item.reviews.toLocaleString("vi-VN")})` : ""}`
      : null,
  ].filter(Boolean)
  const { groupSize } = useTrip()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Xem chi tiết ${item.name}`}
      onClick={onOpen}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-trip-line bg-trip-paper p-2.5 text-left transition-colors outline-none hover:border-trip-line-2 hover:bg-trip-sheet-2/40 focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
    >
      <Thumb key={item.image ?? ""} src={item.image} icon={Icon} meal={meal} />
      <span className="grid min-w-0 flex-1 content-start gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-1.5 text-[15px] leading-snug font-semibold">
          <span className="min-w-0">{item.name}</span>
          {item.end !== item.start && (
            <span className="font-num text-[13px] font-normal text-trip-ink-3">
              → {item.end}
            </span>
          )}
        </span>
        {meta.length > 0 && (
          <span className="truncate text-[12.5px] text-trip-ink-2">
            {meta.join(" · ")}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[12.5px] text-trip-ink-3">
          {priceText(item, groupSize)}
          {/* Có chờ mở cửa thì để dấu nhỏ, chi tiết xem trong ngăn. */}
          {item.wait_min > 0 && (
            <TriangleAlert
              className="size-3.5 shrink-0 text-trip-warn"
              aria-label={`Chờ mở cửa ${item.wait_min} phút`}
            />
          )}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-trip-ink-3 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  )
}

/** Ảnh vuông cố định kích thước (không xô lệch bố cục); không có ảnh hoặc ảnh lỗi thì hiện ô biểu tượng. */
function Thumb({
  src,
  icon: Icon,
  meal,
}: {
  src?: string | null
  icon: typeof MapPin
  meal: boolean
}) {
  const [broken, setBroken] = React.useState(false)
  const box =
    "block size-14 shrink-0 overflow-hidden rounded-lg bg-trip-sheet-2 sm:size-[72px]"
  if (!src || broken)
    return (
      <span className={cn(box, "grid place-items-center")} aria-hidden>
        <Icon
          className={cn("size-6", meal ? "text-trip-food" : "text-trip-ink-3")}
        />
      </span>
    )
  return (
    <span className={box}>
      {/* Ảnh từ nhiều host (Google, SerpApi) nên dùng <img> thường. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-full object-cover"
      />
    </span>
  )
}
