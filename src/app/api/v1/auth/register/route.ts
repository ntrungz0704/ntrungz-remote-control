import { NextResponse } from 'next/server';
import { petSocialStore } from '@/services/pet-social.store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, username, fullName, password, avatarUrl, bio } = body;

    if (!email || !username || !fullName || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ email, username, họ tên và mật khẩu' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có độ dài ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    const user = petSocialStore.createUser({
      email,
      username,
      fullName,
      password,
      avatarUrl,
      bio,
    });

    const token = `token_${user.id}_${Date.now()}`;

    const res = NextResponse.json({
      success: true,
      user,
      token,
      message: 'Đăng ký tài khoản thành công',
    }, { status: 201 });

    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Đăng ký thất bại' },
      { status: 400 }
    );
  }
}
