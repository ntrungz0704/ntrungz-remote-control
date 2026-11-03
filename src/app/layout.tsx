import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { ToastProvider } from '@/components/common/Toast';
import { JsonLd } from '@/components/seo/JsonLd';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fastshiphub.vn';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FAST-SHIP-HUB — Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng',
    template: '%s | FAST-SHIP-HUB',
  },
  description:
    'So sánh giá cước tức thì giữa GrabExpress, ShopeeFood, Xanh SM, Ahamove, Be trong 1.5 giây. Đặt đơn 1-click và Live Tracking bản đồ thời gian thực.',
  applicationName: 'FAST-SHIP-HUB',
  authors: [{ name: 'FAST-SHIP-HUB Engineering Team', url: siteUrl }],
  generator: 'Next.js 15',
  creator: 'FAST-SHIP-HUB Logistics',
  publisher: 'Công Ty Công Nghệ Fast Ship Hub',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  keywords: [
    'giao hàng',
    'so sánh cước',
    'grabexpress',
    'xanh sm',
    'shopeefood',
    'ahamove',
    'be delivery',
    'live tracking sse',
    'tiết kiệm cước ship',
    'giao hàng nội thành',
    'xe máy điện vinfast',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: 'FAST-SHIP-HUB',
    title: 'FAST-SHIP-HUB — So Sánh Giá Cước Giao Hàng Đa Hãng Chỉ Trong 1.5 Giây',
    description:
      'Kết nối trực tiếp API với GrabExpress, ShopeeFood, Xanh SM, Ahamove, Be. Tự động đề xuất gói cước Rẻ nhất, Nhanh nhất và Xanh nhất.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FAST-SHIP-HUB — Nền Tảng Tích Hợp & So Sánh Giao Hàng Đa Hãng',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAST-SHIP-HUB — So Sánh Giá Cước Giao Hàng Đa Hãng',
    description:
      'Kết nối GrabExpress, ShopeeFood, Xanh SM, Ahamove, Be. Đặt đơn 1-click, theo dõi GPS tài xế live SSE.',
    images: ['/og-image.png'],
    creator: '@fastshiphub',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full scroll-smooth">
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        {/* WCAG 2.2 Skip to Content Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-700 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white text-xs font-bold"
        >
          Chuyển đến nội dung chính (Skip to Content)
        </a>

        {/* Structured Data (JSON-LD) */}
        <JsonLd />

        <ToastProvider>
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col focus:outline-none">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
