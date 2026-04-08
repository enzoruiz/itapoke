import { MongoClient } from 'mongodb';

const globalState = globalThis;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI environment variable.');
  return uri;
}

function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || 'itapoke';
}

async function ensureIndexes(db) {
  if (globalState.__itapokeMongoIndexesReady) return;

  await Promise.all([
    db.collection('users').createIndex({ googleSub: 1 }, { unique: true, name: 'users_googleSub_unique' }),
    db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true, name: 'users_email_unique' }),
    db.collection('sessions').createIndex({ sessionTokenHash: 1 }, { unique: true, name: 'sessions_token_unique' }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'sessions_expiry_ttl' }),
    db.collection('collections').createIndex({ userId: 1, id: 1 }, { unique: true, name: 'collections_user_collection_unique' }),
    db.collection('collections').createIndex({ userId: 1, updatedAt: -1 }, { name: 'collections_user_updated_idx' })
  ]);

  globalState.__itapokeMongoIndexesReady = true;
}

export async function getDb() {
  if (!globalState.__itapokeMongoClientPromise) {
    const client = new MongoClient(getMongoUri());
    globalState.__itapokeMongoClientPromise = client.connect();
  }

  const client = await globalState.__itapokeMongoClientPromise;
  const db = client.db(getDatabaseName());
  await ensureIndexes(db);
  return db;
}
