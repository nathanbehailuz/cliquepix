import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { feedQuery, canViewMedia, updateAccessList } from './access.mjs';

const ownerId = 'owner1';
const friendA = 'friendA';
const friendB = 'friendB';
const user = { _id: ownerId, friends: [{ friendId: friendA }] };

describe('feedQuery', () => {
  it('all includes owner or accessList', () => {
    assert.deepEqual(feedQuery(user, 'all'), {
      $or: [
        { owner: ownerId },
        { 'accessList.userId': ownerId }
      ]
    });
  });

  it('mine is owner only', () => {
    assert.deepEqual(feedQuery(user, 'mine'), { owner: ownerId });
  });

  it('friends requires a friend owner and the viewer on the access list', () => {
    assert.deepEqual(feedQuery(user, 'friends'), {
      owner: { $in: [friendA] },
      'accessList.userId': ownerId
    });
  });
});

describe('canViewMedia', () => {
  const media = {
    owner: ownerId,
    accessList: [{ userId: ownerId }, { userId: friendA }]
  };

  it('owner can view', () => {
    assert.equal(canViewMedia({ _id: ownerId }, media), true);
  });

  it('listed friend can view', () => {
    assert.equal(canViewMedia({ _id: friendA }, media), true);
  });

  it('friend who was not shared cannot view', () => {
    assert.equal(canViewMedia({ _id: friendB }, media), false);
  });
});

describe('updateAccessList', () => {
  it('unshare removes that id and the owner stays on the list', () => {
    const shared = updateAccessList(ownerId, [friendA, friendB], [friendA, friendB]);
    assert.deepEqual(
      shared.map((entry) => entry.userId),
      [ownerId, friendA, friendB]
    );

    const unshared = updateAccessList(ownerId, [friendA], [friendA, friendB]);
    const ids = unshared.map((entry) => entry.userId);
    assert.ok(ids.includes(ownerId));
    assert.ok(ids.includes(friendA));
    assert.equal(ids.includes(friendB), false);
  });
});
