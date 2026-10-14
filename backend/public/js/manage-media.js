document.addEventListener('DOMContentLoaded', main);

function main() {
    if (!document.getElementById('sharingModal')) {
        document.querySelectorAll('.edit-share').forEach((btn) => {
            btn.addEventListener('click', async () => {
                try {
                    const img = btn.closest('.media-item')?.querySelector('.media-image')
                        || btn.closest('.group')?.querySelector('.media-image');
                    if (!img) {
                        return;
                    }

                    const res = await fetch('/api/getNames', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: img.id })
                    });

                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }

                    const data = await res.json();
                    if (Array.isArray(data.friends)) {
                        const dialog = createShareDialog(data.friends, img.id, data.accessList || []);
                        document.body.appendChild(dialog);
                        dialog.showModal();
                        dialog.addEventListener('close', () => dialog.remove());
                    }
                } catch (error) {
                    console.error('Error handling share dialog:', error);
                }
            });
        });
    }

    const editFriendsBtn = document.querySelector('.edit-friends-list');
    if (editFriendsBtn) {
        editFriendsBtn.addEventListener('click', async () => {
            const res = await fetch('/api/editFriendsList', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json();
            const friends = Array.isArray(data.friends) ? data.friends : [];

            const dialog = document.createElement('dialog');
            dialog.className = 'edit-friend-list-dialog';
            dialog.innerHTML = `
                <h2>Edit Friends List</h2>
                <form method="dialog">
                    <div class="friends-list">
                        ${friends.map((friend) => `
                            <div class="friend-item">
                                <input type="checkbox" id="friend-${friend.friendId}" name="friends" value="${friend.friendId}">
                                <label for="friend-${friend.friendId}">${friend.name}</label>
                            </div>
                        `).join('')}
                    </div>
                    <div class="dialog-buttons">
                        <button type="submit" class="edit-confirm">Remove</button>
                        <button type="button" class="edit-cancel">Cancel</button>
                    </div>
                </form>
            `;

            document.body.appendChild(dialog);
            dialog.showModal();

            dialog.querySelector('.edit-confirm').addEventListener('click', async (e) => {
                e.preventDefault();
                const selectedIds = [...dialog.querySelectorAll('input:checked')].map((input) => input.value);
                const toBeRemoved = {};
                for (const id of selectedIds) {
                    toBeRemoved[id] = id;
                }

                try {
                    const response = await fetch('/api/removeFriends', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ toBeRemoved })
                    });
                    const result = await response.json();
                    if (response.ok) {
                        dialog.close();
                        window.location.reload();
                    } else {
                        alert(result.message || result.error);
                    }
                } catch (error) {
                    console.error('Error removing friends:', error);
                }
            });

            dialog.addEventListener('close', () => dialog.remove());
            dialog.querySelector('.edit-cancel').addEventListener('click', () => dialog.close());
        });
    }

    const changeKeyBtn = document.querySelector('.change-f-key');
    if (changeKeyBtn) {
        changeKeyBtn.addEventListener('click', async () => {
            const dialog = document.createElement('dialog');
            dialog.className = 'modify-f-key';
            dialog.innerHTML = `
                <h2>Change f-key</h2>
                <form method="dialog">
                    <div class="change-key-card">
                        <input type="text" name="change-id" id="change-id" placeholder="new f-key">
                    </div>
                    <div class="dialog-buttons">
                        <button type="submit" class="change-confirm">Change</button>
                        <button type="button" class="change-cancel">Cancel</button>
                    </div>
                </form>
            `;

            document.body.appendChild(dialog);
            dialog.showModal();

            dialog.querySelector('.change-cancel').addEventListener('click', () => dialog.remove());

            dialog.querySelector('.change-confirm').addEventListener('click', async (e) => {
                e.preventDefault();
                const newFKey = dialog.querySelector('#change-id').value;
                try {
                    const res = await fetch('/api/change-f-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newFKey })
                    });
                    const data = await res.json();
                    alert(data.msg);
                    dialog.remove();
                    window.location.reload();
                } catch (err) {
                    console.error(err);
                }
            });
        });
    }
}

function createShareDialog(friends, imageId, accessList) {
    const dialog = document.createElement('dialog');
    dialog.className = 'share-dialog';
    const allowed = new Set((accessList || []).map(String));

    dialog.innerHTML = `
        <h2>Share with Friends</h2>
        <form method="dialog">
            <div class="friends-list">
                ${friends.map((friend) => `
                    <div class="friend-item">
                        <input type="checkbox" id="share-${friend.friendId}" name="friends" value="${friend.friendId}" ${allowed.has(String(friend.friendId)) ? 'checked' : ''}>
                        <label for="share-${friend.friendId}">${friend.name}</label>
                    </div>
                `).join('')}
            </div>
            <div class="dialog-buttons">
                <button type="submit" class="share-confirm">Share</button>
                <button type="button" class="share-cancel">Cancel</button>
            </div>
        </form>
    `;

    dialog.querySelector('.share-cancel').addEventListener('click', () => dialog.close());

    dialog.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedFriends = [...dialog.querySelectorAll('input:checked')].map((input) => input.value);
        try {
            const response = await fetch('/api/shareImage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageId,
                    friends: selectedFriends
                })
            });
            if (response.ok) {
                dialog.close();
            }
        } catch (error) {
            console.error('Error sharing image:', error);
        }
    });

    return dialog;
}
