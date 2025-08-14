import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Send, EllipsisVertical, Star } from "lucide-react";
import { colors, initials } from "../lib/helpers";
import { TypeBadge } from "./Badges";
import { ReportButton } from "./Reactions";
import { ExpandableText } from "./ExpandableText";

export type CommentModel = {
  id: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorType: "business" | "student" | "general";
  text: string;
  createdAt: number;
  reactions: Record<string, number>;
  userReaction: "like" | "love" | null;
  reports?: number;
  stars?: number;
  replies: Array<{
    id: string;
    author: string;
    authorAvatar?: string;
    text: string;
    createdAt: number;
    stars?: number;
  reports?: number;
    replies?: Array<{
      id: string;
      author: string;
      authorAvatar?: string;
      text: string;
      createdAt: number;
      stars?: number;
      reports?: number;
    }>;
  }>;
};

export function Reply({ reply, onStar, starred, canInteract, onReport, onReply, isAuthor }: { reply: CommentModel["replies"][number]; onStar?: (replyId: string) => void; starred?: boolean; canInteract: boolean; onReport?: (replyId: string) => void; onReply?: (parentReplyId: string, text: string) => void; isAuthor?: boolean; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="flex items-start gap-2 mt-3 ml-10">
      <Avatar className="h-7 w-7 border flex-shrink-0" style={{ borderColor: colors.gold }}>
        {reply.authorAvatar ? (
          <img src={reply.authorAvatar} alt="avatar" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(reply.author)}</AvatarFallback>
        )}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 text-xs mb-0.5 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm flex items-center gap-2" style={{ color: colors.black }}>{reply.author}{isAuthor && <span className="px-1.5 py-0.5 rounded bg-black text-[10px] font-semibold tracking-wide" style={{ color: colors.gold }}>Author</span>}</span>
            <span className="opacity-60 whitespace-nowrap">{new Date(reply.createdAt).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })} {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {onReport && (
            <div className="relative flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setMenuOpen(o=>!o)} aria-label="More actions">
                <EllipsisVertical className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-36 rounded-md border bg-white shadow text-xs py-1 z-30" onMouseLeave={()=>setMenuOpen(false)}>
                  <button
                    className={`w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50 ${reply.reports ? 'text-red-600 font-semibold' : ''}`}
                    disabled={!canInteract}
                    onClick={() => { onReport(reply.id); setMenuOpen(false); }}
                  >{reply.reports ? 'Undo Report' : 'Report Reply'}</button>
                </div>
              )}
            </div>
          )}
        </div>
  <ExpandableText text={reply.text} className="text-sm leading-snug" lines={3} />
        <div className="flex items-center gap-2 mt-1">
          {onReply && (
            <Button variant="ghost" size="sm" className="h-6 px-2" disabled={!canInteract} onClick={() => setOpen(o => !o)}>Reply</Button>
          )}
          {onStar && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-2 ${starred ? 'text-yellow-600' : ''}`}
              disabled={!canInteract}
              onClick={() => onStar(reply.id)}
            >
              <Star className="h-4 w-4 mr-0.5" /> {reply.stars || 0}
            </Button>
          )}
        </div>
        {open && onReply && (
          <div className="flex gap-2 mt-2">
            <Input placeholder="Write a reply" value={text} disabled={!canInteract} onChange={(e)=>setText(e.target.value)} />
            <Button size="sm" disabled={!canInteract} onClick={()=>{ if(!text.trim()) return; onReply(reply.id, text.trim()); setText(""); setOpen(false); }} style={{ background: colors.gold, color: colors.black }}>Send</Button>
          </div>
        )}
        {reply.replies?.map(sr => (
          <NestedReply key={sr.id} sr={sr} canInteract={canInteract} onReport={onReport} />
        ))}
      </div>
    </div>
  );
}

function NestedReply({ sr, canInteract, onReport, isAuthor }: { sr: any; canInteract: boolean; onReport?: (replyId: string)=>void; isAuthor?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex items-start gap-2 mt-3 ml-10">
      <Avatar className="h-6 w-6 border flex-shrink-0" style={{ borderColor: colors.gold }}>
        {sr.authorAvatar ? <img src={sr.authorAvatar} alt="avatar" className="h-6 w-6 rounded-full object-cover" /> : <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(sr.author)}</AvatarFallback>}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap text-[11px] mb-0.5 w-full">
          <span className="font-medium flex items-center gap-2" style={{ color: colors.black }}>{sr.author}{isAuthor && <span className="px-1 py-0.5 rounded bg-black text-[10px] font-semibold tracking-wide" style={{ color: colors.gold }}>Author</span>}</span>
          <span className="opacity-60 whitespace-nowrap">{new Date(sr.createdAt).toLocaleDateString(undefined,{ day:'2-digit', month:'short', year:'numeric' })} {new Date(sr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {onReport && (
            <div className="relative ml-auto">
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={()=>setMenuOpen(o=>!o)} aria-label="More actions"><EllipsisVertical className="h-4 w-4" /></Button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-36 rounded-md border bg-white shadow text-xs py-1 z-30" onMouseLeave={()=>setMenuOpen(false)}>
                  <button className={`w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50 ${sr.reports? 'text-red-600 font-semibold':''}`} disabled={!canInteract} onClick={()=>{ onReport(sr.id); setMenuOpen(false); }}>{sr.reports? 'Undo Report':'Report Reply'}</button>
                </div>
              )}
            </div>
          )}
        </div>
  <ExpandableText text={sr.text} className="text-sm leading-snug" lines={3} />
      </div>
    </div>
  );
}

export function CommentItem({
  comment,
  onReply,
  onReport,
  sessionUser,
  onStar,
  starred,
  onStarReply,
  onReplyToReply,
  onReportReply,
  starredReplies,
  postAuthorEmail,
}: {
  comment: CommentModel;
  onReply: (commentId: string, text: string) => void;
  onReport: () => void;
  sessionUser?: { email: string } | null;
  onStar?: (commentId: string) => void;
  starred?: boolean;
  onStarReply?: (replyId: string) => void;
  onReplyToReply?: (parentReplyId: string, text: string) => void;
  onReportReply?: (replyId: string) => void;
  starredReplies?: Record<string, boolean>;
  postAuthorEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const canInteract = !!sessionUser;
  const isAuthorComment = postAuthorEmail && comment.authorEmail && comment.authorEmail === postAuthorEmail;
  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 border" style={{ borderColor: colors.gold }}>
          {comment.authorAvatar ? (
            <img src={comment.authorAvatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(comment.author)}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 rounded-xl p-3" style={{ background: colors.offwhite }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium flex items-center gap-2" style={{ color: colors.black }}>
                {comment.author}
                {isAuthorComment && (
                  <span className="px-1.5 py-0.5 rounded bg-black text-[10px] font-semibold tracking-wide" style={{ color: colors.gold }}>Author</span>
                )}
              </span>
              <TypeBadge type={comment.authorType} />
            </div>
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMenuOpen(o=>!o)} aria-label="More actions">
                <EllipsisVertical className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-40 rounded-md border bg-white shadow text-xs py-1 z-30" onMouseLeave={()=>setMenuOpen(false)}>
                  <button
                    className={`w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50 ${comment.reports ? 'text-red-600 font-semibold' : ''}`}
                    disabled={!canInteract}
                    onClick={() => { onReport(); setMenuOpen(false); }}
                  >{comment.reports ? 'Undo Report' : 'Report Comment'}</button>
                </div>
              )}
            </div>
          </div>
          <ExpandableText text={comment.text} className="text-sm mt-1" lines={3} />
          <div className="flex items-center gap-2 mt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} className="h-7 px-2">Reply</Button>
            {onStar && (
              <Button variant="ghost" size="sm" className={`h-7 px-2 ${starred ? 'text-yellow-600' : ''}`} disabled={!canInteract}
                onClick={()=>onStar(comment.id)}>
                <Star className="h-4 w-4 mr-0.5" /> {comment.stars || 0}
              </Button>
            )}
          </div>
          <AnimatePresence>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Write a reply" value={text} onChange={(e) => setText(e.target.value)} />
                  <Button
                    onClick={() => {
                      if (!text.trim() || !canInteract) return;
                      onReply(comment.id, text.trim());
                      setText("");
                      setOpen(false);
                    }}
                    className="min-w-[90px]"
                    style={{ background: colors.gold, color: colors.black }}
                  >
                    <Send className="h-4 w-4 mr-1" /> Send
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {comment.replies?.map((r) => {
            const isAuthor = postAuthorEmail && (r as any).authorEmail && (r as any).authorEmail === postAuthorEmail;
            return (
              <Reply key={r.id} reply={r} canInteract={canInteract} onStar={onStarReply} starred={starredReplies?.[r.id]} onReport={onReportReply} onReply={onReplyToReply} isAuthor={!!isAuthor} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
