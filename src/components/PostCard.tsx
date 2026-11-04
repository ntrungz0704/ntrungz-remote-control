'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Share2, MoreHorizontal, EyeOff, Flag, Trash2, Send, CornerDownRight } from 'lucide-react';
import type { PostDetail, User, CommentWithReplies } from '@/types/pet-social.types';

interface PostCardProps {
  post: PostDetail;
  currentUser: User | null;
  onPawToggle?: (postId: string) => Promise<void>;
  onTriggerGuestModal?: () => void;
  onHidePost?: (postId: string) => Promise<void>;
  onDeletePost?: (postId: string) => Promise<void>;
  onReportPost?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPawToggle = async (postId: string) => {
    await fetch(`/api/v1/posts/${postId}/paw`, { method: 'POST' });
  },
  onTriggerGuestModal = () => {},
  onHidePost = async (postId: string) => {
    await fetch(`/api/v1/posts/${postId}/hide`, { method: 'POST' });
  },
  onDeletePost = async (postId: string) => {
    await fetch(`/api/v1/posts/${postId}`, { method: 'DELETE' });
  },
  onReportPost = () => {},
}) => {
  const [hasPawed, setHasPawed] = useState(post.hasPawed || false);
  const [pawCount, setPawCount] = useState(post.pawCount);
  const [isBouncing, setIsBouncing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isOwner = currentUser?.id === post.userId;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Format time ago
  const formatTimeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const handlePawClick = async () => {
    if (!currentUser) {
      onTriggerGuestModal();
      return;
    }

    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 400);

    // Optimistic UI
    const nextPawed = !hasPawed;
    setHasPawed(nextPawed);
    setPawCount((prev) => (nextPawed ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await onPawToggle(post.id);
    } catch {
      // Revert if failed
      setHasPawed(!nextPawed);
      setPawCount((prev) => (nextPawed ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const toggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/v1/posts/${post.id}/comments`);
        const data = await res.json();
        if (data.success) {
          setComments(data.comments);
        }
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onTriggerGuestModal();
      return;
    }
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          content: commentText.trim(),
          parentId: replyingTo?.id || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const newCmt = data.comment;
        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), newCmt] } : c
            )
          );
        } else {
          setComments((prev) => [newCmt, ...prev]);
        }
        setCommentText('');
        setReplyingTo(null);
      } else {
        alert(data.error || 'Gửi bình luận thất bại');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const res = await fetch(`/api/v1/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies.filter((r) => r.id !== commentId),
            }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/#${post.id}` : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setToastMessage('Đã sao chép link bài viết vào bộ nhớ tạm 🐾');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <article
      id={post.id}
      className="bg-white rounded-3xl border border-orange-100/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden mb-6"
    >
      {/* Toast */}
      {toastMessage && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 text-center transition-all">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.username}`}>
            <img
              src={post.author.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={post.author.fullName}
              className="w-11 h-11 rounded-full object-cover border-2 border-orange-200 hover:scale-105 transition-transform"
            />
          </Link>
          <div>
            <Link
              href={`/profile/${post.author.username}`}
              className="font-bold text-sm text-zinc-900 hover:text-rose-600 transition-colors flex items-center gap-1.5"
            >
              {post.author.fullName}
              <span className="text-xs font-normal text-zinc-400">@{post.author.username}</span>
            </Link>
            <p className="text-[11px] text-zinc-400">{formatTimeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-100 shadow-xl rounded-2xl p-1 z-20 text-xs">
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onHidePost(post.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 hover:bg-orange-50 rounded-xl"
                  >
                    <EyeOff className="w-4 h-4 text-orange-500" />
                    <span>Ẩn bài viết</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeletePost(post.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa bài viết</span>
                  </button>
                </>
              )}
              {isAdmin && !isOwner && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDeletePost(post.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa vi phạm (Admin)</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  onReportPost(post.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-zinc-600 hover:bg-zinc-50 rounded-xl"
              >
                <Flag className="w-4 h-4 text-amber-500" />
                <span>Báo cáo vi phạm</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tagged Pets Badges */}
      {post.pets && post.pets.length > 0 && (
        <div className="px-4 sm:px-5 pb-2.5 flex flex-wrap gap-1.5">
          {post.pets.map((pet) => (
            <span
              key={pet.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-full text-xs font-semibold text-orange-800"
            >
              <span>{pet.species === 'DOG' ? '🐶' : pet.species === 'CAT' ? '🐱' : '🐾'}</span>
              <span>{pet.name}</span>
              <span className="text-[10px] text-orange-500 font-normal">({pet.breed})</span>
            </span>
          ))}
        </div>
      )}

      {/* Content text */}
      <div className="px-4 sm:px-5 pb-3">
        <p className="text-zinc-800 text-sm sm:text-base leading-relaxed whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* Media Section */}
      {post.mediaType === 'IMAGE' && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div
          className={`grid gap-1 px-2 ${
            post.mediaUrls.length === 1
              ? 'grid-cols-1'
              : post.mediaUrls.length === 2
              ? 'grid-cols-2'
              : post.mediaUrls.length === 3
              ? 'grid-cols-2'
              : 'grid-cols-2'
          }`}
        >
          {post.mediaUrls.map((url, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden bg-zinc-100 rounded-2xl ${
                post.mediaUrls.length === 3 && idx === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'
              }`}
            >
              <img
                src={url}
                alt={`Media ${idx + 1}`}
                className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {post.mediaType === 'VIDEO' && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="px-2">
          <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[500px] mx-auto">
            <video
              src={post.mediaUrls[0]}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-orange-50 flex items-center justify-between text-zinc-500 text-xs font-semibold">
        <div className="flex items-center gap-4">
          {/* Paw Button */}
          <button
            onClick={handlePawClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
              hasPawed
                ? 'bg-rose-50 text-rose-600 font-extrabold'
                : 'hover:bg-zinc-100 text-zinc-600'
            }`}
          >
            <span
              className={`text-lg select-none inline-block ${
                isBouncing ? 'animate-paw' : ''
              } ${hasPawed ? 'scale-110' : ''}`}
            >
              🐾
            </span>
            <span>{pawCount} Paw</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-zinc-400" />
            <span>{post.commentCount} Bình luận</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-orange-50 hover:text-orange-600 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Chia sẻ</span>
        </button>
      </div>

      {/* Expandable Comments Section (1-Level Nesting) */}
      {showComments && (
        <div className="px-4 sm:px-5 pb-4 pt-2 bg-orange-50/30 border-t border-orange-100/50">
          {/* Input Box */}
          <form onSubmit={handleSubmitComment} className="mb-4">
            {replyingTo && (
              <div className="flex items-center justify-between text-xs text-orange-700 bg-orange-100/70 px-3 py-1 rounded-t-xl">
                <span>
                  Đang trả lời <strong>@{replyingTo.username}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="font-bold hover:underline"
                >
                  Hủy
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  currentUser
                    ? replyingTo
                      ? `Viết câu trả lời cho @${replyingTo.username}...`
                      : 'Viết bình luận đáng yêu cho bé cưng...'
                    : 'Đăng nhập để bình luận...'
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!currentUser || submittingComment}
                className="flex-1 px-4 py-2 bg-white border border-orange-200 rounded-full text-xs sm:text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <button
                type="submit"
                disabled={!currentUser || submittingComment || !commentText.trim()}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gửi</span>
              </button>
            </div>
          </form>

          {/* Comment List */}
          {loadingComments ? (
            <div className="py-4 text-center text-xs text-zinc-400">Đang tải bình luận... 🐾</div>
          ) : comments.length === 0 ? (
            <div className="py-3 text-center text-xs text-zinc-400 italic">
              Chưa có bình luận nào. Hãy là người đầu tiên khen bé cưng nhé!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((rootCmt) => (
                <div key={rootCmt.id} className="space-y-2">
                  {/* Root Comment */}
                  <div className="flex items-start gap-2.5">
                    <img
                      src={
                        rootCmt.author.avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                      }
                      alt={rootCmt.author.fullName}
                      className="w-7 h-7 rounded-full object-cover mt-0.5 border border-zinc-200"
                    />
                    <div className="flex-1 bg-white p-2.5 rounded-2xl border border-zinc-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-zinc-900">{rootCmt.author.fullName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400">
                            {formatTimeAgo(rootCmt.createdAt)}
                          </span>
                          {(currentUser?.id === rootCmt.userId || isOwner || isAdmin) && (
                            <button
                              onClick={() => handleDeleteComment(rootCmt.id)}
                              className="text-zinc-300 hover:text-rose-500"
                              title="Xóa bình luận"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-zinc-700 leading-relaxed">{rootCmt.content}</p>
                      <button
                        onClick={() =>
                          setReplyingTo({
                            id: rootCmt.id,
                            username: rootCmt.author.username,
                          })
                        }
                        className="mt-1 text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>Trả lời</span>
                      </button>
                    </div>
                  </div>

                  {/* Level 1 Nested Replies */}
                  {rootCmt.replies && rootCmt.replies.length > 0 && (
                    <div className="pl-9 space-y-2 border-l-2 border-orange-200 ml-3.5">
                      {rootCmt.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-2">
                          <img
                            src={
                              reply.author.avatarUrl ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                            }
                            alt={reply.author.fullName}
                            className="w-6 h-6 rounded-full object-cover mt-0.5 border border-zinc-200"
                          />
                          <div className="flex-1 bg-white p-2 rounded-2xl border border-zinc-100 text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-zinc-900">{reply.author.fullName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400">
                                  {formatTimeAgo(reply.createdAt)}
                                </span>
                                {(currentUser?.id === reply.userId || isOwner || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-zinc-300 hover:text-rose-500"
                                    title="Xóa câu trả lời"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-zinc-700 leading-relaxed">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
