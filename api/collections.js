import { getDb } from './_lib/mongodb.js';
import { createCollectionId, sanitizeCards, sanitizeFilters, serializeCollection } from './_lib/collections.js';
import { requireAuthenticatedUser } from './_lib/auth.js';
import { methodNotAllowed, readJson, sendError, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const db = await getDb();
  const collectionStore = db.collection('collections');

  if (req.method === 'GET') {
    const docs = await collectionStore.find({ userId: auth.user._id }).sort({ updatedAt: -1, name: 1 }).toArray();
    sendJson(res, 200, { collections: docs.map(serializeCollection) });
    return;
  }

  if (req.method === 'POST') {
    const body = await readJson(req);
    const name = String(body.name || '').trim();
    const cards = sanitizeCards(body.cards);
    if (!name) {
      sendError(res, 400, 'Collection name is required.');
      return;
    }
    if (!cards.length) {
      sendError(res, 400, 'Collection cards are required.');
      return;
    }

    const now = new Date();
    const doc = {
      id: createCollectionId(name),
      userId: auth.user._id,
      name,
      filters: sanitizeFilters(body.filters),
      totalCount: Number(body.totalCount) || cards.length,
      cards,
      createdAt: now,
      updatedAt: now
    };

    await collectionStore.insertOne(doc);
    sendJson(res, 201, { collection: serializeCollection(doc) });
    return;
  }

  methodNotAllowed(res, ['GET', 'POST']);
}
