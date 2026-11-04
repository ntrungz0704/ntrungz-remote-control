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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: '401 Unauthorized: Vui lòng đăng nhập' }, { status: 401 });
    }

    const { postId } = await params;
    const post = petSocialStore.unhidePost(postId, userId);
    return NextResponse.json({ success: true, post, message: 'Đã hiển thị lại bài viết trên bảng tin công khai' });
  } catch (error: any) {
    const status = error.message.includes('403') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
