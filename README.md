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

## Luồng chat

```
Trình duyệt :3000 ──► BE :8000 ──► LLM service :8001 ──► Gemini
```

| Trang    | Việc                                                                  |
| -------- | --------------------------------------------------------------------- |
| `/login` | Đăng nhập / đăng ký (cùng một form, bấm để đổi)                       |
| `/chat`  | Danh sách hội thoại + khung chat, câu trả lời hiện dần theo stream    |
| `/`      | Chuyển hướng sang `/chat`; chưa đăng nhập thì `/chat` đẩy về `/login` |

| File                    | Việc                                           |
| ----------------------- | ---------------------------------------------- |
| `src/lib/api.ts`        | Gọi BE; `streamChat()` tự tách khung SSE       |
| `src/lib/auth.tsx`      | Phiên đăng nhập trong localStorage             |
| `src/components/chat/*` | `message-list`, `message-input`, `thread-list` |

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
├── app/                 # App Router
│   ├── layout.tsx       # ThemeProvider + AuthProvider
│   ├── page.tsx         # chuyển hướng sang /chat
│   ├── login/page.tsx
│   └── chat/page.tsx
├── components/
│   ├── chat/            # message-list, message-input, thread-list
│   ├── ui/              # shadcn/ui (button, card, input, label, textarea)
│   └── theme-provider.tsx
└── lib/
    ├── api.ts           # client gọi backend + đọc stream SSE
    ├── auth.tsx         # phiên đăng nhập (localStorage)
    └── utils.ts         # cn() helper
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
