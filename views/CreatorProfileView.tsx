import React from 'react';
import { PostModel, QuestionModel } from '../lib/types';
import { PostCard } from '../components/PostCard';
import { QAItem } from '../components/QA';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { colors, initials } from '../lib/helpers';
import { getUserActions, updateUserActions } from '../lib/storage';

export interface CreatorProfileViewProps {
  creator: { name: string; email?: string; avatar?: string };
  sessionUser: any;
  posts: PostModel[];
  questions: QuestionModel[];
  followerCount: number;
  onBack: () => void;
  onToggleFollow: (email: string) => void;
  // Post handlers
  onReportPost: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onReplyComment: (postId: string, commentId: string, text: string) => void;
  onReportComment: (postId: string, commentId: string) => void;
  onReportReply: (postId: string, commentId: string, replyId: string) => void;
  onReplyToReply: (postId: string, commentId: string, parentReplyId: string, text: string) => void;
  onStarPost: (postId: string) => void;
  onStarComment: (postId: string, commentId: string) => void;
  onStarReply: (postId: string, commentId: string, replyId: string) => void;
  // Question / answer handlers
  onAddAnswer: (qid: string, text: string) => void;
  onUsefulAnswer: (qid: string, answerId: string) => void;
  onReportQuestion: (qid: string, answerId?: string) => void;
  onStarQuestion: (qid: string) => void;
  onStarAnswer: (qid: string, answerId: string) => void;
  onAddAnswerReply: (qid: string, answerId: string, text: string) => void;
  onAddNestedAnswerReply: (qid: string, answerId: string, parentReplyId: string, text: string) => void;
  onStarAnswerReply: (qid: string, answerId: string, replyId: string) => void;
  onReportAnswerReply: (qid: string, answerId: string, replyId: string) => void;
  onToggleAnswerReplyUseful: (qid: string, answerId: string, replyId: string) => void;
  setActionsVersion: React.Dispatch<React.SetStateAction<number>>;
}

export const CreatorProfileView: React.FC<CreatorProfileViewProps> = (props) => {
  const { creator, sessionUser, posts, questions } = props;
  const allUsersActions = sessionUser ? getUserActions(sessionUser.email) : null;
  const creatorPosts = posts.filter(p => creator.email && p.authorEmail === creator.email);
  const creatorQuestions = questions.filter(q => creator.email && q.authorEmail === creator.email);
  const isSelf = !!(sessionUser && creator.email && sessionUser.email === creator.email);
  const followed = !!(sessionUser && creator.email && getUserActions(sessionUser.email).follows[creator.email]);

  return (
    <div className="space-y-6">
      <Card className="border rounded-2xl">
        <CardHeader className="pb-2 flex flex-row items-center gap-4">
          <Button
            onClick={props.onBack}
            aria-label="Back to feed"
            className="flex items-center gap-1 px-3 h-9 rounded-full shadow"
            style={{ background: colors.black, color: colors.gold }}
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border" style={{ borderColor: colors.gold }}>
              {creator.avatar ? <img src={creator.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover" /> : <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(creator.name)}</AvatarFallback>}
            </Avatar>
            <div>
              <div className="font-semibold text-lg">{creator.name}</div>
              {creator.email && <div className="text-xs opacity-70">{creator.email}</div>}
              {creator.email && (
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span>{props.followerCount} follower{props.followerCount === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            {!isSelf && creator.email && sessionUser && (
              <Button size="sm" variant="outline" onClick={()=>{
                props.onToggleFollow(creator.email!);
                props.setActionsVersion(v=>v+1);
              }} style={{ borderColor: colors.gold }}>
                {followed ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <Separator className="my-3" />
          <div className="grid gap-6">
            <div>
              <div className="font-semibold mb-2">Posts ({creatorPosts.length})</div>
              {creatorPosts.length===0 && <div className="text-xs opacity-60">No posts.</div>}
              <div className="space-y-4">
                {creatorPosts.map(p => (
                  <PostCard key={p.id} post={p} sessionUser={sessionUser}
                    onReport={()=>props.onReportPost(p.id)}
                    onAddComment={(text)=>props.onAddComment(p.id,text)}
                    onReplyComment={(cid,text)=>props.onReplyComment(p.id,cid,text)}
                    onReportComment={(cid)=>props.onReportComment(p.id,cid)}
                    reportedByUser={!!(sessionUser && getUserActions(sessionUser.email).reports.posts[p.id])}
                    saved={!!(sessionUser && getUserActions(sessionUser.email).savedPosts[p.id])}
                    onToggleSave={()=>{ if(!sessionUser) return; const email=sessionUser.email; updateUserActions(email, prev=>{ const next={...prev}; if(next.savedPosts[p.id]) delete next.savedPosts[p.id]; else next.savedPosts[p.id]=true; return next;}); }}
                    isFollowedAuthor={!!(sessionUser && p.authorEmail && getUserActions(sessionUser.email).follows[p.authorEmail])}
                    onToggleFollow={()=>{ if(!sessionUser||!p.authorEmail) return; props.onToggleFollow(p.authorEmail); props.setActionsVersion(v=>v+1); }}
                    onOpenAuthor={(authorEmail, authorName)=>{ /* parent handles navigation */ }}
                    onStarPost={()=>props.onStarPost(p.id)}
                    starredByUser={!!(sessionUser && getUserActions(sessionUser.email).postStars?.[p.id])}
                    onStarComment={(cid)=>props.onStarComment(p.id,cid)}
                    onStarReply={(cid,rid)=>props.onStarReply(p.id,cid,rid)}
                    onReportReply={(cid,rid)=>props.onReportReply(p.id,cid,rid)}
                    onReplyToReply={(cid,prid,text)=>props.onReplyToReply(p.id,cid,prid,text)}
                    starredCommentIds={sessionUser ? getUserActions(sessionUser.email).commentStars : {}}
                    starredReplyIds={sessionUser ? getUserActions(sessionUser.email).replyStars : {}}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Questions ({creatorQuestions.length})</div>
              {creatorQuestions.length===0 && <div className="text-xs opacity-60">No questions.</div>}
              <div className="space-y-4">
                {creatorQuestions.map(q=> (
                  <QAItem key={q.id} q={q} sessionUser={sessionUser}
                    onAddAnswer={props.onAddAnswer}
                    onUsefulAnswer={props.onUsefulAnswer}
                    onReport={props.onReportQuestion}
                    saved={!!(sessionUser && getUserActions(sessionUser.email).savedQuestions[q.id])}
                    onToggleSave={(qid)=>{ if(!sessionUser) return; const email=sessionUser.email; updateUserActions(email, prev=>{ const next={...prev}; if(next.savedQuestions[qid]) delete next.savedQuestions[qid]; else next.savedQuestions[qid]=true; return next;}); }}
                    isFollowedAuthor={!!(sessionUser && q.authorEmail && getUserActions(sessionUser.email).follows[q.authorEmail])}
                    onToggleFollow={(authorEmail)=>{ if(!sessionUser||!authorEmail) return; props.onToggleFollow(authorEmail); props.setActionsVersion(v=>v+1); }}
                    onStarQuestion={(qid)=>props.onStarQuestion(qid)}
                    starredQuestionByUser={!!(sessionUser && getUserActions(sessionUser.email).questionStars?.[q.id])}
                    onStarAnswer={(qid,aid)=>props.onStarAnswer(qid,aid)}
                    starredAnswers={sessionUser ? getUserActions(sessionUser.email).answerStars : {}}
                    onAddAnswerReply={props.onAddAnswerReply}
                    onAddNestedAnswerReply={props.onAddNestedAnswerReply}
                    onStarAnswerReply={props.onStarAnswerReply}
                    starredAnswerReplyIds={sessionUser ? getUserActions(sessionUser.email).answerReplyStars : {}}
                    onReportAnswerReply={props.onReportAnswerReply}
                    onToggleAnswerReplyUseful={props.onToggleAnswerReplyUseful}
                    answerReplyUsefulIds={sessionUser ? (getUserActions(sessionUser.email) as any).answerReplyUseful : {}}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
