import {
  COMPILE_STATUS_KEY,
  EXECUTE_STATUS_KEY,
  SUBMISSION_KEY,
  SUBMISSION_STATUS_KEY,
} from '@/lib/constants';
import { check, clearSubmissionStatus, submit } from '@/server/actions';
import { produceAssignment } from '@/server/assignment/description';
import { ExecutionResult, TypeCheckResult } from '@/server/cpp/compiler';
import * as session from '@/server/session';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

export default async function DescriptionPage({
  searchParams,
}: {
  searchParams: {
    id?: string;
    name?: string;
  };
}) {
  let { id, name } = searchParams;

  if (typeof id !== 'string' || typeof name !== 'string') {
    return <div>Invalid request.</div>;
  }

  id = id.trim();
  name = name.trim();

  const submission = (await session.get(id, SUBMISSION_KEY)) ?? '';

  const compileStatus = await session.getJSON<TypeCheckResult>(id, COMPILE_STATUS_KEY);
  const executeStatus = await session.getJSON<ExecutionResult>(id, EXECUTE_STATUS_KEY);
  const submissionStatus = await session.get(id, SUBMISSION_STATUS_KEY);

  return (
    <div className='mx-auto mb-32 mt-8 max-w-4xl rounded bg-white px-16 py-12 text-gray-700 shadow-lg'>
      <article className='non-selectable prose max-w-none'>
        <MDXRemote
          source={produceAssignment(id, name).description}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkMath],
              rehypePlugins: [rehypeKatex as any],
            },
          }}
        />
      </article>
      <form className='mt-12'>
        <div className='prose max-w-none'>
          <h2>Dorëzimi</h2>
        </div>
        <label className='mt-4 block'>
          <span>Kodi i zgjidhjes</span>
          <textarea
            name={SUBMISSION_KEY}
            defaultValue={submission}
            required
            rows={10}
            className='mt-1 block w-full font-mono'
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='off'
          />
        </label>
        <input type='hidden' name='id' value={id} />
        <input type='hidden' name='name' value={name} />
        {compileStatus && (
          <div className='prose mt-4 max-w-none'>
            <p>
              Statusi i kompajllimit: <b>{compileStatus.status}</b>
            </p>
            {compileStatus.log && <pre>{compileStatus.log}</pre>}
          </div>
        )}
        {executeStatus && executeStatus.error && (
          <div className='prose mt-4 max-w-none'>
            <p>Gabim gjatë ekzekutimit:</p>
            {executeStatus.error && <pre>{executeStatus.error}</pre>}
          </div>
        )}
        {executeStatus && executeStatus.output && (
          <div className='prose mt-4 max-w-none'>
            <p>Dalja e ekzekutimit:</p>
            {executeStatus.output && <pre>{executeStatus.output}</pre>}
          </div>
        )}
        {submissionStatus && (
          <div
            id='submission-status'
            className='mt-4 rounded-lg border border-blue-500 p-4 text-sm text-blue-800'
            role='alert'
          >
            {submissionStatus}
          </div>
        )}
        {submissionStatus ? (
          <span className='mt-4 flex justify-end gap-4'>
            <input
              type='submit'
              value='Modifiko'
              formAction={clearSubmissionStatus}
              className='rounded border border-blue-500 bg-transparent px-8 py-2 font-bold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white'
            />
          </span>
        ) : (
          <span className='mt-4 flex justify-end gap-4'>
            <input
              type='submit'
              value='Testo'
              formAction={check}
              className='rounded border border-blue-500 bg-transparent px-8 py-2 font-bold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white'
            />
            <input
              type='submit'
              value='Dërgo'
              formAction={submit}
              className='rounded bg-blue-500 px-8 py-2 font-bold text-white hover:bg-blue-600'
            />
          </span>
        )}
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              var nonSelectableElements = document.querySelectorAll('.non-selectable');

              for (var i = 0; i < nonSelectableElements.length; i++) {
                nonSelectableElements[i].addEventListener('copy', function(e) {
                  e.preventDefault();
                });
              }
            });
          `,
        }}
      />
    </div>
  );
}
