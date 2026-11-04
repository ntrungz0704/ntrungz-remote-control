'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  EyeOff,
  UserX,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Clock
} from 'lucide-react';
import type { User, Report } from '@/types/pet-social.types';

export default function AdminReportsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('PENDING');

  // Check auth
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchReports();
  }, []);

  const handleAction = async (reportId: string, action: 'DISMISS' | 'HIDE_POST' | 'BAN_USER') => {
    try {
      const res = await fetch('/api/v1/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Xử lý thành công!');
        fetchReports();
      } else {
        alert(data.error || 'Xử lý thất bại');
      }
    } catch (err) {
      console.error('Report action error:', err);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-zinc-900 pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-rose-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chủ</span>
          </Link>
        </div>

        {/* Admin Check */}
        {!isAdmin ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-red-100 shadow-sm">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Quyền truy cập bị hạn chế</h2>
            <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto">
              Chỉ Quản trị viên (Admin) mới có quyền truy cập vào trung tâm kiểm duyệt nội dung vi phạm. Vui lòng đăng nhập với tài khoản Quản trị viên.
            </p>
            <div className="p-4 bg-orange-50 rounded-2xl max-w-sm mx-auto text-xs text-zinc-700 text-left mb-6">
              <p className="font-bold mb-1">Tài khoản Admin Demo:</p>
              <p>Email: <code className="bg-white px-1.5 py-0.5 rounded border border-orange-200">admin@petsocial.vn</code></p>
              <p>Mật khẩu: <code className="bg-white px-1.5 py-0.5 rounded border border-orange-200">adminpassword</code></p>
            </div>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-6 h-6 text-rose-500" />
                  <h1 className="text-2xl font-black text-zinc-900">Trung tâm Kiểm duyệt Nội dung</h1>
                </div>
                <p className="text-sm text-zinc-500">
                  Duyệt và xử lý các báo cáo vi phạm cộng đồng (Spam, bạo lực thú cưng, nội dung không phù hợp).
                </p>
              </div>

              <button
                onClick={fetchReports}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-zinc-700 rounded-xl text-sm font-bold transition self-start sm:self-auto"
              >
                <RefreshCw className="w-4 h-4 text-zinc-500" />
                <span>Làm mới danh sách</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'PENDING'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white text-zinc-600 hover:bg-orange-50'
                }`}
              >
                Chờ xử lý ({reports.filter((r) => r.status === 'PENDING').length})
              </button>
              <button
                onClick={() => setStatusFilter('RESOLVED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'RESOLVED'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white text-zinc-600 hover:bg-orange-50'
                }`}
              >
                Đã xử lý phạt ({reports.filter((r) => r.status === 'RESOLVED').length})
              </button>
              <button
                onClick={() => setStatusFilter('DISMISSED')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'DISMISSED'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white text-zinc-600 hover:bg-orange-50'
                }`}
              >
                Đã bỏ qua ({reports.filter((r) => r.status === 'DISMISSED').length})
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-white text-zinc-600 hover:bg-orange-50'
                }`}
              >
                Tất cả ({reports.length})
              </button>
            </div>

            {/* Reports List */}
            {loading ? (
              <div className="py-16 text-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-400 mb-2" />
                <p className="text-sm font-medium">Đang tải danh sách báo cáo vi phạm...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-orange-100 shadow-sm">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-zinc-800">Không có báo cáo nào ở trạng thái này</h3>
                <p className="text-xs text-zinc-500 mt-1">Cộng đồng thú cưng đang hoạt động an toàn và văn minh!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white rounded-2xl border border-orange-100 p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              report.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : report.status === 'RESOLVED'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {report.status === 'PENDING'
                              ? 'Chờ duyệt'
                              : report.status === 'RESOLVED'
                              ? 'Đã xử phạt'
                              : 'Đã bỏ qua'}
                          </span>

                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            Lý do: {report.reason}
                          </span>

                          <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(report.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        {report.details && (
                          <p className="text-sm text-zinc-700 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100 mb-3">
                            <span className="font-semibold text-zinc-800">Mô tả thêm từ người báo:</span> {report.details}
                          </p>
                        )}

                        <div className="text-xs text-zinc-500">
                          Mã bài viết bị báo cáo:{' '}
                          <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-zinc-800">
                            {report.postId}
                          </code>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {report.status === 'PENDING' && (
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleAction(report.id, 'HIDE_POST')}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Ẩn bài viết</span>
                          </button>

                          <button
                            onClick={() => handleAction(report.id, 'BAN_USER')}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Khóa tài khoản</span>
                          </button>

                          <button
                            onClick={() => handleAction(report.id, 'DISMISS')}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Bỏ qua</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
