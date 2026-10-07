import type { Metadata } from "next"

import { ResetPasswordForm } from "./reset-form"

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu · Ailusion Journey",
  // Token nằm trên URL: không để nó lọt sang trang khác qua header Referer.
  referrer: "no-referrer",
}

/** Mở từ link trong email: /reset-password?token=<jwt>. */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams
  return <ResetPasswordForm token={typeof token === "string" ? token : null} />
}
