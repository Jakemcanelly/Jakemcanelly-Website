/**
 * jakemcanelly.com — script.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Powers:
 *  1. Reading progress bar
 *  2. Nav scroll state (.scrolled)
 *  3. Mobile hamburger menu toggle
 *  4. Scroll-reveal (IntersectionObserver) — .reveal + .reveal-group
 *  5. Active nav-link scrollspy
 *  6. Contact form handler with success state
 *  7. Smooth scroll for all anchor links
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ─── Utilities ─────────────────────────────────────────────────────────────── */

/**
 * Throttle a function so it fires at most once per `limit` ms.
 * Used to keep scroll handlers from running every pixel.
 */
function throttle(fn, limit = 16) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/* ─── 1. Reading Progress Bar ────────────────────────────────────────────────
 *
 * A thin bar at the very top of the page that fills left→right as the user
 * scrolls through the document.  The bar element lives in index.html as:
 *   <div id="progress-bar"></div>
 */
(function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;

  function updateBar() {
    const scrollTop  = window.scrollY || document.documentElement.scrollTop;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width  = `${Math.min(pct, 100)}%`;
  }

  window.addEventListener('scroll', throttle(updateBar), { passive: true });
  updateBar(); // set initial state
})();


/* ─── 2. Nav Scroll State ────────────────────────────────────────────────────
 *
 * Adds / removes the `.scrolled` class on <nav> so CSS can switch between
 * a transparent hero-overlay nav and a frosted-glass background once the
 * user has scrolled past the fold.
 *
 * Threshold: 60 px (enough to clear the nav's own height).
 */
(function initNavScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const THRESHOLD = 60;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > THRESHOLD);
  }

  window.addEventListener('scroll', throttle(updateNav), { passive: true });
  updateNav();
})();


/* ─── 3. Mobile Hamburger Menu ───────────────────────────────────────────────
 *
 * Toggles .open on both #menu-btn and #mobile-nav.
 * When open: hamburger spans rotate into an ✕, the full-screen overlay appears.
 * aria-expanded is kept in sync for accessibility.
 *
 * Clicking any link inside the mobile nav also closes it.
 */
(function initMobileMenu() {
  const menuBtn   = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!menuBtn || !mobileNav) return;

  function openMenu() {
    menuBtn.classList.add('open');
    mobileNav.classList.add('open');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  function closeMenu() {
    menuBtn.classList.remove('open');
    mobileNav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    menuBtn.classList.contains('open') ? closeMenu() : openMenu();
  }

  menuBtn.addEventListener('click', toggleMenu);

  // Close when any mobile nav link is tapped
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();


/* ─── 4. Scroll Reveal ───────────────────────────────────────────────────────
 *
 * Two patterns:
 *
 *   .reveal          → single element fades / slides up when it enters the
 *                       viewport.  CSS handles the animation; JS just adds .in.
 *
 *   .reveal-group    → wrapper whose *direct children* stagger in one by one.
 *                       nth-child transition-delays are set in CSS (0s, 0.07s,
 *                       0.14s … ) so JS only needs to add .in to each child.
 *
 * rootMargin "-10% 0px" means the element must be 10 % into the viewport
 * before triggering — prevents elements right at the edge from popping in.
 */
(function initScrollReveal() {
  // --- single reveals ---
  const revealEls = document.querySelectorAll('.reveal');

  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target); // fire once
          }
        });
      },
      { rootMargin: '-10% 0px', threshold: 0 }
    );

    revealEls.forEach(el => revealObserver.observe(el));
  }

  // --- staggered group reveals ---
  const groupEls = document.querySelectorAll('.reveal-group');

  if (groupEls.length) {
    const groupObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Stagger each direct child
            Array.from(entry.target.children).forEach(child => {
              child.classList.add('in');
            });
            groupObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '-8% 0px', threshold: 0 }
    );

    groupEls.forEach(el => groupObserver.observe(el));
  }
})();


/* ─── 5. Active Nav-Link Scrollspy ──────────────────────────────────────────
 *
 * Highlights the nav link whose section is currently most visible in the
 * viewport.  Uses a second IntersectionObserver watching each <section> with
 * an id.
 *
 * The "active" section is the last one whose observer entry reported
 * isIntersecting = true, so as the user scrolls down the active link
 * advances naturally.
 */
(function initScrollspy() {
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  if (!navLinks.length) return;

  // Build a map: sectionId → nav link element
  const linkMap = {};
  navLinks.forEach(link => {
    const id = link.getAttribute('href').slice(1);
    linkMap[id] = link;
  });

  const sections = document.querySelectorAll('section[id], div[id]');

  let currentId = null;

  function setActive(id) {
    if (id === currentId) return;
    currentId = id;
    navLinks.forEach(l => l.classList.remove('active'));
    if (linkMap[id]) linkMap[id].classList.add('active');
  }

  const spyObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    {
      rootMargin: '-40% 0px -55% 0px', // trigger when section centre crosses mid-screen
      threshold: 0,
    }
  );

  sections.forEach(sec => {
    if (linkMap[sec.id]) spyObserver.observe(sec);
  });
})();


/* ─── 6. Contact Form Handler ────────────────────────────────────────────────
 *
 * Validates name, email, and message fields on submit.
 * On success: hides the form, shows #form-success.
 *
 * This is a front-end-only handler — wire up an actual backend (Formspree,
 * Cloudflare Workers, etc.) by replacing the setTimeout block below.
 *
 * Fields expected:
 *   #contact-form, input[name="name"], input[name="email"],
 *   textarea[name="message"], #form-success
 */
(function initContactForm() {
  const form        = document.getElementById('contact-form');
  const successMsg  = document.getElementById('form-success');
  if (!form) return;

  // Simple email-format check
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(field, msg) {
    field.classList.add('error');
    let hint = field.nextElementSibling;
    if (!hint || !hint.classList.contains('field-hint')) {
      hint = document.createElement('span');
      hint.className = 'field-hint';
      field.insertAdjacentElement('afterend', hint);
    }
    hint.textContent = msg;
    hint.style.display = 'block';
  }

  function clearError(field) {
    field.classList.remove('error');
    const hint = field.nextElementSibling;
    if (hint && hint.classList.contains('field-hint')) {
      hint.style.display = 'none';
    }
  }

  function validate(name, email, message) {
    let valid = true;
    if (!name.value.trim()) {
      setError(name, 'Please enter your name.');
      valid = false;
    } else {
      clearError(name);
    }
    if (!emailRe.test(email.value.trim())) {
      setError(email, 'Please enter a valid email address.');
      valid = false;
    } else {
      clearError(email);
    }
    if (!message.value.trim()) {
      setError(message, 'Please write a message.');
      valid = false;
    } else {
      clearError(message);
    }
    return valid;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name    = form.querySelector('[name="name"]');
    const email   = form.querySelector('[name="email"]');
    const message = form.querySelector('[name="message"]');

    if (!validate(name, email, message)) return;

    // ── Replace this block with your real form submission logic ──────────────
    // Example using Formspree:
    //   fetch('https://formspree.io/f/YOUR_FORM_ID', {
    //     method: 'POST',
    //     headers: { 'Accept': 'application/json' },
    //     body: new FormData(form),
    //   }).then(() => showSuccess()).catch(() => alert('Something went wrong.'));
    //
    // For now: simulate a brief network delay, then show success.
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled   = true;
      submitBtn.textContent = 'Sending…';
    }

    setTimeout(() => {
      form.style.display    = 'none';
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 800);
    // ─────────────────────────────────────────────────────────────────────────
  });

  // Clear error styling on input so users get instant feedback
  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('input', () => clearError(field));
  });
})();


/* ─── 7. Smooth Scroll ───────────────────────────────────────────────────────
 *
 * Intercepts clicks on any <a href="#…"> link and scrolls smoothly to the
 * target element, offsetting by the nav height so the section heading is
 * never hidden behind the sticky nav bar.
 */
(function initSmoothScroll() {
  const nav = document.getElementById('nav');

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href').slice(1);
    if (!targetId) return; // bare "#" links — skip

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const navHeight = nav ? nav.offsetHeight : 0;
    const top       = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;

    window.scrollTo({ top, behavior: 'smooth' });
  });
})();
