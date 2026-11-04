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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: '401 Unauthorized: Vui lòng đăng nhập' }, { status: 401 });
    }

    const { commentId } = await params;
    const user = petSocialStore.findUserById(userId);
    const isAdmin = user?.role === 'ADMIN';

    const success = petSocialStore.deleteComment(commentId, userId, isAdmin);
    return NextResponse.json({ success, message: 'Đã xóa bình luận thành công' });
  } catch (error: any) {
    const status = error.message.includes('403') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
