import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Khu Vực Quản Trị Shop',
  description:
    'Quản trị tập trung toàn bộ đơn hàng đa đối tác và ví nạp tiền VietQR cho chủ shop.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
