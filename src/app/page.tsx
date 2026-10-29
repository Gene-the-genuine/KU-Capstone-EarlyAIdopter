import { redirect } from "next/navigation";

// 첫 화면(/)은 상담사 대시보드로 보냅니다. 로그인하지 않았으면 proxy.ts 가 다시 /login 으로 보냅니다.
export default function Home() {
  redirect("/counselor");
}
