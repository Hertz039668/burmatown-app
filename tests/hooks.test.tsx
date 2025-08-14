import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { usePosts } from '../hooks/usePosts';
import { useQuestions } from '../hooks/useQuestions';
import { PostModel, QuestionModel } from '../lib/types';
import { AdapterProvider } from '../lib/AdapterContext';
import { PersistenceAdapter } from '../lib/adapters';

// Minimal mocks for storage functions (local in-memory) via jest-style manual override.
// Instead, we simulate userActions via a simple object map since hooks import updateUserActions directly.
// We'll monkey patch updateUserActions & getUserActions on globalThis for isolation if needed; for now rely on actual implementation
// assuming it uses localStorage. Provide a lightweight localStorage polyfill.

const mem: Record<string,string> = {};
// @ts-ignore
if(typeof globalThis.localStorage === 'undefined') {
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (k:string) => mem[k] ?? null,
    setItem: (k:string,v:string) => { mem[k]=v; },
    removeItem: (k:string) => { delete mem[k]; },
    clear: () => { Object.keys(mem).forEach(k=> delete mem[k]); }
  };
}

const sessionUser = { email: 'tester@example.com', name: 'Tester', avatar:'', type:'general' };

// Simpler pattern: we can invoke hook inside test via inline component
function renderUsePosts() {
  let hookReturn: any; let postsState: any; let setPostsFn: any;
  const Test: React.FC = () => {
    const [posts, setPosts] = useState<PostModel[]>([{
      id: 'p1', title: 'Post 1', body: 'Body', author: 'Author', authorEmail: 'author@example.com', authorAvatar:'', authorType:'general', createdAt: Date.now(), stars:0, reports:0, comments:[{ id:'c1', author:'A', authorEmail:'a@e.com', authorAvatar:'', authorType:'general', text:'Comment', createdAt:Date.now(), reactions:{like:0,love:0}, userReaction:null, reports:0, stars:0, replies:[{ id:'r1', author:'B', authorEmail:'b@e.com', authorAvatar:'', text:'Reply', createdAt:Date.now(), stars:0, reports:0, replies:[] }] }]
    }]);
    // @ts-ignore
    const pushToast = () => {};
    hookReturn = usePosts(posts, setPosts, sessionUser, pushToast);
    postsState = posts; setPostsFn = setPosts;
    return null;
  };
  renderHook(() => null, { wrapper: ({ children }) => <React.Fragment><Test />{children}</React.Fragment> });
  return { hook: hookReturn, getPosts: () => postsState, setPosts: setPostsFn };
}

function renderUseQuestions() {
  let hookReturn: any; let questionsState: any; let setQuestionsFn: any;
  const Test: React.FC = () => {
    const [questions, setQuestions] = useState<QuestionModel[]>([{
      id:'q1', title:'Question 1', details:'Details', author:'QAuth', authorEmail:'qa@example.com', authorAvatar:'', createdAt:Date.now(), useful:0, usefulByUser:false, reports:0, stars:0,
      answers:[{ id:'a1', author:'Ans', authorEmail:'ans@example.com', authorAvatar:'', text:'Answer', stars:0, reports:0, replies:[{ id:'ar1', author:'Rep', authorEmail:'rep@example.com', authorAvatar:'', text:'Ans Reply', createdAt:Date.now(), stars:0, reports:0, useful:0, usefulByUser:false, replies:[] }] }]
    }]);
    // @ts-ignore
    const pushToast = () => {};
    hookReturn = useQuestions(questions, setQuestions, sessionUser, pushToast);
    questionsState = questions; setQuestionsFn = setQuestions;
    return null;
  };
  renderHook(() => null, { wrapper: ({ children }) => <React.Fragment><Test />{children}</React.Fragment> });
  return { hook: hookReturn, getQuestions: () => questionsState, setQuestions: setQuestionsFn };
}

describe('usePosts', () => {
  beforeEach(() => localStorage.clear());
  it('toggleCommentStar increments and decrements', () => {
    const { hook, getPosts } = renderUsePosts();
    act(() => hook.toggleCommentStar('p1','c1'));
    expect(getPosts()[0].comments[0].stars).toBe(1);
    act(() => hook.toggleCommentStar('p1','c1'));
    expect(getPosts()[0].comments[0].stars).toBe(0);
  });
  it('addReplyToReply nests correctly', () => {
    const { hook, getPosts } = renderUsePosts();
    act(() => hook.addReplyToReply('p1','c1','r1','Nested'));
    const nested = getPosts()[0].comments[0].replies[0].replies;
    expect(nested.length).toBe(1);
    expect(nested[0].text).toBe('Nested');
  });
  it('reportReply toggles reports count', () => {
    const { hook, getPosts } = renderUsePosts();
    act(() => hook.reportReply('p1','c1','r1'));
    expect(getPosts()[0].comments[0].replies[0].reports).toBe(1);
    act(() => hook.reportReply('p1','c1','r1'));
    expect(getPosts()[0].comments[0].replies[0].reports).toBe(0);
  });
});

describe('useQuestions', () => {
  beforeEach(() => localStorage.clear());
  it('toggleAnswerStar increments/decrements', () => {
    const { hook, getQuestions } = renderUseQuestions();
    act(() => hook.toggleAnswerStar('q1','a1'));
    expect(getQuestions()[0].answers[0].stars).toBe(1);
    act(() => hook.toggleAnswerStar('q1','a1'));
    expect(getQuestions()[0].answers[0].stars).toBe(0);
  });
  it('addNestedAnswerReply nests correctly', () => {
    const { hook, getQuestions } = renderUseQuestions();
    act(() => hook.addNestedAnswerReply('q1','a1','ar1','Deep reply'));
    const nested = getQuestions()[0].answers[0].replies[0].replies;
    expect(nested.length).toBe(1);
    expect(nested[0].text).toBe('Deep reply');
  });
  it('toggleAnswerReplyUseful toggles useful count', () => {
    const { hook, getQuestions } = renderUseQuestions();
    act(() => hook.toggleAnswerReplyUseful('q1','a1','ar1'));
    expect(getQuestions()[0].answers[0].replies[0].useful).toBe(1);
    act(() => hook.toggleAnswerReplyUseful('q1','a1','ar1'));
    expect(getQuestions()[0].answers[0].replies[0].useful).toBe(0);
  });
  it('reportAnswerReply toggles report count', () => {
    const { hook, getQuestions } = renderUseQuestions();
    act(() => hook.reportAnswerReply('q1','a1','ar1'));
    expect(getQuestions()[0].answers[0].replies[0].reports).toBe(1);
    act(() => hook.reportAnswerReply('q1','a1','ar1'));
    expect(getQuestions()[0].answers[0].replies[0].reports).toBe(0);
  });
});

// New tests for AdapterProvider usage and recordUserAction side effects
describe('AdapterProvider integration', () => {
  beforeEach(() => localStorage.clear());
  it('post star triggers recordUserAction via context adapter', () => {
    const actions: any[] = [];
    const mockAdapter: PersistenceAdapter = {
      createPost: async (d:any)=> ({ id:'mp1', title:d.title, body:d.body, author:d.profile.name, authorEmail:d.sessionUser.email, authorAvatar:'', authorType:d.profile.type, createdAt:Date.now(), stars:0, reports:0, comments:[] }),
      createComment: async ()=> ({ id:'mc1' }),
      createReply: async ()=> ({ id:'mr1' }),
      createQuestion: async ({ title, details, sessionUser }) => ({ id:'mq1', title, details, author: sessionUser.name, authorEmail: sessionUser.email, authorAvatar:'', createdAt:Date.now(), useful:0, usefulByUser:false, reports:0, stars:0, answers:[] }),
      createAnswer: async ()=> ({ id:'ma1' }),
      recordUserAction: async (type, payload) => { actions.push({ type, payload }); }
    };
    const wrapper: React.FC<{children:any}> = ({ children }) => <AdapterProvider adapter={mockAdapter}>{children}</AdapterProvider>;
    const { result } = renderHook(() => {
      const [posts, setPosts] = useState<PostModel[]>([{ id:'pctx', title:'T', body:'B', author:'A', authorEmail:'a@e.com', authorAvatar:'', authorType:'general', createdAt:Date.now(), stars:0, reports:0, comments:[] }]);
      // @ts-ignore
      const pushToast = () => {};
      return usePosts(posts, setPosts, sessionUser, pushToast);
    }, { wrapper });
    act(()=> result.current.toggleStarPost('pctx'));
    expect(actions.find(a=> a.type==='postStar')).toBeTruthy();
  });
  it('question star triggers recordUserAction via context adapter', () => {
    const actions: any[] = [];
    const mockAdapter: PersistenceAdapter = {
      createPost: async (d:any)=> ({ id:'mp1', title:d.title, body:d.body, author:d.profile.name, authorEmail:d.sessionUser.email, authorAvatar:'', authorType:d.profile.type, createdAt:Date.now(), stars:0, reports:0, comments:[] }),
      createComment: async ()=> ({ id:'mc1' }),
      createReply: async ()=> ({ id:'mr1' }),
      createQuestion: async ({ title, details, sessionUser }) => ({ id:'mq1', title, details, author: sessionUser.name, authorEmail: sessionUser.email, authorAvatar:'', createdAt:Date.now(), useful:0, usefulByUser:false, reports:0, stars:0, answers:[] }),
      createAnswer: async ()=> ({ id:'ma1' }),
      recordUserAction: async (type, payload) => { actions.push({ type, payload }); }
    };
    const wrapper: React.FC<{children:any}> = ({ children }) => <AdapterProvider adapter={mockAdapter}>{children}</AdapterProvider>;
    const { result } = renderHook(() => {
      const [questions, setQuestions] = useState<QuestionModel[]>([{ id:'qctx', title:'QT', details:'QD', author:'QA', authorEmail:'qa@e.com', authorAvatar:'', createdAt:Date.now(), useful:0, usefulByUser:false, reports:0, stars:0, answers:[] }]);
      // @ts-ignore
      const pushToast = () => {};
      return useQuestions(questions, setQuestions, sessionUser, pushToast);
    }, { wrapper });
    act(()=> result.current.toggleQuestionStar('qctx'));
    expect(actions.find(a=> a.type==='questionStar')).toBeTruthy();
  });
});
