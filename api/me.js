import { getAuthenticatedUser } from './_lib/auth.js';
import { ensureMethod, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (!ensureMethod(req, res, ['GET'])) return;

  const auth = await getAuthenticatedUser(req);
  sendJson(res, 200, { user: auth?.publicUser || null });
}
