import { destroySession } from '../_lib/auth.js';
import { ensureMethod, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!ensureMethod(req, res, ['POST'])) return;

  await destroySession(req, res);
  sendJson(res, 200, { ok: true });
}
