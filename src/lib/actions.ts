'use server';

import { COMPILE_STATUS_KEY, SUBMISSION_KEY } from '@/lib/constants';
import { typeCheckSource } from '@/lib/cpp/compiler';
import * as session from '@/lib/session';
import { redirect } from 'next/navigation';

function readParams(formData: FormData) {
  const id = formData.get('id');
  const name = formData.get('name');
  if (typeof id !== 'string' || typeof name !== 'string') {
    throw new Error('Invalid input.');
  }
  return { id, name };
}

async function getSubmission(id: string, formData: FormData) {
  const submission = formData.get(SUBMISSION_KEY) as string;
  await session.set(id, SUBMISSION_KEY, submission);
  return submission;
}

function reloadPage(id: string, name: string) {
  redirect(
    `/description?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}`
  );
}

export async function check(formData: FormData) {
  const { id, name } = readParams(formData);
  const submission = await getSubmission(id, formData);
  const result = await typeCheckSource(submission);
  await session.setJSON(id, COMPILE_STATUS_KEY, result);
  reloadPage(id, name);
}

export async function submit(formData: FormData) {
  const { id, name } = readParams(formData);
  const submission = await getSubmission(id, formData);
  await session.set(id, SUBMISSION_KEY, null);
  reloadPage(id, name);
}
