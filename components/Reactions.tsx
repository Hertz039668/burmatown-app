import { Button } from "./ui/button";
import { Heart, Star, ThumbsUp, Flag } from "lucide-react";
import { colors } from "../lib/helpers";

export type PostReaction = "like" | "love" | "star" | null;
export type CommentReaction = "like" | "love" | null;

export const postReactionKeys: Exclude<PostReaction, null>[] = ["like", "love", "star"];
export const commentReactionKeys: Exclude<CommentReaction, null>[] = ["like", "love"];

export function ReactionBar({
  post,
  onReact,
  disabled,
}: {
  post: { id: string; userReaction: PostReaction; reactions: Record<string, number> };
  onReact: (postId: string, kind: Exclude<PostReaction, null>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 items-center">
      {postReactionKeys.map((key) => (
        <Button
          key={key}
          variant={post.userReaction === key ? "default" : "outline"}
          disabled={disabled}
          className={`rounded-full px-3 py-1 text-xs ${post.userReaction === key ? "" : "border-foreground/10"}`}
          style={post.userReaction === key ? { background: colors.gold, color: colors.black } : undefined}
          onClick={() => onReact(post.id, key)}
        >
          <span className="mr-1">{key === "like" ? <ThumbsUp size={16}/> : key === "love" ? <Heart size={16}/> : <Star size={16}/>}</span>
          {key.charAt(0).toUpperCase() + key.slice(1)} {post.reactions?.[key] ? `· ${post.reactions[key]}` : ""}
        </Button>
      ))}
    </div>
  );
}

export function CommentReactionBar({
  comment,
  onReact,
  disabled,
}: {
  comment: { id: string; userReaction: CommentReaction; reactions: Record<string, number> };
  onReact: (commentId: string, kind: Exclude<CommentReaction, null>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 mt-2">
      {commentReactionKeys.map((key) => (
        <Button
          key={key}
          size="sm"
          variant={comment.userReaction === key ? "default" : "outline"}
          disabled={disabled}
          className={`h-7 px-2 text-xs ${comment.userReaction === key ? "" : "border-foreground/10"}`}
          style={comment.userReaction === key ? { background: colors.gold, color: colors.black } : undefined}
          onClick={() => onReact(comment.id, key)}
        >
          <span className="mr-1">{key === "like" ? <ThumbsUp size={14}/> : <Heart size={14}/>}</span>
          {key} {comment.reactions?.[key] ? `· ${comment.reactions[key]}` : ""}
        </Button>
      ))}
    </div>
  );
}

export function ReportButton({ onReport, count, active }: { onReport: () => void; count?: number; active?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-2 ${active ? 'text-red-600' : ''}`}
      onClick={onReport}
      style={active ? { fontWeight: 600 } : undefined}
      title={active ? 'Click to undo report' : 'Report'}
    >
      <Flag className={`h-3.5 w-3.5 mr-1 ${active ? 'text-red-600' : ''}`}/>
      {active ? 'Reported' : 'Report'}{count ? ` (${count})` : ''}
    </Button>
  );
}
