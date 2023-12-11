import { Func, ResolveDefines } from './definition';

export type AssignmentSpec = {
  description: string | Func<string>;
  summary?: string | Func<string>;
  testStdin?: string | Func<string>;
};

export type Assignment = ResolveDefines<AssignmentSpec>;
