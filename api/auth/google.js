import { createSession, publicUserFromDocument, upsertUserFromGoogle, verifyGoogleCredential } from '../_lib/auth.js';
import { ensureMethod, readJson, sendError, sendJson } from '../_lib/http.js';

function logStep(step, error) {
  console.error(`[auth/google] ${step} failed:`, error?.message || error);
  if (error?.stack) console.error(error.stack);
}

export default async function handler(req, res) {
  if (!ensureMethod(req, res, ['POST'])) return;

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    logStep('readJson', error);
    sendError(res, 400, 'Invalid JSON body.');
    return;
  }

  const credential = String(body?.credential || '').trim();
  if (!credential) {
    sendError(res, 400, 'Missing Google credential.');
    return;
  }

  let profile;
  try {
    profile = await verifyGoogleCredential(credential);
  } catch (error) {
    logStep('verifyGoogleCredential', error);
    sendError(res, 401, 'Google authentication failed.');
    return;
  }

  let user;
  try {
    user = await upsertUserFromGoogle(profile);
  } catch (error) {
    logStep('upsertUserFromGoogle', error);
    sendError(res, 500, `Database upsert failed: ${error?.message || 'unknown error'}`);
    return;
  }

  if (!user) {
    logStep('upsertUserFromGoogle', new Error('User lookup returned null after upsert.'));
    sendError(res, 500, 'Database upsert returned no user.');
    return;
  }

  try {
    await createSession(req, res, user);
  } catch (error) {
    logStep('createSession', error);
    sendError(res, 500, `Session creation failed: ${error?.message || 'unknown error'}`);
    return;
  }

  try {
    sendJson(res, 200, { user: publicUserFromDocument(user) });
  } catch (error) {
    logStep('sendJson', error);
    if (!res.writableEnded) {
      try { sendError(res, 500, 'Response serialization failed.'); } catch { /* noop */ }
    }
  }
}
