import type { MetadataRoute } from 'next';

/**
 * Next.js 15 Metadata Route Handler: sitemap.xml
 * Tự động tạo sitemap chuẩn SEO cho công cụ tìm kiếm
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fastshiphub.vn';
  const currentDate = new Date();

  return [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/quote`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/track/FSH-20261103-8899`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.7,
    },
  ];
}
