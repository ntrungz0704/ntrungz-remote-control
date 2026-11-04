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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const viewerId = getAuthUserId(req) || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu tham số userId' }, { status: 400 });
    }

    const posts = petSocialStore.getUserPosts(userId, viewerId);
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '401 Unauthorized: Vui lòng đăng nhập để đăng bài viết' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { content, mediaType, mediaUrls, petIds } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Nội dung bài viết không được để trống' }, { status: 400 });
    }

    const post = petSocialStore.createPost(userId, {
      content,
      mediaType,
      mediaUrls,
      petIds,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    const status = error.message.includes('429') ? 429 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
