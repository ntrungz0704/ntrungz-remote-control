import { NextResponse } from 'next/server';
import { petSocialStore } from '@/services/pet-social.store';

// Helper to extract userId from Authorization or Header
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
    const userId = searchParams.get('userId') || getAuthUserId(req);

    if (!userId) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp userId hoặc đăng nhập' },
        { status: 400 }
      );
    }

    const pets = petSocialStore.getPetsByUserId(userId);
    return NextResponse.json({ success: true, pets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi lấy danh sách thú cưng' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '401 Unauthorized: Vui lòng đăng nhập để tạo hồ sơ thú cưng' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, species, breed, avatarUrl, birthDate, gender, bio } = body;

    if (!name || !species || !breed) {
      return NextResponse.json(
        { error: 'Vui lòng điền tên bé cưng, phân loài (DOG/CAT/OTHER) và giống' },
        { status: 400 }
      );
    }

    const pet = petSocialStore.createPet(userId, {
      name,
      species,
      breed,
      avatarUrl,
      birthDate,
      gender,
      bio,
    });

    return NextResponse.json({ success: true, pet }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi tạo hồ sơ thú cưng' },
      { status: 400 }
    );
  }
}
