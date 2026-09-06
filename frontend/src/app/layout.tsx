import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "월간회의 케미 매칭",
  description: "회의 시작 전 10분 아이스브레이킹 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
