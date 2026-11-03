'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Package,
  Weight,
  Layers,
  Sparkles,
  Search,
  User,
  Phone,
  Banknote,
  Shield,
  FileText,
  Check,
} from 'lucide-react';
import type { CarrierQuoteRequest, GeoPoint, PackageDetails, ServiceTier, PackageType } from '@/types/carrier.types';

export interface RouteInputFormProps {
  initialValues?: Partial<CarrierQuoteRequest>;
  onSubmit: (request: CarrierQuoteRequest) => void;
  isLoading?: boolean;
}

// Danh mục các cặp lộ trình mẫu để người dùng thử nghiệm nhanh (Hà Nội & TP.HCM)
export const PRESET_ROUTES = [
  {
    label: 'Hà Nội: Bách Khoa ➔ Đội Cấn',
    tag: '4.2 km',
    pickup: {
      latitude: 21.0044,
      longitude: 105.8433,
      address: '24 Tạ Quang Bửu, Phường Bách Khoa, Hai Bà Trưng, Hà Nội',
      senderOrReceiverName: 'Kho Bách Khoa Shop',
      phoneNumber: '0988111222',
      note: 'Lấy hàng tại cửa hàng tầng 1',
    },
    dropoff: {
      latitude: 21.0373,
      longitude: 105.8152,
      address: '280 Đội Cấn, Phường Liễu Giai, Ba Đình, Hà Nội',
      senderOrReceiverName: 'Nguyễn Văn Nhận',
      phoneNumber: '0912333444',
      note: 'Gọi trước 5 phút khi tới nơi',
    },
  },
  {
    label: 'Hà Nội: Tràng Tiền ➔ Cầu Giấy',
    tag: '7.8 km',
    pickup: {
      latitude: 21.0285,
      longitude: 105.8544,
      address: 'Số 1 Tràng Tiền, Phường Phan Chu Trinh, Hoàn Kiếm, Hà Nội',
      senderOrReceiverName: 'Boutique Tràng Tiền',
      phoneNumber: '0988111222',
      note: 'Gặp bảo vệ nhận bọc quà',
    },
    dropoff: {
      latitude: 21.0362,
      longitude: 105.7905,
      address: '144 Xuân Thủy, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
      senderOrReceiverName: 'Trần Thị Thu',
      phoneNumber: '0977222333',
      note: 'Giao tại sảnh tòa nhà chung cư',
    },
  },
  {
    label: 'TP.HCM: Bến Thành ➔ Landmark 81',
    tag: '5.6 km',
    pickup: {
      latitude: 10.7725,
      longitude: 106.698,
      address: 'Chợ Bến Thành, Đường Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
      senderOrReceiverName: 'Cửa Hàng Đặc Sản Sài Gòn',
      phoneNumber: '0903112233',
      note: 'Cửa Đông chợ Bến Thành',
    },
    dropoff: {
      latitude: 10.795,
      longitude: 106.7218,
      address: 'Landmark 81, Vinhomes Central Park, Bình Thạnh, TP.HCM',
      senderOrReceiverName: 'Lê Hoàng Nam',
      phoneNumber: '0938555666',
      note: 'Giao tại sảnh L1 lễ tân',
    },
  },
  {
    label: 'TP.HCM: Sân Bay Tân Sơn Nhất ➔ Q.3',
    tag: '4.8 km',
    pickup: {
      latitude: 10.8185,
      longitude: 106.6588,
      address: 'Ga Quốc Nội Tân Sơn Nhất, Trường Sơn, Tân Bình, TP.HCM',
      senderOrReceiverName: 'Văn Phòng Express TSN',
      phoneNumber: '0909444555',
    },
    dropoff: {
      latitude: 10.7788,
      longitude: 106.689,
      address: 'Nam Kỳ Khởi Nghĩa, Phường 7, Quận 3, TP.HCM',
      senderOrReceiverName: 'Vũ Minh Trí',
      phoneNumber: '0918777888',
    },
  },
];

export function RouteInputForm({ initialValues, onSubmit, isLoading = false }: RouteInputFormProps) {
  // Mặc định chọn lộ trình mẫu đầu tiên (Hà Nội Bách Khoa -> Đội Cấn)
  const defaultPreset = PRESET_ROUTES[0];

  const [pickup, setPickup] = useState<GeoPoint>(initialValues?.pickup || defaultPreset.pickup);
  const [dropoff, setDropoff] = useState<GeoPoint>(initialValues?.dropoff || defaultPreset.dropoff);

  const [packageDetails, setPackageDetails] = useState<PackageDetails>({
    name: initialValues?.packageDetails?.name || 'Hộp quà thời trang cao cấp',
    weightInGrams: initialValues?.packageDetails?.weightInGrams || 1500,
    lengthCm: initialValues?.packageDetails?.lengthCm || 25,
    widthCm: initialValues?.packageDetails?.widthCm || 20,
    heightCm: initialValues?.packageDetails?.heightCm || 10,
    packageType: initialValues?.packageDetails?.packageType || 'FASHION',
    declaredValueVnd: initialValues?.packageDetails?.declaredValueVnd || 500000,
    codAmountVnd: initialValues?.packageDetails?.codAmountVnd || 0,
    deliverToDoor: initialValues?.packageDetails?.deliverToDoor ?? true,
    isFragile: initialValues?.packageDetails?.isFragile ?? false,
    specialInstructions: initialValues?.packageDetails?.specialInstructions || '',
  });

  const [serviceTier, setServiceTier] = useState<ServiceTier>(
    initialValues?.serviceTier || 'BIKE_INSTANT'
  );

  const [activeTab, setActiveTab] = useState<'ROUTE' | 'PACKAGE'>('ROUTE');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Chọn lộ trình mẫu
  const handleApplyPreset = (preset: (typeof PRESET_ROUTES)[0]) => {
    setPickup(preset.pickup);
    setDropoff(preset.dropoff);
    setValidationErrors({});
  };

  const handleValidateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!pickup.address || pickup.address.trim().length < 5) {
      errors.pickupAddress = 'Vui lòng nhập địa chỉ lấy hàng hợp lệ';
    }
    if (!pickup.phoneNumber || !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(pickup.phoneNumber)) {
      errors.pickupPhone = 'Số điện thoại người gửi không đúng định dạng';
    }
    if (!dropoff.address || dropoff.address.trim().length < 5) {
      errors.dropoffAddress = 'Vui lòng nhập địa chỉ giao hàng hợp lệ';
    }
    if (!dropoff.phoneNumber || !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(dropoff.phoneNumber)) {
      errors.dropoffPhone = 'Số điện thoại người nhận không đúng định dạng';
    }
    if (packageDetails.weightInGrams <= 0) {
      errors.weight = 'Trọng lượng kiện hàng phải lớn hơn 0 gram';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSubmit({
      pickup,
      dropoff,
      packageDetails,
      serviceTier,
    });
  };

  return (
    <form
      onSubmit={handleValidateAndSubmit}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-5"
    >
      {/* Header & Quick Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" /> Thiết Lập Lộ Trình & Kiện Hàng
          </h2>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            So sánh tức thì 6 hãng
          </span>
        </div>

        {/* Cụm nút chọn mẫu địa chỉ nhanh */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" aria-hidden="true" /> Chọn nhanh lộ trình mẫu thử nghiệm:
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_ROUTES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                aria-label={`Chọn nhanh lộ trình mẫu ${p.label}, cự ly ${p.tag}`}
                className={`text-left p-2 rounded-xl text-xs border transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  pickup.address === p.pickup.address
                    ? 'bg-blue-50/80 border-blue-300 text-blue-800 font-semibold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="truncate pr-1">{p.label}</span>
                <span className="text-[10px] text-slate-600 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0">
                  {p.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Chuyển đổi giữa Lộ trình & Kiện hàng */}
      <div role="tablist" aria-label="Tùy chọn thiết lập đơn hàng" className="flex items-center border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          role="tab"
          id="tab-route"
          aria-selected={activeTab === 'ROUTE'}
          aria-controls="panel-route"
          onClick={() => setActiveTab('ROUTE')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeTab === 'ROUTE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Địa Chỉ Điểm Lấy & Giao
        </button>
        <button
          type="button"
          role="tab"
          id="tab-package"
          aria-selected={activeTab === 'PACKAGE'}
          aria-controls="panel-package"
          onClick={() => setActiveTab('PACKAGE')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            activeTab === 'PACKAGE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Package className="w-3.5 h-3.5" aria-hidden="true" /> Kiện Hàng & Thu Hộ COD
        </button>
      </div>

      {/* Tab 1: Thông tin Lộ Trình Lấy & Giao */}
      {activeTab === 'ROUTE' && (
        <div id="panel-route" role="tabpanel" aria-labelledby="tab-route" className="space-y-4">
          {/* Điểm Lấy Hàng (Pickup) */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" aria-hidden="true" />
              <span>ĐIỂM LẤY HÀNG (NGƯỜI GỬI)</span>
            </div>

            <div>
              <input
                type="text"
                placeholder="Nhập địa chỉ lấy hàng chính xác..."
                aria-label="Địa chỉ lấy hàng của người gửi"
                value={pickup.address}
                onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-xs text-slate-800 bg-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.pickupAddress ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {validationErrors.pickupAddress && (
                <div className="text-[11px] text-rose-500 mt-1" role="alert">{validationErrors.pickupAddress}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tên người gửi"
                  aria-label="Tên người gửi"
                  value={pickup.senderOrReceiverName}
                  onChange={(e) => setPickup({ ...pickup, senderOrReceiverName: e.target.value })}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                <input
                  type="tel"
                  placeholder="SĐT người gửi"
                  aria-label="Số điện thoại người gửi"
                  value={pickup.phoneNumber}
                  onChange={(e) => setPickup({ ...pickup, phoneNumber: e.target.value })}
                  className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-1 ${
                    validationErrors.pickupPhone ? 'border-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Điểm Giao Hàng (Dropoff) */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100" aria-hidden="true" />
              <span>ĐIỂM GIAO HÀNG (NGƯỜI NHẬN)</span>
            </div>

            <div>
              <input
                type="text"
                placeholder="Nhập địa chỉ giao hàng chính xác..."
                aria-label="Địa chỉ giao hàng của người nhận"
                value={dropoff.address}
                onChange={(e) => setDropoff({ ...dropoff, address: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-xs text-slate-800 bg-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.dropoffAddress ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {validationErrors.dropoffAddress && (
                <div className="text-[11px] text-rose-500 mt-1" role="alert">{validationErrors.dropoffAddress}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tên người nhận"
                  aria-label="Tên người nhận"
                  value={dropoff.senderOrReceiverName}
                  onChange={(e) => setDropoff({ ...dropoff, senderOrReceiverName: e.target.value })}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" aria-hidden="true" />
                <input
                  type="tel"
                  placeholder="SĐT người nhận"
                  aria-label="Số điện thoại người nhận"
                  value={dropoff.phoneNumber}
                  onChange={(e) => setDropoff({ ...dropoff, phoneNumber: e.target.value })}
                  className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-1 ${
                    validationErrors.dropoffPhone ? 'border-rose-500' : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Ghi chú cho shipper khi giao hàng (VD: Tầng 3, phòng 302)..."
                aria-label="Ghi chú thêm cho shipper"
                value={dropoff.note || ''}
                onChange={(e) => setDropoff({ ...dropoff, note: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Thông tin Kiện hàng & COD */}
      {activeTab === 'PACKAGE' && (
        <div id="panel-package" role="tabpanel" aria-labelledby="tab-package" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Tên món hàng / Sản phẩm
              </label>
              <input
                type="text"
                value={packageDetails.name}
                onChange={(e) => setPackageDetails({ ...packageDetails, name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Loại kiện hàng
              </label>
              <select
                value={packageDetails.packageType}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, packageType: e.target.value as PackageType })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="FASHION">Quần áo / Thời trang</option>
                <option value="FOOD">Đồ ăn / Đồ uống</option>
                <option value="DOCUMENT">Tài liệu / Hợp đồng</option>
                <option value="ELECTRONICS">Thiết bị điện tử</option>
                <option value="FRAGILE">Hàng dễ vỡ / Mỹ phẩm</option>
              </select>
            </div>
          </div>

          {/* Trọng lượng & Kích thước */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Khối lượng (gram)
              </label>
              <input
                type="number"
                min={50}
                max={50000}
                value={packageDetails.weightInGrams}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, weightInGrams: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Dài (cm)</label>
              <input
                type="number"
                value={packageDetails.lengthCm}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, lengthCm: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Rộng (cm)</label>
              <input
                type="number"
                value={packageDetails.widthCm}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, widthCm: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">Cao (cm)</label>
              <input
                type="number"
                value={packageDetails.heightCm}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, heightCm: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
          </div>

          {/* COD & Giá trị khai giá */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                <Banknote className="w-3.5 h-3.5 text-amber-600" /> Tiền Thu Hộ COD (VNĐ)
              </label>
              <input
                type="number"
                step={10000}
                min={0}
                value={packageDetails.codAmountVnd}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, codAmountVnd: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white font-bold text-slate-800"
              />
              <span className="text-[10px] text-amber-700 block mt-1">
                {packageDetails.codAmountVnd > 0 ? 'Shipper thu tiền khi giao' : 'Không thu hộ tiền'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80">
              <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Khai Giá Hàng Hóa (VNĐ)
              </label>
              <input
                type="number"
                step={50000}
                min={0}
                value={packageDetails.declaredValueVnd}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, declaredValueVnd: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-blue-300 text-xs bg-white font-bold text-slate-800"
              />
              <span className="text-[10px] text-blue-700 block mt-1">Bảo hiểm bồi hoàn 100% giá trị</span>
            </div>
          </div>

          {/* Checkboxes Dịch vụ cộng thêm */}
          <div className="flex items-center gap-4 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={packageDetails.deliverToDoor}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, deliverToDoor: e.target.checked })
                }
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-slate-700">Giao tận tay / lên phòng</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={packageDetails.isFragile}
                onChange={(e) =>
                  setPackageDetails({ ...packageDetails, isFragile: e.target.checked })
                }
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-slate-700">Hàng dễ vỡ, nhẹ tay</span>
            </label>
          </div>
        </div>
      )}

      {/* Chọn Phân Hạng Dịch Vụ */}
      <div className="pt-2 border-t border-slate-200">
        <label id="service-tier-label" className="text-[11px] font-bold text-slate-600 block mb-2">
          Phương tiện di chuyển mong muốn:
        </label>
        <div role="radiogroup" aria-labelledby="service-tier-label" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'BIKE_INSTANT', label: 'Xe máy siêu tốc', desc: 'Dưới 30-45p' },
            { id: 'BIKE_SAME_DAY', label: 'Xe máy trong ngày', desc: 'Tiết kiệm cước' },
            { id: 'CAR_DELIVERY', label: 'Xe ô tô 4 chỗ', desc: 'Che mưa nắng' },
            { id: 'TRUCK_500KG', label: 'Xe tải 500kg', desc: 'Hàng cồng kềnh' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={serviceTier === item.id}
              onClick={() => setServiceTier(item.id as ServiceTier)}
              className={`p-2 rounded-xl border text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                serviceTier === item.id
                  ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-600'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <div className="text-xs font-bold leading-tight">{item.label}</div>
              <div className="text-[10px] text-slate-600 font-normal mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Nút bấm Tìm & So Sánh Cước */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
            isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/20 active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Đang kết nối 6 hãng song song (&lt; 1.5s)...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>So Sánh Giá Cước Ngay Lập Tức</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
