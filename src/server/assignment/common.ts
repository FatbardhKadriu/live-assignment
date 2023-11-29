import { PointFree, ResolveDefines } from './definition';

export type AssignmentSpec = {
  description: string | PointFree<string>;
  summary?: string | PointFree<string>;
  testStdin?: string | PointFree<string>;
};

export type Assignment = ResolveDefines<AssignmentSpec>;
