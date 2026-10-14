import mongoose from 'mongoose';
import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import '../db/db.mjs';
import { createImageUpload, storedUrlFor, safeUploadFilename } from '../lib/uploads.mjs';
import { persistUpload } from '../lib/storage.mjs';

const User = mongoose.model('User');
const uploadProfilePic = createImageUpload('profile', 1024 * 1024 * 2);

async function userExists(field) {
  const isEmail = field.includes('@');
  const query = isEmail ? { email: field } : { username: field };
  const user = await User.findOne(query);
  return user !== null;
}

async function register(username, email, password, profile_pic = null) {
  if (username.length < 3 || username.length > 20) {
    throw new Error('Username must be between 3 and 20 characters');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (await userExists(username)) {
    throw new Error('Username already in use');
  }
  if (await userExists(email)) {
    throw new Error('Email already in use');
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = new User({ username, email, hash, profile_pic, media: [] });
  user.f_key = await generateFKey();
  await user.save();
  return user;
}

async function generateFKey(maxAttempts = 20) {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let id = '';
    for (let i = 0; i < 3; i++) {
      id += consonants.charAt(Math.floor(Math.random() * consonants.length));
      id += vowels.charAt(Math.floor(Math.random() * vowels.length));
    }
    const fKey = id + Math.floor(100 + Math.random() * 900);
    const existing = await User.findOne({ f_key: fKey });
    if (!existing) {
      return fKey;
    }
  }

  throw new Error('Could not generate a unique friend key');
}

async function login(username, password) {
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error('Invalid username or password');
  }
  const isPasswordValid = await bcrypt.compare(password, user.hash);
  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }
  return user;
}

async function auth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).redirect('/login');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).redirect('/login');
  }
}

async function requireApiUser(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const user = await login(username, password);
    req.session.userId = user._id;
    return res.redirect('/main-page');
  } catch (error) {
    res.render('login', { error: error.message });
  }
});

router.post('/register', uploadProfilePic.single('profile_pic'), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    let profile_pic = null;
    if (req.file) {
      const filename = safeUploadFilename('profile', req.file.originalname);
      await persistUpload(filename, req.file);
      profile_pic = storedUrlFor(filename);
    }
    await register(username, email, password, profile_pic);
    return res.redirect('/login');
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.render('register', {
        error: 'File upload error: File too large or invalid format'
      });
    }
    res.render('register', { error: error.message });
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

export default router;
export { auth, requireApiUser };
