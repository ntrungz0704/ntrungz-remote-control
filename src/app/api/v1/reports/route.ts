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

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '401 Unauthorized: Vui lòng đăng nhập để gửi báo cáo' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { postId, reason, details } = body;

    if (!postId || !reason) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp postId và lý do báo cáo' },
        { status: 400 }
      );
    }

    const report = petSocialStore.createReport(userId, {
      postId,
      reason,
      details,
    });

    return NextResponse.json({
      success: true,
      report,
      message: 'Cảm ơn bạn đã báo cáo. Đội ngũ quản trị sẽ xem xét trong thời gian sớm nhất.',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
