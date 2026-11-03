// ============================================================================
// FAST-SHIP-HUB — DATABASE SEED SCRIPT (prisma/seed.ts)
// Initial Data for Carriers, Service Tiers, Users, Wallets & Sample Order
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu quá trình nạp dữ liệu mẫu (Seeding FAST-SHIP-HUB Database)...');

  // =========================================================================
  // 1. SEED DANH MỤC 6 HÃNG VẬN CHUYỂN (CARRIERS & SERVICE TIERS)
  // =========================================================================
  console.log('📦 1. Seeding Carriers & Service Tiers...');

  const carriersData = [
    {
      code: 'GRAB' as const,
      name: 'GrabExpress',
      logoUrl: 'https://assets.fastshiphub.vn/carriers/grab.svg',
      isActive: true,
      isMock: false,
      hotline: '19001198',
      webhookSecret: 'grab_wh_sec_99a8b7c6d5e4f3a2b1c0',
      tiers: [
        {
          tierCode: 'BIKE_INSTANT' as const,
          tierName: 'GrabExpress Siêu Tốc',
          vehicleType: 'GASOLINE_BIKE' as const,
          maxWeightGrams: 20000, // Grab xe máy nhận tối đa 20kg
          maxDimensionCm: 50,
          baseFeeVnd: 16000,
          baseDistanceMeters: 2000,
          pricePerNextKmVnd: 5500,
        },
        {
          tierCode: 'BIKE_SAME_DAY' as const,
          tierName: 'GrabExpress Giao Trong Ngày',
          vehicleType: 'GASOLINE_BIKE' as const,
          maxWeightGrams: 10000,
          maxDimensionCm: 40,
          baseFeeVnd: 12000,
          baseDistanceMeters: 3000,
          pricePerNextKmVnd: 4500,
        },
      ],
    },
    {
      code: 'SHOPEE_FOOD' as const,
      name: 'Shopee Xpress Instant',
      logoUrl: 'https://assets.fastshiphub.vn/carriers/shopeefood.svg',
      isActive: true,
      isMock: false,
      hotline: '19002042',
      webhookSecret: 'shopee_wh_sec_88b7c6d5e4f3a2b1c0d9',
      tiers: [
        {
          tierCode: 'BIKE_INSTANT' as const,
          tierName: 'Shopee Xpress Hỏa Tốc',
          vehicleType: 'GASOLINE_BIKE' as const,
          maxWeightGrams: 30000,
          maxDimensionCm: 50,
          baseFeeVnd: 15000,
          baseDistanceMeters: 2000,
          pricePerNextKmVnd: 5000,
        },
      ],
    },
    {
      code: 'XANH_SM' as const,
      name: 'Xanh SM Delivery (Thuần Xe Điện)',
      logoUrl: 'https://assets.fastshiphub.vn/carriers/xanhsm.svg',
      isActive: true,
      isMock: false,
      hotline: '19002097',
      webhookSecret: 'xanhsm_wh_sec_77c6d5e4f3a2b1c0d9e8',
      tiers: [
        {
          tierCode: 'BIKE_INSTANT' as const,
          tierName: 'Xanh Express Siêu Tốc (VinFast EV)',
          vehicleType: 'ELECTRIC_BIKE' as const,
          maxWeightGrams: 30000,
          maxDimensionCm: 50,
          baseFeeVnd: 14000, // Giá mở cửa EV ưu đãi
          baseDistanceMeters: 2000,
          pricePerNextKmVnd: 5200,
        },
        {
          tierCode: 'CAR_DELIVERY' as const,
          tierName: 'Xanh Car Delivery (VF e34 / VF 5)',
          vehicleType: 'CAR' as const,
          maxWeightGrams: 100000,
          maxDimensionCm: 120,
          baseFeeVnd: 45000,
          baseDistanceMeters: 2000,
          pricePerNextKmVnd: 12000,
        },
      ],
    },
    {
      code: 'AHAMOVE' as const,
      name: 'Ahamove',
      logoUrl: 'https://assets.fastshiphub.vn/carriers/ahamove.svg',
      isActive: true,
      isMock: false,
      hotline: '1900545411',
      webhookSecret: 'ahamove_wh_sec_66d5e4f3a2b1c0d9e8f7',
      tiers: [
        {
          tierCode: 'BIKE_INSTANT' as const,
          tierName: 'Ahamove Siêu Tốc',
          vehicleType: 'GASOLINE_BIKE' as const,
          maxWeightGrams: 30000,
          maxDimensionCm: 50,
          baseFeeVnd: 18000, // 4km đầu
          baseDistanceMeters: 4000,
          pricePerNextKmVnd: 5000,
        },
        {
          tierCode: 'TRUCK_500KG' as const,
          tierName: 'Ahamove Xe Tải 500kg',
          vehicleType: 'TRUCK' as const,
          maxWeightGrams: 500000,
          maxDimensionCm: 200,
          baseFeeVnd: 150000,
          baseDistanceMeters: 4000,
          pricePerNextKmVnd: 22000,
        },
      ],
    },
    {
      code: 'BE' as const,
      name: 'beDelivery',
      logoUrl: 'https://assets.fastshiphub.vn/carriers/be.svg',
      isActive: true,
      isMock: false,
      hotline: '1900232345',
      webhookSecret: 'be_wh_sec_55e4f3a2b1c0d9e8f7a6',
      tiers: [
        {
          tierCode: 'BIKE_INSTANT' as const,
          tierName: 'beDelivery Hỏa Tốc',
          vehicleType: 'GASOLINE_BIKE' as const,
          maxWeightGrams: 30000,
          maxDimensionCm: 50,
          baseFeeVnd: 15500,
          baseDistanceMeters: 2000,
          pricePerNextKmVnd: 5400,
        },
      ],
    },
    {
      code: 'SANDBOX_MOCK' as const,
      name: 'Mock Carrier (Sandbox Testing)',
      logoUrl: 'https://assets.fastshiphub.vn/carriers/sandbox.svg',
      isActive: true,
      isMock: true,
      hotline: '18000000',
      webhookSecret: 'sandbox_mock_secret_key_1234567890',
      tiers: [
        {
          tierCode: 'BIKE_INSTANT' as const,
          tierName: 'Sandbox Mock Instant Bike',
          vehicleType: 'GASOLINE_BIKE' as const,
          maxWeightGrams: 30000,
          maxDimensionCm: 50,
          baseFeeVnd: 14500,
          baseDistanceMeters: 2000,
          pricePerNextKmVnd: 5000,
        },
      ],
    },
  ];

  for (const c of carriersData) {
    const carrier = await prisma.carrier.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        logoUrl: c.logoUrl,
        isActive: c.isActive,
        isMock: c.isMock,
        hotline: c.hotline,
        webhookSecret: c.webhookSecret,
      },
      create: {
        code: c.code,
        name: c.name,
        logoUrl: c.logoUrl,
        isActive: c.isActive,
        isMock: c.isMock,
        hotline: c.hotline,
        webhookSecret: c.webhookSecret,
      },
    });

    for (const t of c.tiers) {
      await prisma.carrierServiceTier.upsert({
        where: {
          carrierId_tierCode: {
            carrierId: carrier.id,
            tierCode: t.tierCode,
          },
        },
        update: {
          tierName: t.tierName,
          vehicleType: t.vehicleType,
          maxWeightGrams: t.maxWeightGrams,
          maxDimensionCm: t.maxDimensionCm,
          baseFeeVnd: t.baseFeeVnd,
          baseDistanceMeters: t.baseDistanceMeters,
          pricePerNextKmVnd: t.pricePerNextKmVnd,
        },
        create: {
          carrierId: carrier.id,
          tierCode: t.tierCode,
          tierName: t.tierName,
          vehicleType: t.vehicleType,
          maxWeightGrams: t.maxWeightGrams,
          maxDimensionCm: t.maxDimensionCm,
          baseFeeVnd: t.baseFeeVnd,
          baseDistanceMeters: t.baseDistanceMeters,
          pricePerNextKmVnd: t.pricePerNextKmVnd,
        },
      });
    }
  }

  // =========================================================================
  // 2. SEED NGƯỜI DÙNG & VÍ TIỀN TRẢ TRƯỚC (USERS & WALLETS)
  // =========================================================================
  console.log('👤 2. Seeding Users & Merchant Wallets...');

  // 2.1. Quản trị viên sàn (Admin)
  await prisma.user.upsert({
    where: { phone: '0901234567' },
    update: {},
    create: {
      phone: '0901234567',
      email: 'admin@fastshiphub.vn',
      fullName: 'Hoàng Đức Minh (Admin Ops)',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: '$2b$12$e6mZ8b2O3x8C6L4I6/7fE.9gUo8wZ9nN9YkZ.G7M2s6K5s.D8O.Ye',
    },
  });

  // 2.2. Chủ shop thời trang (Merchant) - Nguyễn Thùy Linh
  const merchantUser = await prisma.user.upsert({
    where: { phone: '0987654321' },
    update: {},
    create: {
      phone: '0987654321',
      email: 'shoplinh@gmail.com',
      fullName: 'Nguyễn Thùy Linh (Linh Boutique)',
      role: 'MERCHANT',
      status: 'ACTIVE',
      passwordHash: '$2b$12$e6mZ8b2O3x8C6L4I6/7fE.9gUo8wZ9nN9YkZ.G7M2s6K5s.D8O.Ye',
    },
  });

  // Khởi tạo Ví trả trước cho Merchant với số dư ban đầu 2.000.000 VNĐ
  const merchantWallet = await prisma.wallet.upsert({
    where: { userId: merchantUser.id },
    update: {},
    create: {
      userId: merchantUser.id,
      balance: 2000000n, // BigInt VNĐ
      holdBalance: 0n,
      currency: 'VND',
    },
  });

  // Ghi nhận giao dịch nạp tiền khởi tạo vào sổ cái
  await prisma.walletTransaction.create({
    data: {
      walletId: merchantWallet.id,
      transactionCode: 'TXN-INIT-TOPUP-001',
      type: 'TOPUP',
      status: 'SUCCESS',
      amount: 2000000n,
      balanceBefore: 0n,
      balanceAfter: 2000000n,
      paymentMethod: 'VIETQR',
      referenceId: 'NAPAS_MB_99281721',
      note: 'Nạp tiền ví cước ban đầu qua VietQR chuyển khoản',
    },
  });

  // 2.3. Khách hàng cá nhân vãng lai (Guest) - Trần Quốc Tuấn
  await prisma.user.upsert({
    where: { phone: '0911223344' },
    update: {},
    create: {
      phone: '0911223344',
      email: 'tuantran.hn@gmail.com',
      fullName: 'Trần Quốc Tuấn',
      role: 'GUEST',
      status: 'ACTIVE',
    },
  });

  // =========================================================================
  // 3. SEED ĐƠN HÀNG MẪU ĐẦY ĐỦ VÒNG ĐỜI (SAMPLE ORDER & TRACKING)
  // =========================================================================
  console.log('📦 3. Seeding Sample Completed Order with Tracking & Logs...');

  const xanhSmCarrier = await prisma.carrier.findUniqueOrThrow({
    where: { code: 'XANH_SM' },
  });

  const xanhSmBikeTier = await prisma.carrierServiceTier.findUniqueOrThrow({
    where: {
      carrierId_tierCode: {
        carrierId: xanhSmCarrier.id,
        tierCode: 'BIKE_INSTANT',
      },
    },
  });

  const sampleOrder = await prisma.order.upsert({
    where: { orderCode: 'FSH-20261103-8899' },
    update: {},
    create: {
      orderCode: 'FSH-20261103-8899',
      trackingToken: 'fsh_live_89a7df6b02a4b3c1d9e20011',
      userId: merchantUser.id,
      carrierId: xanhSmCarrier.id,
      serviceTierId: xanhSmBikeTier.id,
      carrierOrderId: 'GSM-EXPRESS-998822',
      status: 'DELIVERED',
      paymentMethod: 'WALLET',

      pickupSenderName: 'Linh Boutique',
      pickupSenderPhone: '0987654321',
      pickupAddress: 'Tòa Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
      pickupLatitude: 10.7951234,
      pickupLongitude: 106.7218901,
      pickupNote: 'Lấy hàng tại sảnh lễ tân tháp Landmark 1',

      dropoffReceiverName: 'Chị Mai Lan',
      dropoffReceiverPhone: '0933445566',
      dropoffAddress: 'Số 120 đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      dropoffLatitude: 10.7745678,
      dropoffLongitude: 106.7034567,
      dropoffNote: 'Giao giờ hành chính, gọi trước khi lên lầu 5',

      distanceMeters: 4500, // 4.5 km
      durationSeconds: 900,  // 15 phút

      baseFee: 14000,
      surcharges: 5000,     // Phụ phí giờ cao điểm
      platformFee: 1000,    // Phí sàn
      discountAmount: 0,
      finalTotalFee: 20000,

      driverName: 'Nguyễn Văn Hùng',
      driverPhone: '0977112233',
      driverLicensePlate: '59-S3 888.99',
      driverVehicleType: 'ELECTRIC_BIKE',
      driverCurrentLat: 10.7745678,
      driverCurrentLng: 106.7034567,
      driverAssignedAt: new Date(Date.now() - 3600 * 1000),
      pickedUpAt: new Date(Date.now() - 2400 * 1000),
      deliveredAt: new Date(Date.now() - 600 * 1000),

      package: {
        create: {
          name: 'Đầm dạ hội thiết kế dự tiệc',
          packageType: 'FASHION',
          weightInGrams: 850,
          lengthCm: 35,
          widthCm: 25,
          heightCm: 10,
          declaredValueVnd: 1200000,
          codAmountVnd: 0,
          isFragile: false,
          deliverToDoor: true,
          specialInstructions: 'Treo cẩn thận tránh nhăn vải',
        },
      },

      statusLogs: {
        createMany: {
          data: [
            {
              oldStatus: 'DRAFT',
              newStatus: 'BOOKED',
              changedBy: merchantUser.id,
              triggerSource: 'USER_ACTION',
              reason: 'Chủ shop chọn Xanh SM và xác nhận trừ ví',
              createdAt: new Date(Date.now() - 3700 * 1000),
            },
            {
              oldStatus: 'BOOKED',
              newStatus: 'PICKING',
              changedBy: 'XANH_SM_WEBHOOK',
              triggerSource: 'WEBHOOK',
              reason: 'Tài xế Nguyễn Văn Hùng đã nhận cuốc xe điện',
              createdAt: new Date(Date.now() - 3600 * 1000),
            },
            {
              oldStatus: 'PICKING',
              newStatus: 'DELIVERING',
              changedBy: 'XANH_SM_WEBHOOK',
              triggerSource: 'WEBHOOK',
              reason: 'Tài xế đã nhận gói hàng từ shop và bắt đầu giao',
              createdAt: new Date(Date.now() - 2400 * 1000),
            },
            {
              oldStatus: 'DELIVERING',
              newStatus: 'DELIVERED',
              changedBy: 'XANH_SM_WEBHOOK',
              triggerSource: 'WEBHOOK',
              reason: 'Người nhận đã ký nhận gói hàng thành công',
              createdAt: new Date(Date.now() - 600 * 1000),
            },
          ],
        },
      },
    },
  });

  console.log(`✅ Hoàn thành Seeding! Mã đơn mẫu: ${sampleOrder.orderCode}`);
  console.log(`🔗 Link Live Tracking công khai: /tracking/${sampleOrder.trackingToken}`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
