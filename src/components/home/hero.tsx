"use client"

import * as React from "react"
import Image from "next/image"

import { HERO_SLIDES, PHOTOS, photoUrl } from "@/lib/destinations"
import { cn } from "@/lib/utils"

import { TripPlanner } from "./trip-planner"

const SLIDE_MS = 8000
/** Slide có video được giữ lâu hơn, gần hết một vòng video (~16 giây). */
const VIDEO_SLIDE_MS = 15000

export function Hero() {
  const [active, setActive] = React.useState(0)
  const [hovered, setHovered] = React.useState(false)
  const [usingForm, setUsingForm] = React.useState(false)
  const paused = hovered || usingForm

  // setTimeout theo từng slide (không dùng setInterval) để bấm chọn slide thì đếm lại từ đầu.
  React.useEffect(() => {
    if (paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setTimeout(
      () => setActive((i) => (i + 1) % HERO_SLIDES.length),
      HERO_SLIDES[active].video ? VIDEO_SLIDE_MS : SLIDE_MS
    )
    return () => window.clearTimeout(timer)
  }, [paused, active])

  const slide = HERO_SLIDES[active]

  return (
    <section className="relative" aria-label="Điểm đến nổi bật">
      <div
        className="relative h-[560px] overflow-hidden bg-sea-deep sm:h-[620px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.photo}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
              i === active ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Ken Burns: ảnh zoom và trôi chậm; key đổi theo active để chạy lại từ đầu. */}
            <div
              key={i === active ? `on-${active}` : "off"}
              className={cn(
                "absolute inset-0",
                i === active && "animate-kenburns motion-reduce:animate-none"
              )}
            >
              <Image
                src={photoUrl(PHOTOS[s.photo], 1920)}
                alt={PHOTOS[s.photo].alt}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
            {s.video && <SlideVideo src={s.video.src} playing={i === active} />}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-sea-deep/75 via-sea-deep/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sea-deep/50 to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-4 pb-28 sm:px-6">
          <div
            key={active}
            className="grid max-w-xl animate-in gap-3 duration-700 fade-in slide-in-from-left-4"
          >
            <p className="font-script text-3xl text-sun drop-shadow">
              Khám phá Việt Nam
            </p>
            <span className="w-fit rounded bg-brand px-3 py-1 text-sm font-semibold text-white">
              {slide.label}
            </span>
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.25rem)] leading-[1.05] font-extrabold text-white drop-shadow-[0_2px_12px_rgb(0_0_0/0.35)]">
              {slide.title}
            </h1>
            <p className="max-w-md text-lg text-white/90">{slide.subtitle}</p>
          </div>

          <div className="mt-8 flex gap-2" role="tablist" aria-label="Chọn ảnh">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.photo}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={s.title}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-white",
                  i === active
                    ? "w-10 bg-white"
                    : "w-5 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Đang điền form thì dừng chuyển ảnh, để ô "Điểm đến" không tự đổi theo slide. */}
      <div
        className="relative z-10 mx-auto -mt-28 max-w-6xl px-4 sm:px-6"
        onFocusCapture={() => setUsingForm(true)}
      >
        <TripPlanner defaultDestination={slide.title} />
      </div>
    </section>
  )
}

/**
 * Video nền phủ lên ảnh của slide. Ảnh bên dưới vẫn hiện trong lúc video tải, và là thứ
 * duy nhất hiện khi người dùng chọn giảm chuyển động.
 */
function SlideVideo({ src, playing }: { src: string; playing: boolean }) {
  const ref = React.useRef<HTMLVideoElement>(null)
  const [ready, setReady] = React.useState(false)
  const [reduceMotion, setReduceMotion] = React.useState(true)

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduceMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  // Chỉ chạy khi slide đang hiện; quay lại slide thì phát từ đầu.
  React.useEffect(() => {
    const video = ref.current
    if (!video) return
    if (!playing) {
      video.pause()
      return
    }

    const play = () =>
      video.play().catch(() => {
        // Trình duyệt chặn tự phát: giữ ảnh tĩnh bên dưới.
      })
    // Trình duyệt tự dừng video khi tab bị ẩn và không tự phát lại; quay về tab thì phát tiếp.
    const onVisible = () => {
      if (!document.hidden) void play()
    }

    video.currentTime = 0
    void play()
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [playing, reduceMotion])

  if (reduceMotion) return null

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      onPlaying={() => setReady(true)}
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-700",
        ready ? "opacity-100" : "opacity-0"
      )}
    />
  )
}
