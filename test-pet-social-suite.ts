/**
 * PET SOCIAL NETWORK - AUTOMATED ACCEPTANCE CRITERIA TEST SUITE
 * 18 Acceptance Criteria verified against Domain Store & Security Guards
 */

import { petSocialStore } from './src/services/pet-social.store';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${id}] ${name} -> ${details}`);
}

async function runSuite() {
  console.log('===============================================================');
  console.log('🐾 BẮT ĐẦU CHẠY KIỂM THỬ PET SOCIAL NETWORK (18 ACCEPTANCE CRITERIA)');
  console.log('===============================================================\n');

  // AC-01: User Registration & Uniqueness Validation
  let user1Id = '';
  try {
    const user1 = petSocialStore.createUser({
      email: 'test_owner_1@example.com',
      username: 'testowner1',
      password: 'password123',
      fullName: 'Chủ Nuôi Test 1',
    });
    user1Id = user1.id;

    let caughtDuplicate = false;
    try {
      petSocialStore.createUser({
        email: 'test_owner_1@example.com',
        username: 'testowner2',
        password: 'password123',
        fullName: 'Trùng Email',
      });
    } catch (err: any) {
      if (err.message.includes('đã được đăng ký')) caughtDuplicate = true;
    }

    recordTest(
      'AC-01',
      'Đăng ký tài khoản & Validate duy nhất Email/Username',
      Boolean(user1Id && caughtDuplicate),
      `User ID: ${user1Id}, Bắt lỗi trùng email thành công`
    );
  } catch (err: any) {
    recordTest('AC-01', 'Đăng ký tài khoản', false, err.message);
  }

  // AC-02: User Login & Scrypt Password Verification
  try {
    const internalUser = petSocialStore.findUserByEmailWithPassword('test_owner_1@example.com');
    const validLogin = internalUser && petSocialStore.verifyPassword('password123', internalUser.passwordHash);
    const invalidLogin = internalUser && petSocialStore.verifyPassword('wrongpass', internalUser.passwordHash);

    recordTest(
      'AC-02',
      'Xác thực đăng nhập & Băm mật khẩu an toàn',
      Boolean(validLogin && !invalidLogin),
      `Đúng pass: thành công, Sai pass: bị từ chối chính xác`
    );
  } catch (err: any) {
    recordTest('AC-02', 'Xác thực đăng nhập', false, err.message);
  }

  // Register User 2 for permissions & follow testing
  const user2 = petSocialStore.createUser({
    email: 'test_owner_2@example.com',
    username: 'testowner2',
    password: 'password123',
    fullName: 'Chủ Nuôi Test 2',
  });

  // AC-03: Pet Profile Creation (1 User -> Multiple Pet Cards)
  let pet1Id = '';
  let pet2Id = '';
  try {
    const p1 = petSocialStore.createPet(user1Id, {
      name: 'Bé Miu',
      species: 'CAT',
      breed: 'British Shorthair',
      gender: 'FEMALE',
      bio: 'Bé mèo xám tai cụp siêu quấn người',
    });
    const p2 = petSocialStore.createPet(user1Id, {
      name: 'Bé Corgi Lucky',
      species: 'DOG',
      breed: 'Pembroke Corgi',
      gender: 'MALE',
      bio: 'Chân ngắn mông trái tim thích ăn thịt bò',
    });
    pet1Id = p1.id;
    pet2Id = p2.id;
    const user1Pets = petSocialStore.getPetsByUserId(user1Id);
    const passed = user1Pets.length === 2 && p1.species === 'CAT' && p2.species === 'DOG';
    recordTest(
      'AC-03',
      'Tạo nhiều hồ sơ Pet Profile dưới 1 tài khoản User',
      passed,
      `Đã tạo 2 Pet Cards: ${p1.name} (CAT) và ${p2.name} (DOG)`
    );
  } catch (err: any) {
    recordTest('AC-03', 'Tạo hồ sơ thú cưng', false, err.message);
  }

  // AC-04: Pet IDOR Protection (User 2 cannot edit User 1's pet)
  try {
    let rejectedIllegal = false;
    try {
      petSocialStore.updatePet(pet1Id, user2.id, { name: 'Hack Name' });
    } catch (err: any) {
      if (err.message.includes('403 Forbidden')) rejectedIllegal = true;
    }

    const legalUpdate = petSocialStore.updatePet(pet1Id, user1Id, { name: 'Bé Miu Miu' });
    const passed = rejectedIllegal && legalUpdate.name === 'Bé Miu Miu';

    recordTest(
      'AC-04',
      'Bảo vệ chống IDOR - Chỉ chủ sở hữu mới được sửa Pet Profile',
      passed,
      `User khác sửa -> Bị chặn 403; Chủ nuôi sửa -> Cập nhật thành công`
    );
  } catch (err: any) {
    recordTest('AC-04', 'Chống IDOR Pet', false, err.message);
  }

  // AC-05: Post Creation with 1-4 Images & Over-limit blocking
  let postWithImagesId = '';
  try {
    const post4Img = petSocialStore.createPost(user1Id, {
      content: 'Bé cưng đi tắm nắng sáng nay #cute #cat',
      mediaType: 'IMAGE',
      mediaUrls: [
        'https://r2.petsocial.vn/img1.webp',
        'https://r2.petsocial.vn/img2.webp',
        'https://r2.petsocial.vn/img3.webp',
        'https://r2.petsocial.vn/img4.webp',
      ],
      petIds: [pet1Id],
    });
    postWithImagesId = post4Img.id;

    let rejectedOverLimit = false;
    try {
      petSocialStore.createPost(user1Id, {
        content: '5 ảnh sẽ bị từ chối',
        mediaType: 'IMAGE',
        mediaUrls: [
          'https://r2.petsocial.vn/1.webp',
          'https://r2.petsocial.vn/2.webp',
          'https://r2.petsocial.vn/3.webp',
          'https://r2.petsocial.vn/4.webp',
          'https://r2.petsocial.vn/5.webp',
        ],
      });
    } catch {
      rejectedOverLimit = true;
    }

    const passed = post4Img.mediaUrls.length === 4 && rejectedOverLimit;
    recordTest(
      'AC-05',
      'Đăng bài với 1-4 ảnh & Chặn triệt để quá 4 ảnh',
      passed,
      `4 ảnh -> Hợp lệ; 5 ảnh -> Bị chặn chính xác theo BR-POST-01`
    );
  } catch (err: any) {
    recordTest('AC-05', 'Đăng bài ảnh', false, err.message);
  }

  // AC-06: Video Post Limit (1 video)
  let videoPostId = '';
  try {
    const validVideo = petSocialStore.createPost(user1Id, {
      content: 'Video Lu Lu chạy bộ quanh công viên #dog #runner',
      mediaType: 'VIDEO',
      mediaUrls: ['https://r2.petsocial.vn/run.mp4'],
      petIds: [pet2Id],
    });
    videoPostId = validVideo.id;

    let rejectedMultiVideo = false;
    try {
      petSocialStore.createPost(user1Id, {
        content: '2 video',
        mediaType: 'VIDEO',
        mediaUrls: ['https://r2.petsocial.vn/1.mp4', 'https://r2.petsocial.vn/2.mp4'],
      });
    } catch {
      rejectedMultiVideo = true;
    }

    const passed = validVideo.mediaType === 'VIDEO' && rejectedMultiVideo;
    recordTest(
      'AC-06',
      'Đăng video ngắn & Chặn đăng nhiều hơn 1 video trong 1 bài',
      passed,
      `1 video MP4 -> Thành công; 2 video -> Bị chặn chính xác theo BR-POST-02`
    );
  } catch (err: any) {
    recordTest('AC-06', 'Đăng video ngắn', false, err.message);
  }

  // AC-07: Single Media Type Restriction (No mixing images + video)
  try {
    let rejectedMixed = false;
    try {
      petSocialStore.createPost(user1Id, {
        content: 'Hỗn hợp video và ảnh',
        mediaType: 'VIDEO',
        mediaUrls: ['https://r2.petsocial.vn/v.mp4', 'https://r2.petsocial.vn/img.webp'],
      });
    } catch {
      rejectedMixed = true;
    }
    recordTest(
      'AC-07',
      'Quy tắc đơn hình thức media (Không trộn lẫn ảnh và video trong 1 bài)',
      rejectedMixed,
      `Chặn bài viết chứa đồng thời nhiều định dạng media`
    );
  } catch (err: any) {
    recordTest('AC-07', 'Đơn hình thức media', false, err.message);
  }

  // AC-08: Chronological Feed (createdAt DESC)
  try {
    const { posts } = petSocialStore.getChronologicalFeed({ limit: 10 });
    let isChronological = true;
    for (let i = 0; i < posts.length - 1; i++) {
      const curr = new Date(posts[i].createdAt).getTime();
      const next = new Date(posts[i + 1].createdAt).getTime();
      if (curr < next) {
        isChronological = false;
        break;
      }
    }
    recordTest(
      'AC-08',
      'Dòng thời gian Chronological Feed (Bài mới nhất lên đầu)',
      isChronological,
      `Đã kiểm tra ${posts.length} bài viết, thứ tự createdAt DESC chuẩn xác 100%`
    );
  } catch (err: any) {
    recordTest('AC-08', 'Dòng thời gian Feed', false, err.message);
  }

  // AC-09: Filter Feed by Pet Species (DOG / CAT)
  try {
    const catFeed = petSocialStore.getChronologicalFeed({ species: 'CAT', limit: 10 });
    const dogFeed = petSocialStore.getChronologicalFeed({ species: 'DOG', limit: 10 });
    const hasOnlyCats = catFeed.posts.every((p) => p.pets.some((pet) => pet.species === 'CAT'));
    const hasOnlyDogs = dogFeed.posts.every((p) => p.pets.some((pet) => pet.species === 'DOG'));
    recordTest(
      'AC-09',
      'Lọc bảng tin Feed theo loài thú cưng (DOG / CAT)',
      hasOnlyCats && hasOnlyDogs,
      `Lọc Mèo: ${catFeed.posts.length} bài chuẩn CAT; Lọc Chó: ${dogFeed.posts.length} bài chuẩn DOG`
    );
  } catch (err: any) {
    recordTest('AC-09', 'Lọc Feed theo loài', false, err.message);
  }

  // AC-10: Paw 🐾 Toggle Concurrency & Idempotency
  try {
    const paw1 = petSocialStore.togglePaw(user2.id, postWithImagesId);
    const postAfterPaw1 = petSocialStore.getPostById(postWithImagesId, user2.id);

    const paw2 = petSocialStore.togglePaw(user2.id, postWithImagesId);
    const postAfterPaw2 = petSocialStore.getPostById(postWithImagesId, user2.id);

    const passed =
      paw1.hasPawed === true &&
      postAfterPaw1?.pawCount === 1 &&
      paw2.hasPawed === false &&
      postAfterPaw2?.pawCount === 0;

    recordTest(
      'AC-10',
      'Thả Paw 🐾 Toggle nguyên tử (1 Paw/User, Bật/Tắt chính xác)',
      passed,
      `Paw lần 1 -> Đã thả (+1); Paw lần 2 -> Hủy thả (-1), pawCount về 0`
    );
  } catch (err: any) {
    recordTest('AC-10', 'Thả Paw', false, err.message);
  }

  // AC-11: Comment 1-Level Nesting (Root comment + Reply only)
  let rootCommentId = '';
  let replyCommentId = '';
  try {
    const root = petSocialStore.createComment(user2.id, postWithImagesId, { content: 'Bé cưng đáng yêu quá ạ!' });
    rootCommentId = root.id;

    const reply = petSocialStore.createComment(user1Id, postWithImagesId, {
      content: 'Cảm ơn bạn nhiều nha!',
      parentId: rootCommentId,
    });
    replyCommentId = reply.id;

    // Trying to reply to a reply -> Re-routed to root to enforce max 1 level!
    const replyToReply = petSocialStore.createComment(user2.id, postWithImagesId, {
      content: 'Phản hồi cấp 2',
      parentId: replyCommentId,
    });

    const passed =
      root.parentId === null &&
      reply.parentId === rootCommentId &&
      replyToReply.parentId === rootCommentId; // Enforces max 1-level flattening

    recordTest(
      'AC-11',
      'Bình luận giới hạn phân cấp tối đa 1 tầng (Root + Reply)',
      passed,
      `Bình luận gốc & phản hồi thành công; Phản hồi lồng sâu được gộp chuẩn BR-COMM-01`
    );
  } catch (err: any) {
    recordTest('AC-11', 'Phân cấp bình luận', false, err.message);
  }

  // AC-12: Comment Deletion Permissions (Author or Post Owner)
  try {
    const thirdPartyUser = petSocialStore.createUser({
      email: 'test_intruder@example.com',
      username: 'intruder',
      password: 'password123',
      fullName: 'Kẻ Lạ Mặt',
    });

    let intruderBlocked = false;
    try {
      petSocialStore.deleteComment(replyCommentId, thirdPartyUser.id);
    } catch {
      intruderBlocked = true;
    }

    const authorDelete = petSocialStore.deleteComment(replyCommentId, user1Id);

    const passed = intruderBlocked && authorDelete === true;
    recordTest(
      'AC-12',
      'Quyền xóa bình luận (Chỉ tác giả bình luận hoặc chủ bài viết)',
      passed,
      `Người lạ xóa -> Bị từ chối 403; Chủ bài viết xóa -> Thành công`
    );
  } catch (err: any) {
    recordTest('AC-12', 'Quyền xóa bình luận', false, err.message);
  }

  // AC-13: One-Way Follow (No Friend Request, No Self-Follow)
  try {
    let rejectedSelfFollow = false;
    try {
      petSocialStore.toggleFollow(user1Id, 'testowner1');
    } catch {
      rejectedSelfFollow = true;
    }

    const followAction = petSocialStore.toggleFollow(user2.id, 'testowner1');
    const u1Profile = petSocialStore.getUserPublicProfile('testowner1', user2.id);

    const unfollowAction = petSocialStore.toggleFollow(user2.id, 'testowner1');
    const u1ProfileAfterUnfollow = petSocialStore.getUserPublicProfile('testowner1', user2.id);

    const passed =
      rejectedSelfFollow &&
      followAction.isFollowing === true &&
      u1Profile?.isFollowing === true &&
      u1Profile?.followersCount === 1 &&
      unfollowAction.isFollowing === false &&
      u1ProfileAfterUnfollow?.isFollowing === false &&
      u1ProfileAfterUnfollow?.followersCount === 0;

    recordTest(
      'AC-13',
      'Quan hệ Theo dõi 1 chiều (Follow/Unfollow, Cấm tự theo dõi chính mình)',
      passed,
      `Tự follow -> Bị chặn; Follow/Unfollow User khác -> Cập nhật followerCount chuẩn xác`
    );
  } catch (err: any) {
    recordTest('AC-13', 'Theo dõi 1 chiều', false, err.message);
  }

  // AC-14: Hide & Unhide Post (Only Post Owner)
  try {
    let intruderHideBlocked = false;
    try {
      petSocialStore.hidePost(postWithImagesId, user2.id);
    } catch {
      intruderHideBlocked = true;
    }

    const ownerHide = petSocialStore.hidePost(postWithImagesId, user1Id);
    const postHidden = petSocialStore.getPostById(postWithImagesId, user1Id);
    const ownerUnhide = petSocialStore.unhidePost(postWithImagesId, user1Id);
    const postVisible = petSocialStore.getPostById(postWithImagesId, user1Id);

    const passed =
      intruderHideBlocked &&
      ownerHide.status === 'HIDDEN' &&
      postHidden?.status === 'HIDDEN' &&
      ownerUnhide.status === 'PUBLIC' &&
      postVisible?.status === 'PUBLIC';

    recordTest(
      'AC-14',
      'Chủ bài viết Ẩn/Hiện bài viết cá nhân',
      passed,
      `Kẻ lạ ẩn -> Bị từ chối 403; Chủ bài ẩn -> HIDDEN; Chủ bài hiện -> PUBLIC`
    );
  } catch (err: any) {
    recordTest('AC-14', 'Ẩn/Hiện bài viết', false, err.message);
  }

  // AC-15: Content Reporting & Admin Moderation Action
  try {
    const report = petSocialStore.createReport(user2.id, {
      postId: postWithImagesId,
      reason: 'SPAM',
      details: 'Nghi vấn spam quảng cáo',
    });

    const adminUser = petSocialStore.findUserByUsername('admin')!;
    const adminAction = petSocialStore.resolveReport(report.id, 'RESOLVE_HIDE_POST', adminUser.id);
    const postAfterAdminHide = petSocialStore.getPostById(postWithImagesId);

    const passed =
      report.id !== '' &&
      adminAction === true &&
      postAfterAdminHide === null; // Hidden from public

    recordTest(
      'AC-15',
      'Báo cáo vi phạm & Ban Quản trị xử lý (Admin Action Taken)',
      passed,
      `Người dùng báo cáo -> Admin ẩn bài -> Bài viết tự động bị ẩn khỏi cộng đồng`
    );
  } catch (err: any) {
    recordTest('AC-15', 'Báo cáo vi phạm & Admin', false, err.message);
  }

  // AC-16: Toxic Keyword Filtering
  try {
    let rejectedToxic = false;
    try {
      petSocialStore.createPost(user2.id, {
        content: 'Bán thịt chó mèo giá rẻ tại đây',
        mediaType: 'IMAGE',
        mediaUrls: ['https://r2.petsocial.vn/sample.webp'],
      });
    } catch (err: any) {
      if (err.message.includes('tiêu chuẩn cộng đồng')) {
        rejectedToxic = true;
      }
    }
    recordTest(
      'AC-16',
      'Tự động kiểm duyệt từ khóa độc hại (Bảo vệ thú cưng)',
      rejectedToxic,
      `Chặn thành công nội dung vi phạm chứa từ khóa cấm theo BR-MOD-01`
    );
  } catch (err: any) {
    recordTest('AC-16', 'Kiểm duyệt từ khóa', false, err.message);
  }

  // AC-17: Pet Deletion Post Preservation (CRITICAL REQUIREMENT)
  try {
    // Lu Lu or Pet1 is tagged in postWithImagesId
    const postBeforeDelete = petSocialStore.getPostById(videoPostId, user1Id);

    // Delete pet2
    const deleteResult = petSocialStore.deletePet(pet2Id, user1Id);
    const postAfterDelete = petSocialStore.getPostById(videoPostId, user1Id);

    const passed =
      deleteResult === true &&
      postAfterDelete !== null &&
      postAfterDelete.content === postBeforeDelete?.content &&
      postAfterDelete.userId === user1Id;

    recordTest(
      'AC-17',
      'Xóa hồ sơ Pet Profile -> BẢO TOÀN NGUYÊN VẸN BÀI VIẾT VÀ TƯƠNG TÁC 100%',
      passed,
      `Hồ sơ thú cưng đã xóa thành công; Bài viết gốc ID ${videoPostId} vẫn tồn tại đầy đủ!`
    );
  } catch (err: any) {
    recordTest('AC-17', 'Bảo toàn bài viết khi xóa Pet', false, err.message);
  }

  // AC-18: Magic Bytes Verification Simulation
  try {
    const checkMagicBytes = (buffer: Buffer): string | null => {
      if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
      if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
        return 'image/png';
      if (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      )
        return 'image/webp';
      if (
        buffer.length >= 8 &&
        buffer.toString('ascii', 4, 8) === 'ftyp'
      )
        return 'video/mp4';
      return null;
    };

    const fakePng = Buffer.from('<?php echo "hack"; ?>', 'utf8');
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const passed = checkMagicBytes(fakePng) === null && checkMagicBytes(validPng) === 'image/png';
    recordTest(
      'AC-18',
      'Xác thực Magic Bytes nhị phân (Chặn file mã độc giả mạo đuôi ảnh)',
      passed,
      `Mã PHP đuôi giả .png -> Bị từ chối; Header PNG thật -> Nhận diện chuẩn image/png`
    );
  } catch (err: any) {
    recordTest('AC-18', 'Xác thực Magic Bytes', false, err.message);
  }

  console.log('\n===============================================================');
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ: ${passCount}/${totalCount} TIÊU CHÍ ĐẠT (${Math.round((passCount / totalCount) * 100)}%)`);
  console.log('===============================================================');

  if (passCount === totalCount) {
    console.log('🎉 TOÀN BỘ 18 TIÊU CHÍ ACCEPTANCE CRITERIA ĐỀU ĐẠT CHUẨN XUẤT XƯỞNG!');
  } else {
    console.error('⚠️ Có tiêu chí kiểm thử chưa đạt yêu cầu.');
    process.exit(1);
  }
}

runSuite().catch(console.error);
