
console.log("manage-media.js")

document.addEventListener('DOMContentLoaded',main)
function main(){
    // on click, show a list of users friends with a checkbox next to em
    const buttons = document.querySelectorAll('.edit-share')
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                const img = (btn.closest('.media-item')).querySelector('.media-image');
                
                const req = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'  
                    },
                    body : JSON.stringify({id: img.id})
                }

                const res = await fetch('/api/getNames', req);
                
                if (res.ok) {
                    const data = await res.json();
                    
                    if (data.friends && Array.isArray(data.friends)) {
                        const dialog = createShareDialog(data.friends, img.id);
                        document.body.appendChild(dialog);
                        dialog.showModal();
                        
                        // Remove dialog from DOM after it's closed
                        dialog.addEventListener('close', () => {
                            dialog.remove();
                        });
                    } else {
                        console.error('Invalid data format:', data);
                    }
                } else {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
            } catch (error) {
                console.error('Error handling share dialog:', error);
                // Optionally show user-friendly error message here
            }
        })
    })

    document.querySelector('.edit-friends-list').addEventListener('click', async () => {
        console.log('edit friends button clicked')
        // ask 
        const fID = document.querySelector('#fkey').innerHTML
        console.log("fID:", fID)

        const req = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userFID: fID
            })
        }
        const res = await fetch('/api/editFriendsList', req)
        const data = await res.json()
    
        console.log(data.friends)

        const names = data.friends ? (Array.isArray(data.friends) ? data.friends : Object.values(data.friends)) : []
        console.log("names: ", names)

        const dialog = document.createElement('dialog');
        dialog.className = 'edit-friend-list-dialog';

        dialog.innerHTML = `
            <h2>Edit Friends List</h2>
            <form method="dialog">
                <div class="friends-list">
                    ${names.map(name => `
                        <div class="friend-item">
                            <input type="checkbox" id="${name}" name="friends" value="${name}">
                            <label for="${name}">${name}</label>
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

        document.querySelector('.edit-confirm').addEventListener('click', async (e) =>{
            e.preventDefault();
            const form = dialog.querySelector('form');
            const selectedFriends = [...form.querySelectorAll('input:checked')].map(input => input.value);   
            const unselectedFriends = names.filter(name => !selectedFriends.includes(name));
            
            const toBeRemoved = {}
            for (const friend of selectedFriends){
                const id = Object.entries(data.friends).find(([key, value]) => value === friend)?.[0];
                toBeRemoved[id] = friend
            }
            console.log('toberemoved: ', toBeRemoved)

            try {
                const req = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        toBeRemoved: toBeRemoved,
                    })
                }
                const response = await fetch('/api/removeFriends', req);
                const data = await response.json();

                console.log(data)
                
                if (response.ok) {
                    dialog.close();
                    if (data.redirect) {
                        window.location.reload();
                    }
                }
                alert(data.message);
                
            } catch (error) {
                console.error('Error sharing image:', error);
            }


        })

        dialog.addEventListener('close', () => {
            dialog.remove();
        });
    
        const cancelBtn = dialog.querySelector('.edit-cancel');
        cancelBtn.addEventListener('click', () => {
            dialog.close();
        });
    })

    document.querySelector('.change-f-key').addEventListener('click', async () => {
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
    
    document.body.appendChild(dialog)
    dialog.showModal();

    const cancelBtn = dialog.querySelector('.change-cancel');

    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });    

    document.querySelector('.change-confirm').addEventListener('click', async () => {
        console.log('change-confirm got clicked')

        const newFKey = document.querySelector('#change-id').value;
        console.log('New f-key:', newFKey);

        try {
            const req = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newFKey: newFKey
                })
            }

            const res = await fetch('/api/change-f-key', req);
            const data = await res.json()

            alert(data.msg);
           

            setTimeout(() => {
                dialog.remove();
                window.location.reload();
            }, 100);

        }
        catch (err) {
            console.error( err);
        }
        
    })
    

    })
    
}

function createShareDialog(names, imageId) {
    const dialog = document.createElement('dialog');
    dialog.className = 'share-dialog';

    dialog.innerHTML = `
        <h2>Share with Friends</h2>
        <form method="dialog">
            <div class="friends-list">
                ${names.map(name => `
                    <div class="friend-item">
                        <input type="checkbox" id="${name}" name="friends" value="${name}">
                        <label for="${name}">${name}</label>
                    </div>
                `).join('')}
            </div>
            <div class="dialog-buttons">
                <button type="submit" class="share-confirm">Share</button>
                <button type="button" class="share-cancel">Cancel</button>
            </div>
        </form>
    `;

    const form = dialog.querySelector('form');
    const cancelBtn = dialog.querySelector('.share-cancel');

    cancelBtn.addEventListener('click', () => {
        dialog.close();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedFriends = [...form.querySelectorAll('input:checked')].map(input => input.value);   
        const unselectedFriends = names.filter(name => !selectedFriends.includes(name));
        console.log("unselectedFriends: ", unselectedFriends)
        try {
            const req = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageId: imageId,
                    friends: selectedFriends,
                    unselectedFriends: unselectedFriends
                })
            }
            const response = await fetch('/api/shareImage', req);
            
            if (response.ok) {
                dialog.close();
            }
        } catch (error) {
            console.error('Error sharing image:', error);
        }
    });

    return dialog;
}



