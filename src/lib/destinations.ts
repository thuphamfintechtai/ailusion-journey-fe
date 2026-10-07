/**
 * Điểm đến và ảnh minh hoạ. Ảnh lấy từ Wikimedia Commons theo giấy phép ghi ở từng mục;
 * phần ghi nguồn hiện ở chân trang (xem `PhotoCredits`).
 */

const COMMONS = "https://thumb.wikimedia.org/wikipedia/commons/thumb"

export type Photo = {
  /** Dạng `<thư mục>/<tên file>` trong kho thumb của Commons. */
  path: string
  alt: string
  author: string
  license: string
  page: string
}

/** Commons chỉ cấp một số độ rộng cố định cho ảnh thu nhỏ. */
export type PhotoWidth = 960 | 1920

export function photoUrl(photo: Photo, width: PhotoWidth = 960): string {
  const file = photo.path.split("/").pop()
  return `${COMMONS}/${photo.path}/${width}px-${file}`
}

function commonsPage(file: string): string {
  return `https://commons.wikimedia.org/wiki/File:${file}`
}

export const PHOTOS = {
  halong: {
    path: "9/92/Ha_Long_Bay_24.jpg",
    alt: "Du thuyền giữa các đảo đá vôi trên vịnh Hạ Long",
    author: "Shyamal",
    license: "CC BY-SA 4.0",
    page: commonsPage("Ha_Long_Bay_24.jpg"),
  },
  phuquoc: {
    path: "6/6e/Bai-sao-phu-quoc-tuonglamphotos.jpg",
    alt: "Bãi Sao, Phú Quốc với cát trắng và nước biển xanh",
    author: "Tuong Lam Photos",
    license: "CC BY-SA 4.0",
    page: commonsPage("Bai-sao-phu-quoc-tuonglamphotos.jpg"),
  },
  ninhbinh: {
    path: "c/c9/Trang_An_Landscape_Complex%2C_Ninh_Binh_Province%2C_20240202_1410_5232.jpg",
    alt: "Núi đá vôi soi bóng xuống sông ở Tràng An, Ninh Bình",
    author: "Jakub Hałun",
    license: "CC BY 4.0",
    page: commonsPage(
      "Trang_An_Landscape_Complex%2C_Ninh_Binh_Province%2C_20240202_1410_5232.jpg"
    ),
  },
  mucangchai: {
    path: "6/6e/Ch%E1%BA%BF_Cu_Nha%2C_M%C3%B9_Cang_Ch%E1%BA%A3i%2C_Y%C3%AAn_B%C3%A1i%2C_Vietnam_-_panoramio_%281%29.jpg",
    alt: "Ruộng bậc thang mùa lúa chín ở Chế Cu Nha, Mù Cang Chải",
    author: "Tiên Ông",
    license: "CC BY-SA 3.0",
    page: commonsPage(
      "Ch%E1%BA%BF_Cu_Nha%2C_M%C3%B9_Cang_Ch%E1%BA%A3i%2C_Y%C3%AAn_B%C3%A1i%2C_Vietnam_-_panoramio_%281%29.jpg"
    ),
  },
  hoian: {
    path: "a/a2/Lanterns_in_Hoi_An%2C_Vietnam_%2825708206924%29.jpg",
    alt: "Đèn lồng nhiều màu ở phố cổ Hội An",
    author: "katiebordner",
    license: "CC BY 2.0",
    page: commonsPage("Lanterns_in_Hoi_An%2C_Vietnam_%2825708206924%29.jpg"),
  },
  dalat: {
    path: "6/67/Da_Lat_train_station_02.JPG",
    alt: "Ga xe lửa Đà Lạt",
    author: "Diane Selwyn",
    license: "Public domain",
    page: commonsPage("Da_Lat_train_station_02.JPG"),
  },
  danang: {
    path: "b/b6/84182-Da-Nang_%2848572593937%29.jpg",
    alt: "Cầu Vàng với đôi bàn tay đá trên Bà Nà Hills, Đà Nẵng",
    author: "xiquinhosilva",
    license: "CC BY 2.0",
    page: commonsPage("84182-Da-Nang_%2848572593937%29.jpg"),
  },
  sapa: {
    path: "6/61/Rice_terraces_in_Sa_Pa_02.jpg",
    alt: "Ruộng bậc thang xanh ở Sa Pa",
    author: "Christophe95",
    license: "CC BY-SA 4.0",
    page: commonsPage("Rice_terraces_in_Sa_Pa_02.jpg"),
  },
  hagiang: {
    path: "2/2f/Ha_Giang_rizieres_bis.jpg",
    alt: "Thung lũng ruộng lúa ở Hà Giang",
    author: "Velvet",
    license: "CC BY-SA 4.0",
    page: commonsPage("Ha_Giang_rizieres_bis.jpg"),
  },
  hue: {
    path: "a/a6/Gate_in_Imperial_City%2C_Hu%E1%BA%BF_%28III%29.jpg",
    alt: "Cổng trong Hoàng thành Huế",
    author: "Supanut Arunoprayote",
    license: "CC BY 4.0",
    page: commonsPage("Gate_in_Imperial_City%2C_Hu%E1%BA%BF_%28III%29.jpg"),
  },
} satisfies Record<string, Photo>

export type PhotoKey = keyof typeof PHOTOS

export type Destination = {
  id: string
  name: string
  region: string
  /** Gợi ý độ dài chuyến, chỉ để hiển thị trên thẻ. */
  days: string
  blurb: string
  photo: PhotoKey
}

/** Các điểm có trong ô chọn của khung lên lịch trình và trong lưới điểm đến. */
export const DESTINATIONS: Destination[] = [
  {
    id: "ha-long",
    name: "Vịnh Hạ Long",
    region: "Quảng Ninh",
    days: "2 ngày 1 đêm",
    blurb: "Ngủ trên du thuyền, chèo kayak qua hang Luồn.",
    photo: "halong",
  },
  {
    id: "hoi-an",
    name: "Hội An",
    region: "Quảng Nam",
    days: "3 ngày 2 đêm",
    blurb: "Phố cổ đèn lồng, cao lầu và biển An Bàng.",
    photo: "hoian",
  },
  {
    id: "da-lat",
    name: "Đà Lạt",
    region: "Lâm Đồng",
    days: "3 ngày 2 đêm",
    blurb: "Đồi chè, ga cổ, cà phê sương sớm.",
    photo: "dalat",
  },
  {
    id: "phu-quoc",
    name: "Phú Quốc",
    region: "Kiên Giang",
    days: "4 ngày 3 đêm",
    blurb: "Bãi Sao cát trắng, lặn ngắm san hô Hòn Thơm.",
    photo: "phuquoc",
  },
  {
    id: "da-nang",
    name: "Đà Nẵng",
    region: "Đà Nẵng",
    days: "3 ngày 2 đêm",
    blurb: "Cầu Vàng Bà Nà, biển Mỹ Khê, chợ Hàn.",
    photo: "danang",
  },
  {
    id: "ninh-binh",
    name: "Ninh Bình",
    region: "Ninh Bình",
    days: "2 ngày 1 đêm",
    blurb: "Đi đò Tràng An, leo Hang Múa ngắm toàn cảnh.",
    photo: "ninhbinh",
  },
  {
    id: "sa-pa",
    name: "Sa Pa",
    region: "Lào Cai",
    days: "3 ngày 2 đêm",
    blurb: "Trekking bản Cát Cát, chinh phục Fansipan.",
    photo: "sapa",
  },
  {
    id: "ha-giang",
    name: "Hà Giang",
    region: "Hà Giang",
    days: "4 ngày 3 đêm",
    blurb: "Cung đường Mã Pí Lèng, sông Nho Quế.",
    photo: "hagiang",
  },
  {
    id: "hue",
    name: "Huế",
    region: "Thừa Thiên Huế",
    days: "2 ngày 1 đêm",
    blurb: "Đại Nội, lăng tẩm và bún bò chính gốc.",
    photo: "hue",
  },
]

export type HeroVideo = {
  src: string
  author: string
  license: string
  page: string
}

/** Thuyền buồm chạy giữa các đảo đá, quay tháng 12/2024. Bản chuyển mã 1080p VP9 (~7,5 MB) của Commons. */
const HALONG_VIDEO: HeroVideo = {
  src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/be/Ha_Long_Bay%2C_Vietnam_-_Dec_2024.webm/Ha_Long_Bay%2C_Vietnam_-_Dec_2024.webm.1080p.vp9.webm",
  author: "പയ്യൻ",
  license: "CC BY-SA 4.0",
  page: commonsPage("Ha_Long_Bay,_Vietnam_-_Dec_2024.webm"),
}

/** Các slide ở hero. */
export const HERO_SLIDES: {
  photo: PhotoKey
  /** Video nền thay cho ảnh (ảnh vẫn dùng làm poster lúc video chưa tải xong). */
  video?: HeroVideo
  label: string
  title: string
  subtitle: string
}[] = [
  {
    photo: "halong",
    video: HALONG_VIDEO,
    label: "2 ngày 1 đêm",
    title: "Vịnh Hạ Long",
    subtitle: "Ngủ đêm trên du thuyền giữa gần 2.000 hòn đảo đá vôi.",
  },
  {
    photo: "phuquoc",
    label: "4 ngày 3 đêm",
    title: "Phú Quốc",
    subtitle: "Cát trắng Bãi Sao, hoàng hôn Dinh Cậu, hải sản chợ đêm.",
  },
  {
    photo: "ninhbinh",
    label: "2 ngày 1 đêm",
    title: "Tràng An, Ninh Bình",
    subtitle: "Ngồi đò xuyên hang, ngắm núi đá soi bóng xuống sông.",
  },
]
