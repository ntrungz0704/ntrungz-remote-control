import { NextResponse } from 'next/server';
import { petSocialStore } from '@/services/pet-social.store';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer token_')) {
      const parts = authHeader.replace('Bearer ', '').split('_');
      userId = `${parts[1]}_${parts[2]}`; // usr_xxxx
    } else {
      // Check cookie
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/auth_token=token_([a-zA-Z0-9_]+)/);
        if (match) {
          const parts = match[1].split('_');
          userId = `${parts[0]}_${parts[1]}`;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = petSocialStore.findUserById(userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const pets = petSocialStore.getPetsByUserId(user.id);

    return NextResponse.json({
      authenticated: true,
      user,
      pets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Lỗi kiểm tra phiên đăng nhập' },
      { status: 500 }
    );
  }
}
