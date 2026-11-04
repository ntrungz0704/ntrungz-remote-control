import { NextResponse } from 'next/server';
import { petSocialStore } from '@/services/pet-social.store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp email và mật khẩu' },
        { status: 400 }
      );
    }

    const internalUser = petSocialStore.findUserByEmailWithPassword(email);
    if (!internalUser) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    if (internalUser.status === 'BANNED') {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng' },
        { status: 403 }
      );
    }

    const isValid = petSocialStore.verifyPassword(password, internalUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const { passwordHash, ...user } = internalUser;
    const token = `token_${user.id}_${Date.now()}`;

    const res = NextResponse.json({
      success: true,
      user,
      token,
      message: 'Đăng nhập thành công',
    });

    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Đăng nhập thất bại' },
      { status: 500 }
    );
  }
}
