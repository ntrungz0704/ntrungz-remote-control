import { NextResponse } from 'next/server';

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

// Magic bytes validation
function validateMagicBytes(buffer: Uint8Array): { isValid: boolean; detectedType?: 'JPEG' | 'PNG' | 'WEBP' | 'MP4' } {
  if (buffer.length < 12) return { isValid: false };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, detectedType: 'JPEG' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, detectedType: 'PNG' };
  }

  // WEBP: RIFF .... WEBP
  const riff = String.fromCharCode(...buffer.slice(0, 4));
  const webp = String.fromCharCode(...buffer.slice(8, 12));
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { isValid: true, detectedType: 'WEBP' };
  }

  // MP4: .... ftyp
  const ftyp = String.fromCharCode(...buffer.slice(4, 8));
  if (ftyp === 'ftyp') {
    return { isValid: true, detectedType: 'MP4' };
  }

  return { isValid: false };
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: '401 Unauthorized: Vui lòng đăng nhập để tải tệp lên' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy tệp tải lên' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Validate size
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 20 * 1024 * 1024 : 10 * 1024 * 1024; // 20MB video, 10MB photo

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Tệp quá lớn. Giới hạn tối đa là ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate Magic Bytes
    const { isValid, detectedType } = validateMagicBytes(bytes);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Định dạng tệp không hợp lệ hoặc bị giả mạo chữ ký số (Magic Bytes verification failed)' },
        { status: 400 }
      );
    }

    // In local/production, construct R2 / CDN url
    const fileExt = detectedType ? detectedType.toLowerCase() : 'bin';
    const fakeUploadedUrl = `https://r2.petsocial.vn/uploads/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    return NextResponse.json({
      success: true,
      url: fakeUploadedUrl,
      mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      size: file.size,
      detectedType,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải tệp lên' }, { status: 500 });
  }
}
