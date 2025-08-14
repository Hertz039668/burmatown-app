import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Star, EllipsisVertical } from "lucide-react";
import { colors, initials } from "../lib/helpers";
import { ExpandableText } from "./ExpandableText";
import { ReportButton } from "./Reactions";
import { AnswerModel, QuestionModel } from "../lib/types";

// Types moved to lib/types.ts

export function QAForm({ onAsk, sessionUser }: { onAsk: (p: { title: string; details?: string }) => void; sessionUser?: { email: string } | null; }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const canInteract = !!sessionUser;
  return (
    <Card className="border rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Ask the Community</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canInteract && <div className="text-xs p-2 rounded" style={{ background: colors.offwhite }}>Sign in to ask a question.</div>}
        <Input disabled={!canInteract} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Question title (required)" />
        <Input disabled={!canInteract} value={details} onChange={(e: any) => setDetails(e.target.value)} placeholder="Add details (optional)" />
        <div className="flex justify-end">
          <Button
            disabled={!canInteract}
            onClick={() => {
              if (!title.trim()) return;
              onAsk({ title: title.trim(), details: details.trim() });
              setTitle("");
              setDetails("");
            }}
            style={{ background: colors.gold, color: colors.black }}
          >
            Post Question
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function QAItem({ q, onAddAnswer, onUsefulAnswer, onReport, sessionUser, onToggleSave, saved, isFollowedAuthor, onToggleFollow, onStarQuestion, starredQuestionByUser, onStarAnswer, starredAnswers, onAddAnswerReply, onAddNestedAnswerReply, onStarAnswerReply, starredAnswerReplyIds, onReportAnswerReply, onToggleAnswerReplyUseful, answerReplyUsefulIds }: {
  q: QuestionModel;
  onAddAnswer: (qid: string, text: string) => void; // create new answer
  onUsefulAnswer: (qid: string, answerId: string) => void;
  onReport: (qid: string, answerId?: string) => void;
  sessionUser?: { email: string } | null;
  onToggleSave?: (qid: string) => void;
  saved?: boolean;
  isFollowedAuthor?: boolean;
  onToggleFollow?: (authorEmail?: string) => void;
  onStarQuestion?: (qid: string) => void;
  starredQuestionByUser?: boolean;
  onStarAnswer?: (qid: string, answerId: string) => void;
  starredAnswers?: Record<string, boolean>;
  onAddAnswerReply: (qid: string, answerId: string, text: string) => void;
  onAddNestedAnswerReply: (qid: string, answerId: string, parentReplyId: string, text: string) => void;
  onStarAnswerReply: (qid: string, answerId: string, replyId: string) => void;
  starredAnswerReplyIds?: Record<string, boolean>;
  onReportAnswerReply: (qid: string, answerId: string, replyId: string) => void;
  onToggleAnswerReplyUseful: (qid: string, answerId: string, replyId: string) => void;
  answerReplyUsefulIds?: Record<string, boolean>;
}) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openAnswerMenu, setOpenAnswerMenu] = useState<string | null>(null);
  const canInteract = !!sessionUser;
  return (
            <Card className="border rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <ExpandableText text={q.title} className="text-base font-semibold" lines={3} />
                    <div className="text-xs opacity-60">Asked by {q.author} · {new Date(q.createdAt).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' })} {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMenuOpen(o => !o)} aria-label="More actions">
                      <EllipsisVertical className="h-5 w-5" />
                    </Button>
                    {menuOpen && (
                      <div className="absolute z-30 right-0 mt-1 w-44 rounded-md border bg-white shadow text-sm py-1" onMouseLeave={() => setMenuOpen(false)}>
                        <button className="w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50" disabled={!canInteract} onClick={() => { onReport(q.id); setMenuOpen(false); }}>Report Question</button>
                        {onToggleSave && (
                          <button className="w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50" disabled={!canInteract} onClick={() => { onToggleSave(q.id); setMenuOpen(false); }}>{saved ? 'Unsave Question' : 'Save Question'}</button>
                        )}
                        {onToggleFollow && q.authorEmail && (
                          <button className="w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50" disabled={!canInteract} onClick={() => { onToggleFollow(q.authorEmail); setMenuOpen(false); }}>{isFollowedAuthor ? 'Unfollow Author' : 'Follow Author'}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {q.details && <ExpandableText text={q.details} className="text-sm" lines={3} />}
                <div className="flex items-center gap-2 flex-wrap">
                  {onStarQuestion && (
                    <Button variant="ghost" size="sm" className={`h-8 px-2 ${starredQuestionByUser ? 'text-yellow-600' : ''}`} disabled={!canInteract} onClick={() => onStarQuestion(q.id)}>
                      <Star className="h-4 w-4 mr-1" /> {(q.stars || 0)}
                    </Button>
                  )}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Input placeholder={canInteract ? "Write an answer" : "Sign in to answer"} disabled={!canInteract} value={text} onChange={(e) => setText(e.target.value)} />
                  <Button
                    onClick={() => {
                      if (!text.trim() || !canInteract) return;
                      onAddAnswer(q.id, text.trim());
                      setText("");
                    }}
                    className="min-w-[90px]"
                    disabled={!canInteract}
                    style={{ background: colors.black, color: colors.gold }}
                  >
                    <Send className="h-4 w-4 mr-1" /> Post
                  </Button>
                </div>
                <div className="space-y-3">
                  {q.answers.map((a) => {
                    const isQuestionAuthor = a.authorEmail && q.authorEmail && a.authorEmail === q.authorEmail;
                    return (
                    <div key={a.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 border" style={{ borderColor: colors.gold }}>
                        {a.authorAvatar ? (
                          <img src={a.authorAvatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(a.author)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 rounded-xl p-3" style={{ background: colors.offwhite }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium flex items-center gap-2">{a.author}{isQuestionAuthor && <span className="px-1.5 py-0.5 rounded bg-black text-[10px] font-semibold tracking-wide" style={{ color: colors.gold }}>Author</span>}</div>
                          <div className="relative">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOpenAnswerMenu(m => m === a.id ? null : a.id)} aria-label="More actions">
                              <EllipsisVertical className="h-4 w-4" />
                            </Button>
                            {openAnswerMenu === a.id && (
                              <div className="absolute z-30 right-0 mt-1 w-40 rounded-md border bg-white shadow text-xs py-1" onMouseLeave={() => setOpenAnswerMenu(null)}>
                                <button className="w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50" disabled={!canInteract} onClick={() => { onReport(q.id, a.id); setOpenAnswerMenu(null); }}>Report Answer</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <ExpandableText text={a.text} className="text-sm mt-1" lines={3} />
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" disabled={!canInteract} onClick={() => onUsefulAnswer(q.id, a.id)} className={`h-7 px-2 text-xs ${a.usefulByUser ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : ''}`}>Useful {a.useful ? `(${a.useful})` : ''}</Button>
                          <AnswerReplyBox canInteract={canInteract} onSubmit={(txt)=> { if(!txt.trim()||!canInteract) return; onAddAnswerReply(q.id, a.id, txt.trim()); }} />
                          {onStarAnswer && (
                            <Button size="sm" variant="ghost" disabled={!canInteract} onClick={() => onStarAnswer(q.id, a.id)} className={`h-7 px-2 ${starredAnswers?.[a.id] ? 'text-yellow-600' : ''}`}>
                              <Star className="h-4 w-4" /> {(a.stars || 0)}
                            </Button>
                          )}
                        </div>
                        {a.replies && a.replies.length>0 && (
                          <div className="mt-3 space-y-2">
                            {a.replies.map(r => (
                              <AnswerReplyItem
                                key={r.id}
                                q={q}
                                answer={a}
                                reply={r}
                                canInteract={canInteract}
                                onStar={(replyId)=>onStarAnswerReply(q.id, a.id, replyId)}
                                starred={!!starredAnswerReplyIds?.[r.id]}
                                onReport={(replyId)=>onReportAnswerReply(q.id, a.id, replyId)}
                                onReply={(parentReplyId, txt)=> onAddNestedAnswerReply(q.id, a.id, parentReplyId, txt)}
                                onToggleUsefulReply={(replyId)=>onToggleAnswerReplyUseful(q.id, a.id, replyId)}
                                usefulMarked={!!answerReplyUsefulIds?.[r.id]}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </CardContent>
            </Card>
  );
}
function AnswerReplyBox({ canInteract, onSubmit }: { canInteract: boolean; onSubmit:(text:string)=>void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!canInteract} onClick={()=>setOpen(o=>!o)}>Reply</Button>
      {open && (
        <div className="flex items-center gap-2">
          <Input className="h-7" placeholder="Reply" value={text} disabled={!canInteract} onChange={(e)=>setText(e.target.value)} />
          <Button size="sm" className="h-7" disabled={!canInteract} onClick={()=>{ if(!text.trim()) return; onSubmit(text); setText(""); setOpen(false); }} style={{ background: colors.gold, color: colors.black }}>Send</Button>
        </div>
      )}
    </div>
  );
}

function AnswerReplyItem({ q, answer, reply, canInteract, onStar, starred, onReport, onReply, onToggleUsefulReply, usefulMarked }: {
  q: QuestionModel;
  answer: AnswerModel;
  reply: NonNullable<AnswerModel['replies']>[number];
  canInteract: boolean;
  onStar: (replyId: string)=>void;
  starred: boolean;
  onReport: (replyId: string)=>void;
  onReply: (parentReplyId: string, text: string)=>void;
  onToggleUsefulReply: (replyId: string)=>void;
  usefulMarked: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const isAuthor = reply.authorEmail && q.authorEmail && reply.authorEmail === q.authorEmail;
  return (
    <div className="flex items-start gap-2 ml-6">
      <Avatar className="h-6 w-6 border" style={{ borderColor: colors.gold }}>
        {reply.authorAvatar ? <img src={reply.authorAvatar} alt="avatar" className="h-6 w-6 rounded-full object-cover" /> : <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(reply.author)}</AvatarFallback>}
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 text-xs mb-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium flex items-center gap-2">{reply.author}{isAuthor && <span className="px-1 py-0.5 rounded bg-black text-[10px] font-semibold tracking-wide" style={{ color: colors.gold }}>Author</span>}</span>
          </div>
          <div className="relative">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={()=>setMenuOpen(o=>!o)} aria-label="More actions"><EllipsisVertical className="h-4 w-4" /></Button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-md border bg-white shadow text-xs py-1 z-30" onMouseLeave={()=>setMenuOpen(false)}>
                <button className={`w-full text-left px-3 py-2 hover:bg-black/5 disabled:opacity-50 ${reply.reports? 'text-red-600 font-semibold':''}`} disabled={!canInteract} onClick={()=>{ onReport(reply.id); setMenuOpen(false); }}>{reply.reports? 'Undo Report':'Report Reply'}</button>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm leading-snug">{reply.text}</div>
        <div className="flex items-center gap-2 mt-1">
          <Button size="sm" variant="outline" className={`h-5 px-2 text-[10px] ${usefulMarked ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : ''}`} disabled={!canInteract} onClick={()=>onToggleUsefulReply(reply.id)}>Useful{reply.useful ? ` (${reply.useful})` : ''}</Button>
          <Button size="sm" variant="ghost" className="h-5 px-2" disabled={!canInteract} onClick={()=>setOpen(o=>!o)}>Reply</Button>
          <Button size="sm" variant="ghost" className={`h-5 px-2 ${starred? 'text-yellow-600':''}`} disabled={!canInteract} onClick={()=>onStar(reply.id)}><Star className="h-4 w-4" /> {reply.stars||0}</Button>
        </div>
        {open && (
          <div className="flex items-center gap-2 mt-2">
            <Input className="h-7" placeholder="Reply" value={text} disabled={!canInteract} onChange={(e)=>setText(e.target.value)} />
            <Button size="sm" className="h-7" disabled={!canInteract} onClick={()=>{ if(!text.trim()) return; onReply(reply.id, text.trim()); setText(""); setOpen(false); }} style={{ background: colors.gold, color: colors.black }}>Send</Button>
          </div>
        )}
        {reply.replies?.map(nr => (
          <div key={nr.id} className="flex items-start gap-2 mt-3 ml-6">
            <Avatar className="h-5 w-5 border" style={{ borderColor: colors.gold }}>
              {nr.authorAvatar ? <img src={nr.authorAvatar} alt="avatar" className="h-5 w-5 rounded-full object-cover" /> : <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(nr.author)}</AvatarFallback>}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{nr.author}</div>
              <div className="text-sm leading-snug">{nr.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
