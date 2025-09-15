import express from 'express';
import multer from 'multer';
import fs from 'fs';
import db from '../db/db.mjs';
const { User, Media } = db;
import {filterImagesByName} from './fr-scripts.js'

const router = express.Router();

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5
  }
});

router.get('/', (req, res) => {
  res.json({ message: 'Media route' });
});


router.post('/search-images/:names', async (req, res) =>{
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.userId)

  const names = req.params.names.split(',')

  try {
    const allMedia = await Media.find({
      $or: [
        { 'accessList.userId': req.session.userId },
        { owner: req.session.userId }
      ]
    }).lean().exec();

    const profileImages = {}

    for (const friend of user.friends){
      for (const name of names){
        if (name === friend.name) {
          const friendUser = await User.findById(friend.friendId);  
          profileImages[name] = friendUser.profile_pic
        }
      }
    }

    console.log(profileImages)
    const matchedImages = await filterImagesByName(allMedia, names, user, Object.values(profileImages))

    const friends = await Promise.all(user.friends.map(async (friend) => {
      const friendUser = await User.findById(friend.friendId);
      return {
        profilePic: friendUser.profile_pic,
        username: getNickName(user, friend.friendId)
      };
    }));

    res.render('main-page', {
      layout: 'layout', 
      partial: 'home', 
      media: matchedImages,
      friends: friends,
      user: user
    });
    
  } catch (err){
    console.error('Error searching images:', err);
    res.status(500).json({ message: 'Error searching images' });
  }

})

function getNickName(user, fid){
  const friends =  user.friends
  for(const f of friends){
    if (f.friendId === fid){
      return f.name
    }
  }
  return undefined
}

router.get('/main-page', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/login');
    }

    const filterBy = req.query.filterby || 'all';
    console.log('Filter value:', filterBy);

    let query = {
      $or: [
        { owner: user._id },          
        { accessList: { $elemMatch: { userId: user._id } } } 
      ]
    };

    if (filterBy === 'mine') {
      query = { owner: user._id };
    } else if (filterBy === 'friends') {
      const friendIds = user.friends.map(f => f.friendId);
      query = { owner: { $in: friendIds } };
    }

    const allAccessibleMedia = await Media.find(query)
      .select('url createdAt type owner')
      .sort('-createdAt')
      .lean()
      .exec();

    console.log('Query:', query);
    console.log('Media count:', allAccessibleMedia.length);

    const formattedMedia = await Promise.all(allAccessibleMedia.map(async (media) => {
      const owner = await User.findById(media.owner);
      return {
        ...media,
        createdAt: new Date(media.createdAt).toLocaleString(),
        ownerProfilePic: owner.profile_pic,
        ownerUsername: owner.username
      };
    }));

    console.log('Formatted media:', formattedMedia);

    const friends =  await Promise.all(user.friends.map(async (friend) => {
      const friendUser = await User.findById(friend.friendId);
      return {
        profilePic: friendUser.profile_pic,
        username: friendUser.username
      };
    }));
    
    res.render('main-page', {
      layout: 'layout', 
      partial: 'home', 
      media: formattedMedia,
      friends: friends,
      user: user
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ message: 'Error fetching media' }); 
  }
});

router.get('/create', async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('main-page', {layout: 'layout', partial: 'create', user: user});
});

router.post('/create', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('Session:', req.session);
    console.log('User in session:', req.session.userId);
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.error('debug: user not found in database');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const getMediaType = (mimeType) => {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      throw new Error('Unsupported media type');
    };

    const mediaType = getMediaType(req.file.mimetype);

    const media = new Media({
      filename: req.file.filename,
      path: req.file.path,
      owner: user._id,
      accessList: [{ userId: user._id }],
      type: mediaType,
      url: `../../uploads/${req.file.filename}`,
      user: user._id
    });
    await media.save();

    user.media.push(media._id);
    await user.save();

    console.log('Media uploaded:', media.url);
    console.log('User media:', user.media);
    
    res.render('main-page', {layout: 'layout', partial: 'create', msg: "File uploaded successfully", user: user});

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

router.get('/add-friend', async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('main-page', {layout: 'layout', partial: 'addfriend', user: user});
});

router.post('/add-friend', async (req, res) => {
  const { name, fID } = req.body;
  console.log(name, fID);

  // check if fID is valid (in the database)
  const friend = await User.findOne({f_key: fID});
  if (!friend) {
    return res.status(404).json({ error: 'Friend not found' });
  }
  //add friend to user's friend list
  const user = await User.findById(req.session.userId);
  user.friends.push({
    friendId: friend._id,
    f_key: friend.f_key,
    name: name
  });

  // update friend's friend list:
  friend.friends.push({
    friendId: user._id,
    f_key: user.f_key,
    name: user.username
  })
  await user.save();
  await friend.save();

  res.render('main-page', {layout: 'layout', partial: 'addfriend', msg: "Friend added", user: user});

});

router.get('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.redirect('/login');
  }

  const mediaList = [];
  if (user.media && user.media.length > 0) {
    for(const mediaId of user.media) {
      const populatedMedia = await Media.findById(mediaId);
      if (populatedMedia) {
        mediaList.push(populatedMedia);
      }
    }
  }

  mediaList.reverse();
  
  res.render('main-page', {
    layout: 'layout', 
    partial: 'profile', 
    user: user, 
    media: mediaList
  });
});

export default router;


