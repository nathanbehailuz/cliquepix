import express from 'express';
import path from 'path';
import db from '../db/db.mjs';
import { auth } from './auth.js';
import { feedQuery, parseSearchNames, canViewMedia, canViewProfilePic } from '../lib/access.mjs';
import { createImageUpload, storedUrlFor, safeUploadFilename, urlMatchesFilename } from '../lib/uploads.mjs';
import { persistUpload, readUploadBuffer, contentTypeFor } from '../lib/storage.mjs';

const { User, Media } = db;
const router = express.Router();
const upload = createImageUpload('media', 1024 * 1024 * 5);

function formatMedia(docs) {
  return docs.map((media) => {
    const owner = media.owner && typeof media.owner === 'object' ? media.owner : {};
    return {
      ...media,
      createdAt: media.createdAt ? new Date(media.createdAt).toLocaleString() : '',
      ownerProfilePic: owner.profile_pic,
      ownerUsername: owner.username
    };
  });
}

async function friendsForSidebar(user) {
  await user.populate('friends.friendId', 'username profile_pic');
  return user.friends.map((friend) => ({
    profilePic: friend.friendId?.profile_pic,
    username: friend.name || friend.friendId?.username
  }));
}

async function loadFeedMedia(user, filterBy) {
  const docs = await Media.find(feedQuery(user, filterBy))
    .populate('owner', 'username profile_pic')
    .sort('-createdAt')
    .lean()
    .exec();
  return formatMedia(docs);
}

router.get('/uploads/:filename', auth, async (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!filename || filename === '.' || filename === '..') {
    return res.status(404).end();
  }

  const media = await Media.findOne({
    $or: [
      { url: storedUrlFor(filename) },
      { url: `../../uploads/${filename}` },
      { url: `../uploads/${filename}` }
    ]
  });

  let allowed = Boolean(media && canViewMedia(req.user, media));

  if (!allowed) {
    const owner = await User.findOne({
      $or: [
        { profile_pic: storedUrlFor(filename) },
        { profile_pic: filename }
      ]
    });
    allowed = Boolean(owner && canViewProfilePic(req.user, owner));
  }

  if (!allowed) {
    const legacyMedia = await Media.find({ url: { $regex: filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$' } });
    const match = legacyMedia.find((item) => urlMatchesFilename(item.url, filename));
    allowed = Boolean(match && canViewMedia(req.user, match));
  }

  if (!allowed) {
    return res.status(404).end();
  }

  const file = await readUploadBuffer(filename);
  if (!file) {
    return res.status(404).end();
  }

  res.setHeader('Content-Type', contentTypeFor(filename));
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(file);
});

router.post('/search-images', auth, async (req, res) => {
  try {
    const user = req.user;
    const names = parseSearchNames(req.body.names);
    const allMedia = await Media.find(feedQuery(user, 'all')).lean().exec();

    const profileImages = [];
    for (const friend of user.friends) {
      if (names.includes(String(friend.name).toLowerCase())) {
        const friendUser = await User.findById(friend.friendId);
        if (friendUser?.profile_pic) {
          profileImages.push(friendUser.profile_pic);
        }
      }
    }

    const { filterImagesByName } = await import('./fr-scripts.js');
    const matchedImages = await filterImagesByName(allMedia, profileImages);
    const formattedMedia = formatMedia(
      await Media.populate(matchedImages, { path: 'owner', select: 'username profile_pic' })
    );

    res.render('main-page', {
      layout: 'layout',
      partial: 'home',
      media: formattedMedia,
      friends: await friendsForSidebar(user),
      user,
      filterBy: 'all'
    });
  } catch (err) {
    console.error('Error searching images:', err);
    res.status(500).json({ message: 'Error searching images' });
  }
});

router.get('/main-page', auth, async (req, res) => {
  try {
    const user = req.user;
    const filterBy = req.query.filterby || 'all';
    const formattedMedia = await loadFeedMedia(user, filterBy);

    res.render('main-page', {
      layout: 'layout',
      partial: 'home',
      media: formattedMedia,
      friends: await friendsForSidebar(user),
      user,
      filterBy
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ message: 'Error fetching media' });
  }
});

router.get('/create', auth, async (req, res) => {
  res.render('main-page', { layout: 'layout', partial: 'create', user: req.user });
});

router.post('/create', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render('main-page', {
        layout: 'layout',
        partial: 'create',
        user: req.user,
        error: 'No file uploaded'
      });
    }

    const user = req.user;
    const filename = safeUploadFilename('media', req.file.originalname);
    await persistUpload(filename, req.file);
    const media = new Media({
      owner: user._id,
      accessList: [{ userId: user._id }],
      type: 'image',
      url: storedUrlFor(filename)
    });
    await media.save();

    user.media.push(media._id);
    await user.save();

    res.render('main-page', {
      layout: 'layout',
      partial: 'create',
      msg: 'File uploaded successfully',
      user
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

router.get('/add-friend', auth, async (req, res) => {
  res.render('main-page', {
    layout: 'layout',
    partial: 'addfriend',
    user: req.user,
    userFId: req.user.f_key
  });
});

router.post('/add-friend', auth, async (req, res) => {
  const { name, fID } = req.body;
  const user = req.user;

  const renderAddFriend = (extra = {}) => res.render('main-page', {
    layout: 'layout',
    partial: 'addfriend',
    user,
    userFId: user.f_key,
    ...extra
  });

  try {
    const friend = await User.findOne({ f_key: fID });
    if (!friend) {
      return renderAddFriend({ error: 'Friend not found' });
    }
    if (friend._id.equals(user._id)) {
      return renderAddFriend({ error: 'You cannot add yourself' });
    }
    if (user.friends.some((entry) => entry.friendId.toString() === friend._id.toString())) {
      return renderAddFriend({ error: 'Already friends' });
    }

    user.friends.push({
      friendId: friend._id,
      f_key: friend.f_key,
      name: name
    });
    await user.save();

    try {
      friend.friends.push({
        friendId: user._id,
        f_key: user.f_key,
        name: user.username
      });
      await friend.save();
    } catch (err) {
      user.friends = user.friends.filter(
        (entry) => entry.friendId.toString() !== friend._id.toString()
      );
      await user.save();
      throw err;
    }

    return renderAddFriend({ msg: 'Friend added' });
  } catch (error) {
    console.error('Error adding friend:', error);
    return renderAddFriend({ error: 'Could not add friend' });
  }
});

router.get('/profile', auth, async (req, res) => {
  const user = req.user;
  const mediaList = await Media.find({ owner: user._id })
    .populate('owner', 'username profile_pic')
    .sort('-createdAt')
    .exec();

  res.render('main-page', {
    layout: 'layout',
    partial: 'profile',
    user,
    media: mediaList
  });
});

export default router;
