import { getDb } from './_lib/mongodb.js';
import { requireAuthenticatedUser } from './_lib/auth.js';
import { serializeCollection } from './_lib/collections.js';
import { getQueryParam, methodNotAllowed, readJson, sendError, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    methodNotAllowed(res, ['PATCH']);
    return;
  }

  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const collectionId = getQueryParam(req, 'collectionId');
  const cardId = getQueryParam(req, 'cardId');
  if (!collectionId || !cardId) {
    sendError(res, 400, 'Collection id and card id are required.');
    return;
  }

  const body = await readJson(req);
  const owned = Boolean(body.owned);
  const db = await getDb();
  const collectionStore = db.collection('collections');

  const result = await collectionStore.findOneAndUpdate(
    { userId: auth.user._id, id: collectionId, 'cards.id': cardId },
    {
      $set: {
        'cards.$.owned': owned,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    sendError(res, 404, 'Collection card not found.');
    return;
  }

  sendJson(res, 200, { collection: serializeCollection(result) });
}
