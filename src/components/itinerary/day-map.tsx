"use client"

/**
 * Bản đồ một hoặc nhiều ngày: chỗ ở, các điểm tham quan đánh số theo thứ tự, bữa ăn, tuyến đi
 * (mỗi ngày một màu), số phút từng chặng và thước tỉ lệ.
 * Chỉ chạy được trên trình duyệt, nên file này luôn được nạp qua next/dynamic với
 * `ssr: false` (xem plan-map.tsx).
 *
 * Mặc định dùng MapLibre (bản đồ vector, cần WebGL2). Trình duyệt không có WebGL2 (tắt tăng tốc
 * phần cứng, máy cũ) thì chuyển sang Leaflet với nền OpenStreetMap, để lộ trình vẫn xem được.
 */

import * as React from "react"
import * as maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import type {
  AltMode,
  ItineraryDay,
  ItineraryItem,
  ItineraryResult,
} from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { ALT_MODES, altModeOf } from "./plan-shared"

// Worker chép vào public/ lúc cài gói (scripts/copy-map-worker.mjs).
maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs")

// Có key Vietmap thì dùng bản đồ Vietmap: dữ liệu làm riêng cho Việt Nam (địa danh, đường hẻm,
// Hoàng Sa, Trường Sa). Không có thì dùng OpenFreeMap (miễn phí, không cần key; Liberty nhiều
// màu, nền tối Fiord). Cả hai đều có sẵn dòng ghi nguồn trong style.
const VIETMAP_KEY = process.env.NEXT_PUBLIC_VIETMAP_KEY
const STYLES = VIETMAP_KEY
  ? {
      light: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_KEY}`,
      dark: `https://maps.vietmap.vn/maps/styles/dm/style.json?apikey=${VIETMAP_KEY}`,
    }
  : {
      light: "https://tiles.openfreemap.org/styles/liberty",
      dark: "https://tiles.openfreemap.org/styles/fiord",
    }
// Nền dự phòng khi không có WebGL2. Lưu lượng lớn trên production thì nên chuyển sang nhà
// cung cấp tile có key, theo chính sách sử dụng của OSM.
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
/** Chưa có điểm nào: nhìn cả Việt Nam. */
const VIETNAM = { lat: 16, lng: 107.5 }

type Kind = "poi" | "meal" | "hotel"
type Stop = {
  lat: number
  lng: number
  label: string
  kind: Kind
  /** Tên hiện cạnh ghim. */
  name: string
  tip: string
  /** Biến màu CSS của ngày (ghim điểm tham quan, tuyến). */
  color: string
  /** Điểm tham quan / quán ăn: bấm ghim để mở chi tiết. */
  item?: ItineraryItem
}
/** Một chặng: nhãn phương tiện + số phút đặt ở giữa đoạn. */
type Leg = { from: Stop; to: Stop; min: number; mode: AltMode | null }
type Route = { color: string; points: Stop[]; legs: Leg[] }
type Stops = { markers: Stop[]; routes: Route[] }

/** Ngày cần vẽ, kèm biến màu CSS riêng của ngày (VD "--trip-sky"). */
export type MapDay = { day: ItineraryDay; color: string }

function css(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2")
  } catch {
    return false
  }
}

/**
 * Các điểm cần ghim, và tuyến từng ngày: chỗ ở → các điểm theo thứ tự → về chỗ ở.
 * Chỗ ở chung cho mọi ngày nên chỉ ghim một lần.
 */
function stopsOf(days: MapDay[], stay: ItineraryResult["stay"]): Stops {
  const home =
    stay?.lat && stay.lng
      ? {
          lat: stay.lat,
          lng: stay.lng,
          label: "",
          kind: "hotel" as const,
          name: stay.name,
          tip: `Chỗ ở · ${stay.name}`,
        }
      : null
  const markers: Stop[] = home ? [{ ...home, color: "--sea-deep" }] : []
  const routes: Route[] = []
  for (const { day, color } of days) {
    const points: Stop[] = []
    const legs: Leg[] = []
    const homeStop = home ? { ...home, color } : null
    if (homeStop) points.push(homeStop)
    let n = 0
    for (const item of day.items) {
      let stop: Stop | null = null
      if (item.type === "visit" || item.type === "meal") {
        if (item.lat === null || item.lng === null) continue
        const isPoi = item.type === "visit"
        if (isPoi) n += 1
        stop = {
          lat: item.lat,
          lng: item.lng,
          label: isPoi ? String(n) : "",
          kind: isPoi ? "poi" : "meal",
          name: item.name,
          tip: `${item.start} · ${item.name}`,
          color,
          item,
        }
        markers.push(stop)
      } else if (item.type === "back" && homeStop && points.length > 1) {
        stop = homeStop
      }
      if (!stop) continue
      const prev = points.at(-1)
      if (prev && item.travel_min > 0)
        legs.push({
          from: prev,
          to: stop,
          min: item.travel_min,
          mode: altModeOf(item.travel_mode),
        })
      points.push(stop)
    }
    // Không có mục "back": vẫn khép tuyến về chỗ ở.
    if (homeStop && points.length > 1 && points.at(-1) !== homeStop)
      points.push(homeStop)
    routes.push({ color, points, legs })
  }
  return { markers, routes }
}

/** Nhãn ở giữa chặng, VD "🛵 11 phút"; chưa biết phương tiện thì chỉ số phút. */
function legElement(leg: Leg): HTMLElement {
  const el = document.createElement("div")
  Object.assign(el.style, {
    padding: "1px 6px",
    borderRadius: "999px",
    background: "rgba(255,255,255,.95)",
    color: "#161a33",
    border: `1.5px solid ${css(leg.from.color) || css("--trip-fill")}`,
    font: "600 11px/1.4 var(--font-numeric), sans-serif",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  })
  el.textContent = `${leg.mode ? `${ALT_MODES[leg.mode].emoji} ` : ""}${leg.min} phút`
  return el
}

function centered(el: HTMLElement): HTMLElement {
  Object.assign(el.style, {
    position: "absolute",
    transform: "translate(-50%, -50%)",
  })
  return el
}

function midpoint(leg: Leg): { lat: number; lng: number } {
  return {
    lat: (leg.from.lat + leg.to.lat) / 2,
    lng: (leg.from.lng + leg.to.lng) / 2,
  }
}

// Icon giường (chỗ ở) và dao nĩa (quán ăn), cùng hình với bộ lucide của web.
const ICONS: Record<Exclude<Kind, "poi">, string> = {
  hotel:
    '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  meal: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
}

/**
 * Ghim: điểm tham quan là vòng tròn đánh số, chỗ ở là ô vuông có giường, quán ăn có dao nĩa.
 * Cạnh ghim có nhãn tên để nhìn bản đồ là biết chỗ nào. Phần tử ngoài cùng chỉ to bằng vòng
 * tròn, nên tâm ghim vẫn đúng toạ độ; nhãn tràn ra bên phải.
 */
function pinElement(stop: Stop): HTMLElement {
  const size = stop.kind === "hotel" ? 30 : 26
  const el = document.createElement("div")
  // Không đặt `position`: MapLibre / Leaflet tự đặt absolute cho ghim; nhãn bám theo ghim đó.
  Object.assign(el.style, {
    width: `${size}px`,
    height: `${size}px`,
  })
  el.title = stop.tip
  if (stop.item) {
    // Bấm ghim -> báo lên khung bản đồ (`DayMap` nghe sự kiện này) để mở chi tiết địa điểm.
    const item = stop.item
    el.style.cursor = "pointer"
    el.setAttribute("role", "button")
    el.setAttribute("aria-label", `Xem chi tiết ${stop.name}`)
    el.addEventListener("click", (e) => {
      e.stopPropagation()
      el.dispatchEvent(
        new CustomEvent<ItineraryItem>(PICK_EVENT, {
          detail: item,
          bubbles: true,
        })
      )
    })
  }

  const dot = document.createElement("div")
  Object.assign(dot.style, {
    position: "absolute",
    inset: "0",
    borderRadius: stop.kind === "hotel" ? "9px" : "50%",
    background:
      stop.kind === "poi"
        ? css(stop.color) || css("--trip-fill")
        : stop.kind === "meal"
          ? css("--trip-food")
          : css("--sea-deep"),
    color: "#ffffff",
    border: "2px solid #ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,.3)",
    display: "grid",
    placeItems: "center",
    font: "600 13px/1 var(--font-numeric), sans-serif",
  })
  if (stop.kind === "poi") dot.textContent = stop.label
  else
    dot.innerHTML = `<svg width="${stop.kind === "hotel" ? 16 : 14}" height="${stop.kind === "hotel" ? 16 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[stop.kind]}</svg>`

  const tag = document.createElement("div")
  Object.assign(tag.style, {
    position: "absolute",
    left: `${size + 4}px`,
    top: "50%",
    transform: "translateY(-50%)",
    maxWidth: "190px",
    padding: "2px 7px",
    borderRadius: "6px",
    background: "rgba(255,255,255,.94)",
    color: "#161a33",
    boxShadow: "0 1px 3px rgba(0,0,0,.25)",
    font: "600 12px/1.35 var(--font-body), sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    pointerEvents: "none",
  })
  tag.textContent = stop.name

  el.append(dot, tag)
  return el
}

function drawMapLibre(container: HTMLElement, { markers, routes }: Stops) {
  const dark = document.documentElement.classList.contains("dark")
  const map = new maplibregl.Map({
    container,
    style: dark ? STYLES.dark : STYLES.light,
    center: VIETNAM,
    zoom: 4.5,
    // Cuộn trang không bị bản đồ "nuốt": phóng to bằng nút hoặc chụm 2 ngón.
    scrollZoom: false,
    attributionControl: { compact: true },
  })
  map.addControl(
    new maplibregl.NavigationControl({ showCompass: false }),
    "top-left"
  )
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left")
  for (const r of routes)
    for (const leg of r.legs)
      new maplibregl.Marker({ element: legElement(leg) })
        .setLngLat(midpoint(leg))
        .addTo(map)
  for (const s of markers)
    new maplibregl.Marker({ element: pinElement(s) })
      .setLngLat([s.lng, s.lat])
      .addTo(map)

  const all = markers.map((s): [number, number] => [s.lng, s.lat])
  if (all.length > 1) {
    const bounds = all.reduce(
      (b, p) => b.extend(p),
      new maplibregl.LngLatBounds(all[0], all[0])
    )
    map.fitBounds(bounds, {
      // Lề phải rộng hơn: nhãn tên nằm bên phải ghim.
      padding: { top: 40, bottom: 40, left: 40, right: 190 },
      maxZoom: 15,
      duration: 0,
    })
  } else if (all.length === 1) {
    map.jumpTo({ center: all[0], zoom: 14 })
  }
  map.on("load", () => {
    routes.forEach((r, i) => {
      const line = r.points.map((s): [number, number] => [s.lng, s.lat])
      if (line.length < 2) return
      const id = `route-${i}`
      map.addSource(id, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: line },
        },
      })
      // Viền trắng bên dưới cho đường nổi trên nền; nét đứt vì đây là thứ tự đi, không phải
      // đường xe chạy thật.
      map.addLayer({
        id: `${id}-casing`,
        type: "line",
        source: id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 6,
          "line-opacity": 0.9,
        },
      })
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": css(r.color) || css("--trip-fill"),
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      })
    })
  })
  return { resize: () => map.resize(), remove: () => map.remove() }
}

function drawLeaflet(container: HTMLElement, { markers, routes }: Stops) {
  const map = L.map(container, { scrollWheelZoom: false })
  L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(
    map
  )
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map)
  for (const r of routes) {
    const line = r.points.map((s): L.LatLngTuple => [s.lat, s.lng])
    if (line.length < 2) continue
    L.polyline(line, { color: "#ffffff", weight: 6, opacity: 0.9 }).addTo(map)
    L.polyline(line, {
      color: css(r.color) || css("--trip-fill"),
      weight: 3,
      dashArray: "6 7",
      lineCap: "round",
    }).addTo(map)
    for (const leg of r.legs) {
      const m = midpoint(leg)
      L.marker([m.lat, m.lng], {
        interactive: false,
        icon: L.divIcon({
          className: "",
          // Ô 0×0 ở đúng điểm giữa, nhãn tự căn giữa quanh điểm đó.
          iconSize: [0, 0],
          html: centered(legElement(leg)),
        }),
      }).addTo(map)
    }
  }
  for (const s of markers)
    L.marker([s.lat, s.lng], {
      icon: L.divIcon({
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: pinElement(s),
      }),
    }).addTo(map)

  const all = markers.map((s): L.LatLngTuple => [s.lat, s.lng])
  if (all.length > 1) {
    map.fitBounds(L.latLngBounds(all), {
      paddingTopLeft: [32, 32],
      paddingBottomRight: [180, 32],
    })
  } else if (all.length === 1) {
    map.setView(all[0], 14)
  } else {
    map.setView([VIETNAM.lat, VIETNAM.lng], 5)
  }
  return { resize: () => map.invalidateSize(), remove: () => map.remove() }
}

const PICK_EVENT = "trip-place-pick"

export default function DayMap({
  days,
  stay,
  className,
  label,
  onSelect,
}: {
  days: MapDay[]
  stay: ItineraryResult["stay"]
  /** Chiều cao (và vị trí) do nơi dùng quyết định. */
  className?: string
  label: string
  /** Bấm ghim điểm tham quan / quán ăn. */
  onSelect?: (item: ItineraryItem) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  // Giữ hàm mới nhất mà không vẽ lại bản đồ khi nơi dùng render lại.
  const select = React.useRef(onSelect)
  React.useEffect(() => {
    select.current = onSelect
  }, [onSelect])
  React.useEffect(() => {
    const container = ref.current
    if (!container) return
    const pick = (e: Event) =>
      select.current?.((e as CustomEvent<ItineraryItem>).detail)
    container.addEventListener(PICK_EVENT, pick)
    return () => container.removeEventListener(PICK_EVENT, pick)
  }, [])

  React.useEffect(() => {
    const container = ref.current
    if (!container) return
    const stops = stopsOf(days, stay)
    let handle: { resize: () => void; remove: () => void } | null = null
    if (hasWebGL2()) {
      try {
        handle = drawMapLibre(container, stops)
      } catch {
        // Có WebGL2 nhưng không khởi tạo được (driver lỗi…): dùng nền dự phòng.
        container.replaceChildren()
        container.classList.remove("maplibregl-map")
      }
    }
    const map = handle ?? drawLeaflet(container, stops)
    // Khung đổi cỡ (phóng to toàn màn hình…): vẽ lại cho khít.
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      map.remove()
    }
  }, [days, stay])

  return (
    <div
      ref={ref}
      className={cn(
        "z-0 w-full overflow-hidden rounded-xl border border-trip-line",
        className
      )}
      role="img"
      aria-label={label}
    />
  )
}
