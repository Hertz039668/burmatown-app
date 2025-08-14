export const STORAGE_KEYS = {
  users: "bt_users",
  session: "bt_session",
} as const;

export type StoredUser = {
  id: string;
  email: string;
  password: string; // prototype-only
  name: string;
  type: "business" | "student" | "general";
  category?: string;
  website?: string;
  bio?: string;
  avatar?: string; // data URL
};

export type Session = {
  email: string;
  token?: string; // optional auth token when using remote backend
} | null;

export const loadUsers = (): StoredUser[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || "[]");
  } catch {
    return [];
  }
};

export const saveUsers = (arr: StoredUser[]) => {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(arr));
};

export const loadSession = (): Session => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "null");
  } catch {
    return null;
  }
};

export const saveSession = (obj: Session) => {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(obj));
  try { window.dispatchEvent(new CustomEvent('bt_session_changed', { detail: obj })); } catch {}
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.session);
};

// User actions for tracking reactions, useful marks, etc.
export type UserActions = {
  postReactions: Record<string, "like" | "love" | "star">;
  commentReactions: Record<string, "like" | "love">;
  questionUseful: Record<string, boolean>;
  answerUseful?: Record<string, boolean>; // new: mark answers as useful
  // star toggles
  postStars?: Record<string, boolean>;
  commentStars?: Record<string, boolean>;
  replyStars?: Record<string, boolean>; // key: replyId
  questionStars?: Record<string, boolean>;
  answerStars?: Record<string, boolean>;
  answerReplyStars?: Record<string, boolean>; // stars for replies to answers
  answerReplyUseful?: Record<string, boolean>; // useful marks for answer replies
  savedPosts: Record<string, boolean>;
  savedQuestions: Record<string, boolean>;
  follows: Record<string, boolean>;
  reports: {
    posts: Record<string, boolean>;
    comments: Record<string, boolean>;
    questions: Record<string, boolean>;
    answers: Record<string, boolean>;
  replies?: Record<string, boolean>; // new: reply reports
  };
};

const defaultUserActions = (): UserActions => ({
  postReactions: {},
  commentReactions: {},
  questionUseful: {},
  answerUseful: {},
  postStars: {},
  commentStars: {},
  replyStars: {},
  questionStars: {},
  answerStars: {},
  answerReplyStars: {},
  answerReplyUseful: {},
  savedPosts: {},
  savedQuestions: {},
  follows: {},
  reports: {
    posts: {},
    comments: {},
    questions: {},
  answers: {},
  replies: {},
  },
});

export const getUserActions = (email: string): UserActions => {
  try {
    const key = `bt_actions_${email}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...defaultUserActions(), ...JSON.parse(stored) };
    }
    return defaultUserActions();
  } catch {
    return defaultUserActions();
  }
};

export const updateUserActions = (email: string, updater: (prev: UserActions) => UserActions): UserActions => {
  const prev = getUserActions(email);
  const next = updater(prev);
  const key = `bt_actions_${email}`;
  localStorage.setItem(key, JSON.stringify(next));
  try {
    // Broadcast an app-wide event so listeners (e.g., profile view) can refresh derived data like follow counts
    window.dispatchEvent(new CustomEvent('bt_user_actions_changed', { detail: { email } }));
  } catch {}
  return next;
};
