import { config } from './config.mjs';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import hbs from 'hbs';

import { connectDb } from './backend/db/db.mjs';
import indexRouter from './backend/routes/index.js';
import authRouter from './backend/routes/auth.js';
import mediaRouter from './backend/routes/media.js';
import apiRouter from './backend/routes/api.js';

config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = Boolean(process.env.VERCEL);

hbs.registerPartials(path.join(__dirname, 'backend/views/partials'));
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

app.set('views', path.join(__dirname, 'backend/views'));
app.set('view engine', 'hbs');
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'backend/public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'build-placeholder',
  resave: false,
  saveUninitialized: false,
  store: process.env.MONGODB_URI
    ? MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 60 * 60 * 24
      })
    : undefined,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isVercel || process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', mediaRouter);
app.use('/api', apiRouter);

app.use((err, req, res, next) => {
  console.error(err);

  if (req.path === '/login' || req.path === '/register') {
    const view = req.path === '/login' ? 'login' : 'register';
    return res.status(err.status || 400).render(view, {
      error: err.message,
      formData: req.body
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!'
  });
});

if (!isVercel) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
