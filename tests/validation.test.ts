import { describe, it, expect } from 'vitest';
import { validatePost, validateQuestion, validateComment, validateAnswer, moderateText } from '../lib/validation';

describe('validation', () => {
  it('validates post length', () => {
    expect(validatePost({ title: '', body: '' }).ok).toBe(false);
    expect(validatePost({ title: 'Hi', body: 'Body' }).ok).toBe(true);
  });
  it('enforces question title min', () => {
    expect(validateQuestion({ title: 'Hi' }).ok).toBe(false);
    expect(validateQuestion({ title: 'Okay', details: 'Detail' }).ok).toBe(true);
  });
  it('moderates banned words', () => {
    const m = moderateText('This has badword in it');
    expect(m.flagged).toBe(true);
  });
  it('answer validation', () => {
    expect(validateAnswer({ text: '' }).ok).toBe(false);
    expect(validateAnswer({ text: 'something helpful' }).ok).toBe(true);
  });
  it('comment validation', () => {
    expect(validateComment({ text: '' }).ok).toBe(false);
    expect(validateComment({ text: 'nice' }).ok).toBe(true);
  });
});
