// ==========================================
// OLLY COHEN — ollycohen.com
// Main JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

  // NAV SCROLL EFFECT
  const nav = document.getElementById('nav');
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    nav.classList.toggle('nav--scrolled', scrollY > 50);
    lastScroll = scrollY;
  });

  // MOBILE NAV TOGGLE
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });
    // Close on link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }

  // SCROLL REVEAL
  const reveals = document.querySelectorAll('.section, .adventure-card, .blog-card, .stat, .impact-card, .sponsor-card, .timeline__item, .faq-item, .blog-list__item');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.05}s, transform 0.6s ease ${i * 0.05}s`;
    revealObserver.observe(el);
  });

  // Expose for dynamically-loaded content (Supabase pages)
  window.observeReveal = function (el, delay) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease ' + (delay || 0) + 's, transform 0.6s ease ' + (delay || 0) + 's';
    revealObserver.observe(el);
  };

  // COUNTER ANIMATION
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'));
        animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  function animateCounter(el, target) {
    const duration = 2000;
    const start = performance.now();
    const format = (n) => n >= 1000 ? n.toLocaleString() : n;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = format(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // SMOOTH ANCHOR SCROLLING
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});

// ==========================================
// VIDEO MODAL (available globally for adventure pages)
// ==========================================
function openVideoModal(youtubeId) {
  var modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML =
    '<div class="video-modal__inner">' +
      '<button class="video-modal__close" aria-label="Close">&times;</button>' +
      '<iframe src="https://www.youtube.com/embed/' + youtubeId + '?autoplay=1&rel=0" ' +
        'allowfullscreen allow="autoplay; encrypted-media"></iframe>' +
    '</div>';

  function close() { modal.remove(); }

  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });
  modal.querySelector('.video-modal__close').addEventListener('click', close);
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
  });

  document.body.appendChild(modal);
}
