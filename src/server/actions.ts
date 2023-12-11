'use server';

import {
  COMPILE_STATUS_KEY,
  EXECUTE_STATUS_KEY,
  SUBMISSION_KEY,
  SUBMISSION_STATUS_KEY,
} from '@/lib/constants';
import { produceAssignment } from '@/server/assignment/description';
import { SUBMISSIONS_CPP_DIR, SUBMISSIONS_MD_DIR } from '@/server/config';
import { evalSource, typeCheckSource } from '@/server/cpp/compiler';
import * as session from '@/server/session';
import fs from 'fs';
import { redirect } from 'next/navigation';
import path from 'path';

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

function reloadPage(id: string, name: string, hash?: string) {
  redirect(`/description?name=${encodeURIComponent(name)}&id=${encodeURIComponent(id)}`);
}

function injectSubmission(submission: string) {
  const CIN_HACK = `#include <iostream>
template<typename T>
std::istream& operator>>=(std::istream& is, T& x) {
    is >> x;
    std::cout << x << "\\n";
    return is;
}`;
  return CIN_HACK + '\n' + submission.replace(/>>/g, '>>=');
}

async function runSubmission(stdin: string, submission: string) {
  const executeStatus = await evalSource(injectSubmission(submission), stdin);

  executeStatus.output = executeStatus.output.replace(/\r\n/g, '\n').substring(0, 512);

  if (executeStatus.error) {
    executeStatus.error = executeStatus.error.substring(0, 512);
  }

  return executeStatus;
}

export async function check(formData: FormData) {
  const { id, name, assignment, submission } = await readSubmission(formData);

  const compileStatus = await typeCheckSource(submission);

  await session.setJSON(id, COMPILE_STATUS_KEY, compileStatus);

  if (compileStatus.status === 'OK' && assignment.testStdin) {
    const executeStatus = await runSubmission(assignment.testStdin, submission);
    await session.setJSON(id, EXECUTE_STATUS_KEY, executeStatus);
  } else {
    await session.setJSON(id, EXECUTE_STATUS_KEY, null);
  }

  reloadPage(id, name);
}

function formatTime(date: Date) {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((x) => x.toString().padStart(2, '0'))
    .join(':');
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[\\\/:*?"<>| ]/g, '-');
}

const SEP_EDGE =
  '***********************************************************************';

const SEP = SEP_EDGE + '**';

function formatCpp(
  id: string,
  name: string,
  assignmentSummary: string,
  submission: string,
  time: string,
  output: string
) {
  return `/*${SEP_EDGE}
Emri: ${name}
ID: ${id}
Ora e dorëzimit: ${time}
${SEP}
${assignmentSummary}
${SEP}
${output.trim()}
${SEP_EDGE}*/

${submission}

/*${SEP_EDGE}
Student: ${name} (${id})
Pikët:${' '}
${SEP_EDGE}*/`;
}

export async function submit(formData: FormData) {
  const { id, name, assignment, submission } = await readSubmission(formData);
  const time = formatTime(new Date());
  const submissionBaseName = sanitizeFileName(`${name}_${id}_${time}`);

  // const dstMd = path.join(SUBMISSIONS_MD_DIR, submissionBaseName + '.md');
  const dstCpp = path.join(SUBMISSIONS_CPP_DIR, submissionBaseName + '.cpp');

  let executeStdout: string | null = null;
  let compileError: string | null = null;
  if (assignment.testStdin) {
    const executeStatus = await runSubmission(assignment.testStdin, submission);
    executeStdout = executeStatus.output.trim();
    compileError = executeStatus.compilation.log;
  }

  await fs.promises.writeFile(
    dstCpp,
    formatCpp(
      id,
      name,
      assignment.summary ?? assignment.description,
      submission,
      time,
      executeStdout || compileError || '<No output>'
    )
  );

  await session.set(id, SUBMISSION_STATUS_KEY, `Dorëzimi është pranuar në ora ${time}.`);
  await session.set(id, SUBMISSION_KEY, null);
  reloadPage(id, name);
}

export async function clearSubmissionStatus(formData: FormData) {
  const { id, name } = await readSubmission(formData);
  await session.setJSON(id, COMPILE_STATUS_KEY, null);
  await session.setJSON(id, EXECUTE_STATUS_KEY, null);
  await session.set(id, SUBMISSION_STATUS_KEY, null);
  reloadPage(id, name);
}
