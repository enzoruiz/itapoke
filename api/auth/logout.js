import { destroySession } from '../_lib/auth.js';
import { methodNotAllowed, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  await destroySession(req, res);
  sendJson(res, 200, { ok: true });
}
