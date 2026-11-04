'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { OrderRecord, OrderStatus } from '@/services/order.service';
import type { CarrierCode } from '@/types/carrier.types';
import { formatVND, formatDateTimeVN } from '@/lib/formatters';
import { useToast } from '@/components/common/Toast';

export default function MerchantOrdersPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [carrierFilter, setCarrierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel Modal State
  const [cancellingOrder, setCancellingOrder] = useState<OrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý muốn hủy đơn');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const fetchOrdersList = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getOrders({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as OrderStatus),
        carrierCode: carrierFilter === 'ALL' ? undefined : (carrierFilter as CarrierCode),
      });
      setOrders(res.orders);
    } catch (err: unknown) {
      toastError('Lỗi tải danh sách đơn', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersList();
  }, [statusFilter, carrierFilter]);

  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    setIsSubmittingCancel(true);
    try {
      await apiClient.cancelOrder(cancellingOrder.orderCode, cancelReason);
      toastSuccess('Đã hủy đơn hàng', `Đơn ${cancellingOrder.orderCode} đã hủy, số tiền cước đã hoàn lại ví`);
      setCancellingOrder(null);
      fetchOrdersList();
    } catch (err: unknown) {
      toastError('Không thể hủy đơn', (err as Error).message);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderCode.toLowerCase().includes(q) ||
      o.dropoff.senderOrReceiverName.toLowerCase().includes(q) ||
      o.dropoff.phoneNumber.includes(q)
    );
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Đang giao hàng</span>;
      case 'PICKING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Đang lấy hàng</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Đã giao xong</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Đã hủy đơn</span>;
      case 'BOOKED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Chờ shipper nhận</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="flex-1 bg-slate-100 py-6 px-4 sm:px-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Quản Lý Đơn Hàng Đa Hãng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi và điều hành tất cả các đơn hàng Grab, Xanh SM, ShopeeFood, Ahamove, Be tập trung
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchOrdersList}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm Mới</span>
            </button>

            <Link
              href="/quote"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
            >
              <span>+ Tạo Đơn Mới</span>
            </Link>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên hoặc SĐT người nhận..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lọc Trạng Thái & Hãng */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 font-semibold"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DELIVERING">Đang giao hàng</option>
              <option value="PICKING">Đang lấy hàng</option>
              <option value="BOOKED">Tiếp nhận / Chờ nhận</option>
              <option value="DELIVERED">Đã giao xong</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 font-semibold"
            >
              <option value="ALL">Tất cả hãng</option>
              <option value="XANH_SM">Xanh SM Delivery</option>
              <option value="GRAB">GrabExpress</option>
              <option value="SHOPEE_FOOD">ShopeeFood</option>
              <option value="AHAMOVE">Ahamove</option>
              <option value="BE">beDelivery</option>
            </select>
          </div>
        </div>

        {/* DataTable Danh Sách Đơn Hàng */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3.5 px-4">Mã Đơn / Thời Gian</th>
                  <th className="py-3.5 px-4">Hãng Vận Chuyển</th>
                  <th className="py-3.5 px-4">Người Nhận / Địa Chỉ Giao</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Cước Phí</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Đang tải danh sách đơn hàng...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Không tìm thấy đơn hàng nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.orderCode} className="hover:bg-slate-50/80 transition">
                      {/* Mã đơn & Thời gian */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/track/${order.trackingToken}`}
                          className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          {order.orderCode} <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDateTimeVN(order.createdAt)}
                        </div>
                      </td>

                      {/* Hãng vận chuyển */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{order.carrierCode}</span>
                        <div className="text-[11px] text-slate-500">
                          {order.serviceTier === 'BIKE_INSTANT' ? 'Xe máy tức thì' : order.serviceTier}
                        </div>
                      </td>

                      {/* Người nhận & Địa chỉ */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-800">
                          {order.dropoff.senderOrReceiverName} ({order.dropoff.phoneNumber})
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={order.dropoff.address}>
                          {order.dropoff.address}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>

                      {/* Cước phí */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{formatVND(order.finalTotalFee)}</span>
                        <div className="text-[10px] text-slate-400">{order.paymentMethod}</div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/track/${order.trackingToken}`}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition inline-block text-[11px]"
                        >
                          Xem Live
                        </Link>

                        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                          <button
                            onClick={() => setCancellingOrder(order)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold transition text-[11px]"
                          >
                            Hủy Đơn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Hủy Đơn Hàng */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Xác Nhận Hủy Đơn Hàng
              </h3>
              <button
                onClick={() => setCancellingOrder(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn hàng <strong>{cancellingOrder.orderCode}</strong>? Sau khi
              hủy, toàn bộ tiền cước <strong>{formatVND(cancellingOrder.finalTotalFee)}</strong> sẽ được
              hoàn trả lại ví trả trước của bạn ngay lập tức.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Lý do hủy đơn:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
              >
                <option value="Khách đổi ý muốn hủy đơn">Khách đổi ý không muốn nhận hàng nữa</option>
                <option value="Thay đổi địa chỉ giao hàng">Cần thay đổi địa chỉ hoặc người nhận</option>
                <option value="Tài xế nhận đơn quá lâu">Thời gian chờ shipper nhận quá lâu</option>
                <option value="Đặt nhầm gói cước">Đặt nhầm gói cước / hãng vận chuyển</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCancellingOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Không Hủy
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isSubmittingCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition"
              >
                {isSubmittingCancel ? 'Đang hủy...' : 'Đồng Ý Hủy & Hoàn Tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
