import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PetSocial — Mạng Xã Hội Thú Cưng & Chủ Nuôi',
  description: 'Chia sẻ khoảnh khắc vui vẻ, đáng yêu của các bé cún, mèo và thú cưng cùng cộng đồng yêu động vật.',
  openGraph: {
    title: 'PetSocial — Mạng Xã Hội Thú Cưng',
    description: 'Chia sẻ ảnh và video ngắn cùng các bé cưng 🐾',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#fffbf7] text-zinc-900 antialiased selection:bg-rose-200 selection:text-rose-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
