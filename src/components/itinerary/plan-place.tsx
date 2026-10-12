"use client"

/**
 * Chi tiết một điểm trong lịch: bấm thẻ điểm/bữa ở tab "Lịch trình" thì mở. Máy tính là hộp
 * giữa màn hình, điện thoại là tấm kéo từ dưới lên. Trên cùng là ảnh, dưới là tab Tổng quan /
 * Đánh giá / Ảnh. Phần của lộ trình (giờ, lý do chọn, giá) hiện ngay; chi tiết địa điểm (ảnh,
 * giờ mở cửa, đánh giá) tải từ `GET /places/{id}`.
 */

import * as React from "react"
import { Dialog, Tabs } from "radix-ui"
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Hourglass,
  Images,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RotateCw,
  Star,
  Utensils,
  Wallet,
  X,
} from "lucide-react"

import { places, type PlaceDetail, type PlaceReview } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { money, type ItineraryItem } from "@/lib/itinerary"
import { cn } from "@/lib/utils"

import { moneyRange, rangeOf } from "./plan-shared"

// ---------------------------------------------------------------- tải dữ liệu
// Cache theo lời hứa, dùng chung cả module: hai effect (StrictMode) hay hai chỗ cùng hỏi một
// điểm thì chỉ một request. Lỗi thì xoá để "Thử lại" gọi lại được.
const pending = new Map<string, Promise<PlaceDetail>>()
const done = new Map<string, PlaceDetail>()

function loadPlace(
  key: string,
  run: () => Promise<PlaceDetail>
): Promise<PlaceDetail> {
  let p = pending.get(key)
  if (!p) {
    p = run()
    pending.set(key, p)
    p.then(
      (data) => done.set(key, data),
      () => pending.delete(key)
    )
  }
  return p
}

type Load = { key: string; data?: PlaceDetail; error?: true }

function usePlace(
  id: string | null,
  destination: string | null | undefined,
  reviewPhotos: boolean,
  enabled = true
) {
  const { authorized } = useAuth()
  const [attempt, setAttempt] = React.useState(0)
  const [load, setLoad] = React.useState<Load | null>(null)
  const base = id ? `${id}|${destination ?? ""}|${reviewPhotos ? 1 : 0}` : null
  const key = `${base}#${attempt}`

  React.useEffect(() => {
    if (!id || !base || !enabled || done.has(base)) return
    // Đóng / đổi điểm thì bỏ kết quả cũ; request vẫn chạy để lần sau có sẵn.
    let live = true
    loadPlace(base, () =>
      authorized((t) => places.get(t, id, destination, { reviewPhotos }))
    ).then(
      (data) => live && setLoad({ key, data }),
      () => live && setLoad({ key, error: true })
    )
    return () => {
      live = false
    }
  }, [authorized, id, destination, reviewPhotos, enabled, base, key])

  const current = load?.key === key ? load : null
  const data = (base && done.get(base)) || current?.data || null
  return {
    data,
    loading: enabled && !!id && !data && !current,
    failed: enabled && !!id && !data && !!current?.error,
    retry: () => setAttempt((a) => a + 1),
  }
}

// ---------------------------------------------------------------- hộp chi tiết
type Shot = { images: string[]; index: number }

export function PlaceSheet({
  item,
  destination,
  onClose,
}: {
  item: ItineraryItem | null
  destination?: string | null
  onClose: () => void
}) {
  // Giữ điểm vừa xem trong lúc hộp đóng, để nội dung không biến mất giữa chừng.
  const [shown, setShown] = React.useState(item)
  if (item && item !== shown) setShown(item)
  const [lightbox, setLightbox] = React.useState<Shot | null>(null)

  return (
    <Dialog.Root open={!!item} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            // Điện thoại: tấm gần kín màn hình, trượt từ dưới lên.
            "fixed inset-x-0 bottom-0 z-50 flex h-[94dvh] flex-col overflow-hidden rounded-t-[22px] bg-trip-sheet text-trip-ink shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:slide-in-from-bottom",
            // Máy tính: hộp giữa màn hình, phóng nhẹ + hiện dần.
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-3rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-trip-line sm:data-[state=closed]:duration-150 sm:data-[state=closed]:zoom-out-95 sm:data-[state=closed]:[--tw-exit-translate-y:8px] sm:data-[state=closed]:fade-out sm:data-[state=open]:duration-200 sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:[--tw-enter-translate-y:12px] sm:data-[state=open]:fade-in"
          )}
        >
          {shown && (
            <PlaceBody
              key={`${shown.place_id}-${shown.start}`}
              item={shown}
              destination={destination}
              onImage={(images, index) => setLightbox({ images, index })}
            />
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/80 shadow sm:hidden"
          />
          <Dialog.Close
            aria-label="Đóng"
            className="absolute top-3 right-3 z-20 grid size-9 place-items-center rounded-full bg-black/45 text-white outline-none hover:bg-black/65 focus-visible:ring-[3px] focus-visible:ring-white/60"
          >
            <X className="size-4.5" />
          </Dialog.Close>
          {/* Nằm trong Content để bấm vào ảnh không bị coi là bấm ra ngoài hộp. */}
          <Lightbox value={lightbox} onChange={setLightbox} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PlaceBody({
  item,
  destination,
  onImage,
}: {
  item: ItineraryItem
  destination?: string | null
  onImage: (images: string[], index: number) => void
}) {
  const id = item.place_id
  const place = usePlace(id, destination, false)
  // Ảnh trong đánh giá chỉ tải khi người dùng bấm (gọi thêm Google).
  const [wantPhotos, setWantPhotos] = React.useState(false)
  const withPhotos = usePlace(id, destination, true, wantPhotos)
  const [broken, setBroken] = React.useState<Set<string>>(new Set())
  const onBroken = (src: string) =>
    setBroken((b) => (b.has(src) ? b : new Set(b).add(src)))

  const detail = place.data ?? withPhotos.data
  const meal = item.type === "meal"
  const name = detail?.name || item.name
  const lat = detail?.lat ?? item.lat
  const lng = detail?.lng ?? item.lng
  const mapsUrl =
    detail?.maps_url ||
    (lat != null && lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.name, destination].filter(Boolean).join(", "))}`)
  const fetched = strings(detail?.images)
  const gallery = (
    fetched.length ? fetched : item.image ? [item.image] : []
  ).filter((s) => !broken.has(s))
  const reviews = usableReviews(withPhotos.data?.reviews ?? detail?.reviews)
  const reviewImages = reviews
    .flatMap((r) => strings(r.images))
    .filter((s) => !broken.has(s))

  return (
    <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain">
      <Hero
        images={gallery}
        loading={place.loading}
        meal={meal}
        onOpen={(i) => onImage(gallery, i)}
        onBroken={onBroken}
      />
      <TitleBlock item={item} detail={detail} name={name} />

      <Tabs.Root defaultValue="overview">
        <Tabs.List
          aria-label="Thông tin địa điểm"
          className="sticky top-0 z-10 flex gap-6 border-b border-trip-line bg-trip-sheet px-5 sm:px-7"
        >
          <TabTrigger value="overview">Tổng quan</TabTrigger>
          <TabTrigger value="reviews" count={reviews.length}>
            Đánh giá
          </TabTrigger>
          <TabTrigger value="photos" count={gallery.length}>
            Ảnh
          </TabTrigger>
        </Tabs.List>

        <Tabs.Content
          value="overview"
          className="px-5 py-5 outline-none sm:px-7 sm:pb-7"
        >
          <Overview
            item={item}
            detail={detail}
            loading={place.loading}
            failed={place.failed}
            onRetry={place.retry}
            mapsUrl={mapsUrl}
          />
        </Tabs.Content>

        <Tabs.Content
          value="reviews"
          className="px-5 py-5 outline-none sm:px-7 sm:pb-7"
        >
          <Reviews
            detail={detail}
            reviews={reviews}
            loading={place.loading}
            failed={place.failed}
            onRetry={place.retry}
            photos={{
              wanted: wantPhotos,
              loaded: !!withPhotos.data,
              loading: withPhotos.loading,
              failed: withPhotos.failed,
              found: reviewImages.length > 0,
              request: () =>
                wantPhotos ? withPhotos.retry() : setWantPhotos(true),
            }}
            onImage={onImage}
          />
        </Tabs.Content>

        <Tabs.Content
          value="photos"
          className="grid gap-5 px-5 py-5 outline-none sm:px-7 sm:pb-7"
        >
          {place.loading && !gallery.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] animate-pulse rounded-xl bg-trip-sheet-2"
                />
              ))}
            </div>
          ) : gallery.length ? (
            <PhotoGrid
              images={gallery}
              onOpen={(i) => onImage(gallery, i)}
              onBroken={onBroken}
            />
          ) : (
            <Empty>Chưa có ảnh cho điểm này.</Empty>
          )}
          {reviewImages.length > 0 && (
            <section className="grid gap-2.5">
              <SectionTitle>Ảnh từ đánh giá</SectionTitle>
              <PhotoGrid
                images={reviewImages}
                onOpen={(i) => onImage(reviewImages, i)}
                onBroken={onBroken}
              />
            </section>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

function TabTrigger({
  value,
  count,
  children,
}: {
  value: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent py-3 text-[14px] font-semibold text-trip-ink-3 outline-none hover:text-trip-ink-2 focus-visible:text-trip-ink data-[state=active]:border-trip-ink data-[state=active]:text-trip-ink"
    >
      {children}
      {!!count && (
        <span className="rounded-full bg-trip-sheet-2 px-1.5 font-num text-[11.5px] text-trip-ink-3">
          {count}
        </span>
      )}
    </Tabs.Trigger>
  )
}

// ---------------------------------------------------------------- ảnh đầu hộp

/**
 * Máy tính: ảnh lớn 2/3 bên trái + tối đa 4 ảnh nhỏ 2×2 bên phải. Điện thoại: cuộn ngang.
 * Chỉ một ảnh thì làm ảnh bìa; không có ảnh thì ô biểu tượng.
 */
function Hero({
  images,
  loading,
  meal,
  onOpen,
  onBroken,
}: {
  images: string[]
  loading: boolean
  meal: boolean
  onOpen: (i: number) => void
  onBroken: (src: string) => void
}) {
  const Icon = meal ? Utensils : MapPin
  // Phủ tối nhẹ phía trên để nút đóng luôn rõ.
  const shade = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/35 to-transparent"
    />
  )

  if (!images.length) {
    if (loading)
      return <div className="h-72 animate-pulse bg-trip-sheet-2 sm:h-[400px]" />
    return (
      <div className="relative grid h-44 place-items-center bg-linear-to-br from-trip-sheet-2 to-trip-paper sm:h-52">
        {shade}
        <span className="grid size-16 place-items-center rounded-full bg-trip-sheet shadow-sm">
          <Icon
            className={cn(
              "size-7",
              meal ? "text-trip-food" : "text-trip-ink-3"
            )}
          />
        </span>
      </div>
    )
  }

  const smalls = images.slice(1, 5)
  // Đang tải mà đã có ảnh của lộ trình: dựng sẵn khung ghép để không giật khi ảnh về.
  const mosaic = images.length > 1 || loading
  const all =
    images.length > 1 ? (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-[#161a33] shadow-md outline-none hover:bg-white focus-visible:ring-[3px] focus-visible:ring-white/60"
      >
        <Images className="size-4" />
        Xem tất cả ảnh
        <span className="font-num text-[#5b6178]">({images.length})</span>
      </button>
    ) : null

  return (
    <div className="relative">
      {/* Điện thoại */}
      {images.length > 1 ? (
        <div className="flex h-72 snap-x snap-mandatory [scrollbar-width:none] gap-1.5 overflow-x-auto sm:hidden">
          {images.map((src, i) => (
            <Tile
              key={`${src}-${i}`}
              src={src}
              label={`Xem ảnh ${i + 1}`}
              onClick={() => onOpen(i)}
              onBroken={onBroken}
              className="w-[86%] shrink-0 snap-center first:snap-start last:snap-end"
            />
          ))}
        </div>
      ) : (
        <Cover src={images[0]} onOpen={onOpen} onBroken={onBroken} mobile />
      )}

      {/* Máy tính */}
      {mosaic ? (
        <div className="hidden h-[min(400px,46dvh)] grid-cols-[2fr_1fr] gap-1.5 sm:grid">
          <Tile
            src={images[0]}
            label="Xem ảnh 1"
            onClick={() => onOpen(0)}
            onBroken={onBroken}
          />
          <div
            className={cn(
              "grid gap-1.5",
              (smalls.length >= 3 || (loading && !smalls.length)) &&
                "grid-cols-2 grid-rows-2",
              smalls.length === 2 && "grid-rows-2"
            )}
          >
            {smalls.length
              ? smalls.map((src, j) => (
                  <Tile
                    key={`${src}-${j}`}
                    src={src}
                    label={`Xem ảnh ${j + 2}`}
                    onClick={() => onOpen(j + 1)}
                    onBroken={onBroken}
                    className={cn(
                      smalls.length === 3 && j === 0 && "col-span-2"
                    )}
                  />
                ))
              : [0, 1, 2, 3].map((j) => (
                  <div key={j} className="animate-pulse bg-trip-sheet-2" />
                ))}
          </div>
        </div>
      ) : (
        <Cover src={images[0]} onOpen={onOpen} onBroken={onBroken} />
      )}
      {shade}
      {all}
    </div>
  )
}

/** Ảnh bìa rộng hết hộp, chuyển màu nhẹ ở đáy. */
function Cover({
  src,
  onOpen,
  onBroken,
  mobile,
}: {
  src: string
  onOpen: (i: number) => void
  onBroken: (src: string) => void
  mobile?: boolean
}) {
  return (
    <div
      className={cn(
        "relative h-72 sm:h-80",
        mobile ? "sm:hidden" : "hidden sm:block"
      )}
    >
      <Tile
        src={src}
        label="Xem ảnh"
        onClick={() => onOpen(0)}
        onBroken={onBroken}
        className="size-full"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/30 to-transparent"
      />
    </div>
  )
}

function Tile({
  src,
  label,
  onClick,
  onBroken,
  className,
}: {
  src: string
  label: string
  onClick: () => void
  onBroken: (src: string) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group relative block overflow-hidden bg-trip-sheet-2 outline-none focus-visible:ring-[3px] focus-visible:ring-trip-sky/40 focus-visible:ring-inset",
        className
      )}
    >
      {/* Ảnh từ nhiều host (Google, SerpApi) nên dùng <img> thường. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => onBroken(src)}
        className="size-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-95"
      />
    </button>
  )
}

function PhotoGrid({
  images,
  onOpen,
  onBroken,
}: {
  images: string[]
  onOpen: (i: number) => void
  onBroken: (src: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((src, i) => (
        <Tile
          key={`${src}-${i}`}
          src={src}
          label={`Xem ảnh ${i + 1}`}
          onClick={() => onOpen(i)}
          onBroken={onBroken}
          className="aspect-[4/3] rounded-xl"
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- tên, sao, giờ, giá

function TitleBlock({
  item,
  detail,
  name,
}: {
  item: ItineraryItem
  detail: PlaceDetail | null
  name: string
}) {
  const category = detail?.category || item.category
  const rating = detail?.rating ?? item.rating
  const count = detail?.reviews_count ?? item.reviews
  const price = rangeOf(item.price_min, item.price_max, item.price)
  const level =
    typeof detail?.price === "number"
      ? money(detail.price)
      : typeof detail?.price === "string"
        ? detail.price
        : null
  const chip =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold"
  return (
    <div className="grid gap-2 px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
      <Dialog.Title className="text-[22px] leading-tight font-extrabold tracking-tight sm:text-[26px]">
        {name}
      </Dialog.Title>
      {(category || rating != null) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] text-trip-ink-2">
          {category && <span>{category}</span>}
          {category && rating != null && (
            <span aria-hidden className="text-trip-ink-3">
              ·
            </span>
          )}
          {rating != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 fill-current text-trip-warn-dot" />
              <b className="font-num font-semibold text-trip-ink">
                {rating.toFixed(1)}
              </b>
              {!!count && (
                <span className="font-num text-trip-ink-3">
                  ({count.toLocaleString("vi-VN")} đánh giá)
                </span>
              )}
            </span>
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className={cn(chip, "bg-trip-sky-bg text-trip-sky")}>
          <Clock className="size-3.5" />
          <span className="font-num">
            {item.start}
            {item.end !== item.start && `–${item.end}`}
          </span>
        </span>
        <span className={cn(chip, "bg-trip-sheet-2 text-trip-ink-2")}>
          <Wallet className="size-3.5" />
          {price == null
            ? "chưa có giá"
            : price[1] === 0
              ? "miễn phí"
              : `${price[0] !== price[1] ? "~" : ""}${moneyRange(...price)} cả đoàn`}
        </span>
        {level && (
          <span className={cn(chip, "bg-trip-sheet-2 text-trip-ink-2")}>
            Mức giá {level}
          </span>
        )}
        {item.wait_min > 0 && (
          <span className={cn(chip, "bg-trip-warn-bg text-trip-warn")}>
            <Hourglass className="size-3.5" />
            chờ mở cửa {item.wait_min} phút
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- tab Tổng quan

function Overview({
  item,
  detail,
  loading,
  failed,
  onRetry,
  mapsUrl,
}: {
  item: ItineraryItem
  detail: PlaceDetail | null
  loading: boolean
  failed: boolean
  onRetry: () => void
  mapsUrl: string
}) {
  const hours = hoursRows(detail?.hours)
  const chips = attributeChips(detail?.attributes)
  const why = item.why ?? []
  const description =
    detail?.description && detail.description !== item.summary
      ? detail.description
      : null
  const notes = [
    item.wait_min > 0 &&
      `Đến sớm hơn giờ mở cửa, phải chờ khoảng ${item.wait_min} phút.`,
    item.rating_floor != null &&
      `Điểm tin được ${item.rating_floor.toFixed(1)}★ (đã trừ hao khi ít đánh giá).`,
    item.stay_by === "ước theo loại" &&
      "Thời gian ở ước theo loại địa điểm, chưa có số liệu riêng.",
  ].filter((x): x is string => !!x)

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 content-start gap-6">
        {failed && <Failed onRetry={onRetry} />}

        {(why.length > 0 || item.matches_purpose || item.summary) && (
          <section className="grid gap-2.5">
            <SectionTitle>Vì sao chọn</SectionTitle>
            {(why.length > 0 || item.matches_purpose) && (
              <ul className="flex flex-wrap gap-1.5">
                {/* Lý do từ LLM đã nói "Hợp mục đích" (kèm từ khoá) thì không lặp chip chung. */}
                {item.matches_purpose &&
                  !why.some((w) => w.startsWith("Hợp mục đích")) && (
                    <WhyChip>Hợp mục đích chuyến đi</WhyChip>
                  )}
                {why.map((w) => (
                  <WhyChip key={w}>{w}</WhyChip>
                ))}
              </ul>
            )}
            {item.summary && (
              <p className="text-[14.5px] leading-relaxed text-trip-ink-2">
                {item.summary}
              </p>
            )}
          </section>
        )}

        {loading && <Skeleton />}

        {description && (
          <section className="grid gap-2">
            <SectionTitle>Giới thiệu</SectionTitle>
            <p className="text-[14.5px] leading-relaxed text-trip-ink-2">
              {description}
            </p>
          </section>
        )}

        {chips.length > 0 && (
          <section className="grid gap-2.5">
            <SectionTitle>Tiện ích</SectionTitle>
            <ul className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-trip-line bg-trip-paper px-2.5 py-1 text-[12.5px] text-trip-ink-2"
                >
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        {notes.length > 0 && (
          <section className="grid gap-2">
            <SectionTitle>Lưu ý</SectionTitle>
            <ul className="grid gap-1.5">
              {notes.map((n, i) => (
                <li
                  key={n}
                  className="flex gap-2 text-[13.5px] leading-snug text-trip-ink-2"
                >
                  {item.wait_min > 0 && i === 0 ? (
                    <Hourglass className="mt-0.5 size-4 shrink-0 text-trip-warn" />
                  ) : (
                    <Info className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
                  )}
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <Contact
          address={detail?.address}
          phone={detail?.phone}
          website={detail?.website}
          mapsUrl={mapsUrl}
        />
        {hours.length > 0 && <Hours rows={hours} />}
      </aside>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[15px] font-bold tracking-tight">{children}</h3>
}

function WhyChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex max-w-full items-center gap-1 rounded-full bg-trip-jade-bg px-2.5 py-1 text-[12.5px] text-trip-jade">
      <Check className="size-3.5 shrink-0" />
      <span>{children}</span>
    </li>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-trip-line-2 px-4 py-6 text-center text-[13.5px] text-trip-ink-3">
      {children}
    </p>
  )
}

function Failed({ onRetry, label }: { onRetry: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-trip-line bg-trip-paper px-3 py-2.5 text-[13.5px] text-trip-ink-2">
      <span className="min-w-0 flex-1">
        {label ?? "Chưa tải được chi tiết."}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-[9px] border border-trip-line-2 bg-trip-sheet px-2.5 py-1 font-semibold hover:bg-trip-sheet-2"
      >
        <RotateCw className="size-3.5" />
        Thử lại
      </button>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid gap-2" aria-label="Đang tải chi tiết" role="status">
      {[80, 60, 90, 70].map((w, i) => (
        <div
          key={i}
          className="h-3.5 animate-pulse rounded bg-trip-sheet-2"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}

function Contact({
  address,
  phone,
  website,
  mapsUrl,
}: {
  address?: string | null
  phone?: string | null
  website?: string | null
  mapsUrl: string
}) {
  const row = "flex items-start gap-2.5 text-[13.5px]"
  return (
    <section className="grid gap-3 rounded-xl border border-trip-line bg-trip-paper p-4">
      {address && (
        <p className={row}>
          <MapPin className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
          <span className="min-w-0">{address}</span>
        </p>
      )}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-trip-fill px-4 text-[14px] font-semibold text-trip-on-fill outline-none hover:bg-trip-fill/90 focus-visible:ring-[3px] focus-visible:ring-trip-sky/30"
      >
        <Navigation className="size-4" />
        Mở Google Maps
        <ExternalLink className="size-3.5 opacity-70" />
      </a>
      {phone && (
        <a href={`tel:${phone.replace(/\s+/g, "")}`} className={row}>
          <Phone className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
          <span className="font-num">{phone}</span>
        </a>
      )}
      {website && (
        <a href={website} target="_blank" rel="noopener" className={row}>
          <Globe className="mt-0.5 size-4 shrink-0 text-trip-ink-3" />
          <span className="min-w-0 truncate text-trip-sky">
            {hostOf(website)}
          </span>
        </a>
      )}
    </section>
  )
}

function Hours({ rows }: { rows: [string, string][] }) {
  const today = TODAY[new Date().getDay()]
  return (
    <section className="grid gap-2 rounded-xl border border-trip-line bg-trip-paper p-4">
      <h3 className="flex items-center gap-1.5 text-[14px] font-bold">
        <Clock className="size-4 text-trip-ink-3" />
        Giờ mở cửa
      </h3>
      <table className="text-[13px]">
        <tbody>
          {rows.map(([day, time], i) => (
            <tr
              key={`${day}-${i}`}
              className={cn(
                "border-b border-trip-line last:border-0",
                day === today && "font-semibold text-trip-ink"
              )}
            >
              {day && (
                <th
                  className={cn(
                    "py-1.5 pr-3 text-left font-normal whitespace-nowrap",
                    day === today ? "font-semibold" : "text-trip-ink-3"
                  )}
                >
                  {day}
                </th>
              )}
              <td className="py-1.5 font-num" colSpan={day ? 1 : 2}>
                {time}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

// ---------------------------------------------------------------- tab Đánh giá

function Reviews({
  detail,
  reviews,
  loading,
  failed,
  onRetry,
  photos,
  onImage,
}: {
  detail: PlaceDetail | null
  reviews: PlaceReview[]
  loading: boolean
  failed: boolean
  onRetry: () => void
  photos: {
    wanted: boolean
    loaded: boolean
    loading: boolean
    failed: boolean
    found: boolean
    request: () => void
  }
  onImage: (images: string[], index: number) => void
}) {
  if (failed) return <Failed onRetry={onRetry} />
  if (loading) return <Skeleton />
  const rating = detail?.rating
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {rating != null ? (
          <p className="flex items-center gap-2.5">
            <span className="font-num text-[28px] leading-none font-extrabold">
              {rating.toFixed(1)}
            </span>
            <span className="grid gap-0.5">
              <Stars value={rating} />
              {!!detail?.reviews_count && (
                <span className="font-num text-[12.5px] text-trip-ink-3">
                  {detail.reviews_count.toLocaleString("vi-VN")} đánh giá trên
                  Google
                </span>
              )}
            </span>
          </p>
        ) : (
          <span />
        )}
        {!photos.loaded && reviews.length > 0 && (
          <button
            type="button"
            onClick={photos.request}
            disabled={photos.loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-trip-line-2 bg-trip-sheet px-3 py-1.5 text-[13px] font-semibold text-trip-ink-2 outline-none hover:bg-trip-sheet-2 focus-visible:ring-[3px] focus-visible:ring-trip-sky/30 disabled:opacity-70"
          >
            {photos.loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {photos.loading ? "Đang tải ảnh…" : "Xem ảnh review từ Google"}
          </button>
        )}
      </div>
      {photos.failed && (
        <Failed onRetry={photos.request} label="Chưa tải được ảnh review." />
      )}
      {photos.loaded && !photos.found && (
        <p className="text-[13px] text-trip-ink-3">
          Google chưa có ảnh trong các đánh giá này.
        </p>
      )}
      {reviews.length ? (
        <ul className="grid gap-2.5">
          {reviews.map((r, i) => (
            <Review key={i} review={r} onImage={onImage} />
          ))}
        </ul>
      ) : (
        <Empty>Chưa có đánh giá nào.</Empty>
      )}
    </div>
  )
}

function Review({
  review,
  onImage,
}: {
  review: PlaceReview
  onImage: (images: string[], index: number) => void
}) {
  const [open, setOpen] = React.useState(false)
  const text = review.text?.trim() ?? ""
  const long = text.length > 280
  const images = strings(review.images)
  return (
    <li className="grid gap-2 rounded-xl border border-trip-line bg-trip-paper p-3.5">
      <p className="flex items-center gap-2 text-[12.5px] text-trip-ink-3">
        {review.rating != null && <Stars value={review.rating} />}
        {review.date && <span>{review.date}</span>}
      </p>
      {text && (
        <p
          className={cn(
            "text-[14px] leading-relaxed whitespace-pre-line text-trip-ink-2",
            long && !open && "line-clamp-4"
          )}
        >
          {text}
        </p>
      )}
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="justify-self-start text-[12.5px] font-semibold text-trip-sky"
        >
          {open ? "thu gọn" : "xem thêm"}
        </button>
      )}
      {images.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {images.map((src, i) => (
            <Thumb
              key={`${src}-${i}`}
              src={src}
              label={`Xem ảnh đánh giá ${i + 1}`}
              onClick={() => onImage(images, i)}
            />
          ))}
        </div>
      )}
    </li>
  )
}

function Thumb({
  src,
  label,
  onClick,
}: {
  src: string
  label: string
  onClick: () => void
}) {
  const [broken, setBroken] = React.useState(false)
  if (broken) return null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="size-20 shrink-0 overflow-hidden rounded-lg bg-trip-sheet-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-full object-cover transition duration-300 hover:scale-105"
      />
    </button>
  )
}

function Stars({ value }: { value: number }) {
  const n = Math.round(Math.max(0, Math.min(5, value)))
  return (
    <span
      className="inline-flex text-trip-warn-dot"
      role="img"
      aria-label={`${value} trên 5 sao`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn("size-3.5", i < n ? "fill-current" : "opacity-40")}
        />
      ))}
    </span>
  )
}

/** Xem ảnh lớn: Dialog lồng trong hộp chi tiết, Esc chỉ đóng ảnh. */
function Lightbox({
  value,
  onChange,
}: {
  value: { images: string[]; index: number } | null
  onChange: (v: { images: string[]; index: number } | null) => void
}) {
  const count = value?.images.length ?? 0
  const go = (step: number) =>
    value && onChange({ ...value, index: (value.index + step + count) % count })
  const nav =
    "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
  return (
    <Dialog.Root open={!!value} onOpenChange={(o) => !o && onChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/85" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1)
            else if (e.key === "ArrowLeft") go(-1)
          }}
          className="fixed inset-0 z-[60] grid place-items-center p-4 outline-none"
        >
          <Dialog.Title className="sr-only">Xem ảnh</Dialog.Title>
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={value.images[value.index]}
              src={value.images[value.index]}
              alt=""
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          )}
          <Dialog.Close
            aria-label="Đóng ảnh"
            className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="size-5" />
          </Dialog.Close>
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={() => go(-1)}
                className={cn(nav, "left-3")}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Ảnh sau"
                onClick={() => go(1)}
                className={cn(nav, "right-3")}
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 font-num text-[12.5px] text-white">
                {(value?.index ?? 0) + 1}/{count}
              </span>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------------------------------------------------------------- đọc dữ liệu lỏng

function strings(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && !!x)
    : []
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const WEEKDAYS: Record<string, string> = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
}

function text(v: unknown): string {
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join(", ")
  return ""
}

/** Giờ mở cửa thành các dòng [thứ, giờ]; nguồn trả object, mảng object hoặc mảng chuỗi. */
function hoursRows(h: unknown): [string, string][] {
  const day = (k: string) => WEEKDAYS[k.toLowerCase()] ?? k
  if (typeof h === "string") return h ? [["", h]] : []
  if (Array.isArray(h))
    return h.flatMap((x): [string, string][] =>
      x && typeof x === "object" && !Array.isArray(x)
        ? hoursRows(x)
        : text(x)
          ? [["", text(x)]]
          : []
    )
  if (h && typeof h === "object")
    return Object.entries(h)
      .map(([k, v]): [string, string] => [day(k), text(v)])
      .filter(([, v]) => v)
  return []
}

/** Tiện ích thành nhãn: mảng chuỗi, hoặc object nhóm → giá trị (chuỗi, mảng, true = tên khoá). */
function attributeChips(a: unknown): string[] {
  const out: string[] = []
  const walk = (v: unknown, key?: string) => {
    if (typeof v === "string") out.push(v)
    else if (v === true && key) out.push(key)
    else if (Array.isArray(v)) v.forEach((x) => walk(x))
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => walk(x, k))
  }
  walk(a)
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))].slice(0, 30)
}

// getDay(): 0 = Chủ nhật.
const TODAY = [
  WEEKDAYS.sunday,
  WEEKDAYS.monday,
  WEEKDAYS.tuesday,
  WEEKDAYS.wednesday,
  WEEKDAYS.thursday,
  WEEKDAYS.friday,
  WEEKDAYS.saturday,
]

function usableReviews(v: unknown): PlaceReview[] {
  return Array.isArray(v)
    ? v.filter(
        (r): r is PlaceReview =>
          !!r && typeof r === "object" && (!!r.text || r.rating != null)
      )
    : []
}
