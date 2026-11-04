// ============================================================================
// PET SOCIAL NETWORK — IN-MEMORY & ATOMIC DOMAIN REPOSITORY
// High-performance, Thread-safe In-Memory Store with Seed Data
// ============================================================================

import crypto from 'node:crypto';
import type {
  User,
  Pet,
  Post,
  PostDetail,
  Comment,
  CommentWithReplies,
  Paw,
  Follow,
  Report,
  PetSpecies,
  PetGender,
  MediaType,
  PostStatus,
  ReportReason,
  ReportStatus,
  UserRole,
  UserStatus,
  UserPublicProfile,
} from '@/types/pet-social.types';

export interface InternalUser extends User {
  passwordHash: string;
}

export interface PostPetTag {
  id: string;
  postId: string;
  petId: string;
  createdAt: string;
}

// Banned words list for basic keyword filtering
const BANNED_KEYWORDS = [
  'đánh đập',
  'bạo hành',
  'ngược đãi',
  'thịt chó',
  'thịt mèo',
  'chọi chó',
  'lừa đảo',
  'bán trộm',
  'thuốc độc',
];

export class PetSocialStore {
  private users: Map<string, InternalUser> = new Map();
  private pets: Map<string, Pet> = new Map();
  private posts: Map<string, Post> = new Map();
  private postPetTags: Map<string, PostPetTag> = new Map();
  private paws: Map<string, Paw> = new Map(); // key: `${userId}_${postId}`
  private comments: Map<string, Comment> = new Map();
  private follows: Map<string, Follow> = new Map(); // key: `${followerId}_${followingId}`
  private reports: Map<string, Report> = new Map();

  // Rate Limiting tracking: userId -> timestamps[]
  private pawRateLimits: Map<string, number[]> = new Map();
  private commentRateLimits: Map<string, { timestamp: number; content: string }[]> = new Map();
  private postRateLimits: Map<string, number[]> = new Map();

  constructor() {
    this.seedInitialData();
  }

  // --- Password Helpers (Native Node.js crypto) ---
  public hashPassword(password: string): string {
    const salt = 'pet_social_salt_2026';
    return crypto.scryptSync(password, salt, 32).toString('hex');
  }

  public verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  // --- User Operations ---
  public createUser(data: {
    email: string;
    username: string;
    fullName: string;
    password: string;
    avatarUrl?: string;
    bio?: string;
    role?: UserRole;
  }): User {
    const emailLower = data.email.toLowerCase().trim();
    const usernameLower = data.username.toLowerCase().trim();

    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailLower) {
        throw new Error('Email đã được đăng ký trên hệ thống');
      }
      if (u.username.toLowerCase() === usernameLower) {
        throw new Error('Tên người dùng (username) đã được sử dụng');
      }
    }

    const id = `usr_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const newUser: InternalUser = {
      id,
      email: emailLower,
      username: usernameLower,
      fullName: data.fullName.trim(),
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      bio: data.bio || 'Yêu thú cưng và cuộc sống tự nhiên 🐾',
      role: data.role || 'USER',
      status: 'ACTIVE',
      passwordHash: this.hashPassword(data.password),
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, newUser);
    return this.sanitizeUser(newUser);
  }

  public findUserById(id: string): User | null {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  }

  public findUserByUsername(username: string): User | null {
    const usernameLower = username.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === usernameLower) {
        return this.sanitizeUser(u);
      }
    }
    return null;
  }

  public findUserByEmailWithPassword(email: string): InternalUser | null {
    const emailLower = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailLower) {
        return u;
      }
    }
    return null;
  }

  public getUserPublicProfile(username: string, viewerId?: string): UserPublicProfile | null {
    const user = this.findUserByUsername(username);
    if (!user) return null;

    const pets = this.getPetsByUserId(user.id);
    const posts = Array.from(this.posts.values()).filter(
      (p) => p.userId === user.id && p.status === 'PUBLIC'
    );
    
    let followersCount = 0;
    let followingCount = 0;
    let isFollowing = false;

    for (const f of this.follows.values()) {
      if (f.followingId === user.id) {
        followersCount++;
        if (viewerId && f.followerId === viewerId) {
          isFollowing = true;
        }
      }
      if (f.followerId === user.id) {
        followingCount++;
      }
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      petsCount: pets.length,
      postsCount: posts.length,
      followersCount,
      followingCount,
      isFollowing,
    };
  }

  private sanitizeUser(internal: InternalUser): User {
    const { passwordHash, ...safe } = internal;
    return safe;
  }

  // --- Pet Operations ---
  public createPet(userId: string, data: {
    name: string;
    species: PetSpecies;
    breed: string;
    avatarUrl?: string | null;
    birthDate?: string | null;
    gender?: PetGender;
    bio?: string | null;
  }): Pet {
    if (!this.users.has(userId)) {
      throw new Error('Tài khoản người dùng không tồn tại');
    }

    const id = `pet_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const newPet: Pet = {
      id,
      userId,
      name: data.name.trim(),
      species: data.species,
      breed: data.breed.trim(),
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80',
      birthDate: data.birthDate || null,
      gender: data.gender || 'UNKNOWN',
      bio: data.bio || null,
      createdAt: now,
      updatedAt: now,
    };

    this.pets.set(id, newPet);
    return newPet;
  }

  public getPetsByUserId(userId: string): Pet[] {
    const list: Pet[] = [];
    for (const p of this.pets.values()) {
      if (p.userId === userId) {
        list.push(p);
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getPetById(petId: string): Pet | null {
    return this.pets.get(petId) || null;
  }

  public updatePet(petId: string, currentUserId: string, updates: Partial<Pet>): Pet {
    const pet = this.pets.get(petId);
    if (!pet) throw new Error('Không tìm thấy thú cưng');
    if (pet.userId !== currentUserId) {
      throw new Error('403 Forbidden: Bạn không có quyền chỉnh sửa hồ sơ này');
    }

    const updated: Pet = {
      ...pet,
      ...updates,
      id: pet.id,
      userId: pet.userId,
      updatedAt: new Date().toISOString(),
    };
    this.pets.set(petId, updated);
    return updated;
  }

  public deletePet(petId: string, currentUserId: string): boolean {
    const pet = this.pets.get(petId);
    if (!pet) throw new Error('Không tìm thấy thú cưng');
    if (pet.userId !== currentUserId) {
      throw new Error('403 Forbidden: Bạn không có quyền xóa hồ sơ này');
    }

    // Business Rule BR-ID-004: Xóa liên kết trong postPetTags, bảo toàn bài viết gốc!
    for (const [tagId, tag] of this.postPetTags.entries()) {
      if (tag.petId === petId) {
        this.postPetTags.delete(tagId);
      }
    }

    return this.pets.delete(petId);
  }

  // --- Post Operations ---
  public createPost(userId: string, data: {
    content: string;
    mediaType?: MediaType;
    mediaUrls?: string[];
    petIds?: string[];
  }): PostDetail {
    const user = this.users.get(userId);
    if (!user) throw new Error('Người dùng không tồn tại');
    if (user.status === 'BANNED') throw new Error('Tài khoản của bạn đã bị khóa');

    // Anti-spam check: max 5 posts per 10 mins
    this.checkPostRateLimit(userId);

    // Keyword moderation
    this.filterContent(data.content);

    // Business Rule BR-POST-001: Only image OR video
    const mediaType = data.mediaType || 'NONE';
    const mediaUrls = data.mediaUrls || [];

    if (mediaType === 'IMAGE') {
      if (mediaUrls.length > 4) {
        throw new Error('Một bài viết chỉ được chứa tối đa 4 ảnh');
      }
    } else if (mediaType === 'VIDEO') {
      if (mediaUrls.length > 1) {
        throw new Error('Một bài viết chỉ được chứa tối đa 1 video');
      }
    }

    // Business Rule: Max 5 pets tagged
    const petIds = (data.petIds || []).slice(0, 5);
    for (const pId of petIds) {
      const pet = this.pets.get(pId);
      if (!pet || pet.userId !== userId) {
        throw new Error('Chỉ được gắn thẻ thú cưng do chính bạn quản lý');
      }
    }

    const postId = `post_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();

    const post: Post = {
      id: postId,
      userId,
      content: data.content.trim(),
      mediaType,
      mediaUrls,
      status: 'PUBLIC',
      pawCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.posts.set(postId, post);

    // Create pet tags
    for (const pId of petIds) {
      const tagId = `tag_${crypto.randomUUID().slice(0, 8)}`;
      this.postPetTags.set(tagId, {
        id: tagId,
        postId,
        petId: pId,
        createdAt: now,
      });
    }

    return this.enrichPost(post, userId);
  }

  public getPostById(postId: string, viewerId?: string): PostDetail | null {
    const post = this.posts.get(postId);
    if (!post) return null;
    if (post.status === 'SOFT_DELETED') return null;
    if (post.status === 'HIDDEN' && post.userId !== viewerId) return null;

    return this.enrichPost(post, viewerId);
  }

  public hidePost(postId: string, userId: string): PostDetail {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Không tìm thấy bài viết');
    if (post.userId !== userId) {
      throw new Error('403 Forbidden: Chỉ chủ bài viết mới có quyền ẩn bài');
    }

    post.status = 'HIDDEN';
    post.updatedAt = new Date().toISOString();
    this.posts.set(postId, post);
    return this.enrichPost(post, userId);
  }

  public unhidePost(postId: string, userId: string): PostDetail {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Không tìm thấy bài viết');
    if (post.userId !== userId) {
      throw new Error('403 Forbidden: Chỉ chủ bài viết mới có quyền hiển thị lại bài');
    }

    post.status = 'PUBLIC';
    post.updatedAt = new Date().toISOString();
    this.posts.set(postId, post);
    return this.enrichPost(post, userId);
  }

  public deletePost(postId: string, userId: string, isAdmin = false): boolean {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Không tìm thấy bài viết');
    if (post.userId !== userId && !isAdmin) {
      throw new Error('403 Forbidden: Bạn không có quyền xóa bài viết này');
    }

    post.status = 'SOFT_DELETED';
    post.updatedAt = new Date().toISOString();
    this.posts.set(postId, post);
    return true;
  }

  // --- Feed & Explore ---
  public getChronologicalFeed(options: {
    species?: PetSpecies;
    breed?: string;
    limit?: number;
    cursor?: string;
    viewerId?: string;
  }): { posts: PostDetail[]; nextCursor?: string } {
    const limit = options.limit || 10;
    let list: Post[] = [];

    for (const post of this.posts.values()) {
      if (post.status !== 'PUBLIC') continue;

      // Filter by species or breed if requested
      if (options.species || options.breed) {
        const taggedPets = this.getPostPets(post.id);
        const matches = taggedPets.some((pet) => {
          if (options.species && pet.species !== options.species) return false;
          if (options.breed && !pet.breed.toLowerCase().includes(options.breed.toLowerCase())) return false;
          return true;
        });
        if (!matches) continue;
      }

      list.push(post);
    }

    // Sort Chronological: newest first
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Handle cursor pagination
    let startIndex = 0;
    if (options.cursor) {
      const idx = list.findIndex((p) => p.id === options.cursor);
      if (idx !== -1) {
        startIndex = idx + 1;
      }
    }

    const paged = list.slice(startIndex, startIndex + limit);
    const nextCursor = paged.length === limit ? paged[paged.length - 1].id : undefined;

    return {
      posts: paged.map((p) => this.enrichPost(p, options.viewerId)),
      nextCursor,
    };
  }

  public getUserPosts(userId: string, viewerId?: string): PostDetail[] {
    const isOwner = userId === viewerId;
    const list: Post[] = [];

    for (const post of this.posts.values()) {
      if (post.userId !== userId) continue;
      if (post.status === 'SOFT_DELETED') continue;
      if (post.status === 'HIDDEN' && !isOwner) continue;
      list.push(post);
    }

    return list
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => this.enrichPost(p, viewerId));
  }

  // --- Paw 🐾 Toggle Interaction (Atomic) ---
  public togglePaw(userId: string, postId: string): { hasPawed: boolean; pawCount: number } {
    this.checkPawRateLimit(userId);

    const post = this.posts.get(postId);
    if (!post || post.status !== 'PUBLIC') {
      throw new Error('Bài viết không tồn tại hoặc không khả dụng');
    }

    const key = `${userId}_${postId}`;
    const existing = this.paws.get(key);

    if (existing) {
      // Toggle OFF: Remove paw
      this.paws.delete(key);
      post.pawCount = Math.max(0, post.pawCount - 1);
      post.updatedAt = new Date().toISOString();
      return { hasPawed: false, pawCount: post.pawCount };
    } else {
      // Toggle ON: Add paw
      this.paws.set(key, {
        id: `paw_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        postId,
        createdAt: new Date().toISOString(),
      });
      post.pawCount += 1;
      post.updatedAt = new Date().toISOString();
      return { hasPawed: true, pawCount: post.pawCount };
    }
  }

  // --- Comment Operations (1-Level Nesting) ---
  public createComment(userId: string, postId: string, data: { content: string; parentId?: string | null }): Comment {
    const user = this.users.get(userId);
    if (!user) throw new Error('Người dùng không tồn tại');
    if (user.status === 'BANNED') throw new Error('Tài khoản đã bị khóa');

    const post = this.posts.get(postId);
    if (!post || post.status !== 'PUBLIC') {
      throw new Error('Bài viết không tồn tại');
    }

    const content = data.content.trim();
    if (!content) throw new Error('Nội dung bình luận không được rỗng');

    this.checkCommentRateLimit(userId, content);
    this.filterContent(content);

    // Business Rule: 1-level nesting only
    let parentId: string | null = null;
    if (data.parentId) {
      const parent = this.comments.get(data.parentId);
      if (!parent) throw new Error('Không tìm thấy bình luận gốc');
      // If parent itself has a parentId, re-route to top-level root comment
      parentId = parent.parentId || parent.id;
    }

    const commentId = `cmt_${crypto.randomUUID().slice(0, 10)}`;
    const now = new Date().toISOString();

    const comment: Comment = {
      id: commentId,
      userId,
      postId,
      parentId,
      content,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      author: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };

    this.comments.set(commentId, comment);
    post.commentCount += 1;

    return comment;
  }

  public getPostComments(postId: string): CommentWithReplies[] {
    const rootComments: CommentWithReplies[] = [];
    const replyMap = new Map<string, Comment[]>();

    for (const c of this.comments.values()) {
      if (c.postId !== postId || c.isDeleted) continue;

      if (!c.parentId) {
        rootComments.push({ ...c, replies: [] });
      } else {
        const replies = replyMap.get(c.parentId) || [];
        replies.push(c);
        replyMap.set(c.parentId, replies);
      }
    }

    // Attach replies and sort
    for (const root of rootComments) {
      root.replies = (replyMap.get(root.id) || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    return rootComments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public deleteComment(commentId: string, userId: string, isAdmin = false): boolean {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error('Không tìm thấy bình luận');

    const post = this.posts.get(comment.postId);
    const isPostOwner = post && post.userId === userId;
    const isCommentAuthor = comment.userId === userId;

    if (!isCommentAuthor && !isPostOwner && !isAdmin) {
      throw new Error('403 Forbidden: Bạn không có quyền xóa bình luận này');
    }

    comment.isDeleted = true;
    comment.content = '[Bình luận đã bị xóa]';
    comment.updatedAt = new Date().toISOString();

    if (post && post.commentCount > 0) {
      post.commentCount -= 1;
    }

    return true;
  }

  // --- Follow Operations (One-way) ---
  public toggleFollow(followerId: string, followingUsername: string): { isFollowing: boolean } {
    const targetUser = this.findUserByUsername(followingUsername);
    if (!targetUser) throw new Error('Người dùng không tồn tại');
    if (followerId === targetUser.id) {
      throw new Error('400 Bad Request: Bạn không thể tự theo dõi chính mình');
    }

    const key = `${followerId}_${targetUser.id}`;
    const existing = this.follows.get(key);

    if (existing) {
      this.follows.delete(key);
      return { isFollowing: false };
    } else {
      this.follows.set(key, {
        id: `fol_${crypto.randomUUID().slice(0, 8)}`,
        followerId,
        followingId: targetUser.id,
        createdAt: new Date().toISOString(),
      });
      return { isFollowing: true };
    }
  }

  // --- Report & Moderation ---
  public createReport(reporterId: string, data: { postId: string; reason: ReportReason; details?: string }): Report {
    const key = `${reporterId}_${data.postId}`;
    if (this.reports.has(key)) {
      throw new Error('Bạn đã gửi báo cáo vi phạm cho bài viết này rồi');
    }

    const reportId = `rep_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const report: Report = {
      id: reportId,
      reporterId,
      postId: data.postId,
      reason: data.reason,
      details: data.details || null,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    this.reports.set(key, report);
    return report;
  }

  public getAdminReports(): Report[] {
    const list: Report[] = [];
    for (const r of this.reports.values()) {
      const reporter = this.users.get(r.reporterId);
      const post = this.getPostById(r.postId);
      list.push({
        ...r,
        reporter: reporter ? { id: reporter.id, username: reporter.username } : undefined,
        post: post || undefined,
      });
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public resolveReport(reportId: string, action: 'RESOLVE_HIDE_POST' | 'RESOLVE_DELETE_POST' | 'DISMISS', adminId: string): boolean {
    const admin = this.users.get(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('403 Forbidden: Chỉ Admin mới có quyền duyệt báo cáo');
    }

    let targetReport: Report | null = null;
    for (const r of this.reports.values()) {
      if (r.id === reportId) {
        targetReport = r;
        break;
      }
    }
    if (!targetReport) throw new Error('Không tìm thấy báo cáo');

    if (action === 'RESOLVE_HIDE_POST') {
      const post = this.posts.get(targetReport.postId);
      if (post) post.status = 'HIDDEN';
      targetReport.status = 'RESOLVED';
    } else if (action === 'RESOLVE_DELETE_POST') {
      this.deletePost(targetReport.postId, adminId, true);
      targetReport.status = 'RESOLVED';
    } else {
      targetReport.status = 'DISMISSED';
    }

    targetReport.updatedAt = new Date().toISOString();
    return true;
  }

  public banUser(targetUserId: string, adminId: string): boolean {
    const admin = this.users.get(adminId);
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('403 Forbidden: Chỉ Admin mới có quyền khóa tài khoản');
    }

    const user = this.users.get(targetUserId);
    if (!user) throw new Error('Không tìm thấy người dùng');

    user.status = 'BANNED';
    user.updatedAt = new Date().toISOString();
    return true;
  }

  // --- Helper Enrichments ---
  private enrichPost(post: Post, viewerId?: string): PostDetail {
    const author = this.users.get(post.userId);
    const pets = this.getPostPets(post.id);
    let hasPawed = false;

    if (viewerId) {
      hasPawed = this.paws.has(`${viewerId}_${post.id}`);
    }

    return {
      ...post,
      author: {
        id: author?.id || post.userId,
        username: author?.username || 'unknown',
        fullName: author?.fullName || 'Người nuôi thú cưng',
        avatarUrl: author?.avatarUrl || null,
      },
      pets,
      hasPawed,
    };
  }

  private getPostPets(postId: string): Array<{ id: string; name: string; species: PetSpecies; breed: string; avatarUrl?: string | null }> {
    const petsList: Array<{ id: string; name: string; species: PetSpecies; breed: string; avatarUrl?: string | null }> = [];
    for (const tag of this.postPetTags.values()) {
      if (tag.postId === postId) {
        const pet = this.pets.get(tag.petId);
        if (pet) {
          petsList.push({
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            avatarUrl: pet.avatarUrl,
          });
        }
      }
    }
    return petsList;
  }

  private filterContent(text: string): void {
    const lower = text.toLowerCase();
    for (const kw of BANNED_KEYWORDS) {
      if (lower.includes(kw)) {
        throw new Error(`Nội dung chứa từ ngữ vi phạm tiêu chuẩn cộng đồng: "${kw}"`);
      }
    }
  }

  private checkPawRateLimit(userId: string): void {
    const now = Date.now();
    const timestamps = (this.pawRateLimits.get(userId) || []).filter((t) => now - t < 60000);
    if (timestamps.length >= 30) {
      throw new Error('429 Too Many Requests: Thao tác thả Paw quá nhanh, vui lòng thử lại sau 1 phút');
    }
    timestamps.push(now);
    this.pawRateLimits.set(userId, timestamps);
  }

  private checkCommentRateLimit(userId: string, content: string): void {
    const now = Date.now();
    const records = (this.commentRateLimits.get(userId) || []).filter((r) => now - r.timestamp < 60000);

    if (records.length >= 10) {
      throw new Error('429 Too Many Requests: Bạn đã bình luận quá 10 lần trong 1 phút');
    }

    // Check duplicate content within 60s
    for (const r of records) {
      if (r.content.toLowerCase() === content.toLowerCase()) {
        throw new Error('Vui lòng không gửi nội dung bình luận trùng lặp liên tiếp');
      }
    }

    records.push({ timestamp: now, content });
    this.commentRateLimits.set(userId, records);
  }

  private checkPostRateLimit(userId: string): void {
    const now = Date.now();
    const timestamps = (this.postRateLimits.get(userId) || []).filter((t) => now - t < 600000); // 10 mins
    if (timestamps.length >= 5) {
      throw new Error('429 Too Many Requests: Bạn chỉ được đăng tối đa 5 bài viết trong 10 phút');
    }
    timestamps.push(now);
    this.postRateLimits.set(userId, timestamps);
  }

  // --- Seed Initial Authentic Data ---
  private seedInitialData(): void {
    // 1. Admin account
    const admin = this.createUser({
      email: 'admin@petsocial.vn',
      username: 'admin',
      fullName: 'Quản Trị Viên PetHub',
      password: 'AdminPassword2026!',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      bio: 'Bảo vệ không gian mạng xã hội thú cưng an toàn và văn minh 🛡️🐾',
      role: 'ADMIN',
    });

    // 2. Sample User 1: Linh Corgi
    const user1 = this.createUser({
      email: 'linh.corgi@gmail.com',
      username: 'linh_corgilove',
      fullName: 'Khánh Linh & Lu Lu',
      password: 'User1Password2026!',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      bio: 'Mẹ của bé Corgi mông to Lu Lu. Mê đi cafe và chụp ảnh thú cưng!',
    });

    // 3. Sample User 2: Tuấn Mèo Mướp
    const user2 = this.createUser({
      email: 'tuan.meo@gmail.com',
      username: 'tuan_catlover',
      fullName: 'Minh Tuấn & Miu Miu',
      password: 'User2Password2026!',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      bio: 'Nhà nuôi 2 bé mèo mướp cứu hộ. Chuyên review pate và cát vệ sinh.',
    });

    // Pets for User 1
    const pet1 = this.createPet(user1.id, {
      name: 'Lu Lu',
      species: 'DOG',
      breed: 'Corgi Pembroke',
      avatarUrl: 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=300&q=80',
      birthDate: '2023-04-12',
      gender: 'MALE',
      bio: 'Mông to, chân ngắn, sở thích cắn dép và ăn kem sữa chua.',
    });

    const pet2 = this.createPet(user1.id, {
      name: 'Bim Bim',
      species: 'DOG',
      breed: 'Poodle Toy',
      avatarUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=300&q=80',
      birthDate: '2024-01-05',
      gender: 'FEMALE',
      bio: 'Tiểu thư điệu đà, thích mặc áo đầm.',
    });

    // Pets for User 2
    const pet3 = this.createPet(user2.id, {
      name: 'Miu Miu',
      species: 'CAT',
      breed: 'Mèo Mướp Ta',
      avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80',
      birthDate: '2022-09-20',
      gender: 'FEMALE',
      bio: 'Được cứu hộ từ bãi xe, nay đã thành đại hoàng hậu trong nhà.',
    });

    // Follows
    this.toggleFollow(user1.id, user2.username); // User 1 follows User 2
    this.toggleFollow(user2.id, user1.username); // User 2 follows User 1

    // Posts
    const post1 = this.createPost(user1.id, {
      content: 'Hôm nay trời nắng đẹp, dẫn đại ca Lu Lu đi dạo công viên Tao Đàn. Vừa thấy bóng con bướm là chạy đuổi theo té lăn cù nè mọi người ơi! 🐶☀️ #corgilove #thucungvietnam',
      mediaType: 'IMAGE',
      mediaUrls: [
        'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80',
      ],
      petIds: [pet1.id],
    });

    const post2 = this.createPost(user2.id, {
      content: 'Khoảnh khắc Miu Miu nằm phơi bụng đòi nạp pate chiều nay. Nhìn đôi mắt long lanh này thì làm sao sen nỡ từ chối được cơ chứ! 🐱❤️ #meomup #yeumeo',
      mediaType: 'IMAGE',
      mediaUrls: [
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
      ],
      petIds: [pet3.id],
    });

    const post3 = this.createPost(user1.id, {
      content: 'Cả hai anh em Lu Lu và Bim Bim cùng diện áo mới đón gió lạnh đầu mùa nè cả nhà! Bé nào cưng hơn ạ? 🐾✨',
      mediaType: 'IMAGE',
      mediaUrls: [
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
      ],
      petIds: [pet1.id, pet2.id],
    });

    // Paws
    this.togglePaw(user2.id, post1.id); // User 2 paws Post 1
    this.togglePaw(user1.id, post2.id); // User 1 paws Post 2
    this.togglePaw(admin.id, post1.id); // Admin paws Post 1

    // Comments & Replies
    const cmt1 = this.createComment(user2.id, post1.id, {
      content: 'Nhìn quả mông lúc chạy chắc lắc lư đáng yêu lắm chị nhỉ! 😂 Miu Miu nhà em mà thấy chó là xù lông ngay.',
    });
    this.createComment(user1.id, post1.id, {
      content: 'Dạ lắc lư cưng xỉu luôn anh ơi! Hôm nào cho hai bé giao lưu cafe nhé!',
      parentId: cmt1.id,
    });
  }
}

// Singleton global instance
export const petSocialStore = new PetSocialStore();
