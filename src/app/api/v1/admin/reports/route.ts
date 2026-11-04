import { NextResponse } from 'next/server';
import { petSocialStore } from '@/services/pet-social.store';

function getAuthUserId(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer token_')) {
    const parts = authHeader.replace('Bearer ', '').split('_');
    return `${parts[1]}_${parts[2]}`;
  }
  const xUserId = req.headers.get('x-user-id');
  if (xUserId) return xUserId;

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/auth_token=token_([a-zA-Z0-9_]+)/);
    if (match) {
      const parts = match[1].split('_');
      return `${parts[0]}_${parts[1]}`;
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: '401 Unauthorized' }, { status: 401 });
    }

    const user = petSocialStore.findUserById(userId);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '403 Forbidden: Chỉ Admin mới có quyền truy cập' }, { status: 403 });
    }

    const reports = petSocialStore.getAdminReports();
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: '401 Unauthorized' }, { status: 401 });
    }

    const user = petSocialStore.findUserById(userId);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '403 Forbidden: Quyền Admin bắt buộc' }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, action, targetUserId } = body;

    if (action === 'BAN_USER' && targetUserId) {
      petSocialStore.banUser(targetUserId, userId);
      return NextResponse.json({ success: true, message: 'Đã khóa tài khoản người dùng vi phạm' });
    }

    if (!reportId || !action) {
      return NextResponse.json({ error: 'Thiếu reportId hoặc action' }, { status: 400 });
    }

    const success = petSocialStore.resolveReport(reportId, action, userId);
    return NextResponse.json({ success, message: 'Đã xử lý báo cáo thành công' });
  } catch (error: any) {
    const status = error.message.includes('403') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
