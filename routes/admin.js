const express = require('express');
require('dotenv').config();
const router = express.Router();
const path = require('path');
const { pool, exe } = require('../config/db');

router.use(express.urlencoded({ extended: true }));

// Helper middleware for session protection
function session_check(req, res, next) {
    if (req.session && req.session.lid) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}

// Global enquiry & admin info middleware for admin templates
router.use(async (req, res, next) => {
    try {
        const pendingData = await exe(`SELECT COUNT(*) as count FROM enquiries WHERE status='pending'`);
        const acceptedData = await exe(`SELECT COUNT(*) as count FROM enquiries WHERE status='accepted'`);
        res.locals.enquiryPendingCount = pendingData[0]?.count || 0;
        res.locals.enquiryAcceptedCount = acceptedData[0]?.count || 0;
        res.locals.username = req.session?.username || 'Admin';
        next();
    } catch (err) {
        res.locals.enquiryPendingCount = 0;
        res.locals.enquiryAcceptedCount = 0;
        res.locals.username = 'Admin';
        next();
    }
});

// Auth Routes (Public to unauthenticated users)
router.get('/login', (req, res) => {
    if (req.session && req.session.lid) {
        return res.redirect('/admin');
    }
    res.render('admin/login');
});

router.post('/login_check', async (req, res) => {
    try {
        const { username, password } = req.body;
        const sql = `SELECT * FROM login WHERE username=? AND password=?`;
        const data = await exe(sql, [username, password]);

        if (data && data[0]) {
            req.session.lid = data[0].lid;
            req.session.username = data[0].username;
            res.redirect('/admin');
        } else {
            res.render('admin/login', { error: 'Invalid username or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.render('admin/login', { error: 'An unexpected error occurred' });
    }
});

router.get('/forgot', (req, res) => {
    res.render('admin/forgot');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// Protect all subsequent routes
router.use(session_check);

// Dashboard
router.get('/', async (req, res) => {
    res.redirect('/admin/dashboard');
});

router.get('/dashboard', async (req, res) => {
    try {
        const projectCount = (await exe(`SELECT COUNT(*) as count FROM project`))[0]?.count || 0;
        const blogCount = (await exe(`SELECT COUNT(*) as count FROM blog`))[0]?.count || 0;
        const skillCount = (await exe(`SELECT COUNT(*) as count FROM technical_skills`))[0]?.count || 0;
        const pendingEnquiries = (await exe(`SELECT COUNT(*) as count FROM enquiries WHERE status='pending'`))[0]?.count || 0;
        
        const recentEnquiries = await exe(`SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5`);
        const recentProjects = await exe(`SELECT * FROM project ORDER BY pr_id DESC LIMIT 5`);

        res.render('admin/dashboard', {
            projectCount,
            blogCount,
            skillCount,
            pendingEnquiries,
            recentEnquiries,
            recentProjects
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Hero Section
router.get('/edit_hero', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM hero LIMIT 1`);
        res.render('admin/update_hero', { hero: data[0] || {} });
    } catch (err) {
        res.status(500).send('Database error');
    }
});

router.post('/update_hero', async (req, res) => {
    try {
        const { hero_name, hero_role, hero_bio, old_pfp } = req.body;
        let imgname = old_pfp || '';

        if (req.files && req.files.hero_pfp) {
            const img = req.files.hero_pfp;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }

        const sql = `UPDATE hero SET name=?, role=?, bio=?, pfp=? WHERE hid=1`;
        await exe(sql, [hero_name, hero_role, hero_bio, imgname]);
        res.redirect('/admin/edit_hero');
    } catch (err) {
        console.error('Update hero error:', err);
        res.status(500).send('Failed to update Hero');
    }
});

// About Section
router.get('/edit_about', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM about LIMIT 1`);
        res.render('admin/update_about', { about: data[0] || {} });
    } catch (err) {
        res.status(500).send('Database error');
    }
});

router.post('/update_about', async (req, res) => {
    try {
        const { about_role, about_des, about_name, about_loc, about_email, old_pfp } = req.body;
        let imgname = old_pfp || '';

        if (req.files && req.files.about_pfp) {
            const img = req.files.about_pfp;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }

        const sql = `UPDATE about SET role=?, des=?, name=?, loc=?, email=?, image=? WHERE aid=1`;
        await exe(sql, [about_role, about_des, about_name, about_loc, about_email, imgname]);
        res.redirect('/admin/edit_about');
    } catch (err) {
        console.error('Update about error:', err);
        res.status(500).send('Failed to update About');
    }
});

// Skills Routes
router.get('/skill_add', (req, res) => {
    res.render('admin/skill_add');
});

router.post('/skill_add_save', async (req, res) => {
    try {
        const { tech_name, tech_per } = req.body;
        const sql = `INSERT INTO technical_skills(tech_name, tech_per) VALUES(?, ?)`;
        await exe(sql, [tech_name, tech_per]);
        res.redirect('/admin/skill_list');
    } catch (err) {
        res.status(500).send('Error adding skill');
    }
});

router.get('/skill_list', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM technical_skills ORDER BY ts_id DESC`);
        res.render('admin/skill_list', { skill: data });
    } catch (err) {
        res.status(500).send('Error fetching skills');
    }
});

router.get('/edit_skill/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM technical_skills WHERE ts_id=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/skill_list');
        res.render('admin/skill_edit', { skill: data[0] });
    } catch (err) {
        res.redirect('/admin/skill_list');
    }
});

router.post('/update_skill/:id', async (req, res) => {
    try {
        const { tech_name, tech_per } = req.body;
        await exe(`UPDATE technical_skills SET tech_name=?, tech_per=? WHERE ts_id=?`, [tech_name, tech_per, req.params.id]);
        res.redirect('/admin/skill_list');
    } catch (err) {
        res.status(500).send('Error updating skill');
    }
});

router.get('/delete_skill/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM technical_skills WHERE ts_id=?`, [req.params.id]);
        res.redirect('/admin/skill_list');
    } catch (err) {
        res.redirect('/admin/skill_list');
    }
});

// Experience Routes
router.get('/experience_add', (req, res) => {
    res.render('admin/experience_add');
});

router.post('/experience_add_save', async (req, res) => {
    try {
        const { exp_dur, exp_pos, exp_com, exp_des } = req.body;
        const sql = `INSERT INTO experience(exp_dur, exp_pos, exp_com, exp_des) VALUES(?, ?, ?, ?)`;
        await exe(sql, [exp_dur, exp_pos, exp_com, exp_des]);
        res.redirect('/admin/experience_list');
    } catch (err) {
        res.status(500).send('Error adding experience');
    }
});

router.get('/experience_list', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM experience ORDER BY eid DESC`);
        res.render('admin/experience_list', { experience: data });
    } catch (err) {
        res.status(500).send('Error fetching experience');
    }
});

router.get('/edit_experience/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM experience WHERE eid=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/experience_list');
        res.render('admin/experience_edit', { experience: data[0] });
    } catch (err) {
        res.redirect('/admin/experience_list');
    }
});

router.post('/update_experience/:id', async (req, res) => {
    try {
        const { exp_dur, exp_pos, exp_com, exp_des } = req.body;
        await exe(`UPDATE experience SET exp_dur=?, exp_pos=?, exp_com=?, exp_des=? WHERE eid=?`, [exp_dur, exp_pos, exp_com, exp_des, req.params.id]);
        res.redirect('/admin/experience_list');
    } catch (err) {
        res.status(500).send('Error updating experience');
    }
});

router.get('/delete_experience/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM experience WHERE eid=?`, [req.params.id]);
        res.redirect('/admin/experience_list');
    } catch (err) {
        res.redirect('/admin/experience_list');
    }
});

// Education Routes
router.get('/education_add', (req, res) => {
    res.render('admin/education_add');
});

router.post('/education_add_save', async (req, res) => {
    try {
        const { edu_dur, edu_deg, edu_coll } = req.body;
        const sql = `INSERT INTO education(edu_dur, edu_deg, edu_coll) VALUES(?, ?, ?)`;
        await exe(sql, [edu_dur, edu_deg, edu_coll]);
        res.redirect('/admin/education_list');
    } catch (err) {
        res.status(500).send('Error adding education');
    }
});

router.get('/education_list', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM education ORDER BY edu_id DESC`);
        res.render('admin/education_list', { education: data });
    } catch (err) {
        res.status(500).send('Error fetching education');
    }
});

router.get('/edit_education/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM education WHERE edu_id=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/education_list');
        res.render('admin/education_edit', { education: data[0] });
    } catch (err) {
        res.redirect('/admin/education_list');
    }
});

router.post('/update_education/:id', async (req, res) => {
    try {
        const { edu_dur, edu_deg, edu_coll } = req.body;
        await exe(`UPDATE education SET edu_dur=?, edu_deg=?, edu_coll=? WHERE edu_id=?`, [edu_dur, edu_deg, edu_coll, req.params.id]);
        res.redirect('/admin/education_list');
    } catch (err) {
        res.status(500).send('Error updating education');
    }
});

router.get('/delete_education/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM education WHERE edu_id=?`, [req.params.id]);
        res.redirect('/admin/education_list');
    } catch (err) {
        res.redirect('/admin/education_list');
    }
});

// Services Routes
router.get('/service_add', (req, res) => {
    res.render('admin/service_add');
});

router.post('/service_add_save', async (req, res) => {
    try {
        const { ser_ico, ser_nam, ser_des } = req.body;
        const sql = `INSERT INTO service(ser_ico, ser_nam, ser_des) VALUES(?, ?, ?)`;
        await exe(sql, [ser_ico, ser_nam, ser_des]);
        res.redirect('/admin/service_list');
    } catch (err) {
        res.status(500).send('Error adding service');
    }
});

router.get('/service_list', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM service ORDER BY ser_id DESC`);
        res.render('admin/service_list', { service: data });
    } catch (err) {
        res.status(500).send('Error fetching services');
    }
});

router.get('/edit_service/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM service WHERE ser_id=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/service_list');
        res.render('admin/service_edit', { service: data[0] });
    } catch (err) {
        res.redirect('/admin/service_list');
    }
});

router.post('/update_service/:id', async (req, res) => {
    try {
        const { ser_ico, ser_nam, ser_des } = req.body;
        await exe(`UPDATE service SET ser_ico=?, ser_nam=?, ser_des=? WHERE ser_id=?`, [ser_ico, ser_nam, ser_des, req.params.id]);
        res.redirect('/admin/service_list');
    } catch (err) {
        res.status(500).send('Error updating service');
    }
});

router.get('/delete_service/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM service WHERE ser_id=?`, [req.params.id]);
        res.redirect('/admin/service_list');
    } catch (err) {
        res.redirect('/admin/service_list');
    }
});

// Projects / Portfolio Routes
router.get('/project_add', (req, res) => {
    res.render('admin/project_add');
});

router.post('/project_add_save', async (req, res) => {
    try {
        const { pr_name, pr_cate } = req.body;
        let imgname = '';
        if (req.files && req.files.pr_photo) {
            const img = req.files.pr_photo;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }

        const sql = `INSERT INTO project (pr_name, pr_cate, pr_photo) VALUES (?, ?, ?)`;
        await exe(sql, [pr_name, pr_cate, imgname]);
        res.redirect('/admin/project_manage');
    } catch (err) {
        console.error('Project add error:', err);
        res.status(500).send('Error adding project');
    }
});

router.get('/project_manage', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM project ORDER BY pr_id DESC`);
        res.render('admin/project_manage', { project: data });
    } catch (err) {
        res.status(500).send('Error fetching projects');
    }
});

router.get('/edit_project/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM project WHERE pr_id=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/project_manage');
        res.render('admin/project_edit', { project: data[0] });
    } catch (err) {
        res.redirect('/admin/project_manage');
    }
});

router.post('/update_project/:id', async (req, res) => {
    try {
        const { pr_name, pr_cate, old_photo } = req.body;
        let imgname = old_photo || '';

        if (req.files && req.files.pr_photo) {
            const img = req.files.pr_photo;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }

        await exe(`UPDATE project SET pr_name=?, pr_cate=?, pr_photo=? WHERE pr_id=?`, [pr_name, pr_cate, imgname, req.params.id]);
        res.redirect('/admin/project_manage');
    } catch (err) {
        console.error('Update project error:', err);
        res.status(500).send('Error updating project');
    }
});

router.get('/delete_project/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM project WHERE pr_id=?`, [req.params.id]);
        res.redirect('/admin/project_manage');
    } catch (err) {
        res.redirect('/admin/project_manage');
    }
});

// Blog Routes
router.get('/blog_add', (req, res) => {
    res.render('admin/blog_add');
});

router.post('/blog_add_save', async (req, res) => {
    try {
        const { post_name, post_des } = req.body;
        let imgname = '';
        if (req.files && req.files.post_photo) {
            const img = req.files.post_photo;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }
        const formattedDate = new Date().toISOString().slice(0, 10);
        const sql = `INSERT INTO blog(post_name, post_des, post_photo, date) VALUES (?, ?, ?, ?)`;
        await exe(sql, [post_name, post_des, imgname, formattedDate]);
        res.redirect('/admin/blog_manage');
    } catch (err) {
        console.error('Blog add error:', err);
        res.status(500).send('Error adding blog post');
    }
});

router.get('/blog_manage', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM blog ORDER BY b_id DESC`);
        res.render('admin/blog_manage', { blog: data });
    } catch (err) {
        res.status(500).send('Error fetching blog posts');
    }
});

router.get('/edit_blog/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM blog WHERE b_id=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/blog_manage');
        res.render('admin/blog_edit', { blog: data[0] });
    } catch (err) {
        res.redirect('/admin/blog_manage');
    }
});

router.post('/update_blog/:id', async (req, res) => {
    try {
        const { post_name, post_des, old_photo } = req.body;
        let imgname = old_photo || '';

        if (req.files && req.files.post_photo) {
            const img = req.files.post_photo;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }

        await exe(`UPDATE blog SET post_name=?, post_des=?, post_photo=? WHERE b_id=?`, [post_name, post_des, imgname, req.params.id]);
        res.redirect('/admin/blog_manage');
    } catch (err) {
        console.error('Update blog error:', err);
        res.status(500).send('Error updating blog post');
    }
});

router.get('/delete_blog/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM blog WHERE b_id=?`, [req.params.id]);
        res.redirect('/admin/blog_manage');
    } catch (err) {
        res.redirect('/admin/blog_manage');
    }
});

// Testimonial Routes
router.get('/testimonials_add', (req, res) => {
    res.render('admin/testimonials_add');
});

router.post('/testimonials_add_save', async (req, res) => {
    try {
        const { ser_ico, ser_nam, ser_des } = req.body;
        const sql = `INSERT INTO testimonial (ser_ico, ser_nam, ser_des) VALUES (?, ?, ?)`;
        await exe(sql, [ser_ico, ser_nam, ser_des]);
        res.redirect('/admin/testimonials_list');
    } catch (err) {
        res.status(500).send('Error adding testimonial');
    }
});

router.get('/testimonials_list', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM testimonial ORDER BY t_id DESC`);
        res.render('admin/testimonials_list', { testimonial: data });
    } catch (err) {
        res.status(500).send('Error fetching testimonials');
    }
});

router.get('/edit_testimonial/:id', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM testimonial WHERE t_id=?`, [req.params.id]);
        if (!data[0]) return res.redirect('/admin/testimonials_list');
        res.render('admin/testimonial_edit', { testimonial: data[0] });
    } catch (err) {
        res.redirect('/admin/testimonials_list');
    }
});

router.post('/update_testimonial/:id', async (req, res) => {
    try {
        const { ser_ico, ser_nam, ser_des } = req.body;
        await exe(`UPDATE testimonial SET ser_ico=?, ser_nam=?, ser_des=? WHERE t_id=?`, [ser_ico, ser_nam, ser_des, req.params.id]);
        res.redirect('/admin/testimonials_list');
    } catch (err) {
        res.status(500).send('Error updating testimonial');
    }
});

router.get('/delete_testimonial/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM testimonial WHERE t_id=?`, [req.params.id]);
        res.redirect('/admin/testimonials_list');
    } catch (err) {
        res.redirect('/admin/testimonials_list');
    }
});

// Settings Routes
router.get('/settings', async (req, res) => {
    try {
        const contact = (await exe(`SELECT * FROM contact LIMIT 1`))[0] || {};
        const social = (await exe(`SELECT * FROM social LIMIT 1`))[0] || {};
        res.render('admin/settings', { contact, social });
    } catch (err) {
        res.status(500).send('Error loading settings');
    }
});

router.post('/contact_save', async (req, res) => {
    try {
        const { email, phone, address, map, old_logo } = req.body;
        let imgname = old_logo || '';

        if (req.files && req.files.logo) {
            const img = req.files.logo;
            imgname = Date.now() + '_' + img.name.replace(/\s+/g, '_');
            const imgpath = path.join(__dirname, '../public', imgname);
            await img.mv(imgpath);
        }

        const sql = `UPDATE contact SET email=?, phone=?, address=?, map=?, logo=? WHERE cid=1`;
        await exe(sql, [email, phone, address, map, imgname]);
        res.redirect('/admin/settings');
    } catch (err) {
        console.error('Save contact error:', err);
        res.status(500).send('Error saving contact settings');
    }
});

router.post('/social_save', async (req, res) => {
    try {
        const { facebook, twitter, instagram, linkedin, github, youtube } = req.body;
        const sql = `UPDATE social SET facebook=?, twitter=?, instagram=?, linkedin=?, github=?, youtube=? WHERE sid=1`;
        await exe(sql, [facebook, twitter, instagram, linkedin, github, youtube]);
        res.redirect('/admin/settings');
    } catch (err) {
        res.status(500).send('Error saving social links');
    }
});

// Enquiries Routes
router.get('/enquiries', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM enquiries WHERE status='pending' ORDER BY created_at DESC`);
        res.render('admin/enquiries', { enquiries: data });
    } catch (err) {
        res.status(500).send('Error fetching enquiries');
    }
});

router.get('/enquiries/accepted', async (req, res) => {
    try {
        const data = await exe(`SELECT * FROM enquiries WHERE status='accepted' ORDER BY created_at DESC`);
        res.render('admin/accepted_enquiries', { enquiries: data });
    } catch (err) {
        res.status(500).send('Error fetching accepted enquiries');
    }
});

router.get('/enquiries/accept/:id', async (req, res) => {
    try {
        await exe(`UPDATE enquiries SET status='accepted' WHERE id=?`, [req.params.id]);
        res.redirect('/admin/enquiries');
    } catch (err) {
        res.redirect('/admin/enquiries');
    }
});

router.get('/enquiries/reject/:id', async (req, res) => {
    try {
        await exe(`DELETE FROM enquiries WHERE id=?`, [req.params.id]);
        res.redirect('/admin/enquiries');
    } catch (err) {
        res.redirect('/admin/enquiries');
    }
});

module.exports = router;