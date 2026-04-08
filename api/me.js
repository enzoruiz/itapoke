import { getAuthenticatedUser } from './_lib/auth.js';
import { methodNotAllowed, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  const auth = await getAuthenticatedUser(req);
  sendJson(res, 200, { user: auth?.publicUser || null });
}
