import mongoose from 'mongoose';
import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import db from '../db/db.mjs';

const User = mongoose.model('User');

async function userExists(field) {
  const isEmail = field.includes('@');
  const query = isEmail ? { email: field } : { username: field };
  const user = await User.findOne(query);
  return user !== null;
}
const profilePicStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + '-' + file.originalname)
  }
});

const uploadProfilePic = multer({ 
  storage: profilePicStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image for your profile picture.'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 2 
  }
});


async function register(username, email, password, profile_pic = null) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  if (username.length < 3 || username.length > 20) {
    throw new Error('Username must be between 3 and 20 characters');
  }
  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }
  if (await userExists(username)) {
    throw new Error('Username already in use');
  }
  if (await userExists(email)) {
    throw new Error('Email already in use');
  }
  
  const user = new User({ username, email, hash, profile_pic, media: [] });
  const fKey = await generateFKey();
  user.f_key = fKey;
  await user.save();
  return user;
}

async function generateFKey() {
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const vowels = 'aeiou';
  let id = '';
  
  while (true) {
    // Generate CVCVCV pattern (Consonant-Vowel)
    for(let i = 0; i < 3; i++) {
        id += consonants.charAt(Math.floor(Math.random() * consonants.length));
        id += vowels.charAt(Math.floor(Math.random() * vowels.length));
    }

    const fKey = id + Math.floor(100 + Math.random() * 900);
    if (!await userExists(fKey)) {  return fKey; }
  } 
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

async function auth (req, res, next)  {
  try {
      // Check if session exists
      if (!req.session || !req.session.userId) {
          return res.status(401).redirect('/login');
      }

      // Find user by ID from session
      const user = await User.findById(req.session.userId);
      if (!user) {
          return res.status(401).redirect('/login');
      }

      // Add user to request object
      req.user = user;
      next();
  } catch (error) {
      res.status(401).redirect('/login');
  }
};

// Routesprofile_pic
const router = express.Router();
router.post('/login', async (req, res) => {
  try {
    console.log('Received login request:', req.body);
    
    const { username, password } = req.body;
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    
    const user = await login(username, password);
    console.log('Login successful:', user);
    
    // Set user session
    req.session.userId = user._id;
    
    return res.redirect('/main-page');
  } catch (error) {
    res.render('login', { error: error.message });
  }
});

router.post('/register', uploadProfilePic.single('profile_pic'), async (req, res) => {
  try {
    console.log('Received registration request:', req.body);
    
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }
    
    // Get the profile pic path from the uploaded file

    // error here: req.file is undefined
    console.log('req.file:', req.file);

    const profile_pic = req.file ? `/uploads/${req.file.filename}` : null;
    
    const user = await register(username, email, password, profile_pic);
    console.log('Registration successful:', user);
    
    return res.redirect('/login');
  } catch (error) {
    // If there's a multer error, handle it
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

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

export default router;
export { auth };