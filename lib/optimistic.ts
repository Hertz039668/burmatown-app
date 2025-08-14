// Generic optimistic mutation utility
export interface OptimisticCtx<TSnapshot> { snapshot: TSnapshot; }

export async function optimisticUpdate<TState, TSnapshot>(
  applyLocal: () => { rollback: () => void; snapshot: TSnapshot },
  remote: () => Promise<any>,
  onError?: (e: any, ctx: OptimisticCtx<TSnapshot>) => void,
  onFinally?: () => void
) {
  const { rollback, snapshot } = applyLocal();
  try {
    await remote();
  } catch (e) {
    rollback();
    onError?.(e, { snapshot });
  } finally {
    onFinally?.();
  }
}
