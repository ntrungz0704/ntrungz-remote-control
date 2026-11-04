import { NextResponse } from 'next/server';
import { petSocialStore } from '@/services/pet-social.store';
import type { PetSpecies } from '@/types/pet-social.types';

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
    const species = (searchParams.get('species') as PetSpecies) || undefined;
    const breed = searchParams.get('breed') || undefined;
    const cursor = searchParams.get('cursor') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    const viewerId = getAuthUserId(req) || undefined;

    const feedData = petSocialStore.getChronologicalFeed({
      species,
      breed,
      cursor,
      limit,
      viewerId,
    });

    return NextResponse.json({
      success: true,
      posts: feedData.posts,
      nextCursor: feedData.nextCursor,
      totalCount: feedData.posts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
