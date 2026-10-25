import "server-only";
import { Db, MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _dudeMongoClient: Promise<MongoClient> | undefined;
}

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing. Set it in your environment variables.");
  const dbName = process.env.MONGODB_DB;
  if (!dbName) throw new Error("MONGODB_DB is missing. Set it in your environment variables.");

  if (!global._dudeMongoClient) {
    const client = new MongoClient(uri, { maxPoolSize: 15, serverSelectionTimeoutMS: 8000 });
    global._dudeMongoClient = client.connect().catch((e) => {
      global._dudeMongoClient = undefined;
      throw e;
    });
  }
  return (await global._dudeMongoClient).db(dbName);
}

export async function getMovieCollection() {
  const db = await getDatabase();
  return db.collection(process.env.MONGODB_COLLECTION || "movies");
}
