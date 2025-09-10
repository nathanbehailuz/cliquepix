import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

try {
    await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log(`Connected to MongoDB: ${MONGODB_URI.includes('localhost') ? 'Local' : 'Atlas'}`);
} catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process on failure
}



const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  f_key: { type: String, required: true, unique: true },
  friends: [{
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    f_key: { type: String, required: true },
    name: {type: String, required: true}
  }],
  media: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
  createdAt: { type: Date, default: Date.now },
  profile_pic: { type: String, default: 'default.png' }
});


const MediaSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },  
  accessList: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now }
});


const User = mongoose.model('User', UserSchema);
const Media = mongoose.model('Media', MediaSchema);

export default { User, Media };
