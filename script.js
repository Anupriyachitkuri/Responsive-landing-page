document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. FIXED HEADER SCROLL INTERACTION
       ========================================== */
    const navbar = document.getElementById('navbar');
    const scrollProgress = document.getElementById('scroll-progress');
    const scrollThreshold = 40; // Pixels to scroll before style changes

    function handleScroll() {
        const scrollY = window.scrollY;
        
        // Dynamic scroll header style adjustment
        if (scrollY > scrollThreshold) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Top scroll progress bar indicator calculation
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
            const progress = (scrollY / totalHeight) * 100;
            scrollProgress.style.width = `${progress}%`;
        }
    }

    // Bind scroll handler
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial run on load


    /* ==========================================
       2. RESPONSIVE MOBILE MENU INTERACTIONS
       ========================================== */
    const hamburgerToggle = document.getElementById('hamburger-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    function toggleMobileMenu() {
        const isOpen = hamburgerToggle.classList.contains('open');
        
        if (isOpen) {
            // Close menu
            hamburgerToggle.classList.remove('open');
            mobileMenuOverlay.classList.remove('open');
            hamburgerToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = ''; // Re-enable body scroll
        } else {
            // Open menu
            hamburgerToggle.classList.add('open');
            mobileMenuOverlay.classList.add('open');
            hamburgerToggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden'; // Block body scroll when open
        }
    }

    hamburgerToggle.addEventListener('click', toggleMobileMenu);

    // Close mobile menu when a nav link is selected
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburgerToggle.classList.contains('open')) {
                toggleMobileMenu();
            }
        });
    });


    /* ==========================================
       3. ACTIVE NAVIGATION LINK SYNCHRONIZATION
       ========================================== */
    const sections = document.querySelectorAll('section');
    const desktopLinks = document.querySelectorAll('.nav-link');

    // Use Intersection Observer to detect active viewport section
    const observerOptions = {
        root: null, // Viewport is the root
        rootMargin: '-30% 0px -60% 0px', // Shrink vertical bounds for trigger area
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.getAttribute('id');
                
                // Update desktop nav links
                desktopLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${activeId}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });

                // Update mobile nav links
                mobileLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${activeId}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });


    /* ==========================================
       4. ANIMATED STATISTICS COUNTER UPON VISIBILITY
       ========================================== */
    const statsSection = document.getElementById('about');
    const statNums = document.querySelectorAll('.stat-num');
    let animated = false;

    function animateStats(stats) {
        stats.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-val'), 10);
            const duration = 2000; // 2 seconds total animation time
            const stepTime = Math.abs(Math.floor(duration / target));
            let current = 0;
            
            const timer = setInterval(() => {
                current += 1;
                stat.textContent = current;
                if (current >= target) {
                    stat.textContent = target;
                    clearInterval(timer);
                }
            }, stepTime);
        });
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animateStats(statNums);
                animated = true; // Trigger animation once
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    if (statsSection) {
        statsObserver.observe(statsSection);
    }

});
