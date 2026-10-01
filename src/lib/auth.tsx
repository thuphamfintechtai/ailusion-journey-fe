"use client"

/**
 * Phiên đăng nhập, giữ trong localStorage.
 *
 * Đủ cho prototype: trình duyệt gọi thẳng BE nên phải tự cầm token. Khi cần siết bảo mật
 * thì chuyển sang cookie httpOnly do Route Handler của Next đặt — lúc đó chỉ file này và
 * `api.ts` phải sửa, phần giao diện giữ nguyên.
 *
 * localStorage là trạng thái nằm ngoài React nên đọc bằng `useSyncExternalStore` thay vì
 * `useEffect` + `setState`. Đổi lại được luôn: đăng xuất ở tab này thì tab kia tự cập nhật.
 */

import * as React from "react"
import { useRouter } from "next/navigation"

import { auth as authApi, type TokenPair, type User } from "@/lib/api"

const STORAGE_KEY = "ailusion.session"

type Session = { tokens: TokenPair; user: User }

type AuthContextValue = {
  user: User | null
  token: string | null
  /** Chưa đọc được localStorage (lúc render trên server + lần hydrate đầu). */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------- store
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // `storage` chỉ bắn ở các tab khác, nên tab hiện tại dùng `emit()` khi tự ghi.
  window.addEventListener("storage", emit)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener("storage", emit)
  }
}

/** Trả về chuỗi JSON thô: hai lần đọc giống nhau thì `===` bằng nhau, React không render thừa. */
function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

/** `undefined` = chưa biết. Phân biệt được "chưa đọc xong" với "không có phiên". */
const getServerSnapshot = (): undefined => undefined

function writeSession(session: Session | null) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(STORAGE_KEY)
  emit()
}

function parseSession(raw: string | null | undefined): Session | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Session
    return parsed?.tokens?.access_token ? parsed : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const raw = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const session = React.useMemo(() => parseSession(raw), [raw])
  const loading = raw === undefined
  const router = useRouter()

  const login = React.useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    const user = await authApi.me(tokens.access_token)
    writeSession({ tokens, user })
  }, [])

  const register = React.useCallback(
    async (email: string, password: string, fullName?: string) => {
      await authApi.register(email, password, fullName)
      await login(email, password)
    },
    [login]
  )

  const logout = React.useCallback(async () => {
    // Thu hồi refresh token ở backend; gọi lỗi cũng vẫn phải đăng xuất được ở máy này.
    if (session)
      await authApi.logout(session.tokens.refresh_token).catch(() => {})
    writeSession(null)
    router.push("/login")
  }, [session, router])

  const value = React.useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.tokens.access_token ?? null,
      loading,
      login,
      register,
      logout,
    }),
    [session, loading, login, register, logout]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = React.use(AuthContext)
  if (!context) throw new Error("useAuth phải nằm trong <AuthProvider>")
  return context
}
