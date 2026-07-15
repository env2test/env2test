(function () {
  'use strict';

  // Mobile navigation toggle
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Ouvrir le menu');
      });
    });
  }

  // Fixed header: transparent at the top, solid once scrolled
  var siteHeader = document.getElementById('siteHeader');
  if (siteHeader) {
    var updateHeaderState = function () {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Benefit list hover-swap: size each title/paragraph slot to fit the taller of
  // the two, so wrapped text (narrow viewports) never gets clipped by the
  // fixed-height reveal container.
  var benefitContents = document.querySelectorAll('.benefit-list__content');
  if (benefitContents.length) {
    var sizeBenefitSlots = function () {
      benefitContents.forEach(function (content) {
        var h3 = content.querySelector('h3');
        var p = content.querySelector('p');
        if (!h3 || !p) { return; }
        var slotHeight = Math.max(h3.scrollHeight, p.scrollHeight);
        content.style.height = slotHeight + 'px';
        h3.style.height = slotHeight + 'px';
        p.style.height = slotHeight + 'px';
      });
    };
    sizeBenefitSlots();
    window.addEventListener('resize', sizeBenefitSlots);

    // Safari can render this before the custom webfonts finish loading,
    // measuring slot heights against fallback-font metrics and leaving the
    // title/paragraph overlapping until the next reflow. Recompute once the
    // real fonts are in.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sizeBenefitSlots);
    }
  }

  // Videos marked [data-autoplay-inview] start playing once their section
  // scrolls into view, and pause again once it scrolls out (saves resources,
  // avoids autoplaying every background video on page load).
  var inviewVideos = document.querySelectorAll('[data-autoplay-inview]');
  if (inviewVideos.length && 'IntersectionObserver' in window) {
    var inviewObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.play().catch(function () {});
        } else {
          entry.target.pause();
        }
      });
    }, { threshold: 0.4 });
    inviewVideos.forEach(function (video) {
      inviewObserver.observe(video);
    });
  }

  // Video banner placeholder interaction
  var videoBanner = document.querySelector('.video-banner');
  if (videoBanner) {
    videoBanner.addEventListener('click', function () {
      videoBanner.dispatchEvent(new CustomEvent('play-requested'));
    });
  }

  // Video showcase & specialty marquee: duplicate each row for a seamless scroll loop
  document.querySelectorAll('.video-row__track, .specialty-marquee__track').forEach(function (track) {
    track.insertAdjacentHTML('beforeend', track.innerHTML);
  });

  // Mobile only: let the auto-scrolling showreel rows be dragged with a
  // finger. Releasing resumes the same continuous auto-scroll from wherever
  // the drag left it, rather than the CSS animation snapping back to its own
  // timeline. Desktop keeps the plain CSS animation untouched.
  if (window.matchMedia('(max-width: 780px)').matches) {
    document.querySelectorAll('.video-row__track').forEach(function (track) {
      var direction = track.closest('.video-row--right') ? 1 : -1;
      var halfWidth = track.scrollWidth / 2;
      if (!halfWidth) { return; }
      var speed = halfWidth / 60000; // px/ms — matches the 60s CSS animation it replaces
      var pos = direction === -1 ? 0 : -halfWidth;
      var dragging = false;
      var startX = 0;
      var startPos = 0;
      var lastTime = null;

      track.style.animation = 'none';
      track.classList.add('video-row__track--dragscroll');

      function wrap() {
        pos = pos % halfWidth;
        if (pos > 0) { pos -= halfWidth; }
      }

      function apply() {
        track.style.transform = 'translateX(' + pos + 'px)';
      }

      function tick(time) {
        if (!dragging) {
          if (lastTime !== null) {
            pos += direction * speed * (time - lastTime);
            wrap();
            apply();
          }
          lastTime = time;
        } else {
          lastTime = null;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      apply();

      track.addEventListener('touchstart', function (e) {
        dragging = true;
        startX = e.touches[0].clientX;
        startPos = pos;
      }, { passive: true });

      track.addEventListener('touchmove', function (e) {
        pos = startPos + (e.touches[0].clientX - startX);
        wrap();
        apply();
      }, { passive: true });

      track.addEventListener('touchend', function () {
        dragging = false;
      });
    });
  }

  // Video showcase: hover to preview (video is created on demand, not kept in the DOM),
  // click to watch the full clip in a modal. Avoids holding dozens of <video> layers at rest.
  var videoModal = document.getElementById('videoModal');
  var videoModalPlayer = document.getElementById('videoModalPlayer');

  document.querySelectorAll('.video-card').forEach(function (card) {
    var poster = card.querySelector('.video-card__media');
    var videoSrc = card.getAttribute('data-video');
    var preview = null;
    var hoverTimer = null;

    card.addEventListener('mouseenter', function () {
      if (preview) { return; }
      hoverTimer = window.setTimeout(function () {
        preview = document.createElement('video');
        preview.className = 'video-card__media video-card__media--preview';
        preview.muted = true;
        preview.loop = true;
        preview.playsInline = true;
        preview.preload = 'auto';
        preview.src = videoSrc;
        card.insertBefore(preview, poster.nextSibling);
        preview.play().catch(function () {});
      }, 120);
    });

    card.addEventListener('mouseleave', function () {
      window.clearTimeout(hoverTimer);
      if (preview) {
        preview.pause();
        preview.remove();
        preview = null;
      }
    });

    card.addEventListener('click', function () {
      if (!videoModal || !videoModalPlayer) { return; }
      if (preview) { preview.pause(); }
      videoModalPlayer.poster = poster ? poster.getAttribute('src') : '';
      videoModalPlayer.src = videoSrc;
      videoModalPlayer.muted = false;
      videoModal.classList.add('is-open');
      videoModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      videoModalPlayer.play().catch(function () {});
    });
  });

  var closeVideoModal = function () {
    if (!videoModal || !videoModalPlayer) { return; }
    videoModalPlayer.pause();
    videoModalPlayer.removeAttribute('src');
    videoModalPlayer.load();
    videoModal.classList.remove('is-open');
    videoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (videoModal) {
    videoModal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeVideoModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && videoModal.classList.contains('is-open')) {
        closeVideoModal();
      }
    });
  }

  // Studio photo carousels: chevrons appear on hover, click opens an enlarged
  // carousel modal. Each carousel auto-hides its nav/dots when it only has one
  // slide, so adding more <img> tags later "just works" with no code changes.
  function buildDots(container, count, activeIndex, onSelect) {
    container.innerHTML = '';
    if (count <= 1) { return; }
    for (var i = 0; i < count; i++) {
      var dot = document.createElement('span');
      if (i === activeIndex) { dot.className = 'is-active'; }
      dot.addEventListener('click', (function (idx) {
        return function (e) { e.stopPropagation(); onSelect(idx); };
      })(i));
      container.appendChild(dot);
    }
  }

  // Swipe-to-navigate for any carousel: pass the element to watch and the
  // callbacks to run on a left/right swipe. Returns a `wasSwipe()` check so
  // callers can suppress a click that immediately follows a swipe gesture
  // (mobile fires a synthetic click on touchend).
  function addSwipeSupport(el, onSwipeLeft, onSwipeRight) {
    var startX = 0;
    var startY = 0;
    var tracking = false;
    var swiped = false;

    el.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
      swiped = false;
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!tracking) { return; }
      var t = e.touches[0];
      if (Math.abs(t.clientX - startX) > Math.abs(t.clientY - startY) && Math.abs(t.clientX - startX) > 10) {
        swiped = true;
      }
    }, { passive: true });

    el.addEventListener('touchend', function (e) {
      if (!tracking) { return; }
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      if (Math.abs(dx) > 40) {
        if (dx < 0) { onSwipeLeft(); } else { onSwipeRight(); }
      }
    });

    return { wasSwipe: function () { return swiped; } };
  }

  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var track = carousel.querySelector('.studio-carousel__track');
    var images = Array.prototype.slice.call(track.querySelectorAll('img'));
    var dotsEl = carousel.querySelector('.studio-carousel__dots');
    var prevBtn = carousel.querySelector('.studio-carousel__nav--prev');
    var nextBtn = carousel.querySelector('.studio-carousel__nav--next');
    var index = 0;

    if (images.length <= 1) { carousel.classList.add('is-single'); }

    function render() {
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      buildDots(dotsEl, images.length, index, function (i) { index = i; render(); });
    }
    render();

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        index = (index - 1 + images.length) % images.length;
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        index = (index + 1) % images.length;
        render();
      });
    }

    var swipe = addSwipeSupport(carousel, function () {
      index = (index + 1) % images.length;
      render();
    }, function () {
      index = (index - 1 + images.length) % images.length;
      render();
    });

    carousel.addEventListener('click', function () {
      if (swipe.wasSwipe()) { return; }
      openStudioModal(
        images.map(function (img) { return img.getAttribute('src'); }),
        images.map(function (img) { return img.getAttribute('alt'); }),
        index,
        carousel.getAttribute('data-title') || ''
      );
    });
  });

  var studioModal = document.getElementById('studioModal');
  var studioModalTrack = document.getElementById('studioModalTrack');
  var studioModalDots = document.getElementById('studioModalDots');
  var studioModalTitle = document.getElementById('studioModalTitle');
  var studioModalPrev = document.getElementById('studioModalPrev');
  var studioModalNext = document.getElementById('studioModalNext');
  var studioModalImages = [];
  var studioModalIndex = 0;

  function renderStudioModal() {
    studioModalTrack.style.transform = 'translateX(-' + (studioModalIndex * 100) + '%)';
    buildDots(studioModalDots, studioModalImages.length, studioModalIndex, function (i) {
      studioModalIndex = i;
      renderStudioModal();
    });
    var single = studioModalImages.length <= 1;
    studioModalPrev.style.display = single ? 'none' : '';
    studioModalNext.style.display = single ? 'none' : '';
  }

  function openStudioModal(srcs, alts, startIndex, title) {
    if (!studioModal) { return; }
    studioModalImages = srcs;
    studioModalIndex = startIndex || 0;
    studioModalTrack.innerHTML = '';
    srcs.forEach(function (src, i) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = alts[i] || '';
      studioModalTrack.appendChild(img);
    });
    studioModalTitle.textContent = title;
    renderStudioModal();
    studioModal.classList.add('is-open');
    studioModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeStudioModal() {
    if (!studioModal) { return; }
    studioModal.classList.remove('is-open');
    studioModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (studioModal) {
    studioModal.querySelectorAll('[data-studio-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeStudioModal);
    });
    studioModalPrev.addEventListener('click', function () {
      studioModalIndex = (studioModalIndex - 1 + studioModalImages.length) % studioModalImages.length;
      renderStudioModal();
    });
    studioModalNext.addEventListener('click', function () {
      studioModalIndex = (studioModalIndex + 1) % studioModalImages.length;
      renderStudioModal();
    });
    document.addEventListener('keydown', function (e) {
      if (!studioModal.classList.contains('is-open')) { return; }
      if (e.key === 'Escape') { closeStudioModal(); }
      if (e.key === 'ArrowLeft') { studioModalPrev.click(); }
      if (e.key === 'ArrowRight') { studioModalNext.click(); }
    });
    addSwipeSupport(document.getElementById('studioModalCarousel'), function () {
      studioModalNext.click();
    }, function () {
      studioModalPrev.click();
    });
  }

  // Equipment gallery: clicking any equipment photo opens a full carousel of
  // all the gear (including shots not shown as cards on the page), with the
  // equipment name displayed under the active photo.
  var EQUIPMENT_ITEMS = [
    { src: 'assets/img/cam-blackmagic-1.png', alt: 'Caméras Blackmagic Cinema en studio', name: 'Caméras Blackmagic Cinema' },
    { src: 'assets/img/cam-blackmagic-2.png', alt: 'Caméras Blackmagic Cinema en studio', name: 'Caméras Blackmagic Cinema' },
    { src: 'assets/img/cam6K-1.png', alt: 'Caméra cinéma 6K en studio', name: 'Caméra cinéma 6K' },
    { src: 'assets/img/cam6K-2.png', alt: 'Caméra cinéma 6K en studio', name: 'Caméra cinéma 6K' },
    { src: 'assets/img/camera-prompteur.png', alt: 'Système prompteur professionnel', name: 'Système Prompteur Professionnel' },
    { src: 'assets/img/micro-rode.png', alt: 'Microphone Rode professionnel', name: 'Micro Rode' },
    { src: 'assets/img/micro-shure.png', alt: 'Microphone Shure professionnel', name: 'Micro Shure' }
  ];

  var equipmentModal = document.getElementById('equipmentModal');
  var equipmentModalTrack = document.getElementById('equipmentModalTrack');
  var equipmentModalDots = document.getElementById('equipmentModalDots');
  var equipmentModalTitle = document.getElementById('equipmentModalTitle');
  var equipmentModalPrev = document.getElementById('equipmentModalPrev');
  var equipmentModalNext = document.getElementById('equipmentModalNext');
  var equipmentModalIndex = 0;

  function renderEquipmentModal() {
    equipmentModalTrack.style.transform = 'translateX(-' + (equipmentModalIndex * 100) + '%)';
    buildDots(equipmentModalDots, EQUIPMENT_ITEMS.length, equipmentModalIndex, function (i) {
      equipmentModalIndex = i;
      renderEquipmentModal();
    });
    equipmentModalTitle.textContent = EQUIPMENT_ITEMS[equipmentModalIndex].name;
  }

  function openEquipmentModal(startIndex) {
    if (!equipmentModal) { return; }
    equipmentModalIndex = startIndex || 0;
    equipmentModalTrack.innerHTML = '';
    EQUIPMENT_ITEMS.forEach(function (item) {
      var img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt;
      equipmentModalTrack.appendChild(img);
    });
    renderEquipmentModal();
    equipmentModal.classList.add('is-open');
    equipmentModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeEquipmentModal() {
    if (!equipmentModal) { return; }
    equipmentModal.classList.remove('is-open');
    equipmentModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.equipment-card[data-equipment-src]').forEach(function (card) {
    var openFromCard = function () {
      var src = card.getAttribute('data-equipment-src');
      var idx = EQUIPMENT_ITEMS.findIndex(function (item) { return item.src === src; });
      openEquipmentModal(idx === -1 ? 0 : idx);
    };
    card.addEventListener('click', openFromCard);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFromCard(); }
    });
  });

  if (equipmentModal) {
    equipmentModal.querySelectorAll('[data-equipment-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeEquipmentModal);
    });
    equipmentModalPrev.addEventListener('click', function () {
      equipmentModalIndex = (equipmentModalIndex - 1 + EQUIPMENT_ITEMS.length) % EQUIPMENT_ITEMS.length;
      renderEquipmentModal();
    });
    equipmentModalNext.addEventListener('click', function () {
      equipmentModalIndex = (equipmentModalIndex + 1) % EQUIPMENT_ITEMS.length;
      renderEquipmentModal();
    });
    document.addEventListener('keydown', function (e) {
      if (!equipmentModal.classList.contains('is-open')) { return; }
      if (e.key === 'Escape') { closeEquipmentModal(); }
      if (e.key === 'ArrowLeft') { equipmentModalPrev.click(); }
      if (e.key === 'ArrowRight') { equipmentModalNext.click(); }
    });
    addSwipeSupport(document.getElementById('equipmentModalCarousel'), function () {
      equipmentModalNext.click();
    }, function () {
      equipmentModalPrev.click();
    });
  }

  // Contact modal (podcast à emporter): opens on demand, submits to Web3Forms
  // (static-site-friendly email delivery — no backend required).
  var contactModal = document.getElementById('contactModal');
  var contactForm = document.getElementById('contactForm');
  var contactFormStatus = document.getElementById('contactFormStatus');

  function openContactModal() {
    if (!contactModal) { return; }
    contactModal.classList.add('is-open');
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var firstField = contactModal.querySelector('input[name="prenom"]');
    if (firstField) { firstField.focus(); }
  }

  function closeContactModal() {
    if (!contactModal) { return; }
    contactModal.classList.remove('is-open');
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-open-contact-modal]').forEach(function (btn) {
    btn.addEventListener('click', openContactModal);
  });

  if (contactModal) {
    contactModal.querySelectorAll('[data-contact-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeContactModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && contactModal.classList.contains('is-open')) {
        closeContactModal();
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (contactForm.botcheck && contactForm.botcheck.value) { return; }

      var submitBtn = contactForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';
      contactFormStatus.textContent = '';
      contactFormStatus.removeAttribute('data-state');

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(contactForm)))
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            contactFormStatus.textContent = 'Merci, votre demande a bien été envoyée !';
            contactFormStatus.setAttribute('data-state', 'success');
            contactForm.reset();
            window.setTimeout(closeContactModal, 2200);
          } else {
            throw new Error(data.message || 'Envoi impossible');
          }
        })
        .catch(function () {
          contactFormStatus.textContent = "Une erreur est survenue, réessayez ou contactez-nous directement par email.";
          contactFormStatus.setAttribute('data-state', 'error');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Envoyer ma demande';
        });
    });
  }

  // Testimonial carousel (Google reviews, contact section)
  document.querySelectorAll('[data-testimonial-carousel]').forEach(function (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.testimonial'));
    var track = carousel.querySelector('.testimonial-carousel__track');
    var dotsEl = carousel.querySelector('.testimonial-carousel__dots');
    var prevBtn = carousel.querySelector('.testimonial-carousel__nav--prev');
    var nextBtn = carousel.querySelector('.testimonial-carousel__nav--next');
    if (!slides.length) { return; }

    var index = 0;
    var timer = null;

    // The slides are stacked with position:absolute for the cross-fade, so the
    // track never grows to fit them on its own. Size it explicitly to the
    // tallest quote (recalculated on resize, since text reflows) to stop long
    // reviews from overflowing onto whatever sits below the card.
    function sizeTrack() {
      var tallest = 0;
      slides.forEach(function (slide) {
        tallest = Math.max(tallest, slide.scrollHeight);
      });
      track.style.minHeight = tallest + 'px';
    }

    slides.forEach(function (slide, i) {
      var dot = document.createElement('span');
      if (i === 0) { dot.className = 'is-active'; }
      dot.addEventListener('click', function () { goTo(i); restartAutoplay(); });
      dotsEl.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsEl.children);

    function render() {
      slides.forEach(function (slide, i) { slide.classList.toggle('is-active', i === index); });
      dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === index); });
    }

    function goTo(i) { index = (i + slides.length) % slides.length; render(); }

    function startAutoplay() {
      timer = window.setInterval(function () { goTo(index + 1); }, 6000);
    }
    function restartAutoplay() {
      window.clearInterval(timer);
      startAutoplay();
    }

    prevBtn.addEventListener('click', function () { goTo(index - 1); restartAutoplay(); });
    nextBtn.addEventListener('click', function () { goTo(index + 1); restartAutoplay(); });
    carousel.addEventListener('mouseenter', function () { window.clearInterval(timer); });
    carousel.addEventListener('mouseleave', startAutoplay);
    window.addEventListener('resize', sizeTrack);
    addSwipeSupport(track, function () { goTo(index + 1); restartAutoplay(); }, function () { goTo(index - 1); restartAutoplay(); });

    sizeTrack();
    render();
    startAutoplay();
  });

  // Reveal-on-scroll for content blocks
  if ('IntersectionObserver' in window) {
    var revealTargets = document.querySelectorAll('.card--feature, .studio-card, .price-card, .event-card, .equipment-card, .benefit-list__item, .included-card, .media-frame, .text-block, .steps__item, .testimonial-card, .addon-card');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }
})();
