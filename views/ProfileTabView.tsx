import React from 'react';
import { PostModel, QuestionModel } from '../lib/types';
import { PostCard } from '../components/PostCard';
import { QAItem } from '../components/QA';
import { getUserActions, updateUserActions } from '../lib/storage';

interface ProfileTabViewProps {
  posts: PostModel[];
  questions: QuestionModel[];
  sessionUser: any;
  onStarPost: (postId: string)=>void;
  onStarComment: (postId: string, commentId: string)=>void;
  onStarReply: (postId: string, commentId: string, replyId: string)=>void;
  onReportPost: (postId: string)=>void;
  onReportComment: (postId: string, commentId: string)=>void;
  onReportReply: (postId: string, commentId: string, replyId: string)=>void;
  onAddComment: (postId: string, text: string)=>void;
  onReplyComment: (postId: string, commentId: string, text: string)=>void;
  onReplyToReply: (postId: string, commentId: string, parentReplyId: string, text: string)=>void;
  onToggleFollow: (authorEmail: string)=>void;
  onStarQuestion: (qid: string)=>void;
  onStarAnswer: (qid: string, answerId: string)=>void;
  onAddAnswer: (qid: string, text: string)=>void;
  onReportQuestion: (qid: string, answerId?: string)=>void;
  onUsefulAnswer: (qid: string, answerId: string)=>void;
  onAddAnswerReply: (qid: string, answerId: string, text: string)=>void;
  onAddNestedAnswerReply: (qid: string, answerId: string, parentReplyId: string, text: string)=>void;
  onStarAnswerReply: (qid: string, answerId: string, replyId: string)=>void;
  onReportAnswerReply: (qid: string, answerId: string, replyId: string)=>void;
  onToggleAnswerReplyUseful: (qid: string, answerId: string, replyId: string)=>void;
}

export const ProfileTabView: React.FC<ProfileTabViewProps> = (props) => {
  const { posts, questions, sessionUser } = props;
  const actions = sessionUser ? getUserActions(sessionUser.email) : null;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-semibold mb-2">My Posts</h3>
        <div className="space-y-4">
          {posts.filter(p=> p.authorEmail===sessionUser?.email).map(p => {
            const saved = !!(actions && actions.savedPosts[p.id]);
            return (
              <PostCard
                key={p.id}
                post={p}
                sessionUser={sessionUser}
                onReport={()=>props.onReportPost(p.id)}
                onAddComment={(text)=>props.onAddComment(p.id,text)}
                onReplyComment={(cid,text)=>props.onReplyComment(p.id,cid,text)}
                onReportComment={(cid)=>props.onReportComment(p.id,cid)}
                reportedByUser={!!(actions && actions.reports.posts[p.id])}
                saved={saved}
                onToggleSave={()=>{ if(!sessionUser) return; updateUserActions(sessionUser.email, prev=>{ const next={...prev}; if(next.savedPosts[p.id]) delete next.savedPosts[p.id]; else next.savedPosts[p.id]=true; return next;}); }}
                isFollowedAuthor={false}
                onStarPost={()=>props.onStarPost(p.id)}
                starredByUser={!!(actions && actions.postStars?.[p.id])}
                onStarComment={(cid)=>props.onStarComment(p.id,cid)}
                onStarReply={(cid,rid)=>props.onStarReply(p.id,cid,rid)}
                onReportReply={(cid,rid)=>props.onReportReply(p.id,cid,rid)}
                onReplyToReply={(cid,prid,text)=>props.onReplyToReply(p.id,cid,prid,text)}
                starredCommentIds={actions ? actions.commentStars : {}}
                starredReplyIds={actions ? actions.replyStars : {}}
              />
            );
          })}
        </div>
      </section>
      <section>
        <h3 className="font-semibold mb-2">My Questions</h3>
        <div className="space-y-4">
          {questions.filter(q=> q.authorEmail===sessionUser?.email).map(q => {
            const saved = !!(actions && actions.savedQuestions[q.id]);
            return (
              <QAItem
                key={q.id}
                q={q}
                sessionUser={sessionUser}
                onAddAnswer={props.onAddAnswer}
                onUsefulAnswer={props.onUsefulAnswer}
                onReport={props.onReportQuestion}
                saved={saved}
                onToggleSave={(qid)=>{ if(!sessionUser) return; updateUserActions(sessionUser.email, prev=>{ const next={...prev}; if(next.savedQuestions[qid]) delete next.savedQuestions[qid]; else next.savedQuestions[qid]=true; return next;}); }}
                isFollowedAuthor={false}
                onToggleFollow={()=>{}}
                onStarQuestion={props.onStarQuestion}
                starredQuestionByUser={!!(actions && actions.questionStars?.[q.id])}
                onStarAnswer={props.onStarAnswer}
                starredAnswers={actions ? actions.answerStars : {}}
                onAddAnswerReply={props.onAddAnswerReply}
                onAddNestedAnswerReply={props.onAddNestedAnswerReply}
                onStarAnswerReply={props.onStarAnswerReply}
                starredAnswerReplyIds={actions ? actions.answerReplyStars : {}}
                onReportAnswerReply={props.onReportAnswerReply}
                onToggleAnswerReplyUseful={props.onToggleAnswerReplyUseful}
                answerReplyUsefulIds={actions ? (actions as any).answerReplyUseful : {}}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};
