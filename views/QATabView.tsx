import { QAForm, QAItem } from '../components/QA';
import { QuestionModel } from '../lib/types';
import { getUserActions, updateUserActions } from '../lib/storage';

interface QATabViewProps {
  questions: QuestionModel[];
  sessionUser: any;
  highlightQuestionId: string | null;
  askQuestion: (p: { title: string; details?: string }) => void;
  answerQuestion: (qid: string, text: string) => void;
  toggleUsefulAnswer: (qid: string, answerId: string) => void;
  reportQuestion: (qid: string, aid?: string) => void;
  addAnswerReply: (qid: string, answerId: string, text: string) => void;
  addNestedAnswerReply: (qid: string, answerId: string, parentReplyId: string, text: string) => void;
  starAnswerReply: (qid: string, answerId: string, replyId: string) => void;
  reportAnswerReply: (qid: string, answerId: string, replyId: string) => void;
  toggleAnswerReplyUseful: (qid: string, answerId: string, replyId: string) => void;
  toggleQuestionStar: (qid: string) => void;
  toggleAnswerStar: (qid: string, answerId: string) => void;
  setQuestions: React.Dispatch<React.SetStateAction<QuestionModel[]>>;
  setActionsVersion: React.Dispatch<React.SetStateAction<number>>;
}

export const QATabView: React.FC<QATabViewProps> = ({ questions, sessionUser, highlightQuestionId, askQuestion, answerQuestion, toggleUsefulAnswer, reportQuestion, addAnswerReply, addNestedAnswerReply, starAnswerReply, reportAnswerReply, toggleAnswerReplyUseful, toggleQuestionStar, toggleAnswerStar, setQuestions, setActionsVersion }) => {
  return (
    <>
      <QAForm onAsk={askQuestion} sessionUser={sessionUser} />
      <div className="space-y-4">
        {questions.map((q) => (
          <div id={`question-${q.id}`} key={q.id} className={highlightQuestionId===q.id ? 'ring-2 ring-yellow-500 rounded-2xl' : ''}>
            <QAItem
              q={q}
              sessionUser={sessionUser}
              onAddAnswer={answerQuestion}
              onUsefulAnswer={toggleUsefulAnswer}
              onReport={(qid, aid) => reportQuestion(qid, aid)}
              saved={!!(sessionUser && getUserActions(sessionUser.email).savedQuestions[q.id])}
              onToggleSave={(qid) => {
                if(!sessionUser) return; const email = sessionUser.email;
                updateUserActions(email, prev => { const next={...prev}; if(next.savedQuestions[qid]) delete next.savedQuestions[qid]; else next.savedQuestions[qid]=true; return next; });
                setQuestions(qs=>[...qs]);
              }}
              isFollowedAuthor={!!(sessionUser && q.authorEmail && getUserActions(sessionUser.email).follows[q.authorEmail])}
              onToggleFollow={(authorEmail) => {
                if(!sessionUser || !authorEmail) return; const email = sessionUser.email;
                updateUserActions(email, prev => { const next={...prev}; if(next.follows[authorEmail]) delete next.follows[authorEmail]; else next.follows[authorEmail]=true; return next; });
                setQuestions(qs=>[...qs]);
                setActionsVersion(v=>v+1);
              }}
              onStarQuestion={(qid)=>toggleQuestionStar(qid)}
              starredQuestionByUser={!!(sessionUser && getUserActions(sessionUser.email).questionStars?.[q.id])}
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
          </div>
        ))}
      </div>
    </>
  );
};
