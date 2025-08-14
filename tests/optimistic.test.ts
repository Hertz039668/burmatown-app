import { describe, it, expect } from 'vitest';
import { optimisticUpdate } from '../lib/optimistic';

describe('optimisticUpdate', () => {
  it('rolls back on error', async () => {
    let applied = false;
    let rolledBack = false;
    await optimisticUpdate(
      () => ({ rollback: () => { rolledBack = true; }, snapshot: null }),
      async () => { applied = true; throw new Error('fail'); },
      () => {}
    );
    expect(applied).toBe(true);
    expect(rolledBack).toBe(true);
  });

  it('keeps state on success', async () => {
    let rolledBack = false;
    await optimisticUpdate(
      () => ({ rollback: () => { rolledBack = true; }, snapshot: null }),
      async () => {},
      () => {}
    );
    expect(rolledBack).toBe(false);
  });
});
