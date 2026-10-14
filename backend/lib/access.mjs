export function idsEqual(a, b) {
  return String(a) === String(b);
}

export function friendIdsOf(user) {
  return (user.friends || []).map((friend) => friend.friendId);
}

export function feedQuery(user, filter) {
  const userId = user._id;
  const friendIds = friendIdsOf(user);

  if (filter === 'mine') {
    return { owner: userId };
  }

  if (filter === 'friends') {
    return {
      owner: { $in: friendIds },
      'accessList.userId': userId
    };
  }

  return {
    $or: [
      { owner: userId },
      { 'accessList.userId': userId }
    ]
  };
}

export function canViewMedia(user, media) {
  const userId = user._id;
  if (idsEqual(media.owner, userId)) {
    return true;
  }
  return (media.accessList || []).some((entry) => idsEqual(entry.userId, userId));
}

export function isListedFriend(user, otherId) {
  return (user.friends || []).some((friend) => idsEqual(friend.friendId, otherId));
}

export function canViewProfilePic(viewer, owner) {
  if (idsEqual(viewer._id, owner._id)) {
    return true;
  }
  return isListedFriend(viewer, owner._id) || isListedFriend(owner, viewer._id);
}

export function updateAccessList(ownerId, selectedFriendIds, allowedFriendIds) {
  const allowed = new Set((allowedFriendIds || []).map(String));
  const selected = (selectedFriendIds || [])
    .map(String)
    .filter((id) => allowed.has(id));
  const unique = new Set([String(ownerId), ...selected]);
  return [...unique].map((userId) => ({ userId }));
}

export function parseSearchNames(input) {
  return String(input || '')
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((name) => name.toLowerCase())
    .filter((name) => name && name !== 'and');
}
