import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// DESIGN.md 3장: IBM Plex Sans KR (400 본문 · 500 버튼/라벨 · 600 카드 제목 · 700 페이지 제목)
const plexSansKr = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  fallback: ["Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
});

export const metadata: Metadata = {
  title: "회기노트", // 서비스 이름은 가칭 (DESIGN.md 0장)
  description: "AI 기반 상담 회기 기록 및 실천 지원 서비스 (데모: 합성 데이터만 사용)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${plexSansKr.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        {/* 저장 성공 같은 짧은 알림: import { toast } from "sonner"; toast.success("저장했어요") */}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
