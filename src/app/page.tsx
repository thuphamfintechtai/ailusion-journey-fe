import { redirect } from "next/navigation"

export default function Home() {
  // Vào thẳng màn chat; chưa đăng nhập thì /chat tự đẩy sang /login.
  redirect("/chat")
}
