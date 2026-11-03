import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bảng So Sánh Giá Cước Thời Gian Thực',
  description:
    'So sánh cước phí giao hàng 5 hãng (GrabExpress, ShopeeFood, Xanh SM, Ahamove, Be) trong vòng 1.5 giây. Tự động gắn nhãn Rẻ nhất, Nhanh nhất, Xe điện xanh.',
  alternates: {
    canonical: '/quote',
  },
  openGraph: {
    title: 'Bảng So Sánh Giá Cước Thời Gian Thực | FAST-SHIP-HUB',
    description:
      'Nhận báo giá 5 hãng đồng thời trong 1.5 giây. Tiết kiệm tới 35% chi phí giao hàng với công nghệ đề xuất thông minh.',
    url: '/quote',
    images: [
      {
        url: '/og-quote.png',
        width: 1200,
        height: 630,
        alt: 'Bảng so sánh giá cước đa hãng FAST-SHIP-HUB',
      },
    ],
  },
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
