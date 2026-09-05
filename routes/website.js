const express = require('express');
require('dotenv').config();
const router = express.Router();
const { pool, exe } = require('../config/db');

router.use(express.urlencoded({ extended: true }));

router.use(async (req, res, next) => {
    try {
        const heroData = await exe(`SELECT * FROM hero LIMIT 1`);
        const aboutData = await exe(`SELECT * FROM about LIMIT 1`);
        const contactData = await exe(`SELECT * FROM contact LIMIT 1`);
        const socialData = await exe(`SELECT * FROM social LIMIT 1`);

        res.locals.siteHero = heroData[0] || {};
        res.locals.siteAbout = aboutData[0] || {};
        res.locals.siteContact = contactData[0] || {};
        res.locals.siteSocial = socialData[0] || {};
        res.locals.currentPath = req.path;
        next();
    } catch (err) {
        console.error('Error fetching global site settings:', err);
        res.locals.siteHero = {};
        res.locals.siteAbout = {};
        res.locals.siteContact = {};
        res.locals.siteSocial = {};
        res.locals.currentPath = req.path;
        next();
    }
});

// Home Page
router.get('/', async (req, res) => {
    try {
        const hero = (await exe(`SELECT * FROM hero LIMIT 1`))[0] || {};
        const about = (await exe(`SELECT * FROM about LIMIT 1`))[0] || {};
        const skills = (await exe(`SELECT * FROM technical_skills LIMIT 6`)) || [];
        const services = (await exe(`SELECT * FROM service LIMIT 4`)) || [];
        const projects = (await exe(`SELECT * FROM project LIMIT 6`)) || [];
        const testimonials = (await exe(`SELECT * FROM testimonial LIMIT 5`)) || [];
        const blogs = (await exe(`SELECT * FROM blog LIMIT 3`)) || [];
        
        res.render('website/index', {
            hero,
            about,
            skills,
            services,
            projects,
            testimonials,
            blogs
        });
    } catch (err) {
        console.error('Home route error:', err.message);
        res.render('website/index', {
            hero: res.locals.siteHero || {},
            about: res.locals.siteAbout || {},
            skills: [],
            services: [],
            projects: [],
            testimonials: [],
            blogs: []
        });
    }
});

// About Page
router.get('/about', async (req, res) => {
    try {
        const about = (await exe(`SELECT * FROM about LIMIT 1`))[0] || {};
        const projectCount = (await exe(`SELECT COUNT(*) as count FROM project`))[0]?.count || 0;
        const skillCount = (await exe(`SELECT COUNT(*) as count FROM technical_skills`))[0]?.count || 0;
        const experienceCount = (await exe(`SELECT COUNT(*) as count FROM experience`))[0]?.count || 0;
        
        res.render('website/about', {
            about,
            stats: {
                projects: projectCount,
                skills: skillCount,
                experience: experienceCount || 1,
                clients: 15
            }
        });
    } catch (err) {
        console.error('About route error:', err.message);
        res.render('website/about', {
            about: res.locals.siteAbout || {},
            stats: { projects: 0, skills: 0, experience: 1, clients: 15 }
        });
    }
});

// Resume Page
router.get('/resume', async (req, res) => {
    try {
        const skill = (await exe(`SELECT * FROM technical_skills ORDER BY ts_id ASC`)) || [];
        const experience = (await exe(`SELECT * FROM experience ORDER BY eid DESC`)) || [];
        const edu = (await exe(`SELECT * FROM education ORDER BY edu_id DESC`)) || [];
        res.render('website/resume', { skill, experience, edu });
    } catch (err) {
        console.error('Resume route error:', err.message);
        res.render('website/resume', { skill: [], experience: [], edu: [] });
    }
});

// Services Page
router.get('/services', async (req, res) => {
    try {
        const service = (await exe(`SELECT * FROM service ORDER BY ser_id ASC`)) || [];
        res.render('website/services', { service });
    } catch (err) {
        console.error('Services route error:', err.message);
        res.render('website/services', { service: [] });
    }
});

// Testimonials Page
router.get('/testimonials', async (req, res) => {
    try {
        const test = (await exe(`SELECT * FROM testimonial ORDER BY t_id DESC`)) || [];
        res.render('website/testimonials', { test });
    } catch (err) {
        console.error('Testimonials route error:', err.message);
        res.render('website/testimonials', { test: [] });
    }
});

// Portfolio Page
router.get('/portfolio', async (req, res) => {
    try {
        const port = (await exe(`SELECT * FROM project ORDER BY pr_id DESC`)) || [];
        const categories = [...new Set(port.map(p => p.pr_cate).filter(Boolean))];
        res.render('website/portfolio', { port, categories });
    } catch (err) {
        console.error('Portfolio route error:', err.message);
        res.render('website/portfolio', { port: [], categories: [] });
    }
});

// Blog Page
router.get('/blog', async (req, res) => {
    try {
        const blog = (await exe(`SELECT * FROM blog ORDER BY b_id DESC`)) || [];
        res.render('website/blog', { blog });
    } catch (err) {
        console.error('Blog route error:', err.message);
        res.render('website/blog', { blog: [] });
    }
});

// Contact Page
router.get('/contact', async (req, res) => {
    try {
        const contact = (await exe(`SELECT * FROM contact LIMIT 1`))[0] || {};
        const successMessage = req.query.submitted ? 'Thank you! Your enquiry has been received successfully. We will respond shortly.' : null;
        res.render('website/contact', { contact, successMessage });
    } catch (err) {
        console.error('Contact route error:', err.message);
        res.render('website/contact', { contact: res.locals.siteContact || {}, successMessage: null });
    }
});

// Contact Form Submission
router.post('/contact_submit', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !message) {
            return res.redirect('/contact?error=missing_fields');
        }
        const sql = `INSERT INTO enquiries (name, email, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())`;
        await exe(sql, [name, email, subject || 'General Enquiry', message, 'pending']);
        res.redirect('/contact?submitted=1');
    } catch (err) {
        console.error('Contact submit error:', err);
        res.redirect('/contact?error=server_error');
    }
});

module.exports = router;