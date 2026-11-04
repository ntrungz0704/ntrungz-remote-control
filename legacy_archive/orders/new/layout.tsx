import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Xác Nhận Đặt Đơn & Thanh Toán 1-Click',
  description:
    'Hoàn tất đặt đơn giao hàng đa hãng, thanh toán qua số dư ví trả trước hoặc quét mã VietQR Napas 24/7.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrderNewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
