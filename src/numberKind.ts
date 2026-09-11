export type NumberKind = 'given' | 'filled' | 'assumption';

const priority: Record<NumberKind, number> = { given: 2, filled: 1, assumption: 0 };

export function canOverwrite(current: NumberKind | null, incoming: NumberKind): boolean {
  return current === null || priority[incoming] >= priority[current];
}
