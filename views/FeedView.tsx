import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PostCard } from '../components/PostCard';
import { QAItem } from '../components/QA';
import { colors } from '../lib/helpers';
import { getUserActions, updateUserActions } from '../lib/storage';
import { QuestionModel, PostModel } from '../lib/types';

export interface FeedViewProps {
  posts: PostModel[];
  questions: QuestionModel[];
  sessionUser: any;
  highlightPostId: string | null;
  highlightQuestionId: string | null;
  navigateTo: (tab: 'feed'|'qa'|'biz'|'profile'|'creator')=>void;
  setPosts: React.Dispatch<React.SetStateAction<PostModel[]>>;
  setQuestions: React.Dispatch<React.SetStateAction<QuestionModel[]>>;
  setViewingCreator: (v: { name: string; email?: string; avatar?: string } | null)=>void; // retained (legacy)
  navigateToCreator: (email?: string, name?: string)=>void;
  addComment: (postId: string, text: string)=>void;
  addReply: (postId: string, commentId: string, text: string)=>void;
  addReplyToReply: (postId: string, commentId: string, parentReplyId: string, text: string)=>void;
  reportPost: (postId: string)=>void;
  reportComment: (postId: string, commentId: string)=>void;
  reportReply: (postId: string, commentId: string, replyId: string)=>void;
  answerQuestion: (qid: string, text: string)=>void;
  toggleUsefulAnswer: (qid: string, answerId: string)=>void;
  reportQuestion: (qid: string, aid?: string)=>void;
  addAnswerReply: (qid: string, answerId: string, text: string)=>void;
  addNestedAnswerReply: (qid: string, answerId: string, parentReplyId: string, text: string)=>void;
  toggleAnswerReplyUseful: (qid: string, answerId: string, replyId: string)=>void;
  starAnswerReply: (qid: string, answerId: string, replyId: string)=>void;
  reportAnswerReply: (qid: string, answerId: string, replyId: string)=>void;
  togglePostStar: (postId: string)=>void;
  toggleCommentStar: (postId: string, commentId: string)=>void;
  toggleReplyStar: (postId: string, commentId: string, replyId: string)=>void;
  toggleQuestionStar: (qid: string)=>void;
  toggleAnswerStar: (qid: string, answerId: string)=>void;
  setActionsVersion: React.Dispatch<React.SetStateAction<number>>;
}

export const FeedView: React.FC<FeedViewProps> = (props) => {
  const { posts, questions, sessionUser, highlightPostId, highlightQuestionId, navigateTo, setPosts, setQuestions, setViewingCreator, navigateToCreator, addComment, addReply, addReplyToReply, reportPost, reportComment, reportReply, answerQuestion, toggleUsefulAnswer, reportQuestion, addAnswerReply, addNestedAnswerReply, toggleAnswerReplyUseful, starAnswerReply, reportAnswerReply, togglePostStar, toggleCommentStar, toggleReplyStar, toggleQuestionStar, toggleAnswerStar, setActionsVersion } = props;

  const combined = [
    ...posts.map(p => ({ kind: 'post' as const, createdAt: p.createdAt, data: p })),
    ...questions.map(q => ({ kind: 'question' as const, createdAt: q.createdAt, data: q }))
  ].sort((a,b)=> b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <Card className="border rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigateTo('biz')} className="flex-1" style={{ background: colors.gold, color: colors.black }}>Create a Business post</Button>
          <Button onClick={() => navigateTo('qa')} className="flex-1" style={{ background: colors.gold, color: colors.black }}>Ask the community</Button>
        </CardContent>
      </Card>
      <AnimatePresence>
        {combined.map(item => item.kind==='post' ? (
          <motion.div id={`post-${item.data.id}`} key={item.kind+item.data.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={highlightPostId===item.data.id ? 'ring-2 ring-yellow-500 rounded-2xl' : ''}>
            <PostCard
              post={item.data}
              sessionUser={sessionUser}
              onReport={() => reportPost(item.data.id)}
              onAddComment={(text) => addComment(item.data.id, text)}
              onReplyComment={(commentId, text) => addReply(item.data.id, commentId, text)}
              onReportComment={(commentId) => reportComment(item.data.id, commentId)}
              reportedByUser={!!(sessionUser && getUserActions(sessionUser.email).reports.posts[item.data.id])}
              saved={!!(sessionUser && getUserActions(sessionUser.email).savedPosts[item.data.id])}
              onToggleSave={() => {
                if(!sessionUser) return; const email = sessionUser.email;
                updateUserActions(email, prev => { const next = { ...prev }; if(next.savedPosts[item.data.id]) delete next.savedPosts[item.data.id]; else next.savedPosts[item.data.id]=true; return next; });
                setPosts(p=>[...p]);
              }}
              isFollowedAuthor={!!(sessionUser && item.data.authorEmail && getUserActions(sessionUser.email).follows[item.data.authorEmail])}
              onToggleFollow={() => {
                if(!sessionUser || !item.data.authorEmail) return; const email = sessionUser.email;
                updateUserActions(email, prev => { const next = { ...prev }; if(next.follows[item.data.authorEmail!]) delete next.follows[item.data.authorEmail!]; else next.follows[item.data.authorEmail!]=true; return next; });
                setPosts(p=>[...p]);
                setActionsVersion(v=>v+1);
              }}
              onOpenAuthor={(authorEmail, authorName) => { navigateToCreator(authorEmail, authorName); }}
              onStarPost={()=>togglePostStar(item.data.id)}
              starredByUser={!!(sessionUser && getUserActions(sessionUser.email).postStars?.[item.data.id])}
              onStarComment={(commentId)=>toggleCommentStar(item.data.id, commentId)}
              onStarReply={(commentId, replyId)=>toggleReplyStar(item.data.id, commentId, replyId)}
              onReportReply={(commentId, replyId)=>reportReply(item.data.id, commentId, replyId)}
              onReplyToReply={(commentId, parentReplyId, text)=> addReplyToReply(item.data.id, commentId, parentReplyId, text)}
              starredCommentIds={sessionUser ? getUserActions(sessionUser.email).commentStars : {}}
              starredReplyIds={sessionUser ? getUserActions(sessionUser.email).replyStars : {}}
            />
          </motion.div>
        ) : (
          <motion.div id={`question-${item.data.id}`} key={item.kind+item.data.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={highlightQuestionId===item.data.id ? 'ring-2 ring-yellow-500 rounded-2xl' : ''}>
            <QAItem
              q={item.data}
              sessionUser={sessionUser}
              onAddAnswer={answerQuestion}
              onUsefulAnswer={toggleUsefulAnswer}
              onReport={(qid, aid) => reportQuestion(qid, aid)}
              saved={!!(sessionUser && getUserActions(sessionUser.email).savedQuestions[item.data.id])}
              onToggleSave={(qid) => {
                if(!sessionUser) return; const email = sessionUser.email;
                updateUserActions(email, prev => { const next={...prev}; if(next.savedQuestions[qid]) delete next.savedQuestions[qid]; else next.savedQuestions[qid]=true; return next; });
                setQuestions(qs=>[...qs]);
              }}
              isFollowedAuthor={!!(sessionUser && item.data.authorEmail && getUserActions(sessionUser.email).follows[item.data.authorEmail])}
              onToggleFollow={(authorEmail) => {
                if(!sessionUser || !authorEmail) return; const email = sessionUser.email;
                updateUserActions(email, prev => { const next={...prev}; if(next.follows[authorEmail]) delete next.follows[authorEmail]; else next.follows[authorEmail]=true; return next; });
                setQuestions(qs=>[...qs]);
                setActionsVersion(v=>v+1);
              }}
              onStarQuestion={(qid)=>toggleQuestionStar(qid)}
              starredQuestionByUser={!!(sessionUser && getUserActions(sessionUser.email).questionStars?.[item.data.id])}
              onStarAnswer={(qid,aid)=>toggleAnswerStar(qid,aid)}
              starredAnswers={sessionUser ? getUserActions(sessionUser.email).answerStars : {}}
              onAddAnswerReply={addAnswerReply}
              onAddNestedAnswerReply={addNestedAnswerReply}
              onStarAnswerReply={starAnswerReply}
              starredAnswerReplyIds={sessionUser ? getUserActions(sessionUser.email).answerReplyStars : {}}
              onReportAnswerReply={reportAnswerReply}
              onToggleAnswerReplyUseful={toggleAnswerReplyUseful}
              answerReplyUsefulIds={sessionUser ? (getUserActions(sessionUser.email) as any).answerReplyUseful : {}}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
