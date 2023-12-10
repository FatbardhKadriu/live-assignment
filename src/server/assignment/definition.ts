import crypto from 'crypto';
import seedrandom, { PRNG } from 'seedrandom';

export type DefineEnv = Record<string, any>;

export type DefineContext = {
  readonly env: DefineEnv;
  readonly baseSeed: string;

  readonly key: string;
  value: DefinedValue;

  readonly path: DefineContext[];
  readonly childSpecs: Record<string, DefineSpec>;
  readonly children: Record<string, DefineContext>;
  readonly rng: PRNG;
  anonContextState: number;
};

function makeRng(baseSeed: string, path: string[]) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(baseSeed + '::' + path.join('.'));
  return seedrandom.alea(sha1.digest('hex'));
}

function newContext(baseSeed: string, env: DefineEnv): DefineContext {
  const context: DefineContext = {
    env,
    baseSeed,
    key: '$root',
    value: undefined,
    path: [],
    childSpecs: {},
    children: {},
    rng: makeRng(baseSeed, ['$root']),
    anonContextState: 0,
  };
  context.path.push(context);
  return context;
}

function newChildContext(
  context: DefineContext,
  childKey: string
): DefineContext {
  const childContext: DefineContext = {
    env: context.env,
    baseSeed: context.baseSeed,
    key: childKey,
    value: undefined,
    path: [...context.path],
    childSpecs: {},
    children: {},
    rng: makeRng(
      context.baseSeed,
      context.path.map((c) => c.key).concat([childKey])
    ),
    anonContextState: 0,
  };
  childContext.path.push(childContext);
  return childContext;
}

function newAnonContext(context: DefineContext) {
  const key = `$$anon_${context.anonContextState++}`;
  return newChildContext(context, key);
}

function resolvePartial(
  context: DefineContext,
  childSpec: DefineSpec,
  childKey: string
): DefinedValue {
  let childContext: DefineContext;

  if (childKey in context.children) {
    childContext = context.children[childKey];
  } else {
    childContext = newChildContext(context, childKey);
    context.children[childKey] = childContext;
  }

  if (typeof childContext.value === 'undefined') {
    childContext.value = resolve(childContext, childSpec);
  }

  return childContext.value;
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
    spec.map((spec, i) => (context.childSpecs[i] = spec));
    for (let i = 0; i < spec.length; i++) {
      resolvedState.push(resolvePartial(context, spec[i], i.toString()));
    }
    return resolvedState as ResolveDefines<TSpec>;
  }

  if (typeof spec === 'object') {
    const resolvedState: Record<string, DefinedValue> = {};
    Object.assign(context.childSpecs, spec);
    for (const key in spec) {
      resolvedState[key] = resolvePartial(context, spec[key], key);
    }
    return resolvedState as ResolveDefines<TSpec>;
  }

  throw new Error('Unknown define spec.');
}

export type PointFree<T extends DefinedValue> = (c: DefineContext) => T;

export type Eventual<T extends DefinedValue> = T | PointFree<T>;

export function randomInt(minIncl: number, maxExcl: number): PointFree<number> {
  return (c) => {
    return Math.floor(c.rng.double() * (maxExcl - minIncl)) + minIncl;
  };
}

export function random(): PointFree<number> {
  return (c) => {
    return c.rng.double();
  };
}

export function env<T extends DefinedValue>(path: string): PointFree<T> {
  return (c) => c.env[path];
}

function resolvePath(context: DefineContext, path: string[]): DefinedValue {
  let i = 0;
  for (; i < path.length; i++) {
    const key = path[i];
    if (key in context.children) {
      context = context.children[key];
    } else {
      break;
    }
  }

  path = path.slice(i);

  if (path.length === 0) {
    return context.value;
  }

  if (!(path[0] in context.childSpecs)) {
    throw new Error(`Missing key '${path[0]}' in object.`);
  }

  let resolvedValue = resolvePartial(
    context,
    context.childSpecs[path[0]],
    path[0]
  );

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

export function get<T extends DefinedValue>(path: string): PointFree<T> {
  const absolute = !path.startsWith('.');

  if (absolute) {
    const paths = path.split('.');
    return (c) => resolvePath(c.path[0], paths) as T;
  }

  let levelsUp = 0;
  while (path.startsWith('.')) {
    levelsUp++;
    path = path.substring(1);
  }

  const paths = path.split('.');
  return (c) => {
    const level = Math.max(0, c.path.length - 1 - levelsUp);
    return resolvePath(c.path[level], paths) as T;
  };
}

export function map<T extends DefinedValue, U extends DefinedValue>(
  path: string,
  mapper: (t: T, c: DefineContext) => U
): PointFree<U> {
  return (c) => mapper(get<T>(path)(c), c);
}

export function map2<
  T1 extends DefinedValue,
  T2 extends DefinedValue,
  U extends DefinedValue,
>(
  path1: string,
  path2: string,
  mapper: (t1: T1, t2: T2, c: DefineContext) => U
): PointFree<U> {
  return (c) => mapper(get<T1>(path1)(c), get<T2>(path2)(c), c);
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
): PointFree<U> {
  return (c) =>
    mapper(get<T1>(path1)(c), get<T2>(path2)(c), get<T3>(path3)(c), c);
}

export function bind<T extends DefineSpec, U extends DefineSpec>(
  spec: T,
  mapper: (t1: ResolveDefines<T>, c: DefineContext) => U
): PointFree<ResolveDefines<U>> {
  return (c) => {
    const anonC = newAnonContext(c);
    const t = resolve(anonC, spec);
    return resolve(c, mapper(t, c));
  };
}

export function bind2<
  T1 extends DefineSpec,
  T2 extends DefineSpec,
  U extends DefineSpec,
>(
  spec1: T1,
  spec2: T2,
  mapper: (
    t1: ResolveDefines<T1>,
    t2: ResolveDefines<T2>,
    c: DefineContext
  ) => U
): PointFree<ResolveDefines<U>> {
  return (c) => {
    const anonC1 = newAnonContext(c);
    const anonC2 = newAnonContext(c);
    const t1 = resolve(anonC1, spec1);
    const t2 = resolve(anonC2, spec2);
    return resolve(c, mapper(t1, t2, c));
  };
}

export function bind3<
  T1 extends DefineSpec,
  T2 extends DefineSpec,
  T3 extends DefineSpec,
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
): PointFree<ResolveDefines<U>> {
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

export function pick<const TSpec extends DefineSpec = DefineSpec>(
  specs: ReadonlyArray<TSpec>
): PointFree<ResolveDefines<TSpec>> {
  return (c) => {
    const index = randomInt(0, specs.length)(c);
    return resolve(c, specs[index]);
  };
}

export function match<
  const TCases extends { _?: DefineSpec; [key: string]: DefineSpec },
>(
  expr: string | PointFree<string | number | boolean | null | undefined>,
  cases: TCases
): PointFree<ResolveDefines<TCases[keyof TCases]>> {
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
  ...exprs: Array<string | DefineSpec[] | PointFree<DefinedValue>>
): PointFree<string> {
  return (c) =>
    strings
      .reduce((result, str, i) => {
        let exprStr = '';
        if (i < exprs.length) {
          const expr = exprs[i];
          if (typeof expr === 'string') {
            exprStr = String(get(expr)(c));
          } else if (Array.isArray(expr)) {
            exprStr = String(pick(expr)(c));
          } else {
            exprStr = String(resolve(c, exprs[i]));
          }
        }
        return result + str + exprStr;
      }, '')
      .trim();
}

export function concat(
  ...stringExprs: Array<Eventual<string>>
): PointFree<string> {
  return (c) =>
    stringExprs.reduce((acc: string, expr) => {
      return acc + (typeof expr === 'string' ? expr : resolve(c, expr));
    }, '');
}

export function val<const T extends DefinedValue>(val: T): PointFree<T> {
  return (_c) => val;
}

export function spec<const TSpec extends DefineSpec>(arg: TSpec): TSpec {
  return arg;
}

export type DefineSpec =
  | string
  | number
  | boolean
  | null
  | undefined
  | DefineSpec[]
  | { [key: string]: DefineSpec }
  | PointFree<DefinedValue>;

// prettier-ignore
export type ResolveDefines<T> =
  T extends string ? T :
  T extends number ? T :
  T extends boolean ? T :
  T extends null ? null :
  T extends undefined ? undefined :
  T extends Array<infer U> ? Array<ResolveDefines<U>> :
  T extends { [key: string]: DefineSpec; } ? { -readonly [key in keyof T]: ResolveDefines<T[key]> } :
  T extends PointFree<infer U extends DefinedValue> ? U
  : never;

export type DefinedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | DefinedValue[]
  | { [key: string]: DefinedValue };

export function produce<const TSpec extends DefineSpec>(
  baseSeed: string,
  spec: TSpec,
  env: DefineEnv = {}
): ResolveDefines<TSpec> {
  const context = newContext(baseSeed, env);
  return resolve(context, spec);
}
