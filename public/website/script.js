document.addEventListener('DOMContentLoaded', () => {
    // Hide Loader
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
        }, 300);
    }

    // Navbar Scroll Shadow
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });

    // Theme Toggle (Dark/Light Mode)
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (!themeToggle) return;
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Mobile Navigation Drawer Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    mobileToggle?.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        navMenu?.classList.toggle('active');
    });

    // Back to Top Button
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTop?.classList.add('visible');
        } else {
            backToTop?.classList.remove('visible');
        }
    });

    backToTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Skill Bar Animation On Scroll
    const progressFills = document.querySelectorAll('.progress-fill');
    if (progressFills.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const width = entry.target.getAttribute('data-width') || '85%';
                    entry.target.style.width = width.trim() + '%';
                }
            });
        }, { threshold: 0.2 });

        progressFills.forEach(fill => observer.observe(fill));
    }

    // Portfolio Filter Tabs
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            portfolioItems.forEach(item => {
                const category = item.getAttribute('data-category')?.toLowerCase() || '';
                if (filterValue === 'all' || category.includes(filterValue.toLowerCase())) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Contact Form Validation
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            let isValid = true;
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');

            const nameError = document.getElementById('nameError');
            const emailError = document.getElementById('emailError');
            const messageError = document.getElementById('messageError');

            if (!nameInput.value.trim()) {
                if (nameError) nameError.style.display = 'block';
                isValid = false;
            } else {
                if (nameError) nameError.style.display = 'none';
            }

            if (!emailInput.value.trim() || !emailInput.value.includes('@')) {
                if (emailError) emailError.style.display = 'block';
                isValid = false;
            } else {
                if (emailError) emailError.style.display = 'none';
            }

            if (!messageInput.value.trim()) {
                if (messageError) messageError.style.display = 'block';
                isValid = false;
            } else {
                if (messageError) messageError.style.display = 'none';
            }

            if (!isValid) {
                e.preventDefault();
            }
        });
    }
});