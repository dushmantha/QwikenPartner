// Qwiken Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 70; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    });

    // Back to top button
    const backToTopButton = document.getElementById('backToTop');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });

    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    // Observe all feature cards, screenshot items, and other elements
    document.querySelectorAll('.feature-card, .screenshot-item, .about-feature, .contact-item').forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });

            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;

            // Send email via existing send-email Edge Function  
            fetch('https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0',
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlemRteHZxdXJjemVxbXF2Z3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODIyODAsImV4cCI6MjA2ODc1ODI4MH0.uVHCEmNjpbkjFtOkwb9ColGd1zORc5HdWvBygKPEkm0'
                },
                body: JSON.stringify({
                    to: 'admin@qwiken.org',
                    subject: `[Contact Form] ${formObject.subject} - from ${formObject.name}`,
                    type: 'contact_form',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
                                <div style="font-size: 40px;">🐝</div>
                                <h1 style="color: #1a2533; margin: 10px 0;">Qwiken Contact Form</h1>
                                <p style="color: #1a2533; margin: 0;">New Message Received</p>
                            </div>
                            <div style="padding: 30px;">
                                <h2 style="color: #1a2533;">Contact Details</h2>
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong>Name:</strong> ${formObject.name}</p>
                                    <p><strong>Email:</strong> <a href="mailto:${formObject.email}" style="color: #FFA500;">${formObject.email}</a></p>
                                    <p><strong>Subject:</strong> ${formObject.subject}</p>
                                    <p><strong>Message:</strong></p>
                                    <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #FFD700;">
                                        ${formObject.message.replace(/\n/g, '<br>')}
                                    </div>
                                </div>
                                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                                    <p style="color: #666; font-size: 14px; margin: 0;">
                                        📅 Received: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    showFormMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
                    
                    // Reset form
                    this.reset();
                } else {
                    // Show error message
                    showFormMessage(data.error || 'Failed to send message. Please try again.', 'error');
                }
                
                // Reset button
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            })
            .catch(error => {
                console.error('Error sending message:', error);
                showFormMessage('Failed to send message. Please try again.', 'error');
                
                // Reset button
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            });
        });
    }

    // Form message function
    function showFormMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageElement = document.createElement('div');
        messageElement.className = `form-message form-${type}`;
        messageElement.textContent = message;
        
        // Insert after form
        const form = document.getElementById('contactForm');
        form.parentNode.insertBefore(messageElement, form.nextSibling);

        // Remove message after 5 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    // Feature card hover effects
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Screenshot carousel functionality
    const screenshotItems = document.querySelectorAll('.screenshot-item');
    let currentScreenshot = 0;

    function showScreenshot(index) {
        screenshotItems.forEach((item, i) => {
            if (i === index) {
                item.style.transform = 'scale(1.05)';
                item.style.zIndex = '10';
            } else {
                item.style.transform = 'scale(1)';
                item.style.zIndex = '1';
            }
        });
    }

    // Auto-rotate screenshots every 3 seconds
    if (screenshotItems.length > 0) {
        setInterval(() => {
            currentScreenshot = (currentScreenshot + 1) % screenshotItems.length;
            showScreenshot(currentScreenshot);
        }, 3000);
    }

    // Phone mockup animation
    const phoneMockups = document.querySelectorAll('.phone-mockup');
    phoneMockups.forEach(mockup => {
        mockup.addEventListener('mouseenter', function() {
            this.style.transform = 'rotate(0deg) scale(1.05)';
        });

        mockup.addEventListener('mouseleave', function() {
            this.style.transform = 'rotate(-5deg) scale(1)';
        });
    });

    // Download button tracking
    document.querySelectorAll('.store-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const store = this.querySelector('img').alt.includes('App Store') ? 'ios' : 'android';
            
            // Analytics tracking (replace with your analytics code)
            console.log(`Download button clicked: ${store}`);
            
            // You can add actual app store links here
            if (store === 'ios') {
                // this.href = 'https://apps.apple.com/app/qwiken';
            } else {
                // this.href = 'https://play.google.com/store/apps/details?id=com.qwiken';
            }
        });
    });

    // Social media link tracking
    document.querySelectorAll('.social-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const platform = this.querySelector('i').className.split('-')[1];
            console.log(`Social link clicked: ${platform}`);
            
            // Add actual social media links here
            const socialLinks = {
                facebook: 'https://facebook.com/qwiken',
                twitter: 'https://twitter.com/qwiken',
                instagram: 'https://instagram.com/qwiken',
                linkedin: 'https://linkedin.com/company/qwiken'
            };
            
            if (socialLinks[platform]) {
                window.open(socialLinks[platform], '_blank');
            }
        });
    });

    // Typing animation for hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        };
        
        // Start typing animation after a short delay
        setTimeout(typeWriter, 500);
    }

    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroImage = document.querySelector('.hero-image');
        if (heroImage) {
            heroImage.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Statistics counter animation
    function animateCounters() {
        const counters = document.querySelectorAll('.stat h3, .about-stat h3');
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent.replace(/\D/g, ''));
            const suffix = counter.textContent.replace(/\d/g, '');
            
            let current = 0;
            const increment = target / 50;
            
            const updateCounter = () => {
                if (current < target) {
                    current += increment;
                    counter.textContent = Math.floor(current) + suffix;
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target + suffix;
                }
            };
            
            updateCounter();
        });
    }

    // Trigger counter animation when stats come into view
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    });

    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // Loading animation for images
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
        
        if (img.complete) {
            img.style.opacity = '1';
        }
    });

    // Error handling for missing images
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', function() {
            this.style.display = 'none';
            console.warn(`Failed to load image: ${this.src}`);
        });
    });

    // Preload critical images
    const criticalImages = [
        './icon.svg',
        './assets/images/app-screenshot-1.png'
    ];

    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    // Add fade-in animation to sections as they come into view
    const sectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });

    document.querySelectorAll('section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        sectionObserver.observe(section);
    });

    // Initialize tooltips for download info
    document.querySelectorAll('.download-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px)';
        });

        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });


    console.log('Qwiken website loaded successfully! 🚀');
});

