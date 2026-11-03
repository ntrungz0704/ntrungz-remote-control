import React from 'react';

/**
 * Component sinh dữ liệu cấu trúc JSON-LD (Schema.org)
 * Hỗ trợ Google Search hiển thị Rich Snippets (Knowledge Panel, Breadcrumb, Sitelinks Search Box)
 */
export function JsonLd() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fastshiphub.vn';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'FAST-SHIP-HUB',
    alternateName: 'Nền Tảng Tích Hợp Giao Hàng Đa Hãng FAST-SHIP-HUB',
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/logo.png`,
      width: 512,
      height: 512,
    },
    description:
      'Nền tảng tích hợp và so sánh giá cước giao hàng đa đơn vị hàng đầu Việt Nam. Tự động kết nối GrabExpress, ShopeeFood, Xanh SM, Ahamove, Be chỉ trong 1.5 giây.',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+84-1900-6868',
        contactType: 'customer service',
        areaServed: 'VN',
        availableLanguage: ['Vietnamese', 'English'],
      },
    ],
    sameAs: [
      'https://facebook.com/fastshiphub',
      'https://twitter.com/fastshiphub',
      'https://linkedin.com/company/fastshiphub',
    ],
  };

  const deliveryServiceSchema = {
    '@context': 'https://schema.org',
    '@type': 'DeliveryService',
    '@id': `${baseUrl}/#service`,
    name: 'Dịch Vụ So Sánh & Điều Phối Giao Hàng Đa Hãng Siêu Tốc',
    provider: {
      '@type': 'Organization',
      name: 'FAST-SHIP-HUB',
      url: baseUrl,
    },
    serviceType: 'On-demand Delivery Aggregation & Real-time Comparison',
    areaServed: {
      '@type': 'Country',
      name: 'Vietnam',
    },
    termsOfService: `${baseUrl}/terms`,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Mạng Lưới Đối Tác Vận Chuyển Liên Kết',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'GrabExpress',
            description: 'Mạng lưới giao hàng tức thì đông đảo nhất cả nước',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'ShopeeFood Instant',
            description: 'Giao hàng siêu tốc tối ưu nội thành và quà tặng',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Xanh SM Delivery',
            description: '100% Xe máy điện VinFast thân thiện môi trường, không phát thải CO2',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Ahamove',
            description: 'Giải pháp giao hàng chuyên nghiệp, nhận kiện hàng tới 50kg',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'beDelivery',
            description: 'Cước phí cạnh tranh linh hoạt mọi khung giờ',
          },
        },
      ],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'FAST-SHIP-HUB',
    publisher: {
      '@id': `${baseUrl}/#organization`,
    },
    inLanguage: 'vi-VN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/track/{search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(deliveryServiceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
