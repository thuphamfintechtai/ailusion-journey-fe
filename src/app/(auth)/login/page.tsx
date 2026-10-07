"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  AuthHeader,
  Field,
  FormError,
  PasswordInput,
  SubmitButton,
  errorMessage,
} from "@/components/auth/form"
import { Input } from "@/components/ui/input"
import { SESSION_EXPIRED_KEY, useAuth } from "@/lib/auth"

/** Chỉ báo "phiên hết hạn" nếu vừa bị đưa về đây, không báo lại ở lần mở sau. */
const EXPIRED_NOTICE_MS = 2 * 60 * 1000

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()

  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Bị đưa về đây vì phiên hết hạn: báo cho người dùng. Không xoá dấu ở đây (trang có thể
  // được dựng lại ngay sau khi chuyển hướng); xoá khi bấm đăng nhập, và bỏ qua dấu quá cũ.
  React.useEffect(() => {
    try {
      const at = Number(sessionStorage.getItem(SESSION_EXPIRED_KEY))
      if (at && Date.now() - at < EXPIRED_NOTICE_MS)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage chỉ đọc được ở client
        setError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.")
    } catch {
      // storage bị chặn: bỏ qua câu báo
    }
  }, [])

  // Đã đăng nhập rồi thì không ở lại trang này.
  React.useEffect(() => {
    if (!loading && user) router.replace("/chat")
  }, [loading, user, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setError(null)
    setSubmitting(true)
    try {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY)
    } catch {
      // như trên
    }
    try {
      await login(String(form.get("email")), String(form.get("password")))
      router.replace("/chat")
    } catch (err) {
      setError(errorMessage(err, "Không đăng nhập được"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8">
      <AuthHeader eyebrow="Đăng nhập" title="Chào mừng trở lại">
        Tiếp tục lên kế hoạch cho chuyến đi cùng trợ lý.
      </AuthHeader>

      <form onSubmit={onSubmit} className="grid gap-5">
        <Field id="email" label="Email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="ban@vidu.vn"
            className="h-11 bg-card"
          />
        </Field>

        <Field
          id="password"
          label="Mật khẩu"
          action={
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Quên mật khẩu?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </Field>

        <FormError>{error}</FormError>

        <SubmitButton pending={submitting}>Đăng nhập</SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  )
}
