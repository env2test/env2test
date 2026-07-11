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

    carousel.addEventListener('click', function () {
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
  }

  // Reveal-on-scroll for content blocks
  if ('IntersectionObserver' in window) {
    var revealTargets = document.querySelectorAll('.card--feature, .studio-card, .price-card, .event-card, .equipment-card');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach(function (el) {
      el.classList.add('reveal');
      observer.observe(el);
    });
  }
})();
