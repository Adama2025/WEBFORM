(function () {
  'use strict';

  /* Barre de navigation : fond au défilement + menu mobile */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  /* Générateur de sous-domaine en direct */
  var input = document.getElementById('shopname');
  var url = document.getElementById('url');
  var title = document.getElementById('shoptitle');
  var status = document.getElementById('status');
  var reserved = ['admin', 'www', 'api', 'app', 'webform', 'mail', 'support', 'wave', 'orange', 'boutique'];
  var taken = ['babshabits', 'electroplus', 'modeadam', 'cosmetiqueplus'];

  function slugify(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  }
  function update() {
    var raw = input.value.trim();
    var slug = slugify(raw);
    title.textContent = raw || 'Ma boutique';
    url.textContent = (slug || 'maboutique') + '.webform.sn';
    status.className = 'try__status';
    if (!slug) { status.textContent = 'Entrez un nom pour voir votre adresse.'; return; }
    if (slug.length < 3) { status.textContent = 'Utilisez au moins 3 caractères.'; status.classList.add('bad'); return; }
    if (reserved.indexOf(slug) > -1) { status.textContent = 'Ce nom est réservé. Essayez un autre nom.'; status.classList.add('bad'); return; }
    if (taken.indexOf(slug) > -1 && raw.toLowerCase() !== 'babs habits') { status.textContent = 'Cette adresse est déjà prise. Ajoutez votre ville ou un mot.'; status.classList.add('bad'); return; }
    status.textContent = slug + '.webform.sn est disponible.';
    status.classList.add('ok');
  }
  input.addEventListener('input', update);
  update();

  /* Inclinaison de la maquette selon la souris (écrans larges) */
  var stage = document.querySelector('.stage');
  var browser = document.querySelector('.browser');
  var canTilt = window.matchMedia('(min-width: 981px) and (prefers-reduced-motion: no-preference)').matches;
  if (canTilt) {
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      browser.style.transform = 'rotateY(' + (-8 + x * 10) + 'deg) rotateX(' + (4 - y * 8) + 'deg)';
    });
    stage.addEventListener('mouseleave', function () { browser.style.transform = ''; });
  }

  /* Apparition au défilement */
  var targets = document.querySelectorAll('.sec__head, .card, .steps li, .plan, .faq details, .chat');
  targets.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  /* Assistant IA : texte qui s'écrit quand la section est visible */
  var typed = document.getElementById('typed');
  var message = 'Marchez avec style. Nos sandales en cuir, cousues main à Dakar, sont faites pour durer et pour briller. Disponibles du 38 au 45, à partir de 12 500 FCFA. Livraison rapide et paiement par Wave. Commandez en un clic via le lien en bio.';
  var started = false;
  function typeText() {
    if (started) return; started = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { typed.textContent = message; return; }
    var i = 0;
    (function step() {
      typed.textContent = message.slice(0, ++i);
      if (i < message.length) setTimeout(step, 22);
    })();
  }
  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { typeText(); io2.disconnect(); }
    }, { threshold: 0.4 });
    io2.observe(document.getElementById('chat'));
  } else { typeText(); }

  /* FAQ : une seule réponse ouverte à la fois */
  var items = document.querySelectorAll('.faq details');
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* Essai gratuit : redirection vers l'inscription avec la formule choisie */
  document.querySelectorAll('[data-trial]').forEach(function (b) {
    b.addEventListener('click', function () {
      location.href = 'connexion.html?mode=inscription&plan=' + b.getAttribute('data-trial');
    });
  });
})();
