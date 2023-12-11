import { Assignment, AssignmentSpec } from './common';
import {
  DefineSpec,
  bind,
  env,
  get,
  map,
  map2,
  pick,
  produce,
  randomInt,
  text,
  val,
} from './definition';

const aggResult = map2(
  'problem.agg.type',
  'problem.exampleArray',
  (type: string, array: number[]) => {
    switch (type) {
      case 'max':
        return Math.max(...array);
      case 'min':
        return Math.min(...array);
      case 'sum':
        return array.reduce((acc, x) => acc + x);
      case 'avg':
        const sum = array.reduce((acc, x) => acc + x);
        return Math.round((100 * sum) / array.length) / 100;
      default:
        throw new Error('Invalid agg type.');
    }
  }
);

const assignment = {
  problem: pick([
    {
      arrayName: 'notat',
      arrayLength: pick([4, 5, 6]),
      arrayType: val('int'),
      exampleArray: bind(get<number>('problem.arrayLength'), (arrayLength) =>
        Array(arrayLength).fill(randomInt(6, 10))
      ),
      promptFirst: text`Jepni ${'.arrayLength'} notat e studentit.`,
      promptEach: 'Jepni noten',
      description: text`
Studenti i është nënshtruar ${'.arrayLength'} provimeve dhe është vlerësuar me notat 6-10.
Këto nota do t'i ruani në program në një varg me emrin \`${'.arrayName'}\`,
i cili ka gjatësinë ${'.arrayLength'} dhe mban numra të plotë.
      `,
      agg: pick([
        {
          type: 'max',
          desc: text`Të llogaritet nota maksimale e studentit.`,
          exampleOutput: text`Nota maksimale eshte: ${aggResult}`,
        },
        {
          type: 'min',
          desc: text`Të llogaritet nota minimale e studentit.`,
          exampleOutput: text`Nota minimale eshte: ${aggResult}`,
        },
        {
          type: 'avg',
          desc: text`Të llogaritet nota mesatare e studentit.`,
          exampleOutput: text`Nota mesatare eshte: ${aggResult}`,
        },
      ] satisfies DefineSpec),
    },
  ] satisfies DefineSpec),
  summary: text`
1. **(4)** ${'problem.arrayType'} ${'problem.arrayName'}[${'problem.arrayLength'}]
2. **(3+1)** Agg ${'problem.agg.type'}`,
  description: text`
# Bazat e Programimit – Detyra 1

| Student        | ID           |
| -------------- | ------------ |
| ${env('name')} | ${env('id')} |

## Përshkrimi

${'problem.description'}

Të realizohen kërkesat në vijim:

1. **(4p)** Të mbushet vargu \`${'problem.arrayName'}\` me ${'problem.arrayLength'} vlera të lexuara nga tastiera.
2. **(3p)** ${'problem.agg.desc'}
3. **(1p)** Të shtypet në ekran vlera e llogaritur në hapin 2.
4. **(1p)** Dalja në ekran duhet të përputhet me shembullin e treguar.

**Detyra që nuk kompajllohet ka minus 3 pikë!** Për kontrollim më të shpejtë, ndani implementimin e kërkesave me komente.

Shembull të ekzekutimit të programit gjeni në vijim:

\`\`\`
${'problem.promptFirst'}

${map2('problem.exampleArray', 'problem.promptEach', (arr: number[], s: string) => {
  return arr.map((val, i) => `${s} ${i + 1}: ${val}`).join('\n');
})}

${'problem.agg.exampleOutput'}
\`\`\``,
  testStdin: map('problem.exampleArray', (arr: number[]) => arr.join('\n')),
} satisfies DefineSpec & AssignmentSpec;

export function produceAssignment(id: string, name: string): Assignment {
  const SECRET = 'VQJFT437YW::';
  const instance = produce(SECRET + id, assignment, { id, name });
  return instance;
}
