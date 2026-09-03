require('dotenv').config();
const { pool, exe } = require('./config/db');
const express = require('express');
const fileupload = require('express-fileupload');
const session = require('express-session');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileupload());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'yashparkhe_portfolio_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

const webrouter = require('./routes/website');
const adminrouter = require('./routes/admin');

app.use('/', webrouter);
app.use('/admin', adminrouter);

// 404 Handler
app.use((req, res) => {
    res.status(404).render('website/index', { error: 'Page not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
