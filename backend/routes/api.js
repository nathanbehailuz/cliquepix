import express from 'express';
import db from '../db/db.mjs';

const { User, Media } = db;


const router = express.Router();

router.post('/editFriendsList', async (req, res) =>{
    const user = await User.findOne({f_key:req.body.userFID})
    console.log('user: ', user)
    
    const friendsNames = {}
    for (const friend of user.friends){
        friendsNames[friend.friendId] = friend.name
    }

    console.log(friendsNames)

    res.json({friends: friendsNames})
    
})

router.post('/getNames', async (req, res) => {
    try {
        const id = req.body.id;
        const media = await Media.findById(id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media item not found' });
        }

        const ownerID = media.owner;

        const user = await User.findById(ownerID);
        const friends = user.friends.map((friend) => {
            return friend.name;
        })

        // Send back the response (adjust based on what data you need)
        res.json({ ownerID, friends});
    }
    catch (err) {
        console.error('Error in getNames:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/shareImage', async (req, res) => {
  try {
    
    const imageId = req.body.imageId
    const friendsNames = req.body.friends
    const unselectedFriends = req.body.unselectedFriends

    const media = await Media.findById(imageId);
    if (!media) {
        return res.status(404).json({ error: 'Media not found' });
    }

    const m = await Media.findById(imageId)
    const owner = await User.findById(m.owner)
    const allFriendsIds = {};
    owner.friends.forEach(f => {allFriendsIds[f.name] = f.friendId});


    friendsNames.forEach(friendName => {
        const friendId = allFriendsIds[friendName];
        if (Object.keys(allFriendsIds).includes(friendName) && 
            !media.accessList.some(access => access.userId?.toString() === friendId)) {
            media.accessList.push({ userId: friendId });
        } else {
            console.log('either the friend has already been added to accessList or friend is not selected');
        }
    });

    unselectedFriends.forEach(friendName => {
        const friendId = allFriendsIds[friendName];
        if (Object.keys(allFriendsIds).includes(friendName) && 
            !media.accessList.some(access => access.userId?.toString() === friendId)) {
            media.accessList.pop({ userId: friendId });
        } else {
            console.log('either the friend has already been removed from accessList or friend is selected');
        }
    })

    await media.save();
    console.log(media)
    res.json({ message: 'Image shared successfully' });
  } catch (err) {
    console.error('Error in shareImage:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/removeFriends', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const toBeRemoved = req.body.toBeRemoved;

        for (const [key, value] of Object.entries(toBeRemoved)) {
            await removeFriend(user, key);
        }
        res.set('Cache-Control', 'no-store');
        res.json({ message: 'Friends removed successfully', redirect: '/profile' });
    } catch (error) {
        console.error('Error removing friends:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


async function removeFriend (user, friendId){
    user.friends = user.friends.filter((friend) => {
        return friend.friendId.toString() !== friendId.toString()
    });

    await user.save();


    // remove images shared by user to friend
    for (const mid of user.media){
        const media = await Media.findById(mid);
        if (media) {
            media.accessList = media.accessList.filter(access => access.userId.toString() !== friendId);
            await media.save();
        }
    }

    // remove images shared by friend to user
    const friend = await User.findById(friendId);
    for (const mid of friend.media){
        const media = await Media.findById(mid);
        if (media) {
            media.accessList = media.accessList.filter(access => access.userId.toString() !== user._id.toString());
            await media.save();
        }
    }

}


router.post('/change-f-key', async (req, res) => {
    const newkey = req.body.newFKey

    const user = await User.findById(req.session.userId)

    if (await isKeyUnique(newkey)){
        user.f_key = newkey
        await user.save()

        res.json({msg: "✅"})
    }
    else{
        res.json({msg: "try a new key"})
    }
})


async function isKeyUnique(key){
    const existingUser = await User.findOne({ f_key: key });
    return !existingUser;
}


router.post('/filter-images', async (req, res) => {
    try {
        const selectedValue = req.body.filterby;
        const user = await User.findById(req.session.userId);

        let filteredMedia;
        if (selectedValue === 'mine') {
            // Find all media owned by the current user
            filteredMedia = await Media.find({ owner: user._id });
        } else if (selectedValue === 'friends') {
            const friendIds = user.friends.map(f => f.friendId);
            // Find all media owned by user's friends
            filteredMedia = await Media.find({ owner: { $in: friendIds } });
        }
        
        res.json({ media: filteredMedia });
    } catch (err) {
        console.error('Error in filter-images:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router