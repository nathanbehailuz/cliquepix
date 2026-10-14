import express from 'express';
import db from '../db/db.mjs';
import { requireApiUser } from './auth.js';
import { feedQuery, updateAccessList, idsEqual } from '../lib/access.mjs';

const { User, Media } = db;
const router = express.Router();

router.use(requireApiUser);

router.post('/editFriendsList', async (req, res) => {
  try {
    const user = req.user;
    const friends = user.friends.map((friend) => ({
      friendId: friend.friendId,
      name: friend.name
    }));
    res.json({ friends });
  } catch (err) {
    console.error('Error in editFriendsList:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/getNames', async (req, res) => {
  try {
    const media = await Media.findById(req.body.id);
    if (!media) {
      return res.status(404).json({ error: 'Media item not found' });
    }
    if (!idsEqual(media.owner, req.user._id)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const friends = req.user.friends.map((friend) => ({
      friendId: friend.friendId,
      name: friend.name
    }));
    const accessList = (media.accessList || []).map((entry) => String(entry.userId));

    res.json({ friends, accessList });
  } catch (err) {
    console.error('Error in getNames:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shareImage', async (req, res) => {
  try {
    const media = await Media.findById(req.body.imageId);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }
    if (!idsEqual(media.owner, req.user._id)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const allowedFriendIds = req.user.friends.map((friend) => friend.friendId);
    media.accessList = updateAccessList(req.user._id, req.body.friends || [], allowedFriendIds);
    await media.save();
    res.json({ message: 'Image shared successfully' });
  } catch (err) {
    console.error('Error in shareImage:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/removeFriends', async (req, res) => {
  try {
    const user = req.user;
    const toBeRemoved = req.body.toBeRemoved || {};

    for (const friendId of Object.keys(toBeRemoved)) {
      await removeFriend(user, friendId);
    }
    res.set('Cache-Control', 'no-store');
    res.json({ message: 'Friends removed successfully', redirect: '/profile' });
  } catch (error) {
    console.error('Error removing friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function removeFriend(user, friendId) {
  user.friends = user.friends.filter(
    (friend) => friend.friendId.toString() !== friendId.toString()
  );
  await user.save();

  const friend = await User.findById(friendId);
  if (friend) {
    friend.friends = friend.friends.filter(
      (entry) => entry.friendId.toString() !== user._id.toString()
    );
    await friend.save();
  }

  await Media.updateMany(
    { owner: user._id },
    { $pull: { accessList: { userId: friendId } } }
  );
  await Media.updateMany(
    { owner: friendId },
    { $pull: { accessList: { userId: user._id } } }
  );
}

router.post('/change-f-key', async (req, res) => {
  try {
    const newkey = String(req.body.newFKey || '').trim();
    if (!newkey) {
      return res.json({ msg: 'try a new key' });
    }

    const user = req.user;
    const existing = await User.findOne({ f_key: newkey, _id: { $ne: user._id } });
    if (existing) {
      return res.json({ msg: 'try a new key' });
    }

    user.f_key = newkey;
    await user.save();

    await User.updateMany(
      { 'friends.friendId': user._id },
      { $set: { 'friends.$[elem].f_key': newkey } },
      { arrayFilters: [{ 'elem.friendId': user._id }] }
    );

    res.json({ msg: 'Friend key updated' });
  } catch (err) {
    console.error('Error in change-f-key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/filter-images', async (req, res) => {
  try {
    const user = req.user;
    const filteredMedia = await Media.find(feedQuery(user, req.body.filterby));
    res.json({ media: filteredMedia });
  } catch (err) {
    console.error('Error in filter-images:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
