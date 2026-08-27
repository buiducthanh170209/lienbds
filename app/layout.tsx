import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Ảnh → Excel",
  description: "Upload ảnh + viết yêu cầu → AI tự tạo file Excel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
