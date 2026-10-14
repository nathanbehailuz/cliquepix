import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB: ${uri.includes('localhost') ? 'Local' : 'Atlas'}`);
  return mongoose.connection;
}

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  f_key: { type: String, required: true, unique: true },
  friends: [{
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    f_key: { type: String, required: true },
    name: { type: String, required: true }
  }],
  media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
  createdAt: { type: Date, default: Date.now },
  profile_pic: { type: String, default: 'default.png' }
});

const MediaSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  accessList: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Media = mongoose.models.Media || mongoose.model('Media', MediaSchema);

export default { User, Media };
