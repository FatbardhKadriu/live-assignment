import fs from 'fs';
import path from 'path';

export const SUBMISSIONS_MD_DIR =
  process.env.SUBMISSIONS_MD_DIR || path.resolve(process.cwd(), 'submissions');

export const SUBMISSIONS_CPP_DIR =
  process.env.SUBMISSIONS_CPP_DIR || path.join(SUBMISSIONS_MD_DIR, 'source');

fs.mkdirSync(SUBMISSIONS_CPP_DIR, { recursive: true });
fs.mkdirSync(SUBMISSIONS_MD_DIR, { recursive: true });
