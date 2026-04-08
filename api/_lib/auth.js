import crypto from 'node:crypto';
import { parse, serialize } from 'cookie';
import { OAuth2Client } from 'google-auth-library';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb.js';
import { sendError } from './http.js';

const SESSION_COOKIE_NAME = 'itapoke_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const googleClient = new OAuth2Client();

function cookieOptions(req, maxAgeSeconds) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const secure = process.env.NODE_ENV === 'production' || forwardedProto === 'https';

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: maxAgeSeconds
  };
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sessionCookie(req, token, maxAgeSeconds) {
  return serialize(SESSION_COOKIE_NAME, token, cookieOptions(req, maxAgeSeconds));
}

export function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
}

export function publicUserFromDocument(user) {
  return {
    id: String(user._id),
    sub: user.googleSub,
    name: user.name || 'Usuario',
    email: user.email || '',
    picture: user.picture || ''
  };
}

export async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Missing GOOGLE_CLIENT_ID environment variable.');

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: clientId
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('Invalid Google credential payload.');

  return {
    googleSub: payload.sub,
    email: payload.email || '',
    name: payload.name || payload.given_name || payload.email || 'Usuario',
    picture: payload.picture || ''
  };
}

export async function upsertUserFromGoogle(profile) {
  const db = await getDb();
  const now = new Date();

  await db.collection('users').updateOne(
    { googleSub: profile.googleSub },
    {
      $set: {
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  return db.collection('users').findOne({ googleSub: profile.googleSub });
}

export async function createSession(req, res, user) {
  const db = await getDb();
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.collection('sessions').insertOne({
    sessionTokenHash: hashSessionToken(sessionToken),
    userId: user._id instanceof ObjectId ? user._id : new ObjectId(user._id),
    createdAt: now,
    expiresAt
  });

  res.setHeader('Set-Cookie', sessionCookie(req, sessionToken, Math.floor(SESSION_TTL_MS / 1000)));
}

export async function destroySession(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE_NAME];
  if (token) {
    const db = await getDb();
    await db.collection('sessions').deleteOne({ sessionTokenHash: hashSessionToken(token) });
  }
  clearSessionCookie(req, res);
}

export async function getAuthenticatedUser(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;

  const db = await getDb();
  const session = await db.collection('sessions').findOne({
    sessionTokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() }
  });

  if (!session) return null;

  const user = await db.collection('users').findOne({ _id: session.userId });
  if (!user) return null;

  return {
    session,
    user,
    publicUser: publicUserFromDocument(user)
  };
}

export async function requireAuthenticatedUser(req, res) {
  const auth = await getAuthenticatedUser(req);
  if (!auth) {
    sendError(res, 401, 'Authentication required.');
    return null;
  }
  return auth;
}
