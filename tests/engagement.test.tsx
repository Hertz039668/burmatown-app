import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { AdapterProvider } from '../lib/AdapterContext';
import { PersistenceAdapter } from '../lib/adapters';
import { usePosts } from '../hooks/usePosts';
import { PostModel } from '../lib/types';

// Verify that persistEngagement is invoked for star/report actions

describe('engagement persistence', () => {
  it('invokes persistEngagement for star/report actions', () => {
    const calls: any[] = [];
    const mockAdapter: PersistenceAdapter = {
      createPost: async (d:any)=> ({ id:'p1', title:d.title, body:d.body, author:d.profile.name, authorEmail:d.sessionUser.email, authorAvatar:'', authorType:d.profile.type, createdAt:Date.now(), stars:0, reports:0, comments:[] }),
      createComment: async ()=> ({ id:'c1' }),
      createReply: async ()=> ({ id:'r1' }),
      createQuestion: async ({ title, details, sessionUser }) => ({ id:'q1', title, details, author: sessionUser.name, authorEmail: sessionUser.email, authorAvatar:'', createdAt:Date.now(), useful:0, usefulByUser:false, reports:0, stars:0, answers:[] }),
      createAnswer: async ()=> ({ id:'a1' }),
      recordUserAction: async ()=>{},
      persistEngagement: async (d)=> { calls.push(d); },
      flushEngagements: async ()=>{},
      followUser: async ()=>{},
      unfollowUser: async ()=>{},
    };
    const sessionUser = { email:'u@x.com', name:'User' };
    const wrapper: React.FC<{children: React.ReactNode}> = ({ children }) => <AdapterProvider adapter={mockAdapter}>{children}</AdapterProvider>;
    const { result } = renderHook(() => {
      const [posts, setPosts] = useState<PostModel[]>([{ id:'p0', title:'T', body:'B', author:'A', authorEmail:'a@e.com', authorAvatar:'', authorType:'general', createdAt:Date.now(), stars:0, reports:0, comments:[{ id:'c0', author:'C', authorEmail:'c@e.com', authorAvatar:'', authorType:'general', text:'Comment', createdAt:Date.now(), reactions:{like:0,love:0}, userReaction:null, reports:0, stars:0, replies:[{ id:'r0', author:'R', authorEmail:'r@e.com', authorAvatar:'', text:'Reply', createdAt:Date.now(), stars:0, reports:0, replies:[] }] }] }]);
      // @ts-ignore
      const pushToast = () => {};
      return usePosts(posts, setPosts, sessionUser, pushToast);
    }, { wrapper });

    act(()=> result.current.toggleStarPost('p0'));
    act(()=> result.current.reportPost('p0'));
    act(()=> result.current.toggleCommentStar('p0','c0'));
    act(()=> result.current.toggleReplyStar('p0','c0','r0'));

    expect(calls.length).toBe(4);
    const kinds = calls.map(c=>c.kind).sort();
    expect(kinds.filter(k=>k==='star').length).toBe(3);
    expect(kinds.filter(k=>k==='report').length).toBe(1);
  });
});
