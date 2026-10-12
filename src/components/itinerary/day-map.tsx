"use client"

/**
 * Bản đồ một ngày: chỗ ở, các điểm tham quan đánh số theo thứ tự, bữa ăn, và tuyến đi.
 * Leaflet chỉ chạy được trên trình duyệt, nên file này luôn được nạp qua next/dynamic
 * với `ssr: false` (xem itinerary-view.tsx).
 */

import * as React from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import type { ItineraryDay, ItineraryResult } from "@/lib/itinerary"

// Nền OpenStreetMap (miễn phí, phải ghi nguồn). Màu được làm dịu bằng CSS (`.trip-tiles` trong
// globals.css) cho hợp nền giấy của trang. Lưu lượng lớn khi lên production thì nên chuyển sang
// nhà cung cấp tile có key (MapTiler, Stadia...) theo chính sách sử dụng của OSM.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function css(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function pin(label: string, kind: "poi" | "meal" | "hotel"): L.DivIcon {
  const bg =
    kind === "poi"
      ? css("--trip-ink")
      : kind === "meal"
        ? css("--trip-food")
        : css("--trip-sheet")
  const fg = kind === "hotel" ? css("--trip-ink") : css("--trip-on-ink")
  const radius = kind === "hotel" ? "7px" : "50%"
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="width:26px;height:26px;border-radius:${radius};background:${bg};color:${fg};border:2px solid ${css("--trip-sheet")};box-shadow:0 1px 4px rgba(0,0,0,.35);display:grid;place-items:center;font:600 13px/1 var(--font-numeric),sans-serif">${label}</div>`,
  })
}

export default function DayMap({
  day,
  stay,
}: {
  day: ItineraryDay
  stay: ItineraryResult["stay"]
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!ref.current) return
    const map = L.map(ref.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    L.tileLayer(TILES, {
      attribution: ATTRIBUTION,
      maxZoom: 19,
      className: "trip-tiles",
    }).addTo(map)

    const route: L.LatLngExpression[] = []
    if (stay?.lat && stay.lng) {
      route.push([stay.lat, stay.lng])
      L.marker([stay.lat, stay.lng], { icon: pin("⌂", "hotel") })
        .bindTooltip(stay.name)
        .addTo(map)
    }
    let n = 0
    for (const item of day.items) {
      if (item.type !== "visit" && item.type !== "meal") continue
      if (item.lat === null || item.lng === null) continue
      const isPoi = item.type === "visit"
      if (isPoi) n += 1
      route.push([item.lat, item.lng])
      L.marker([item.lat, item.lng], {
        icon: pin(isPoi ? String(n) : "•", isPoi ? "poi" : "meal"),
      })
        .bindTooltip(`${item.start} · ${item.name}`)
        .addTo(map)
    }
    if (stay?.lat && stay.lng && route.length > 1)
      route.push([stay.lat, stay.lng])

    if (route.length > 1) {
      L.polyline(route, {
        color: css("--trip-canbang"),
        weight: 3,
        opacity: 0.85,
      }).addTo(map)
      map.fitBounds(L.latLngBounds(route), { padding: [28, 28] })
    } else if (route.length === 1) {
      map.setView(route[0], 14)
    } else {
      map.setView([16, 107.5], 5)
    }
    return () => {
      map.remove()
    }
  }, [day, stay])

  return (
    <div
      ref={ref}
      className="z-0 h-64 w-full overflow-hidden rounded-xl border border-trip-line sm:h-72"
      role="img"
      aria-label={`Bản đồ ngày ${day.day}`}
    />
  )
}
