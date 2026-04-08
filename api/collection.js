import { getDb } from './_lib/mongodb.js';
import { requireAuthenticatedUser } from './_lib/auth.js';
import { serializeCollection } from './_lib/collections.js';
import { getQueryParam, methodNotAllowed, readJson, sendError, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const id = getQueryParam(req, 'id');
  if (!id) {
    sendError(res, 400, 'Collection id is required.');
    return;
  }

  const db = await getDb();
  const collectionStore = db.collection('collections');
  const query = { userId: auth.user._id, id };

  if (req.method === 'GET') {
    const doc = await collectionStore.findOne(query);
    if (!doc) {
      sendError(res, 404, 'Collection not found.');
      return;
    }
    sendJson(res, 200, { collection: serializeCollection(doc) });
    return;
  }

  if (req.method === 'PATCH') {
    const body = await readJson(req);
    const name = String(body.name || '').trim();
    if (!name) {
      sendError(res, 400, 'Collection name is required.');
      return;
    }

    await collectionStore.updateOne(query, {
      $set: {
        name,
        updatedAt: new Date()
      }
    });

    const doc = await collectionStore.findOne(query);
    if (!doc) {
      sendError(res, 404, 'Collection not found.');
      return;
    }
    sendJson(res, 200, { collection: serializeCollection(doc) });
    return;
  }

  if (req.method === 'DELETE') {
    const result = await collectionStore.deleteOne(query);
    if (!result.deletedCount) {
      sendError(res, 404, 'Collection not found.');
      return;
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);
}
