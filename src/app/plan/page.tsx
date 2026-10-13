import { redirect } from "next/navigation"

/** Lập lộ trình nằm trong trang chat: chuyển sang đó và mở sẵn form. */
export default function PlanPage() {
  redirect("/chat?form=1")
}
