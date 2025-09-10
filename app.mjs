import { config } from './config.mjs';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './backend/db/db.mjs';
import dotenv from 'dotenv';
import session from 'express-session';
import hbs from 'hbs';

import indexRouter from './backend/routes/index.js';
import authRouter, { auth } from './backend/routes/auth.js';
import mediaRouter from './backend/routes/media.js';
import apiRouter from './backend/routes/api.js';

config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

hbs.registerPartials(path.join(__dirname, 'backend/views/partials'));
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

app.set('views', path.join(__dirname, 'backend/views'));
app.set('view engine', 'hbs');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'backend/public')));
app.use(express.static(path.join(__dirname, 'frontend/js')));
app.use(express.static(path.join(__dirname, 'frontend')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat', 
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', mediaRouter);
app.use('/api', apiRouter);



app.use((err, req, res, next) => {
  console.error(err);
  
  if (req.url.startsWith('/auth')) {
    const view = req.url.includes('login') ? 'login' : 'register';
    return res.status(err.status || 400).render(view, { 
      error: err.message,
      formData: req.body 
    });
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!'
  });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;