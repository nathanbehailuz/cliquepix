# CliquePix

CliquePix is a private photo sharing app for a close circle of friends. People connect with unique friend codes (f-keys). Each photo has an access list, so you choose who can see it.

## Data model

The app stores **Users** and **Media**.

- Each **User** has an `f_key` used to add friends, a hashed password, and a list of friends (`friendId`, nickname, and copied `f_key`).
- Each **Media** item has an `owner` and an `accessList` of users who may view it. Uploads are images. Files are stored under `/uploads/<filename>` and are only served to the owner or someone on that access list.

See [backend/db/db.mjs](backend/db/db.mjs) for the schema.

## Routes

- **`/`** — Landing page with links to login and register
- **`/register`** — Sign up with username, email, password, and optional profile photo
- **`/login`** — Log in with username and password
- **`/main-page`** — Feed of photos you own or that were shared with you. Filter by all / mine / friends, and search by friend name
- **`/create`** — Upload an image
- **`/add-friend`** — Add a friend by nickname and their f-key
- **`/profile`** — Your posts, friend list, and per-photo access
- **`POST /logout`** — End the session

Login uses **username** and password. Uploads are **images** (jpg, jpeg, png, gif, webp).

## Site map

- Landing → Login / Register
- Register → Login
- Login → Home (`/main-page`)
- Home → Create / Add a Friend / Profile
- Create, Add a Friend, and Profile link back to Home

## User stories

1. As a visitor, I can create an account with a username, email, and password.
2. As a user, I can log in with my username and password.
3. As a user, I can see my home feed: my photos and photos friends have shared with me.
4. As a user, I can upload photos on Create.
5. As a user, I can add a friend with their f-key.
6. As a user, I can filter the feed (all, mine, friends) and search by friend name.
7. As a user, I can open Profile and edit who can see each photo.
8. As a user, I can log out from the sidebar.

## Run

```bash
npm install
npm start
```

Requires `MONGODB_URI` and `SESSION_SECRET` in `.env`. Local uploads go in `uploads/`.

## Deploy on Vercel

The Express app is the Vercel Function (`app.mjs`). Photos are stored in a **private** Vercel Blob store and still served through `/uploads/...` after an access check. Sessions are stored in MongoDB.

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and copy the connection string. `localhost` will not work on Vercel.
2. In Vercel: import this repo (or run `npx vercel`), then **Storage → Create Database → Blob**, and choose **Private** access.
3. Set environment variables for Production and Preview:
   - `MONGODB_URI` — Atlas URI
   - `SESSION_SECRET` — a long random string
   - `BLOB_READ_WRITE_TOKEN` — added automatically when the Blob store is linked
4. Deploy:

```bash
npx vercel --prod
```

Face search loads TensorFlow on first use and can hit the function timeout on large libraries.

## Tests

```bash
npm test
```

Covers feed query rules and access-list updates (who can view a photo, and that unshare removes a friend while the owner stays on the list).
