"use client"

/** Tab "Thời tiết": mỗi ngày một thẻ lịch, nhiệt độ, mức đông, dự báo sáng/chiều/tối. */

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Sun,
  type LucideIcon,
} from "lucide-react"

import type { DaySession, ItineraryDay, WeatherIcon } from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { TabIntro } from "./plan-shared"

const ICONS: Record<WeatherIcon, LucideIcon> = {
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
  fog: CloudFog,
}

const CROWD: Record<
  NonNullable<ItineraryDay["crowd"]>,
  { label: string; cls: string }
> = {
  low: { label: "Vắng", cls: "bg-trip-jade-bg text-trip-jade" },
  medium: { label: "Vừa", cls: "bg-trip-sky-bg text-trip-sky" },
  high: { label: "Cao điểm", cls: "bg-trip-warn-bg text-trip-warn" },
}

export function WeatherTab({ days }: { days: ItineraryDay[] }) {
  return (
    <div className="grid gap-3">
      <TabIntro>Dự báo theo buổi, âm lịch, ngày lễ và mức cao điểm.</TabIntro>
      <div className="grid gap-3 md:grid-cols-2">
        {days.map((d) => (
          <DayWeather key={d.plan_id} day={d} />
        ))}
      </div>
    </div>
  )
}

function DayWeather({ day }: { day: ItineraryDay }) {
  const [, month, date] = day.date.split("-")
  const temp =
    day.temp_min != null && day.temp_max != null
      ? `${Math.round(day.temp_min)}–${Math.round(day.temp_max)}°`
      : day.temp_max != null
        ? `${Math.round(day.temp_max)}°`
        : null
  const crowd = day.crowd ? CROWD[day.crowd] : null
  return (
    <article className="grid content-start gap-3 rounded-xl border border-trip-line bg-trip-paper p-3">
      <div className="flex items-start gap-3">
        <div
          className="w-14 shrink-0 overflow-hidden rounded-lg border border-trip-line bg-trip-sheet text-center"
          aria-hidden
        >
          <div className="bg-trip-ink py-0.5 text-[10.5px] font-semibold text-trip-on-ink">
            {day.weekday}
          </div>
          <div className="font-num text-[22px] leading-8 font-semibold">
            {date ? Number(date) : day.day}
          </div>
          {month && (
            <div className="pb-1 text-[10.5px] text-trip-ink-3">
              Tháng {Number(month)}
            </div>
          )}
        </div>
        <div className="grid min-w-0 flex-1 content-start gap-1">
          <h4 className="text-[14.5px] font-bold">
            Ngày {day.day}
            {day.lunar ? `, âm lịch ${day.lunar}` : ""}
          </h4>
          {(day.holiday || crowd) && (
            <p className="flex flex-wrap gap-1.5 text-[12px]">
              {day.holiday && (
                <span className="rounded-full bg-trip-lotus-bg px-2 py-0.5 font-semibold text-trip-lotus">
                  {day.holiday}
                </span>
              )}
              {crowd && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    crowd.cls
                  )}
                >
                  {crowd.label}
                </span>
              )}
            </p>
          )}
          {day.crowd_note && (
            <p className="text-[13px] leading-snug text-trip-ink-2">
              {day.crowd_note}
            </p>
          )}
        </div>
        {temp && (
          <span className="shrink-0 font-num text-[24px] leading-none font-semibold">
            {temp}
          </span>
        )}
      </div>
      {day.sessions?.length ? (
        <ul className="grid grid-cols-3 gap-2">
          {day.sessions.map((s) => (
            <Session key={s.part} s={s} />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-trip-ink-3">
          {day.weather ?? "Chưa có dự báo cho ngày này."}
        </p>
      )}
    </article>
  )
}

function Session({ s }: { s: DaySession }) {
  const Icon = ICONS[s.icon] ?? Cloud
  const wet = s.rain_chance != null && s.rain_chance >= 50
  return (
    <li
      className={cn(
        "grid min-w-0 content-start gap-1 rounded-lg border p-2",
        wet
          ? "border-trip-sky/30 bg-trip-sky-bg"
          : "border-trip-line bg-trip-sheet"
      )}
    >
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
        <Icon
          className={cn(
            "size-4 shrink-0",
            wet ? "text-trip-sky" : "text-trip-ink-3"
          )}
        />
        {s.label}
      </span>
      <span className="line-clamp-2 text-[12px] leading-snug text-trip-ink-2">
        {s.condition}
      </span>
      {s.rain_chance != null && (
        <>
          <span className="font-num text-[18px] leading-tight font-semibold">
            {Math.round(s.rain_chance)}%
            <span className="sr-only"> khả năng mưa</span>
          </span>
          <div
            className="h-1 overflow-hidden rounded-full bg-trip-sheet-2"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-trip-sky"
              style={{ width: `${Math.min(100, Math.max(0, s.rain_chance))}%` }}
            />
          </div>
        </>
      )}
    </li>
  )
}
