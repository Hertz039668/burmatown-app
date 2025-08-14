import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CreatePost from '../components/CreatePost';
import { PostCard } from '../components/PostCard';
import { PostModel } from '../lib/types';
import { getUserActions, updateUserActions } from '../lib/storage';

interface BusinessesViewProps {
  posts: PostModel[];
  sessionUser: any;
  profile: any; // accept broader shape; CreatePost enforces needed fields
  highlightPostId: string | null;
  createPost: (p: { title: string; body: string; media?: string[]; mediaUrl?: string; price?: string }) => Promise<void> | void;
  reportPost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  addReply: (postId: string, commentId: string, text: string) => void;
  addReplyToReply: (postId: string, commentId: string, parentReplyId: string, text: string) => void;
  reportComment: (postId: string, commentId: string) => void;
  reportReply: (postId: string, commentId: string, replyId: string) => void;
  togglePostStar: (postId: string) => void;
  toggleCommentStar: (postId: string, commentId: string) => void;
  toggleReplyStar: (postId: string, commentId: string, replyId: string) => void;
  setPosts: React.Dispatch<React.SetStateAction<PostModel[]>>;
  setActionsVersion: React.Dispatch<React.SetStateAction<number>>;
  onOpenAuthor: (authorEmail: string, authorName: string) => void;
  pushToast: (msg: string, opts?: { type?: 'success' | 'error' | 'info' }) => void;
}

export const BusinessesView: React.FC<BusinessesViewProps> = ({
  posts,
  sessionUser,
  profile,
  highlightPostId,
  createPost,
  reportPost,
  addComment,
  addReply,
  addReplyToReply,
  reportComment,
  reportReply,
  togglePostStar,
  toggleCommentStar,
  toggleReplyStar,
  setPosts,
  setActionsVersion,
  onOpenAuthor,
  pushToast
}) => {
  const cachedActions = sessionUser ? getUserActions(sessionUser.email) : null;

  return (
    <>
  <CreatePost profile={profile as any} onCreate={createPost} sessionUser={sessionUser} />
      <AnimatePresence>
        {posts.map(post => {
          const saved = !!(cachedActions && cachedActions.savedPosts[post.id]);
          const reported = !!(cachedActions && cachedActions.reports.posts[post.id]);
          const followed = !!(cachedActions && post.authorEmail && cachedActions.follows[post.authorEmail]);
          const starred = !!(cachedActions && cachedActions.postStars?.[post.id]);
          return (
            <motion.div
              id={`post-${post.id}`}
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={highlightPostId === post.id ? 'ring-2 ring-yellow-500 rounded-2xl' : ''}
            >
              <PostCard
                post={post}
                sessionUser={sessionUser}
                onReport={() => {
                  reportPost(post.id);
                  pushToast(reported ? 'Post report removed' : 'Post reported', { type: reported ? 'info' : 'success' });
                }}
                onAddComment={(text) => addComment(post.id, text)}
                onReplyComment={(commentId, text) => addReply(post.id, commentId, text)}
                onReportComment={(commentId) => { reportComment(post.id, commentId); pushToast('Comment report toggled', { type: 'info' }); }}
                reportedByUser={reported}
                saved={saved}
                onToggleSave={() => {
                  if (!sessionUser) return;
                  const email = sessionUser.email;
                  updateUserActions(email, prev => {
                    const next = { ...prev } as any;
                    if (next.savedPosts[post.id]) delete next.savedPosts[post.id]; else next.savedPosts[post.id] = true;
                    return next;
                  });
                  setPosts(p => [...p]);
                  pushToast(saved ? 'Post unsaved' : 'Post saved', { type: 'success' });
                }}
                isFollowedAuthor={followed}
                onToggleFollow={() => {
                  if (!sessionUser || !post.authorEmail) return;
                  const email = sessionUser.email;
                  updateUserActions(email, prev => {
                    const next = { ...prev } as any;
                    if (next.follows[post.authorEmail]) delete next.follows[post.authorEmail]; else next.follows[post.authorEmail] = true;
                    return next;
                  });
                  setPosts(p => [...p]);
                  setActionsVersion(v => v + 1);
                  pushToast(followed ? 'Unfollowed author' : 'Now following author', { type: 'info' });
                }}
                onOpenAuthor={onOpenAuthor}
                onStarPost={() => { togglePostStar(post.id); pushToast(starred ? 'Star removed' : 'Post starred', { type: 'info' }); }}
                starredByUser={starred}
                onStarComment={(commentId) => { toggleCommentStar(post.id, commentId); pushToast('Comment star toggled', { type: 'info' }); }}
                onStarReply={(commentId, replyId) => { toggleReplyStar(post.id, commentId, replyId); pushToast('Reply star toggled', { type: 'info' }); }}
                onReportReply={(commentId, replyId) => { reportReply(post.id, commentId, replyId); pushToast('Reply report toggled', { type: 'info' }); }}
                onReplyToReply={(commentId, parentReplyId, text) => addReplyToReply(post.id, commentId, parentReplyId, text)}
                starredCommentIds={cachedActions ? cachedActions.commentStars : {}}
                starredReplyIds={cachedActions ? cachedActions.replyStars : {}}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </>
  );
};
