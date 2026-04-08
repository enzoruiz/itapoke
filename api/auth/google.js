import { createSession, publicUserFromDocument, upsertUserFromGoogle, verifyGoogleCredential } from '../_lib/auth.js';
import { methodNotAllowed, readJson, sendError, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = await readJson(req);
    const credential = String(body.credential || '').trim();
    if (!credential) {
      sendError(res, 400, 'Missing Google credential.');
      return;
    }

    const profile = await verifyGoogleCredential(credential);
    const user = await upsertUserFromGoogle(profile);
    await createSession(req, res, user);
    sendJson(res, 200, { user: publicUserFromDocument(user) });
  } catch (error) {
    console.error(error);
    sendError(res, 401, 'Google authentication failed.');
  }
}
