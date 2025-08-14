// Central shared type definitions for the Burma Town app.
// NOTE: Moved from scattered component files (PostCard.tsx, QA.tsx, BusinessCard.tsx) for consistency.

export interface Business {
  name: string;
  category?: string;
  website?: string;
  bio?: string;
  avatar?: string;
  email?: string;
}

export interface CommentReplyModel {
  id: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  text: string;
  createdAt: number;
  stars?: number;
  reports?: number;
  replies?: CommentReplyModel[]; // nested replies for post comments
}

export interface CommentModel {
  id: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorType?: string;
  text: string;
  createdAt: number;
  reactions: { like: number; love: number }; // retained shape
  userReaction: string | null;
  reports: number;
  stars?: number;
  replies: CommentReplyModel[];
}

export interface PostModel {
  id: string;
  title: string;
  body: string;
  mediaUrl?: string; // legacy single
  media?: string[]; // multi
  price?: string;
  author: string;
  authorEmail: string;
  authorAvatar?: string;
  authorType: "business" | "student" | "general";
  createdAt: number;
  stars?: number;
  reports: number;
  commentsCount?: number; // server-provided aggregate (optional)
  answersCount?: number; // symmetry if backend treats posts with answers
  comments: CommentModel[];
  flagged?: boolean; // client-side moderation heuristic
  moderationReasons?: string[];
}

export interface AnswerReplyDeepModel {
  id: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  text: string;
  createdAt: number;
  stars?: number;
  reports?: number;
  useful?: number;
  usefulByUser?: boolean;
  replies?: AnswerReplyDeepModel[]; // nested answer replies
}

export interface AnswerModel {
  id: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  text: string;
  reports?: number;
  stars?: number;
  useful?: number;
  usefulByUser?: boolean;
  replies?: AnswerReplyDeepModel[]; // first-level replies
}

export interface QuestionModel {
  id: string;
  title: string;
  details?: string;
  author: string;
  authorEmail?: string;
  authorAvatar?: string;
  createdAt: number;
  useful: number;
  usefulByUser: boolean;
  reports?: number;
  stars?: number;
  answers: AnswerModel[];
  answersCount?: number; // server-provided aggregate
  flagged?: boolean;
  moderationReasons?: string[];
}

export interface UserProfile {
  type: string; // "business" | "student" | "general"
  name: string;
  category?: string;
  website?: string;
  bio?: string;
  avatar?: string;
}

export interface SessionUser {
  email: string;
  name: string;
  type: string;
  category?: string;
  website?: string;
  bio?: string;
  avatar?: string;
}
