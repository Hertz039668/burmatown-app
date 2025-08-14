import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { MessageSquare, Building2, Users, LayoutGrid, LogIn, LogOut, Search, Folder, FileText, Bookmark, ArrowLeft } from "lucide-react";

// Lib
import { colors, uid, initials } from "../lib/helpers";
import { API_URL, fetchPostsApi, fetchQuestionsApi } from "../lib/api";
import { markHydrated } from "../lib/perf";
import { loadUsers, saveUsers, loadSession, clearSession, getUserActions, updateUserActions } from "../lib/storage";

// Components
import { TypeBadge } from "../components/Badges";
import CreatePost from "../components/CreatePost";
import BusinessProfileForm from "../components/BusinessProfile";
import BusinessCard from "../components/BusinessCard";
import { QAForm, QAItem } from "../components/QA";
import { PostCard } from "../components/PostCard";
import { FeedView } from "../views/FeedView";
import { QATabView } from "../views/QATabView";
import { BusinessesView } from "../views/BusinessesView";
import { Business, QuestionModel, PostModel } from "../lib/types";
import { CreatorProfileView } from "../views/CreatorProfileView";
// Hooks
import { usePosts } from "../hooks/usePosts";
import { useQuestions } from "../hooks/useQuestions";
import { AdapterProvider } from "../lib/AdapterContext";
import { useAdapterFromContext } from "../lib/AdapterContext";
import { useI18n } from '../lib/i18n';

// Auth guard wrapper for routes/components needing a session
const RequireAuth: React.FC<{ sessionUser: any; children: React.ReactElement }> = ({ sessionUser, children }) => {
  if (!sessionUser) return <Navigate to="/profile" replace />;
  return children;
};

// Hook to resolve creator from email param
function useCreatorResolver(email: string | undefined, posts: PostModel[], questions: QuestionModel[]) {
  if (!email) return null;
  // Try exact post author match
  const post = posts.find(p => p.authorEmail === email);
  if (post) return { name: post.author, email: post.authorEmail, avatar: post.authorAvatar };
  // Try question author
  const q = questions.find(q => q.authorEmail === email);
  if (q) return { name: q.author, email: q.authorEmail, avatar: q.authorAvatar };
  // Fallback: derive name from local part
  return { name: email.split('@')[0] || email, email };
}

// (placeholder removed; real dynamic component defined inside main component)
import AuthModal from "../components/AuthModal";
import { useUIState } from "../lib/uiState";

// Folder-style content browser for profile
function ProfileContentFolders({ myPosts, myQuestions, savedPosts, savedQuestions, onOpenPost, onOpenQuestion }: {
  myPosts: any[];
  myQuestions: any[];
  savedPosts: any[];
  savedQuestions: any[];
  onOpenPost: (id: string)=>void;
  onOpenQuestion: (id: string)=>void;
}) {
  const [tab, setTab] = useState<'myPosts'|'myQuestions'|'savedPosts'|'savedQuestions'>('myPosts');
  const tabs: { key: typeof tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'myPosts', label: 'My Posts', icon: <FileText className="h-4 w-4" />, count: myPosts.length },
    { key: 'myQuestions', label: 'My Questions', icon: <MessageSquare className="h-4 w-4" />, count: myQuestions.length },
    { key: 'savedPosts', label: 'Saved Posts', icon: <Bookmark className="h-4 w-4" />, count: savedPosts.length },
    { key: 'savedQuestions', label: 'Saved Questions', icon: <Folder className="h-4 w-4" />, count: savedQuestions.length },
  ];
  const renderList = (items: any[], kind: 'post'|'question') => {
    if(items.length===0) return <div className="text-sm opacity-60 py-4">No items.</div>;
    return (
      <div className="space-y-2 mt-3">
        {items.map(it => (
          <button
            type="button"
            key={it.id}
            onClick={()=> kind==='post' ? onOpenPost(it.id) : onOpenQuestion(it.id)}
            className="w-full text-left p-3 rounded-lg bg-[--item-bg] hover:ring-2 ring-yellow-500 transition focus:outline-none"
            style={{ ['--item-bg' as any]: colors.offwhite }}
          >
            <div className="font-medium line-clamp-2">{it.title}</div>
            <div className="text-xs opacity-70 mt-0.5">
              {new Date(it.createdAt).toLocaleDateString(undefined,{ day:'2-digit', month:'short', year:'numeric' })}
              {' '}
              {new Date(it.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </button>
        ))}
      </div>
    );
  };
  return (
    <div className="mt-4">
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={()=>setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${tab===t.key ? 'bg-black text-yellow-500' : 'bg-white hover:bg-black/5'}`}
            style={{ borderColor: colors.smoke }}
          >
            {t.icon}
            {t.label}
            <span className="opacity-70">({t.count})</span>
          </button>
        ))}
      </div>
      <div className="mt-2 border rounded-xl p-3" style={{ borderColor: colors.smoke }}>
  {tab==='myPosts' && renderList(myPosts, 'post')}
  {tab==='myQuestions' && renderList(myQuestions, 'question')}
  {tab==='savedPosts' && renderList(savedPosts, 'post')}
  {tab==='savedQuestions' && renderList(savedQuestions, 'question')}
      </div>
    </div>
  );
}

export default function BurmaTown() {
  const adapterCtx = useAdapterFromContext();
  const { t } = useI18n();
  // Dynamic creator route component (captures latest state via closure)
  const CreatorDynamic: React.FC = () => {
    const { email } = useParams();
    const creator = useCreatorResolver(email, posts, questions);
    if(!creator) return <div className="text-sm opacity-60 p-4">Creator not found.</div>;
    const followerCount = (function(){
      let count=0; try { const allUsers=loadUsers(); if(creator.email) count = allUsers.filter(u=>{ try { return !!getUserActions(u.email).follows[creator.email!]; } catch { return false; }}).length; } catch {} return count; })();
    return (
      <CreatorProfileView
  creator={creator}
        sessionUser={sessionUser}
        posts={posts}
        questions={questions}
        followerCount={followerCount}
        onBack={()=>{ goTab('feed'); navigate('/'); }}
  onToggleFollow={(em)=>{ if(!sessionUser||!em) return; updateUserActions(sessionUser.email, prev=>{ const next={...prev}; if(next.follows[em]) { delete next.follows[em]; adapterCtx?.unfollowUser?.(em); } else { next.follows[em]=true; adapterCtx?.followUser?.(em); } return next; }); setActionsVersion(v=>v+1); }}
        onReportPost={reportPost}
        onAddComment={addComment}
        onReplyComment={addReply}
        onReportComment={reportComment}
        onReportReply={reportReply}
        onReplyToReply={addReplyToReply}
        onStarPost={togglePostStar}
        onStarComment={toggleCommentStar}
        onStarReply={toggleReplyStar}
        onAddAnswer={answerQuestion}
        onUsefulAnswer={toggleUsefulAnswer}
        onReportQuestion={reportQuestion}
        onStarQuestion={toggleQuestionStar}
        onStarAnswer={toggleAnswerStar}
        onAddAnswerReply={addAnswerReply}
        onAddNestedAnswerReply={addNestedAnswerReply}
        onStarAnswerReply={starAnswerReply}
        onReportAnswerReply={reportAnswerReply}
        onToggleAnswerReplyUseful={toggleAnswerReplyUseful}
        setActionsVersion={setActionsVersion}
      />
    );
  };
  const { pushToast, setLoading } = useUIState();
  const location = useLocation();
  const navigate = useNavigate();
  const pathToTab = (path: string): "feed" | "qa" | "biz" | "profile" | "creator" => {
    const seg = (path || "/").replace(/\/+$/, "").split("/")[1] || "feed";
    if (seg === "qa" || seg === "biz" || seg === "profile" || seg === 'creator') return seg;
    return "feed";
  };
  const active: "feed" | "qa" | "biz" | "profile" | "creator" = pathToTab(location.pathname);
  const [viewingCreator, setViewingCreator] = useState<{ name: string; email?: string; avatar?: string } | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const actionsAppliedRef = useRef(false);

  const [profile, setProfile] = useState<any>({
    type: "general",
    name: "Guest",
    category: "",
    website: "",
    bio: "",
    avatar: "",
  });

  // Navigation helper
  const goTab = (tab: typeof active) => navigate(tab === 'feed' ? '/' : `/${tab}`);

  // Hydrate session once
  useEffect(() => {
    const sess = loadSession();
    if (sess?.email) {
      const users = loadUsers();
      const user = users.find((u) => u.email === sess.email);
      if (user) setSessionUser(user);
    }
  }, []);

  // Listen for user action log failures to surface toast
  useEffect(() => {
    const handler = (e: any) => { pushToast?.(`Action sync failed: ${e.detail?.actionType}`, { type:'error' }); };
    window.addEventListener('bt_user_action_log_failed', handler);
    return () => window.removeEventListener('bt_user_action_log_failed', handler);
  }, [pushToast]);

  useEffect(() => {
    if (sessionUser) {
      setProfile({
        type: sessionUser.type,
        name: sessionUser.name,
        category: sessionUser.category || "",
        website: sessionUser.website || "",
        bio: sessionUser.bio || "",
        avatar: sessionUser.avatar || "",
      });
    } else {
      setProfile({ type: "general", name: "Guest", category: "", website: "", bio: "", avatar: "" });
    }
  }, [sessionUser]);

  const signOut = () => {
    clearSession();
    setSessionUser(null);
  };

  // Seed data (local fallback; can be replaced by API on mount)
  const [posts, setPosts] = useState<PostModel[]>([
    {
      id: uid(),
      title: "Launching our Summer Jasmine Blend",
      body: "Delicate aroma, fresh harvest. Pre-orders open now!",
      mediaUrl:
        "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=1200&auto=format&fit=crop",
      price: "12.99",
      author: "Golden Lotus Tea",
      authorEmail: "golden@lotus.mm",
      authorAvatar: "",
      authorType: "business",
      createdAt: Date.now() - 1000 * 60 * 60 * 3,
  // reactions removed
      reports: 0,
      comments: [
        {
          id: uid(),
          author: "Myo Min",
          authorEmail: "myo@student.mm",
          authorAvatar: "",
          authorType: "student",
          text: "Is there a student discount?",
          createdAt: Date.now() - 1000 * 60 * 60 * 2,
          reactions: { like: 0, love: 0 },
          userReaction: null,
          reports: 0,
          replies: [
            {
              id: uid(),
              author: "Golden Lotus Tea",
              authorAvatar: "",
              text: "Yes! 10% with student ID.",
              createdAt: Date.now() - 1000 * 60 * 55,
              stars: 0,
              reports: 0,
            },
          ],
        },
      ],
    },
  ]);

  const [questions, setQuestions] = useState<QuestionModel[]>([
    {
      id: uid(),
      title: "Best places to source packaging in Yangon?",
      details: "Looking for eco-friendly suppliers.",
      author: "Aye Aye",
      authorEmail: "aye@user.mm",
      authorAvatar: "",
      createdAt: Date.now() - 1000 * 60 * 90,
      useful: 1,
      usefulByUser: false,
      reports: 0,
      answers: [
        {
          id: uid(),
          author: "Soe Naing (Green Pack)",
          authorEmail: "soenaing@biz.mm",
          authorAvatar: "",
          text: "Try Thaketa Industrial Zone – several vendors with recycled options.",
          reports: 0,
        },
      ],
    },
  ]);

  const [pendingEngagements, setPendingEngagements] = useState(0);
  const pendingMapRef = useRef<Record<string, number>>({});

  // Engagement queue status listeners
  useEffect(()=>{
  const pending = (e:any)=> { setPendingEngagements(e.detail?.count||0); if(e.detail?.entityId){ pendingMapRef.current[e.detail.entityId]=(pendingMapRef.current[e.detail.entityId]||0)+1; } };
  const flushed = (e:any)=> { setPendingEngagements(0); pendingMapRef.current={}; pushToast?.(`Synced ${e.detail?.count||0} engagement${(e.detail?.count||0)===1?'':'s'}`); };
    window.addEventListener('bt_engagement_pending', pending);
    window.addEventListener('bt_engagement_flush', flushed);
    return ()=> { window.removeEventListener('bt_engagement_pending', pending); window.removeEventListener('bt_engagement_flush', flushed); };
  }, [pushToast]);

  // Apply persisted actions once per session load + server hydration
  useEffect(() => {
    // Optional: fetch initial data from backend if configured
    (async () => {
      if (API_URL) {
        try {
          const [remotePosts, remoteQuestions] = await Promise.all([
            fetchPostsApi(),
            fetchQuestionsApi(),
          ]);
          if (remotePosts && remotePosts.length) {
            setPosts(remotePosts.map((p:any) => {
              return {
                id: p.id,
                title: p.title||'',
                body: p.body||'',
                media: p.media||[],
                price: p.price,
                author: p.author||'Unknown',
                authorEmail: p.authorEmail||'',
                authorAvatar: p.authorAvatar||'',
                authorType: (p.authorType as any)||'general',
                createdAt: p.createdAt||Date.now(),
                reports: p.reports||0,
                stars: p.stars||0,
                commentsCount: p.commentsCount,
                comments: []
              };
            }));
          }
          if (remoteQuestions && remoteQuestions.length) {
            setQuestions(remoteQuestions.map((q:any) => ({
              id: q.id,
              title: q.title,
              details: q.details,
              author: q.author||'Unknown',
              authorEmail: q.authorEmail||'',
              authorAvatar: q.authorAvatar||'',
              createdAt: q.createdAt||Date.now(),
              useful: q.useful||0,
              usefulByUser: !!q.usefulByUser,
              reports: q.reports||0,
              stars: q.stars||0,
              answersCount: q.answersCount,
              answers: []
            })));
          }
          markHydrated();
        } catch {}
      }
    })();
    if (!sessionUser || actionsAppliedRef.current) return;
    const actions = getUserActions(sessionUser.email);
    // Posts
  // Post reactions removed; skip hydration for them
    // Hydrate stars
    setPosts(prev => prev.map(p => ({
      ...p,
      stars: p.stars || (actions.postStars?.[p.id] ? 1 : 0),
      comments: p.comments.map((c: any) => ({
        ...c,
        stars: c.stars || (actions.commentStars?.[c.id] ? 1 : 0),
        replies: (c.replies||[]).map((r:any)=> ({
          ...r,
          stars: r.stars || (actions.replyStars?.[r.id] ? 1 : 0),
        }))
      }))
    })));
    setQuestions(prev => prev.map(q => ({
      ...q,
      stars: q.stars || (actions.questionStars?.[q.id] ? 1 : 0),
      answers: q.answers.map(a => ({
        ...a,
        stars: a.stars || (actions.answerStars?.[a.id] ? 1 : 0)
      }))
    })));
    // Questions useful
    setQuestions((prev) =>
      prev.map((q) => {
        if (actions.questionUseful[q.id] && !q.usefulByUser) {
          return { ...q, usefulByUser: true, useful: (q.useful || 0) + 1 };
        }
        return q;
      })
    );
    // Answer replies useful hydration
    setQuestions(prev => prev.map(q => ({
      ...q,
      answers: q.answers.map(a => ({
        ...a,
        replies: (a.replies||[]).map(r => {
          const mark = (actions as any).answerReplyUseful?.[r.id];
            const base: any = { ...r };
            if(mark && !base.usefulByUser) {
              base.usefulByUser = true;
              base.useful = (base.useful||0)+1;
            }
            if(base.replies && base.replies.length) {
              base.replies = base.replies.map((nr:any) => {
                const nmark = (actions as any).answerReplyUseful?.[nr.id];
                if(nmark && !nr.usefulByUser) return { ...nr, usefulByUser: true, useful: (nr.useful||0)+1 };
                return nr;
              });
            }
            return base;
        })
      }))
    })));
    // Comments reactions cannot be easily incremented without IDs mapping; we stored by commentId, so do it:
    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        comments: p.comments.map((c: any) => {
          const cr = actions.commentReactions[c.id];
          if (cr && c.userReaction == null) {
            const reactions = { ...c.reactions } as Record<string, number>;
            reactions[cr] = (reactions[cr] || 0) + 1;
            return { ...c, userReaction: cr as any, reactions };
          }
          return c;
        }),
      }))
    );
    actionsAppliedRef.current = true;
  }, [sessionUser]);

  // Derive businesses from users + posts
  const businessesFromUsers = useMemo(
    () => loadUsers().filter((u: any) => u.type === "business"),
    [sessionUser]
  );

  const businesses: Business[] = useMemo(() => {
    const b: Business[] = [];
    if (profile?.type === "business") b.push({ ...profile, name: profile.name });
    posts.forEach((p) => {
      if (p.authorType === "business") {
        b.push({
          name: p.author,
          category: (p as any).category || profile.category,
          website: profile.website,
          bio: profile.bio,
          avatar: p.authorAvatar,
          email: p.authorEmail,
        });
      }
    });
    businessesFromUsers.forEach((u: any) =>
      b.push({ name: u.name, category: u.category, website: u.website, bio: u.bio, avatar: u.avatar, email: u.email })
    );
    const map = new Map<string, Business>();
    b.forEach((x) => map.set(x.name, x));
    return Array.from(map.values());
  }, [posts, profile, businessesFromUsers]);

  // Saved content (posts & questions) for profile view
  // Recompute user actions whenever content or active tab changes so saved items reflect latest localStorage state
  // Version bump state to force recalculation of user-related aggregates (follows) after localStorage mutations
  const [actionsVersion, setActionsVersion] = useState(0);
  const userActions = useMemo(() => (sessionUser ? getUserActions(sessionUser.email) : null), [sessionUser, posts, questions, active, actionsVersion]);
  // React to cross-component localStorage updates (follow/unfollow, saves, stars) via custom event
  useEffect(() => {
    const handler = () => setActionsVersion(v=>v+1);
    window.addEventListener('bt_user_actions_changed', handler);
    return () => window.removeEventListener('bt_user_actions_changed', handler);
  }, []);
  const savedPostsList = useMemo(() => (
    sessionUser && userActions ? posts.filter(p => !!userActions.savedPosts[p.id]) : []
  ), [sessionUser, posts, userActions]);
  const savedQuestionsList = useMemo(() => (
    sessionUser && userActions ? questions.filter(q => !!userActions.savedQuestions[q.id]) : []
  ), [sessionUser, questions, userActions]);

  // Following / Followers data
  const followingList = useMemo(() => {
    if(!sessionUser || !userActions) return [] as any[];
    const users = loadUsers();
    const followedEmails = Object.keys(userActions.follows || {});
    if(followedEmails.length === 0) return [];
    // Build quick lookup from existing users
    const userMap: Record<string, any> = {};
    users.forEach(u => { userMap[u.email] = u; });
    const enrichFromContent = (email: string) => {
      // Try posts
      for(const p of posts) {
        if(p.authorEmail === email) return { email, name: p.author, avatar: p.authorAvatar, type: p.authorType };
      }
      // Try questions
      for(const q of questions) {
        if(q.authorEmail === email) return { email, name: q.author, avatar: q.authorAvatar, type: 'general' };
      }
      return { email, name: email.split('@')[0] || email, avatar: '', type: 'general' };
    };
    return followedEmails.map(em => userMap[em] || enrichFromContent(em));
  }, [sessionUser, userActions, posts, questions]);
  const followerList = useMemo(() => {
    if(!sessionUser) return [] as any[];
    const users = loadUsers();
    const collected: any[] = [];
    const seen = new Set<string>();
    const pushIf = (u:any) => { if(!seen.has(u.email)) { seen.add(u.email); collected.push(u); } };
    // From registered users
    users.forEach(u => {
      try { const ua = getUserActions(u.email); if(ua.follows?.[sessionUser.email]) pushIf(u); } catch {}
    });
    // From posts authors
    posts.forEach(p => {
      if(p.authorEmail && !seen.has(p.authorEmail)) {
        try { const ua = getUserActions(p.authorEmail); if(ua.follows?.[sessionUser.email]) pushIf({ email:p.authorEmail, name:p.author, avatar:p.authorAvatar, type:p.authorType }); } catch {}
      }
    });
    // From questions authors
    questions.forEach(q => {
      if(q.authorEmail && !seen.has(q.authorEmail)) {
        try { const ua = getUserActions(q.authorEmail); if(ua.follows?.[sessionUser.email]) pushIf({ email:q.authorEmail, name:q.author, avatar:q.authorAvatar, type:'general' }); } catch {}
      }
    });
    return collected;
  }, [sessionUser, actionsVersion, userActions, posts, questions]);
  const followingCount = followingList.length;
  const followersCount = followerList.length;
  const [openFollowType, setOpenFollowType] = useState<null | 'following' | 'followers'>(null);

  // Navigation helpers to jump to original posts / questions
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [highlightQuestionId, setHighlightQuestionId] = useState<string | null>(null);

  const goToPost = (postId: string) => {
    goTab('feed');
    navigate(`/#post-${postId}`);
    setHighlightPostId(postId);
    // Wait a tick for feed to render
    setTimeout(() => {
      const el = document.getElementById(`post-${postId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    setTimeout(() => setHighlightPostId(p => p === postId ? null : p), 4000);
  };
  const goToQuestion = (qid: string) => {
    goTab('qa');
    navigate(`/qa#question-${qid}`);
    setHighlightQuestionId(qid);
    setTimeout(() => {
      const el = document.getElementById(`question-${qid}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    setTimeout(() => setHighlightQuestionId(q => q === qid ? null : q), 4000);
  };

  // --- Integrated Hooks (Posts & Questions) ---
  const {
    createPost: createPostInternal,
    addComment: addCommentInternal,
    addReply: addReplyInternal,
    addReplyToReply: addReplyToReplyInternal,
    toggleStarPost: toggleStarPostInternal,
    toggleCommentStar: toggleCommentStarInternal,
    toggleReplyStar: toggleReplyStarInternal,
    reportPost: reportPostInternal,
    reportComment: reportCommentInternal,
    reportReply: reportReplyInternal,
  } = usePosts(posts, setPosts, sessionUser, pushToast);
  const {
    askQuestion: askQuestionInternal,
    answerQuestion: answerQuestionInternal,
    toggleQuestionStar: toggleQuestionStarInternal,
    toggleAnswerStar: toggleAnswerStarInternal,
    toggleUsefulAnswer: toggleUsefulAnswerInternal,
    addAnswerReply: addAnswerReplyInternal,
    addNestedAnswerReply: addNestedAnswerReplyInternal,
    toggleAnswerReplyUseful: toggleAnswerReplyUsefulInternal,
    starAnswerReply: starAnswerReplyInternal,
    reportQuestion: reportQuestionInternal,
    reportAnswerReply: reportAnswerReplyInternal,
  } = useQuestions(questions, setQuestions, sessionUser, pushToast);

  // Wrappers preserving existing prop names / signatures
  const createPost = ({ title, body, media, mediaUrl, price }: { title: string; body: string; media?: string[]; mediaUrl?: string; price?: string }) =>
    createPostInternal({ title, body, media, mediaUrl, price, profile });
  const addComment = (postId: string, text: string) => addCommentInternal(postId, text);
  const addReply = (postId: string, commentId: string, text: string) => addReplyInternal(postId, commentId, text);
  const addReplyToReply = (postId: string, commentId: string, parentReplyId: string, text: string) => addReplyToReplyInternal(postId, commentId, parentReplyId, text);
  const askQuestion = ({ title, details }: { title: string; details?: string }) => askQuestionInternal({ title, details });
  const answerQuestion = (qid: string, text: string) => answerQuestionInternal(qid, text);
  const togglePostStar = (postId: string) => toggleStarPostInternal(postId);
  const toggleQuestionStar = (qid: string) => toggleQuestionStarInternal(qid);
  const toggleAnswerStar = (qid: string, answerId: string) => toggleAnswerStarInternal(qid, answerId);
  const toggleUsefulAnswer = (qid: string, answerId: string) => toggleUsefulAnswerInternal(qid, answerId);
  const addAnswerReply = (qid: string, answerId: string, text: string) => addAnswerReplyInternal(qid, answerId, text);
  const addNestedAnswerReply = (qid: string, answerId: string, parentReplyId: string, text: string) => addNestedAnswerReplyInternal(qid, answerId, parentReplyId, text);
  const toggleAnswerReplyUseful = (qid: string, answerId: string, replyId: string) => toggleAnswerReplyUsefulInternal(qid, answerId, replyId);
  const starAnswerReply = (qid: string, answerId: string, replyId: string) => starAnswerReplyInternal(qid, answerId, replyId);
  const reportQuestion = (qid: string, answerId?: string) => reportQuestionInternal(qid, answerId);
  const reportAnswerReply = (qid: string, answerId: string, replyId: string) => reportAnswerReplyInternal(qid, answerId, replyId);
  // Comment/reply stars & reports via hook
  const toggleCommentStar = (postId: string, commentId: string) => toggleCommentStarInternal(postId, commentId);
  const toggleReplyStar = (postId: string, commentId: string, replyId: string) => toggleReplyStarInternal(postId, commentId, replyId);
  const reportPost = (postId: string) => reportPostInternal(postId);
  const reportComment = (postId: string, commentId: string) => reportCommentInternal(postId, commentId);
  const reportReply = (postId: string, commentId: string, replyId: string) => reportReplyInternal(postId, commentId, replyId);
  // Legacy inline star/report handlers removed; wrappers delegate to hook internals.

  const onProfileSave = (p: any) => {
    setProfile(p);
    if (sessionUser) {
      const users = loadUsers();
      const idx = users.findIndex((u: any) => u.email === sessionUser.email);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...p, name: p.name };
        saveUsers(users);
        setSessionUser(users[idx]);
      }
    }
  };

  // Business search & modal
  const [bizQuery, setBizQuery] = useState("");
  const filteredBusinesses = useMemo(() => {
    const q = bizQuery.toLowerCase();
    return businesses.filter((b) => [b.name, b.category || ""].some((x) => x.toLowerCase().includes(q)));
  }, [bizQuery, businesses]);

  const [openBiz, setOpenBiz] = useState<Business | null>(null);
  const bizPosts = useMemo(
    () => posts.filter((p) => openBiz && (p.authorEmail ? p.authorEmail === openBiz.email : p.author === openBiz?.name)),
    [openBiz, posts]
  );

  return (
    <AdapterProvider>
    <div className="min-h-screen" style={{ background: colors.white }}>
      {/* Top Bar (hidden in creator view) */}
      {active !== 'creator' && (
      <div className="sticky top-0 z-20 border-b backdrop-blur supports-[backdrop-filter]:bg-white/70" style={{ borderColor: colors.smoke }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold" style={{ background: colors.black, color: colors.gold }}>
              BT
            </div>
            <div className="font-semibold tracking-wide" style={{ color: colors.black }}>
              Burma Town
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              aria-current={active === "feed" ? "page" : undefined}
              className={`relative gap-2 transition-colors rounded-xl px-4 ${active === "feed" ? "font-semibold bg-black/90 text-white shadow-inner" : "hover:bg-black/5"}`}
              onClick={() => goTab("feed")}>
              <LayoutGrid className="h-4 w-4" /> {t('nav.feed')}
              {active === "feed" && <span className="absolute -bottom-2 left-4 right-4 h-0.5 rounded-full" style={{ background: colors.gold }} />}
            </Button>
            <Button
              variant="ghost"
              aria-current={active === "qa" ? "page" : undefined}
              className={`relative gap-2 transition-colors rounded-xl px-4 ${active === "qa" ? "font-semibold bg-black/90 text-white shadow-inner" : "hover:bg-black/5"}`}
              onClick={() => goTab("qa")}>
              <MessageSquare className="h-4 w-4" /> {t('nav.qa')}
              {active === "qa" && <span className="absolute -bottom-2 left-4 right-4 h-0.5 rounded-full" style={{ background: colors.gold }} />}
            </Button>
            <Button
              variant="ghost"
              aria-current={active === "biz" ? "page" : undefined}
              className={`relative gap-2 transition-colors rounded-xl px-4 ${active === "biz" ? "font-semibold bg-black/90 text-white shadow-inner" : "hover:bg-black/5"}`}
              onClick={() => goTab("biz")}>
              <Building2 className="h-4 w-4" /> {t('nav.biz')}
              {active === "biz" && <span className="absolute -bottom-2 left-4 right-4 h-0.5 rounded-full" style={{ background: colors.gold }} />}
            </Button>
            <Button
              variant="ghost"
              aria-current={active === "profile" ? "page" : undefined}
              className={`relative gap-2 transition-colors rounded-xl px-4 ${active === "profile" ? "font-semibold bg-black/90 text-white shadow-inner" : "hover:bg-black/5"}`}
              onClick={() => goTab("profile")}>
              <Users className="h-4 w-4" /> {t('nav.profile')}
              {active === "profile" && <span className="absolute -bottom-2 left-4 right-4 h-0.5 rounded-full" style={{ background: colors.gold }} />}
            </Button>
            {/* Creator tab button removed; creator view hides nav entirely */}
            {!sessionUser ? (
              <AuthModal
                onSignedIn={() => {
                  const sess = loadSession();
                  if (sess?.email) {
                    const users = loadUsers();
                    const user = users.find((u) => u.email === sess.email);
                    if (user) setSessionUser(user);
                  }
                }}
                trigger={() => (
                  <Button variant="outline" className="ml-2" style={{ borderColor: colors.gold }}>
                    <LogIn className="h-4 w-4 mr-1" /> {t('auth.signin')}
                  </Button>
                )}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border" style={{ borderColor: colors.gold }}>
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <AvatarFallback style={{ background: colors.black, color: colors.gold }}>
                      {initials(sessionUser.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button variant="outline" onClick={signOut} style={{ borderColor: colors.gold }}>
                  <LogOut className="h-4 w-4 mr-1" /> {t('auth.signout')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          {active === 'profile' && (
            <BusinessProfileForm profile={profile} setProfile={onProfileSave} />
          )}
          {!sessionUser && (
            <Card className="border rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('cta.getStarted')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>{t('cta.guestBrowse')}</p>
                <AuthModal
                  onSignedIn={() => {
                    const sess = loadSession();
                    if (sess?.email) {
                      const users = loadUsers();
                      const user = users.find((u) => u.email === sess.email);
                      if (user) setSessionUser(user);
                    }
                  }}
                  trigger={() => (
                    <Button className="w-full" style={{ background: colors.gold, color: colors.black }}>
                      <LogIn className="h-4 w-4 mr-1" /> {t('cta.signupSignin')}
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          <Routes>
            <Route path="/" element={<FeedView
              posts={posts}
              questions={questions}
              sessionUser={sessionUser}
              highlightPostId={highlightPostId}
              highlightQuestionId={highlightQuestionId}
              navigateTo={goTab}
              setPosts={setPosts}
              setQuestions={setQuestions}
              setViewingCreator={setViewingCreator}
              navigateToCreator={(email, name)=> { const target = email || name; if(target) navigate(`/creator/${encodeURIComponent(target)}`); }}
              addComment={addComment}
              addReply={addReply}
              addReplyToReply={addReplyToReply}
              reportPost={reportPost}
              reportComment={reportComment}
              reportReply={reportReply}
              answerQuestion={answerQuestion}
              toggleUsefulAnswer={toggleUsefulAnswer}
              reportQuestion={reportQuestion}
              addAnswerReply={addAnswerReply}
              addNestedAnswerReply={addNestedAnswerReply}
              toggleAnswerReplyUseful={toggleAnswerReplyUseful}
              starAnswerReply={starAnswerReply}
              reportAnswerReply={reportAnswerReply}
              togglePostStar={togglePostStar}
              toggleCommentStar={toggleCommentStar}
              toggleReplyStar={toggleReplyStar}
              toggleQuestionStar={toggleQuestionStar}
              toggleAnswerStar={toggleAnswerStar}
              setActionsVersion={setActionsVersion}
            />} />
            <Route path="/qa" element={<QATabView
              questions={questions}
              sessionUser={sessionUser}
              highlightQuestionId={highlightQuestionId}
              askQuestion={askQuestion}
              answerQuestion={answerQuestion}
              toggleUsefulAnswer={toggleUsefulAnswer}
              reportQuestion={reportQuestion}
              addAnswerReply={addAnswerReply}
              addNestedAnswerReply={addNestedAnswerReply}
              starAnswerReply={starAnswerReply}
              reportAnswerReply={reportAnswerReply}
              toggleAnswerReplyUseful={toggleAnswerReplyUseful}
              toggleQuestionStar={toggleQuestionStar}
              toggleAnswerStar={toggleAnswerStar}
              setQuestions={setQuestions}
              setActionsVersion={setActionsVersion}
            />} />
            <Route path="/biz" element={<BusinessesView
              posts={posts}
              sessionUser={sessionUser}
              profile={profile}
              highlightPostId={highlightPostId}
              createPost={createPost}
              reportPost={reportPost}
              addComment={addComment}
              addReply={addReply}
              addReplyToReply={addReplyToReply}
              reportComment={reportComment}
              reportReply={reportReply}
              togglePostStar={togglePostStar}
              toggleCommentStar={toggleCommentStar}
              toggleReplyStar={toggleReplyStar}
              setPosts={setPosts}
              setActionsVersion={setActionsVersion}
              onOpenAuthor={(authorEmail, authorName) => { const target = authorEmail || authorName; if(target) navigate(`/creator/${encodeURIComponent(target)}`); }}
              pushToast={pushToast}
            />} />
            <Route path="/creator/:email" element={<CreatorDynamic /> } />
            <Route path="/creator" element={viewingCreator ? <CreatorProfileView
              creator={viewingCreator}
              sessionUser={sessionUser}
              posts={posts}
              questions={questions}
              followerCount={(function(){
                let count=0; try { const allUsers=loadUsers(); if(viewingCreator.email) count = allUsers.filter(u=>{ try { return !!getUserActions(u.email).follows[viewingCreator.email!]; } catch { return false; }}).length; } catch {} return count; })()}
              onBack={()=>{ goTab('feed'); setViewingCreator(null); }}
              onToggleFollow={(email)=>{ if(!sessionUser||!email) return; updateUserActions(sessionUser.email, prev=>{ const next={...prev}; if(next.follows[email]) { delete next.follows[email]; adapterCtx?.unfollowUser?.(email); } else { next.follows[email]=true; adapterCtx?.followUser?.(email); } return next; }); }}
              onReportPost={reportPost}
              onAddComment={addComment}
              onReplyComment={addReply}
              onReportComment={reportComment}
              onReportReply={reportReply}
              onReplyToReply={addReplyToReply}
              onStarPost={togglePostStar}
              onStarComment={toggleCommentStar}
              onStarReply={toggleReplyStar}
              onAddAnswer={answerQuestion}
              onUsefulAnswer={toggleUsefulAnswer}
              onReportQuestion={reportQuestion}
              onStarQuestion={toggleQuestionStar}
              onStarAnswer={toggleAnswerStar}
              onAddAnswerReply={addAnswerReply}
              onAddNestedAnswerReply={addNestedAnswerReply}
              onStarAnswerReply={starAnswerReply}
              onReportAnswerReply={reportAnswerReply}
              onToggleAnswerReplyUseful={toggleAnswerReplyUseful}
              setActionsVersion={setActionsVersion}
            /> : null} />
            <Route path="/protected/new-post" element={<RequireAuth sessionUser={sessionUser}><div className="text-sm">Protected placeholder</div></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={
            <Card className="border rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border" style={{ borderColor: colors.gold }}>
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <AvatarFallback style={{ background: colors.black, color: colors.gold }}>
                        {initials(profile.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-semibold text-lg flex items-center gap-2">
                      {profile.name} <TypeBadge type={profile.type} />
                      {sessionUser && (
                        <span className="text-xs font-normal opacity-70 flex items-center gap-3">
                          <button type="button" onClick={()=> setOpenFollowType('following')} className="hover:underline focus:outline-none">
                            Following {followingCount}
                          </button>
                          <button type="button" onClick={()=> setOpenFollowType('followers')} className="hover:underline focus:outline-none">
                            Followers {followersCount}
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-70 capitalize">{profile.type} account</div>
                  </div>
                </div>
                {profile.type === "business" && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="opacity-60">Category:</span> {profile.category || "—"}
                    </div>
                    <div>
                      <span className="opacity-60">Website:</span>{" "}
                      {profile.website ? (
                        <a href={profile.website} className="underline" target="_blank" rel="noreferrer">
                          {profile.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                )}
                <p className="text-sm">{profile.bio || "No bio yet."}</p>
                {/* Folder-style navigation for user content */}
                {sessionUser ? (
                  <ProfileContentFolders
                    myPosts={posts.filter(p=> p.authorEmail===sessionUser?.email)}
                    myQuestions={questions.filter(q=> q.authorEmail===sessionUser?.email)}
                    savedPosts={savedPostsList}
                    savedQuestions={savedQuestionsList}
                    onOpenPost={goToPost}
                    onOpenQuestion={goToQuestion}
                  />
                ) : (
                  <div className="text-sm opacity-70">Sign in to see your posts and saved items.</div>
                )}
              </CardContent>
              {/* Follow dialog */}
              <Dialog open={!!openFollowType} onOpenChange={(o)=> !o && setOpenFollowType(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{openFollowType === 'following' ? 'Following' : 'Followers'}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-80 overflow-y-auto space-y-2 pt-1">
                    {(openFollowType === 'following' ? followingList : followerList).length === 0 && (
                      <div className="text-sm opacity-60 py-6 text-center">No {openFollowType === 'following' ? 'followings' : 'followers'} yet.</div>
                    )}
                    {(openFollowType === 'following' ? followingList : followerList).map(u => (
                      <div key={u.email} className="flex items-center gap-3 p-2 rounded-md hover:bg-black/5">
                        <Avatar className="h-8 w-8 border" style={{ borderColor: colors.gold }}>
                          {u.avatar ? (<img src={u.avatar} className="h-8 w-8 rounded-full object-cover" />) : (
                            <AvatarFallback style={{ background: colors.black, color: colors.gold }}>{initials(u.name)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{u.name}</div>
                          <div className="text-[10px] opacity-60 capitalize">{u.type} account</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </Card> } />
          </Routes>
        </div>

        {/* Right */}
        <div className="lg:col-span-1 space-y-6 order-3">
          <Card className="border rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Keep it friendly and constructive.</p>
              <p>• Product posts: add clear photos/videos and pricing.</p>
              <p>• Q&A: include details to get better answers.</p>
            </CardContent>
          </Card>
          <Card className="border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trending Q&A</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {questions.slice(0, 3).map((q) => (
                <div key={q.id} className="p-3 rounded-xl" style={{ background: colors.offwhite }}>
                  {q.title}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Business Profile Modal */}
      {openBiz && (
        <Dialog open={!!openBiz} onOpenChange={(o) => !o && setOpenBiz(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{openBiz.name}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 border" style={{ borderColor: colors.gold }}>
                {openBiz.avatar ? (
                  <img src={openBiz.avatar} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <AvatarFallback style={{ background: colors.black, color: colors.gold }}>
                    {initials(openBiz.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <TypeBadge type="business" /> <span>{openBiz.category}</span>
                </div>
                {openBiz.website && (
                  <a className="underline" href={openBiz.website} target="_blank" rel="noreferrer">
                    {openBiz.website}
                  </a>
                )}
              </div>
            </div>
            <p className="text-sm mb-4">{openBiz.bio || "No bio yet."}</p>
            <Separator />
            <div className="mt-4">
              <div className="font-medium mb-2">Posts by {openBiz.name}</div>
              <div className="grid gap-3">
                {bizPosts.length === 0 && <div className="text-sm opacity-70">No posts from this business yet.</div>}
                {bizPosts.map((p) => (
                  <div key={p.id} className="text-sm p-3 rounded-xl" style={{ background: colors.offwhite }}>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs opacity-70">{new Date(p.createdAt).toLocaleDateString(undefined,{ day:'2-digit', month:'short', year:'numeric' })} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Footer */}
      <div className="border-t py-8 mt-8" style={{ borderColor: colors.smoke }}>
        <div className="max-w-6xl mx-auto px-4 text-xs opacity-70 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Burma Town — Minimalist community platform.</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: colors.gold }} />
            <span>Gold · White · Black</span>
          </div>
        </div>
      </div>
    </div>
    </AdapterProvider>
  );
}
