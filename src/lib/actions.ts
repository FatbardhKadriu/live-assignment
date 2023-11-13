'use server';

import { produceAssignment } from '@/lib/assignment/description';
import { COMPILE_STATUS_KEY, SUBMISSION_KEY } from '@/lib/constants';
import {
  TypeCheckResult,
  evalSource,
  typeCheckSource,
} from '@/lib/cpp/compiler';
import * as session from '@/lib/session';
import { redirect } from 'next/navigation';

async function readSubmission(formData: FormData) {
  const id = formData.get('id');
  const name = formData.get('name');

  if (typeof id !== 'string' || typeof name !== 'string') {
    throw new Error('Invalid input.');
  }

  const submission = formData.get(SUBMISSION_KEY) as string;
  await session.set(id, SUBMISSION_KEY, submission);

  return {
    id: id.trim(),
    name: name.trim(),
    assignment: produceAssignment(id, name),
    submission,
  };
}

async function getSubmission(id: string, formData: FormData) {}

function reloadPage(id: string, name: string) {
  redirect(
    `/description?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}`
  );
}

export async function check(formData: FormData) {
  const { id, name, assignment, submission } = await readSubmission(formData);

  let result: TypeCheckResult;

  if (assignment.testStdin) {
    const extendedResult = await evalSource(submission, assignment.testStdin);
    if (extendedResult.compilation.status === 'OK' && !extendedResult.error) {
      result = { status: 'OK', log: extendedResult.output.substring(0, 1024) };
    } else if (extendedResult.compilation.status !== 'OK') {
      result = extendedResult.compilation;
    } else if (extendedResult.error) {
      result = {
        status: 'FAILED',
        log: extendedResult.error.substring(0, 1024),
      };
    } else {
      result = {
        status: 'UNKNOWN',
        log: '',
      };
    }
  } else {
    result = await typeCheckSource(submission);
  }

  await session.setJSON(id, COMPILE_STATUS_KEY, result);
  reloadPage(id, name);
}

export async function submit(formData: FormData) {
  const { id, name, assignment, submission } = await readSubmission(formData);
  await session.set(id, SUBMISSION_KEY, null);
  reloadPage(id, name);
}
