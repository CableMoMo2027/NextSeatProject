import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/nextseat_payment';

export async function connectToMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  const mongoUri = String(process.env.MONGODB_URI || DEFAULT_URI).trim() || DEFAULT_URI;
  await mongoose.connect(mongoUri);
}

