import { getDb } from './_lib/mongodb.js';
import { requireAuthenticatedUser } from './_lib/auth.js';
import { sanitizeCards, serializeCollection } from './_lib/collections.js';
import { getQueryParam, methodNotAllowed, readJson, sendError, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const collectionId = getQueryParam(req, 'collectionId');
  if (!collectionId) {
    sendError(res, 400, 'Collection id is required.');
    return;
  }

  const db = await getDb();
  const collectionStore = db.collection('collections');
  const collectionQuery = { userId: auth.user._id, id: collectionId };

  if (req.method === 'POST') {
    const body = await readJson(req);
    const [card] = sanitizeCards([body.card]);
    if (!card) {
      sendError(res, 400, 'Collection card is required.');
      return;
    }

    const result = await collectionStore.findOneAndUpdate(
      { ...collectionQuery, 'cards.id': { $ne: card.id } },
      {
        $push: { cards: card },
        $set: { updatedAt: new Date() },
        $inc: { totalCount: 1 }
      },
      { returnDocument: 'after' }
    );

    if (result) {
      sendJson(res, 200, { collection: serializeCollection(result) });
      return;
    }

    const existing = await collectionStore.findOne(collectionQuery);
    if (!existing) {
      sendError(res, 404, 'Collection not found.');
      return;
    }
    if (Array.isArray(existing.cards) && existing.cards.some((entry) => entry.id === card.id)) {
      sendError(res, 409, 'Collection card already exists.');
      return;
    }
    sendError(res, 409, 'Collection card could not be added.');
    return;
  }

  if (req.method === 'DELETE') {
    const cardId = getQueryParam(req, 'cardId');
    if (!cardId) {
      sendError(res, 400, 'Card id is required.');
      return;
    }

    const existing = await collectionStore.findOne(collectionQuery);
    if (!existing) {
      sendError(res, 404, 'Collection not found.');
      return;
    }

    const nextCards = Array.isArray(existing.cards) ? existing.cards.filter((entry) => entry.id !== cardId) : [];
    if (nextCards.length === (Array.isArray(existing.cards) ? existing.cards.length : 0)) {
      sendError(res, 404, 'Collection card not found.');
      return;
    }

    const result = await collectionStore.findOneAndUpdate(
      collectionQuery,
      {
        $set: {
          cards: nextCards,
          totalCount: nextCards.length,
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
    return;
  }

  if (req.method !== 'PATCH') {
    methodNotAllowed(res, ['POST', 'PATCH', 'DELETE']);
    return;
  }

  const cardId = getQueryParam(req, 'cardId');
  if (!cardId) {
    sendError(res, 400, 'Card id is required.');
    return;
  }

  const body = await readJson(req);
  const owned = Boolean(body.owned);

  const result = await collectionStore.findOneAndUpdate(
    { ...collectionQuery, 'cards.id': cardId },
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
