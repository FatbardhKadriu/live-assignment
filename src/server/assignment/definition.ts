import crypto from 'crypto';
import seedrandom, { PRNG } from 'seedrandom';

export type DefineEnv = Record<string, any>;

export type DefineSpec =
  | string
  | number
  | boolean
  | null
  | undefined
  | DefineSpec[]
  | { [key: string]: DefineSpec }
  | Func<DefinedValue>;

// prettier-ignore
export type ResolveDefines<T> =
  T extends string ? T :
  T extends number ? T :
  T extends boolean ? T :
  T extends null ? null :
  T extends undefined ? undefined :
  T extends Array<infer U> ? Array<ResolveDefines<U>> :
  T extends { [key: string]: DefineSpec; } ? { -readonly [key in keyof T]: ResolveDefines<T[key]> } :
  T extends Func<infer U extends DefinedValue> ? U
  : never;

export type DefinedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DefinedValue[]
  | { [key: string]: DefinedValue };

export type Func<T extends DefinedValue> = (c: DefineContext) => T;

export type Eventual<T extends DefinedValue> = T | Func<T>;

type DefineContextData = {
  env: DefineEnv;
  baseSeed: string;
  key: string;
  path: DefineContext[];
  rng: PRNG;
};

export class DefineContext {
  readonly _env: DefineEnv;
  readonly _baseSeed: string;

  readonly _key: string;
  _value: DefinedValue;

  readonly _path: DefineContext[];
  readonly _childSpecs: Record<string, DefineSpec>;
  readonly _children: Record<string, DefineContext>;
  readonly _rng: PRNG;
  _anonContextState: number;

  constructor(data: DefineContextData) {
    this._env = data.env;
    this._baseSeed = data.baseSeed;
    this._key = data.key;
    this._value = undefined;
    this._path = data.path;
    this._childSpecs = {};
    this._children = {};
    this._rng = data.rng;
    this._anonContextState = 0;
  }

  randomInt(minIncl: number, maxExcl: number) {
    return Math.floor(this._rng.double() * (maxExcl - minIncl)) + minIncl;
  }

  random(): number {
    return this._rng.double();
  }

  pick<T>(array: ReadonlyArray<T>): T {
    const index = this.randomInt(0, array.length);
    return array[index];
  }

  shuffle<T>(array: ReadonlyArray<T>): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  get<T extends DefinedValue>(path: string): T {
    const absolute = !path.startsWith('.');

    if (absolute) {
      const paths = path.split('.');
      return resolvePath(this._path[0], paths) as T;
    }

    let levelsUp = 0;
    while (path.startsWith('.')) {
      levelsUp++;
      path = path.substring(1);
    }

    const paths = path.split('.');
    const level = Math.max(0, this._path.length - 1 - levelsUp);
    return resolvePath(this._path[level], paths) as T;
  }

  env<T extends DefinedValue>(path: string): T {
    return this._env[path];
  }
}

// ----------------------------------------------------------------
// Method wrappers
// ----------------------------------------------------------------

export function randomInt(minIncl: number, maxExcl: number): Func<number> {
  return (c) => c.randomInt(minIncl, maxExcl);
}

export function random(): Func<number> {
  return (c) => c.random();
}

export function pick<const TSpec extends DefineSpec>(
  specs: ReadonlyArray<TSpec>
): Func<ResolveDefines<TSpec>> {
  return (c) => resolve(c, c.pick(specs));
}

export function shuffle<const TSpec extends DefineSpec>(
  specs: ReadonlyArray<TSpec>
): Func<Array<ResolveDefines<TSpec>>> {
  return (c) => resolve(c, c.shuffle(specs));
}

export function get<T extends DefinedValue>(path: string): Func<T> {
  return (c) => c.get(path);
}

export function env<T extends DefinedValue>(path: string): Func<T> {
  return (c) => c.env(path);
}

// ----------------------------------------------------------------
// Function-only utils
// ----------------------------------------------------------------

export function map<T extends DefinedValue, U extends DefinedValue>(
  path: string,
  mapper: (t: T, c: DefineContext) => U
): Func<U> {
  return (c) => mapper(c.get<T>(path), c);
}

export function map2<
  T1 extends DefinedValue,
  T2 extends DefinedValue,
  U extends DefinedValue,
>(
  path1: string,
  path2: string,
  mapper: (t1: T1, t2: T2, c: DefineContext) => U
): Func<U> {
  return (c) => mapper(c.get<T1>(path1), c.get<T2>(path2), c);
}

export function map3<
  T1 extends DefinedValue,
  T2 extends DefinedValue,
  T3 extends DefinedValue,
  U extends DefinedValue,
>(
  path1: string,
  path2: string,
  path3: string,
  mapper: (t1: T1, t2: T2, t3: T3, c: DefineContext) => U
): Func<U> {
  return (c) => mapper(c.get<T1>(path1), c.get<T2>(path2), c.get<T3>(path3), c);
}

export function map4<
  T1 extends DefinedValue,
  T2 extends DefinedValue,
  T3 extends DefinedValue,
  T4 extends DefinedValue,
  U extends DefinedValue,
>(
  path1: string,
  path2: string,
  path3: string,
  path4: string,
  mapper: (t1: T1, t2: T2, t3: T3, t4: T4, c: DefineContext) => U
): Func<U> {
  return (c) =>
    mapper(c.get<T1>(path1), c.get<T2>(path2), c.get<T3>(path3), c.get<T4>(path4), c);
}

export function map5<
  T1 extends DefinedValue,
  T2 extends DefinedValue,
  T3 extends DefinedValue,
  T4 extends DefinedValue,
  T5 extends DefinedValue,
  U extends DefinedValue,
>(
  path1: string,
  path2: string,
  path3: string,
  path4: string,
  path5: string,
  mapper: (t1: T1, t2: T2, t3: T3, t4: T4, t5: T5, c: DefineContext) => U
): Func<U> {
  return (c) =>
    mapper(
      c.get<T1>(path1),
      c.get<T2>(path2),
      c.get<T3>(path3),
      c.get<T4>(path4),
      c.get<T5>(path5),
      c
    );
}

export function bind<const T extends DefineSpec, U extends DefineSpec>(
  spec: T,
  mapper: (t1: ResolveDefines<T>, c: DefineContext) => U
): Func<ResolveDefines<U>> {
  return (c) => {
    const anonC = newAnonContext(c);
    const t = resolve(anonC, spec);
    return resolve(c, mapper(t, c));
  };
}

export function bind2<
  const T1 extends DefineSpec,
  const T2 extends DefineSpec,
  U extends DefineSpec,
>(
  spec1: T1,
  spec2: T2,
  mapper: (t1: ResolveDefines<T1>, t2: ResolveDefines<T2>, c: DefineContext) => U
): Func<ResolveDefines<U>> {
  return (c) => {
    const anonC1 = newAnonContext(c);
    const anonC2 = newAnonContext(c);
    const t1 = resolve(anonC1, spec1);
    const t2 = resolve(anonC2, spec2);
    return resolve(c, mapper(t1, t2, c));
  };
}

export function bind3<
  const T1 extends DefineSpec,
  const T2 extends DefineSpec,
  const T3 extends DefineSpec,
  U extends DefineSpec,
>(
  spec1: T1,
  spec2: T2,
  spec3: T3,
  mapper: (
    t1: ResolveDefines<T1>,
    t2: ResolveDefines<T2>,
    t3: ResolveDefines<T3>,
    c: DefineContext
  ) => U
): Func<ResolveDefines<U>> {
  return (c) => {
    const anonC1 = newAnonContext(c);
    const anonC2 = newAnonContext(c);
    const anonC3 = newAnonContext(c);
    const t1 = resolve(anonC1, spec1);
    const t2 = resolve(anonC2, spec2);
    const t3 = resolve(anonC3, spec3);
    return resolve(c, mapper(t1, t2, t3, c));
  };
}

export function match<const TCases extends { _?: DefineSpec; [key: string]: DefineSpec }>(
  expr: string | Func<string | number | boolean | null | undefined>,
  cases: TCases
): Func<ResolveDefines<TCases[keyof TCases]>> {
  if (typeof expr === 'string') {
    if (expr.startsWith('.')) {
      expr = '.' + expr;
    }
    expr = get(expr);
  }

  return bind(expr, (val) => {
    val = String(val);
    if (Object.hasOwn(cases, val)) {
      return cases[val] as any;
    } else if (Object.hasOwn(cases, '_')) {
      return cases['_'];
    } else {
      throw new Error(`No match for '${val}'.`);
    }
  });
}

export function text(
  strings: TemplateStringsArray,
  ...exprs: Array<string | DefineSpec[] | Func<DefinedValue>>
): Func<string> {
  return (c) =>
    strings
      .reduce((result, str, i) => {
        let exprStr = '';
        if (i < exprs.length) {
          const expr = exprs[i];
          if (typeof expr === 'string') {
            exprStr = String(c.get(expr));
          } else if (Array.isArray(expr)) {
            exprStr = String(resolve(c, c.pick(expr)));
          } else {
            exprStr = String(resolve(c, exprs[i]));
          }
        }
        return result + str + exprStr;
      }, '')
      .trim();
}

export function concat(...stringExprs: Array<Eventual<string>>): Func<string> {
  return (c) =>
    stringExprs.reduce((acc: string, expr) => {
      return acc + (typeof expr === 'string' ? expr : resolve(c, expr));
    }, '');
}

export function val<const T extends DefinedValue>(val: T): Func<T> {
  return (_c) => val;
}

export function spec<const TSpec extends DefineSpec>(arg: TSpec): TSpec {
  return arg;
}

// ----------------------------------------------------------------
// Entry point
// ----------------------------------------------------------------

export function produce<const TSpec extends DefineSpec>(
  baseSeed: string,
  spec: TSpec,
  env: DefineEnv = {}
): ResolveDefines<TSpec> {
  const context = newContext(baseSeed, env);
  return resolve(context, spec);
}

// ----------------------------------------------------------------
// Internal functions
// ----------------------------------------------------------------

function makeRng(baseSeed: string, path: string[]) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(baseSeed + '::' + path.join('.'));
  return seedrandom.alea(sha1.digest('hex'));
}

function newContext(baseSeed: string, env: DefineEnv): DefineContext {
  const context = new DefineContext({
    env,
    baseSeed,
    key: '$root',
    path: [],
    rng: makeRng(baseSeed, ['$root']),
  });
  context._path.push(context);
  return context;
}

function newChildContext(context: DefineContext, childKey: string): DefineContext {
  const childContext = new DefineContext({
    env: context._env,
    baseSeed: context._baseSeed,
    key: childKey,
    path: [...context._path],
    rng: makeRng(context._baseSeed, context._path.map((c) => c._key).concat([childKey])),
  });
  childContext._path.push(childContext);
  return childContext;
}

function newAnonContext(context: DefineContext) {
  const key = `$$anon_${context._anonContextState++}`;
  return newChildContext(context, key);
}

function resolvePartial(
  context: DefineContext,
  childSpec: DefineSpec,
  childKey: string
): DefinedValue {
  let childContext: DefineContext;

  if (childKey in context._children) {
    childContext = context._children[childKey];
  } else {
    childContext = newChildContext(context, childKey);
    context._children[childKey] = childContext;
  }

  if (typeof childContext._value === 'undefined') {
    childContext._value = resolve(childContext, childSpec);
  }

  return childContext._value;
}

function resolve<TSpec extends DefineSpec>(
  context: DefineContext,
  spec: TSpec
): ResolveDefines<TSpec> {
  if (typeof spec === 'string') return spec as ResolveDefines<TSpec>;
  if (typeof spec === 'number') return spec as ResolveDefines<TSpec>;
  if (typeof spec === 'boolean') return spec as ResolveDefines<TSpec>;
  if (typeof spec === 'undefined') return spec as ResolveDefines<TSpec>;
  if (typeof spec === null) return spec as ResolveDefines<TSpec>;

  if (typeof spec === 'function') {
    return spec(context) as ResolveDefines<TSpec>;
  }

  if (Array.isArray(spec)) {
    const resolvedState: DefinedValue[] = [];
    spec.forEach((spec, i) => (context._childSpecs[i] = spec));
    for (let i = 0; i < spec.length; i++) {
      resolvedState.push(resolvePartial(context, spec[i], i.toString()));
    }
    return resolvedState as ResolveDefines<TSpec>;
  }

  if (typeof spec === 'object') {
    const resolvedState: Record<string, DefinedValue> = {};
    Object.assign(context._childSpecs, spec);
    for (const key in spec) {
      resolvedState[key] = resolvePartial(context, spec[key], key);
    }
    return resolvedState as ResolveDefines<TSpec>;
  }

  throw new Error('Unknown define spec.');
}

function resolvePath(context: DefineContext, path: string[]): DefinedValue {
  let i = 0;
  for (; i < path.length; i++) {
    const key = path[i];
    if (key in context._children) {
      context = context._children[key];
    } else {
      break;
    }
  }

  path = path.slice(i);

  if (path.length === 0) {
    return context._value;
  }

  if (!(path[0] in context._childSpecs)) {
    throw new Error(`Missing key '${path[0]}' in object.`);
  }

  let resolvedValue = resolvePartial(context, context._childSpecs[path[0]], path[0]);

  path = path.slice(1);

  for (const key of path) {
    if (!resolvedValue || typeof resolvedValue !== 'object') {
      throw new Error(`Cannot access key '${key}' of a non-object.`);
    }

    if (key in resolvedValue) {
      resolvedValue = (resolvedValue as any)[key];
    } else {
      throw new Error(`Missing key '${key}' in object.`);
    }
  }

  return resolvedValue;
}
