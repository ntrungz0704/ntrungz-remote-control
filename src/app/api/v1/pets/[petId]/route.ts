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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const { petId } = await params;
    const pet = petSocialStore.getPetById(petId);
    if (!pet) {
      return NextResponse.json({ error: 'Không tìm thấy thú cưng' }, { status: 404 });
    }
    return NextResponse.json({ success: true, pet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: '401 Unauthorized: Vui lòng đăng nhập' }, { status: 401 });
    }

    const { petId } = await params;
    const body = await req.json();

    const updated = petSocialStore.updatePet(petId, userId, body);
    return NextResponse.json({ success: true, pet: updated });
  } catch (error: any) {
    const status = error.message.includes('403') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: '401 Unauthorized: Vui lòng đăng nhập' }, { status: 401 });
    }

    const { petId } = await params;
    const success = petSocialStore.deletePet(petId, userId);
    return NextResponse.json({
      success,
      message: 'Đã xóa hồ sơ bé cưng thành công (bài viết cũ vẫn được giữ nguyên)',
    });
  } catch (error: any) {
    const status = error.message.includes('403') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
}
