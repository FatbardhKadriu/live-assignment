'use server';

import { COMPILE_STATUS_KEY, SUBMISSION_KEY } from '@/lib/constants';
import { typeCheckSource } from '@/lib/cpp/compiler';
import * as session from '@/lib/session';
import { redirect } from 'next/navigation';

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

export async function check(id: string, name: string, formData: FormData) {
  const submission = await getSubmission(id, formData);
  const result = await typeCheckSource(submission);
  await session.setJSON(id, COMPILE_STATUS_KEY, result);
  reloadPage(id, name);
}

export async function submit(id: string, name: string, formData: FormData) {
  const submission = await getSubmission(id, formData);
  console.log('submit', submission);
  reloadPage(id, name);
}
