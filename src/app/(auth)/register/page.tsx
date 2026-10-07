"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  AuthHeader,
  Field,
  FormError,
  MIN_PASSWORD_LENGTH,
  PasswordInput,
  SubmitButton,
  errorMessage,
} from "@/components/auth/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"

export default function RegisterPage() {
  const { user, loading, register } = useAuth()
  const router = useRouter()

  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!loading && user) router.replace("/chat")
  }, [loading, user, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password"))

    if (password !== String(form.get("confirm"))) {
      setError("Hai lần nhập mật khẩu chưa khớp nhau.")
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      // register() đăng nhập luôn sau khi tạo tài khoản.
      await register(
        String(form.get("email")),
        password,
        String(form.get("full_name") ?? "").trim() || undefined
      )
      router.replace("/chat")
    } catch (err) {
      setError(errorMessage(err, "Không tạo được tài khoản"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8">
      <AuthHeader eyebrow="Tạo tài khoản" title="Bắt đầu chuyến đi mới">
        Lịch sử hội thoại được lưu theo tài khoản, nên bạn có thể quay lại chỉnh
        lịch trình bất cứ lúc nào.
      </AuthHeader>

      <form onSubmit={onSubmit} className="grid gap-5">
        <Field id="full_name" label="Họ tên">
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            autoFocus
            placeholder="Nguyễn Văn A"
            className="h-11 bg-card"
          />
        </Field>

        <Field id="email" label="Email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ban@vidu.vn"
            className="h-11 bg-card"
          />
        </Field>

        <Field
          id="password"
          label="Mật khẩu"
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
        >
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            aria-describedby="password-hint"
          />
        </Field>

        <Field id="confirm" label="Nhập lại mật khẩu">
          <PasswordInput
            id="confirm"
            name="confirm"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </Field>

        <FormError>{error}</FormError>

        <SubmitButton pending={submitting}>Tạo tài khoản</SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}
