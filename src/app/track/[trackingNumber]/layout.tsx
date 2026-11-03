import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackingNumber: string }>;
}): Promise<Metadata> {
  const { trackingNumber } = await params;
  const decoded = decodeURIComponent(trackingNumber || 'Tra cứu');

  return {
    title: `Theo Dõi Hành Trình Đơn Hàng ${decoded}`,
    description: `Theo dõi vị trí tài xế shipper và trạng thái đơn hàng ${decoded} trực tiếp trên bản đồ GPS qua Server-Sent Events (SSE).`,
    alternates: {
      canonical: `/track/${decoded}`,
    },
    openGraph: {
      title: `Live Tracking Đơn Hàng ${decoded} | FAST-SHIP-HUB`,
      description: `Bản đồ trực quan hiển thị tọa độ GPS tài xế di chuyển theo thời gian thực mỗi 3 giây.`,
      url: `/track/${decoded}`,
      images: [
        {
          url: '/og-tracking.png',
          width: 1200,
          height: 630,
          alt: `Theo dõi đơn hàng ${decoded}`,
        },
      ],
    },
  };
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
