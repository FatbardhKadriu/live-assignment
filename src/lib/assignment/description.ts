import { DefineSpec, env, produce, text, PointFree } from './definition';

export type AssignmentSpec = {
  desc: DefineSpec;
  testStdin?: PointFree<string>;
};

const assignment = {
  desc: text`
# Bazat e Programimit – Detyra 1
import { DefineSpec, env, produce, text, PointFree } from './definition';

export type AssignmentSpec = DefineSpec & {
  description: string | PointFree<string>;
  testStdin?: PointFree<string>;
};

const assignment = {
  description: text`
# Bazat e Programimit – Detyra 1

| Student        | ID           |
| -------------- | ------------ |
| ${env('name')} | ${env('id')} |

## Përshkrimi

Të realizohen kërkesat në vijim:

1. Aaa
2. Bbb
3. Ccc

**Detyra që nuk kompajllohet ka minus 3 pikë!** Për kontrollim më të shpejtë, ndani implementimin e kërkesave me komente.

Shembull të ekzekutimit të programit gjeni në vijim:

\`\`\`
Jepni elementin 1: 25
Jepni elementin 2: 25
Jepni elementin 3: 25

Rezultati: 42
\`\`\`
`,
} satisfies DefineSpec & AssignmentSpec;

export function produceAssignment(
  id: string,
  name: string
): ResolveDefines<AssignmentSpec> {
  const SECRET = 'VQJFT437YW::';
  const instance = produce(SECRET + id, assignment, { id, name });
  return instance;
}
