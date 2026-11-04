// ============================================================================
// PET SOCIAL NETWORK — PRISMA SEED SCRIPT
// Populates Database with Realistic Initial Data for Pet Social Network
// ============================================================================

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = 'pet_social_salt_2026';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

async function main() {
  console.log('🐾 [SEED] Bắt đầu khởi tạo dữ liệu mẫu Pet Social Network...');

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@petsocial.vn' },
    update: {},
    create: {
      email: 'admin@petsocial.vn',
      username: 'admin',
      fullName: 'Quản Trị Viên PetHub',
      passwordHash: hashPassword('AdminPassword2026!'),
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      bio: 'Bảo vệ không gian mạng xã hội thú cưng an toàn và văn minh 🛡️🐾',
      role: 'ADMIN',
    },
  });

  // 2. User 1: Linh Corgi
  const user1 = await prisma.user.upsert({
    where: { email: 'linh.corgi@gmail.com' },
    update: {},
    create: {
      email: 'linh.corgi@gmail.com',
      username: 'linh_corgilove',
      fullName: 'Khánh Linh & Lu Lu',
      passwordHash: hashPassword('User1Password2026!'),
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      bio: 'Mẹ của bé Corgi mông to Lu Lu. Mê đi cafe và chụp ảnh thú cưng!',
    },
  });

  // 3. User 2: Tuấn Mèo Mướp
  const user2 = await prisma.user.upsert({
    where: { email: 'tuan.meo@gmail.com' },
    update: {},
    create: {
      email: 'tuan.meo@gmail.com',
      username: 'tuan_catlover',
      fullName: 'Minh Tuấn & Miu Miu',
      passwordHash: hashPassword('User2Password2026!'),
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      bio: 'Nhà nuôi 2 bé mèo mướp cứu hộ. Chuyên review pate và cát vệ sinh.',
    },
  });

  // 4. Pets for User 1
  const pet1 = await prisma.pet.create({
    data: {
      userId: user1.id,
      name: 'Lu Lu',
      species: 'DOG',
      breed: 'Corgi Pembroke',
      avatarUrl: 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=300&q=80',
      birthDate: new Date('2023-04-12'),
      gender: 'MALE',
      bio: 'Mông to, chân ngắn, sở thích cắn dép và ăn kem sữa chua.',
    },
  });

  const pet2 = await prisma.pet.create({
    data: {
      userId: user1.id,
      name: 'Bim Bim',
      species: 'DOG',
      breed: 'Poodle Toy',
      avatarUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80',
      birthDate: new Date('2024-01-05'),
      gender: 'FEMALE',
      bio: 'Tiểu thư điệu đà, thích mặc áo đầm.',
    },
  });

  // 5. Pet for User 2
  const pet3 = await prisma.pet.create({
    data: {
      userId: user2.id,
      name: 'Miu Miu',
      species: 'CAT',
      breed: 'Mèo Mướp Ta',
      avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80',
      birthDate: new Date('2022-09-20'),
      gender: 'FEMALE',
      bio: 'Được cứu hộ từ bãi xe, nay đã thành đại hoàng hậu trong nhà.',
    },
  });

  // 6. Posts
  const post1 = await prisma.post.create({
    data: {
      userId: user1.id,
      content: 'Hôm nay trời nắng đẹp, dẫn đại ca Lu Lu đi dạo công viên Tao Đàn. Vừa thấy bóng con bướm là chạy đuổi theo té lăn cù nè mọi người ơi! 🐶☀️ #corgilove #thucungvietnam',
      mediaType: 'IMAGE',
      mediaUrls: [
        'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80',
      ],
      pawCount: 2,
      commentCount: 2,
      petTags: {
        create: [{ petId: pet1.id }],
      },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      userId: user2.id,
      content: 'Khoảnh khắc Miu Miu nằm phơi bụng đòi nạp pate chiều nay. Nhìn đôi mắt long lanh này thì làm sao sen nỡ từ chối được cơ chứ! 🐱❤️ #meomup #yeumeo',
      mediaType: 'IMAGE',
      mediaUrls: [
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
      ],
      pawCount: 1,
      commentCount: 0,
      petTags: {
        create: [{ petId: pet3.id }],
      },
    },
  });

  console.log(`🐾 [SEED] Đã tạo thành công Admin (${admin.username}), User 1 (${user1.username}), User 2 (${user2.username}) và các bài đăng!`);
}

main()
  .catch((e) => {
    console.error('❌ [SEED ERROR]:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
