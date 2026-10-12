# ailusion-journey-fe

Frontend cho Ailusion Journey.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (style `new-york`, Radix, icon `lucide-react`)
- `next-themes` cho dark mode (class `.dark`)
- ESLint (`eslint-config-next`) + Prettier (`prettier-plugin-tailwindcss`)
- Husky + lint-staged (pre-commit)
- Docker (Next.js `output: "standalone"`)

## Yêu cầu

- Node.js >= 20.9 (khuyến nghị 24 LTS)
- pnpm 12 (`corepack enable` hoặc `npm i -g pnpm@12`)

## Bắt đầu

```bash
pnpm install          # cũng cài git hooks (husky)
cp .env.example .env.local
pnpm dev              # http://localhost:3000
```

FE cần **backend chạy sẵn** mới chat được. Bật đủ ba tầng:

```bash
# 1. service LLM (repo ailusion-journey-llm) — :8001
cd ../ailusion-journey-llm && make up && make api

# 2. backend (repo ailusion-journey-be) — :8000
cd ../ailusion-journey-be && make services && make migrate && make dev

# 3. frontend — :3000
pnpm dev
```

## Luồng chat và lập lộ trình

```
Trình duyệt :3000 ──► BE :8000 ──► LLM service :8001 ──► OpenAI (gpt-4.1-mini)
                                          └──► MCP server :8002 (dữ liệu địa điểm, chỗ ở, thời tiết…)
```

| Trang                                                        | Việc                                                                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                          | Trang giới thiệu; ô "lên kế hoạch" soạn sẵn câu hỏi rồi chuyển sang `/chat` (chưa đăng nhập thì qua đăng ký trước)                                |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Đăng nhập, đăng ký, quên / đặt lại mật khẩu                                                                                                       |
| `/chat`                                                      | Danh sách hội thoại + khung chat (trả lời dần theo stream). Khi người dùng muốn lập lộ trình, form chuyến đi tự mở; lộ trình hiện ngay trong chat |
| `/plan`                                                      | Lập lộ trình riêng: cùng form, khung kết quả và tiến độ với trang chat                                                                            |

| File                                           | Việc                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/lib/api.ts`                               | Gọi BE; `streamChat()` tự tách khung SSE; `streamPlanEvents()` đọc tiến độ lập lộ trình                  |
| `src/lib/itinerary.ts`                         | Kiểu dữ liệu form (`TripForm`) và kết quả (`ItineraryResult`) của pipeline lập lộ trình, nhãn tiếng Việt |
| `src/lib/auth.tsx`                             | Phiên đăng nhập trong localStorage                                                                       |
| `src/components/chat/*`                        | `message-list`, `message-input`, `thread-list`, `markdown`                                               |
| `src/components/itinerary/trip-form-sheet.tsx` | Form chuyến đi (chỉ gửi ô đã điền; ô trống thì service đọc từ lời nhắn hoặc hỏi lại)                     |
| `src/components/itinerary/itinerary-view.tsx`  | Kết quả: câu hỏi lại kèm nút chọn, tối đa 3 phương án, tab từng ngày, bản đồ, giá ước                    |
| `src/components/itinerary/plan-trace.tsx`      | Tiến độ từng bước của pipeline (SSE)                                                                     |
| `src/components/itinerary/day-map.tsx`         | Bản đồ một ngày (Leaflet, chỉ chạy trên trình duyệt)                                                     |

Vài điểm đáng lưu ý:

- **Không gửi lại lịch sử hội thoại.** FE chỉ giữ `thread_id` và gửi kèm mỗi lượt; lịch sử
  nằm ở service LLM.
- **Không dùng `EventSource`** cho stream được: nó chỉ gửi GET và không đặt được header
  `Authorization`. Vì vậy `streamChat()` dùng `fetch` rồi tự đọc từng khung `data:`.
- **Token nằm trong localStorage** — đủ cho prototype, nhưng bị lộ nếu có lỗ hổng XSS.
  Muốn chặt hơn thì chuyển sang cookie `httpOnly` do Route Handler của Next đặt; lúc đó
  chỉ `api.ts` và `auth.tsx` phải sửa, giao diện giữ nguyên.
- Phiên đọc bằng `useSyncExternalStore` nên đăng xuất ở tab này thì tab kia tự cập nhật.

## Scripts

| Lệnh                | Mô tả                              |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Chạy dev server                    |
| `pnpm build`        | Build production (standalone)      |
| `pnpm start`        | Chạy bản build bằng `next start`   |
| `pnpm lint`         | ESLint (`pnpm lint:fix` để tự sửa) |
| `pnpm format`       | Prettier format toàn bộ repo       |
| `pnpm format:check` | Kiểm tra format (dùng cho CI)      |
| `pnpm typecheck`    | Sinh route types + `tsc --noEmit`  |

Pre-commit hook chạy `lint-staged`: ESLint `--fix` + Prettier trên các file đã stage.

## Cấu trúc thư mục

```
src/
├── app/                   # App Router
│   ├── layout.tsx         # ThemeProvider + AuthProvider
│   ├── page.tsx           # trang giới thiệu
│   ├── (auth)/            # login, register, forgot-password, reset-password
│   ├── chat/page.tsx      # chat + lập lộ trình trong chat
│   └── plan/page.tsx      # lập lộ trình riêng
├── components/
│   ├── auth/              # form đăng nhập / đăng ký
│   ├── chat/              # message-list, message-input, thread-list, markdown
│   ├── itinerary/         # trip-form-sheet, itinerary-view, plan-trace, day-map
│   ├── home/              # các khối của trang giới thiệu
│   ├── ui/                # shadcn/ui (button, card, input, label, textarea)
│   └── theme-provider.tsx
└── lib/
    ├── api.ts             # client gọi backend + đọc stream SSE
    ├── itinerary.ts       # kiểu dữ liệu form / kết quả lập lộ trình
    ├── auth.tsx           # phiên đăng nhập (localStorage)
    ├── destinations.ts    # điểm đến + ảnh (Wikimedia Commons) cho trang giới thiệu
    ├── pending-prompt.ts  # câu hỏi soạn ở trang chủ, chờ gửi khi vào /chat
    └── utils.ts           # cn() helper
```

Alias import: `@/*` → `src/*`.

## Thêm component shadcn/ui

```bash
pnpm dlx shadcn@latest add dialog dropdown-menu form
```

Cấu hình nằm trong `components.json`. Màu/theme chỉnh trong `src/app/globals.css` (biến `:root` và `.dark`).

## Biến môi trường

| Biến                  | Việc                                               |
| --------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Địa chỉ backend (mặc định `http://localhost:8000`) |
| `NEXT_PUBLIC_APP_URL` | Địa chỉ chính FE                                   |

- `.env.local` cho local (không commit). Mẫu ở `.env.example`.
- Biến `NEXT_PUBLIC_*` được inline lúc **build**, nên khi build Docker phải truyền qua `--build-arg`.

## Docker

```bash
# build & chạy
docker build -t ailusion-journey-fe --build-arg NEXT_PUBLIC_APP_URL=https://example.com .
docker run --rm -p 3000:3000 ailusion-journey-fe

# hoặc docker compose
docker compose up --build
```

Image dùng `node:24-alpine`, multi-stage, chạy bằng user không phải root, chỉ chứa output `.next/standalone`.
