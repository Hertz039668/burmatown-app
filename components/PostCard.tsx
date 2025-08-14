import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { TypeBadge } from "./Badges";
import { Star, MessageCircle, Send, X, Play, ChevronLeft, ChevronRight, EllipsisVertical } from "lucide-react";
import { colors, initials, isVideoUrl } from "../lib/helpers";
import { CommentItem } from "./Comments";
import { ExpandableText } from "./ExpandableText";
import { Dialog, DialogContent } from "./ui/dialog";
import { PostModel } from "../lib/types";
// import { CommentReactionBar, ReportButton } from "./Reactions"; // (reserved for potential granular usage)

// PostModel now imported from lib/types.ts

export function PostCard({
  post,
  sessionUser,
  // onReact removed
  onReport,
  onAddComment,
  onReplyComment,
  onReportComment,
  reportedByUser,
  saved,
  onToggleSave,
  isFollowedAuthor,
  onToggleFollow,
  onOpenAuthor,
  onStarPost,
  starredByUser,
  onStarComment,
  onStarReply,
  onReportReply,
  starredCommentIds,
  starredReplyIds,
  onReplyToReply,
  pending,
}: {
  post: PostModel;
  sessionUser?: { email: string } | null;
  // onReact removed
  onReport: () => void;
  onAddComment: (text: string) => void;
  // onReactComment removed
  onReplyComment: (commentId: string, text: string) => void;
  onReportComment: (commentId: string) => void;
  reportedByUser?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  isFollowedAuthor?: boolean;
  onToggleFollow?: () => void;
  onOpenAuthor?: (authorEmail: string, authorName: string) => void;
  onStarPost?: () => void;
  starredByUser?: boolean;
  onStarComment?: (commentId: string) => void;
  onStarReply?: (commentId: string, replyId: string) => void;
  onReportReply?: (commentId: string, replyId: string) => void;
  onReplyToReply?: (commentId: string, parentReplyId: string, text: string) => void;
  starredCommentIds?: Record<string, boolean>;
  starredReplyIds?: Record<string, boolean>;
  pending?: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const canInteract = !!sessionUser;

  const submitComment = () => {
    if (!commentText.trim() || !canInteract) return;
    onAddComment(commentText.trim());
    setCommentText("");
    if (!showComments) setShowComments(true);
  };

  return (
    <Card className="border rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpenAuthor && onOpenAuthor(post.authorEmail, post.author)}>
            <Avatar className="h-10 w-10 border" style={{ borderColor: colors.gold }}>
              {post.authorAvatar ? (
                <img src={post.authorAvatar} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <AvatarFallback style={{ background: colors.black, color: colors.gold }}>
                  {initials(post.author)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-semibold flex items-center gap-2">
                {post.author} <TypeBadge type={post.authorType} />
              </div>
              <div className="text-xs opacity-70">{new Date(post.createdAt).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          <div className="relative">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMenuOpen(o=>!o)} aria-label="More actions">
              <EllipsisVertical className="h-5 w-5" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-md border bg-white shadow-lg z-30 text-sm py-1" onMouseLeave={()=>setMenuOpen(false)}>
                {onToggleSave && (
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50"
                    disabled={!sessionUser}
                    onClick={() => { onToggleSave(); setMenuOpen(false); }}
                  >{saved ? 'Unsave Post' : 'Save Post'}</button>
                )}
                {onToggleFollow && post.authorEmail && (!sessionUser || sessionUser.email !== post.authorEmail) && (
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50"
                    disabled={!sessionUser}
                    onClick={() => { onToggleFollow(); setMenuOpen(false); }}
                  >{isFollowedAuthor ? 'Unfollow Author' : 'Follow Author'}</button>
                )}
                <button
                  className={`w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50 ${reportedByUser ? 'text-red-600 font-semibold' : ''}`}
                  disabled={!sessionUser}
                  onClick={() => { onReport(); setMenuOpen(false); }}
                >{reportedByUser ? 'Undo Report' : 'Report Post'}</button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <ExpandableText text={post.body} className="text-sm" lines={3} />
          {post.price && (
            <ExpandableText text={`$${post.price}`} className="mt-2 text-lg font-bold" lines={3} />
          )}
        </div>

        {(post.media && post.media.length > 0) ? (
          <div className="mt-2">
            {(() => {
              const media = post.media.slice(0, 10);
              const extra = media.length - 3;
              const first = media[0];
              const second = media[1];
              const third = media[2];
              const renderMedia = (src: string, idx: number, primary = false) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => { setGalleryIndex(idx); setGalleryOpen(true); }}
                  className={`group relative w-full h-full ${primary ? '' : ''}`}
                  style={{ background: colors.black }}
                >
                  {isVideoUrl(src) ? (
                    <video className={`w-full h-full object-cover ${primary ? 'max-h-96' : ''}`} src={src} muted />
                  ) : (
                    <img className={`w-full h-full object-cover ${primary ? 'max-h-96' : ''}`} src={src} alt="media" />
                  )}
                  {isVideoUrl(src) && (
                    <span className="absolute top-2 left-2 bg-black/60 text-white rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-medium"><Play className="h-3 w-3" /> Video</span>
                  )}
                  {extra > 0 && idx === 2 && (
                    <span className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-sm font-medium">+{extra}</span>
                  )}
                </button>
              );
              if (media.length === 1) return <div className="rounded-lg overflow-hidden">{renderMedia(first,0,true)}</div>;
              return (
                <div className="grid gap-2" style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                  <div className="row-span-2 rounded-lg overflow-hidden">{renderMedia(first,0,true)}</div>
                  {second && <div className="rounded-lg overflow-hidden aspect-video">{renderMedia(second,1)}</div>}
                  {third && <div className="rounded-lg overflow-hidden aspect-video">{renderMedia(third,2)}</div>}
                </div>
              );
            })()}
          </div>
        ) : post.mediaUrl && (
          <div className="rounded-lg overflow-hidden mt-2">
            <button type="button" onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }} className="relative group w-full">
              <img src={post.mediaUrl} alt="Post media" className="w-full h-auto max-h-96 object-cover" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="ghost" size="sm" onClick={() => setShowComments((s) => !s)}>
            <MessageCircle className="h-4 w-4 mr-1" />
            {post.comments.length}
          </Button>
          {typeof starredByUser !== 'undefined' && onStarPost && (
            <Button variant="ghost" size="sm" onClick={() => onStarPost()} className={starredByUser ? 'text-yellow-600' : ''}>
              <Star className="h-4 w-4 mr-1" />{post.stars || 0}{' '}{pending && <span className="text-[10px] opacity-70 ml-1">…</span>}
            </Button>
          )}
        </div>

        {showComments && (
          <div className="pt-2 border-t space-y-4">
            {post.comments.length === 0 && <div className="text-xs opacity-60">No comments yet.</div>}
            {post.comments.map((c: any) => (
                <CommentItem
                key={c.id}
                comment={c}
                sessionUser={sessionUser}
                postAuthorEmail={post.authorEmail}
                // reactions removed
                onReply={(commentId, text) => onReplyComment(commentId, text)}
                onReport={() => onReportComment(c.id)}
                onStar={onStarComment ? () => onStarComment(c.id) : undefined}
                starred={!!starredCommentIds?.[c.id]}
                onStarReply={onStarReply ? (replyId) => onStarReply(c.id, replyId) : undefined}
                onReportReply={onReportReply ? (replyId)=> onReportReply(c.id, replyId) : undefined}
                onReplyToReply={onReplyToReply ? (parentReplyId, text)=> onReplyToReply(c.id, parentReplyId, text) : undefined}
                starredReplies={starredReplyIds}
              />
            ))}
            <div className="flex gap-2 items-start">
              <Input
                placeholder={canInteract ? "Add a comment" : "Sign in to comment"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!canInteract}
              />
              <Button size="sm" onClick={submitComment} disabled={!canInteract} style={{ background: colors.gold, color: colors.black }}>
                <Send className="h-4 w-4 mr-1" /> Post
              </Button>
              {post.comments.length > 2 && (
                <Button variant="ghost" size="sm" onClick={() => setShowComments(false)} className="text-xs h-9">
                  <X className="h-3.5 w-3.5 mr-1" /> Hide
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
  {/* Gallery Dialog */}
  {(post.media && post.media.length > 0) && (
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogContent className="max-w-4xl w-full">
            <div className="relative flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <button
                  className="p-2 rounded bg-black/60 text-white disabled:opacity-30"
                  onClick={() => setGalleryIndex(i => (i-1+post.media!.length)%post.media!.length)}
                  disabled={post.media.length <= 1}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-xs opacity-70">{galleryIndex+1} / {post.media.length}</div>
                <button
                  className="p-2 rounded bg-black/60 text-white disabled:opacity-30"
                  onClick={() => setGalleryIndex(i => (i+1)%post.media!.length)}
                  disabled={post.media.length <= 1}
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-lg" style={{ background: colors.black }}>
                {post.media[galleryIndex].startsWith("data:video") ? (
                  <video controls className="max-h-[75vh] w-auto" src={post.media[galleryIndex]} />
                ) : (
                  <img className="max-h-[75vh] w-auto object-contain" src={post.media[galleryIndex]} />
                )}
              </div>
              {post.media.length > 1 && (
                <div className="mt-3 grid gap-2 w-full" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(70px,1fr))" }}>
                  {post.media.map((m, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className={`relative h-16 rounded overflow-hidden border ${i===galleryIndex? 'ring-2 ring-offset-2 ring-[--ring-color]' : ''}`}
                      style={i===galleryIndex? { ['--ring-color' as any]: colors.gold }: undefined}
                    >
                      {m.startsWith("data:video") ? (
                        <video className="w-full h-full object-cover" src={m} />
                      ) : (
                        <img className="w-full h-full object-cover" src={m} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
