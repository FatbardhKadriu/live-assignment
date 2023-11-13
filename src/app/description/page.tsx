import { check, submit } from '@/actions/submission';
import { COMPILE_STATUS_KEY, SUBMISSION_KEY } from '@/lib/constants';
import { TypeCheckResult } from '@/lib/cpp/compiler';
import * as session from '@/lib/session';

export default async function DescriptionPage({
  searchParams,
}: {
  searchParams: {
    id?: string;
    name?: string;
    submitted?: boolean;
  };
}) {
  const { id, name } = searchParams;

  if (typeof id !== 'string' || typeof name !== 'string') {
    return <div>Invalid request.</div>;
  }

  const submission = (await session.get(id, SUBMISSION_KEY)) ?? '';
  const compileStatus = await session.getJSON<TypeCheckResult>(
    id,
    COMPILE_STATUS_KEY
  );

  return (
    <div className='mx-auto my-8 max-w-3xl rounded bg-white px-16 py-12 text-gray-700 shadow-lg'>
      <div className='prose lg:prose-xl'>Description...</div>
      {/* {compileStatus && (
        <div>
          Status: {compileStatus.status} <br />
          <pre>{compileStatus.log}</pre>
        </div>
      )} */}
      <form className='mt-8'>
        <label className='block'>
          <span>Kodi i zgjidhjes</span>
          <textarea
            name={SUBMISSION_KEY}
            defaultValue={submission}
            required
            rows={10}
            className='mt-1 block w-full font-mono'
          />
        </label>
        <div className='mt-1 flex justify-end gap-4 pt-4'>
          <input
            type='submit'
            value='Testo'
            formAction={check.bind(null, id, name)}
            className='rounded border border-blue-500 bg-transparent px-8 py-2 font-bold text-blue-700 hover:border-transparent hover:bg-blue-500 hover:text-white'
          />
          <input
            type='submit'
            value='Dërgo'
            formAction={submit.bind(null, id, name)}
            className='rounded bg-blue-500 px-8 py-2 font-bold text-white hover:bg-blue-600'
          />
        </div>
      </form>
    </div>
  );
}
