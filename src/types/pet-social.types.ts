// ============================================================================
// PET SOCIAL NETWORK — DOMAIN TYPES & DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED';

export type PetSpecies = 'DOG' | 'CAT' | 'OTHER';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export type MediaType = 'NONE' | 'IMAGE' | 'VIDEO';
export type PostStatus = 'PUBLIC' | 'HIDDEN' | 'SOFT_DELETED';

export type ReportReason = 'CRUELTY' | 'SPAM' | 'OFFENSIVE' | 'FRAUD' | 'OTHER';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

// --- User Models & DTOs ---

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  petsCount: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
    role: UserRole;
  };
  token: string;
}

// --- Pet Models & DTOs ---

export interface Pet {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  species: PetSpecies;
  breed: string; // e.g., "Corgi", "Mèo Mướp", "Poodle"
  birthDate?: string | null;
  gender: PetGender;
  bio?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePetDto {
  name: string;
  species: PetSpecies;
  breed: string;
  avatarUrl?: string | null;
  birthDate?: string | null;
  gender?: PetGender;
  bio?: string | null;
}

export interface UpdatePetDto {
  name?: string;
  species?: PetSpecies;
  breed?: string;
  avatarUrl?: string | null;
  birthDate?: string | null;
  gender?: PetGender;
  bio?: string | null;
}

// --- Post Models & DTOs ---

export interface Post {
  id: string;
  userId: string;
  content: string;
  mediaType: MediaType;
  mediaUrls: string[];
  status: PostStatus;
  pawCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends Post {
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  pets: Array<{
    id: string;
    name: string;
    species: PetSpecies;
    breed: string;
    avatarUrl?: string | null;
  }>;
  hasPawed?: boolean;
}

export interface CreatePostDto {
  content: string;
  mediaType?: MediaType;
  mediaUrls?: string[];
  petIds?: string[]; // Max 5 pets
}

// --- Interaction Models & DTOs ---

export interface Paw {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  postId: string;
  parentId?: string | null; // Null for root comment
  content: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface CommentWithReplies extends Comment {
  replies: Comment[];
}

export interface CreateCommentDto {
  content: string;
  parentId?: string | null;
}

// --- Follow Models & DTOs ---

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

// --- Report Models & DTOs ---

export interface Report {
  id: string;
  reporterId: string;
  postId: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    username: string;
  };
  post?: PostDetail;
}

export interface CreateReportDto {
  postId: string;
  reason: ReportReason;
  details?: string | null;
}
