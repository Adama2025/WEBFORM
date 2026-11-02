(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var forms = { connexion: $('#fLogin'), inscription: $('#fSignup'), reset: $('#fReset') };
  var tabs = document.querySelectorAll('.tabs button');
  var params = new URLSearchParams(location.search);
  if (WF.me()) { location.replace('espace.html'); return; }

  function show(m) {
    Object.keys(forms).forEach(function (k) { forms[k].hidden = k !== m; });
    tabs.forEach(function (t) { t.classList.toggle('on', t.dataset.m === m); t.setAttribute('aria-selected', t.dataset.m === m); });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.m); }); });
  $('#toReset').addEventListener('click', function () { show('reset'); });
  $('#backLogin').addEventListener('click', function () { show('connexion'); });
  if (params.get('mode') === 'inscription') show('inscription');
  if (WF.PLANS[params.get('plan')]) forms.inscription.elements.plan.value = params.get('plan');

  function mark(f, names) {
    var bad = null;
    names.forEach(function (n) {
      var el = f.elements[n]; var v = el.value.trim();
      var ok = v && el.checkValidity() && (n !== 'tel' || v.replace(/\D/g, '').length >= 9) && (n !== 'mdp' || v.length >= 8 || f === forms.connexion);
      el.classList.toggle('bad', !ok);
      if (!ok && !bad) bad = el;
    });
    if (bad) bad.focus();
    return bad;
  }
  var msg = { nom: 'Entrez votre nom complet.', tel: 'Entrez un numéro valide (9 chiffres minimum).', email: 'Entrez une adresse e-mail valide.', mdp: 'Le mot de passe doit contenir au moins 8 caractères.', boutique: 'Entrez le nom de votre boutique.' };

  /* Inscription : choix du rôle et adresse de la boutique */
  var f = forms.inscription;
  var seller = function () { return f.elements.role.value === 'vendeur'; };
  function slugState() {
    var slug = WF.slug(f.elements.boutique.value), el = $('#slugline');
    if (!slug) { el.textContent = ''; return false; }
    var free = WF.slugFree(slug);
    el.innerHTML = 'Votre adresse : <b>' + slug + '.webform.sn</b> <span class="' + (free ? 'ok' : 'no') + '">' + (free ? 'disponible' : slug.length < 3 ? 'trop court' : 'indisponible') + '</span>';
    return free;
  }
  f.elements.boutique.addEventListener('input', slugState);
  f.addEventListener('change', function () {
    $('#sellerFields').hidden = !seller();
    $('#goSignup').textContent = seller() ? 'Créer mon compte vendeur gratuit' : 'Créer mon compte acheteur';
  });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#eSignup'); err.textContent = '';
    var bad = mark(f, ['nom', 'tel', 'email', 'mdp'].concat(seller() ? ['boutique'] : []));
    if (bad) { err.textContent = msg[bad.name]; return; }
    var email = f.elements.email.value.trim().toLowerCase();
    if (WF.users().some(function (u) { return u.email === email; })) { err.textContent = 'Un compte existe déjà avec cet e-mail. Connectez-vous.'; return; }
    if (seller() && !slugState()) { err.textContent = 'Cette adresse de boutique n\'est pas disponible. Modifiez le nom.'; f.elements.boutique.focus(); return; }
    WF.hash(f.elements.mdp.value).then(function (h) {
      var u = { id: WF.id(), role: seller() ? 'vendeur' : 'acheteur', nom: f.elements.nom.value.trim(), tel: f.elements.tel.value.trim(), email: email, mdp: h, created: Date.now() };
      WF.save('users', function (a) { a.push(u); });
      if (seller()) {
        WF.save('stores', function (a) {
          a.push({ id: WF.id(), owner: u.id, slug: WF.slug(f.elements.boutique.value), name: f.elements.boutique.value.trim(), desc: '', tel: u.tel, whatsapp: u.tel, color: '#B3326E', plan: f.elements.plan.value, paid: false, trialStart: Date.now(), subEnd: Date.now() + 30 * WF.DAY, payments: [] });
        });
      }
      WF.login(u.id);
      location.href = 'espace.html';
    });
  });

  /* Connexion avec limitation des tentatives */
  forms.connexion.addEventListener('submit', function (e) {
    e.preventDefault();
    var fl = forms.connexion, err = $('#eLogin'); err.textContent = '';
    var lock = WF.g('lock', { n: 0, until: 0 });
    if (Date.now() < lock.until) { err.textContent = 'Trop de tentatives. Réessayez dans ' + Math.ceil((lock.until - Date.now()) / 1000) + ' secondes.'; return; }
    var bad = mark(fl, ['email', 'mdp']);
    if (bad) { err.textContent = 'Entrez votre adresse e-mail et votre mot de passe.'; return; }
    var email = fl.elements.email.value.trim().toLowerCase();
    WF.hash(fl.elements.mdp.value).then(function (h) {
      var u = WF.users().filter(function (x) { return x.email === email && x.mdp === h; })[0];
      if (!u) {
        lock.n++; if (lock.n >= 5) { lock.until = Date.now() + 30000; lock.n = 0; }
        WF.s('lock', lock);
        err.textContent = 'E-mail ou mot de passe incorrect.'; return;
      }
      WF.s('lock', { n: 0, until: 0 });
      WF.login(u.id);
      location.href = params.get('retour') || 'espace.html';
    });
  });

  forms.reset.addEventListener('submit', function (e) {
    e.preventDefault();
    var fr = forms.reset, err = $('#eReset'); err.textContent = '';
    var bad = mark(fr, ['email', 'mdp']); if (bad) { err.textContent = msg[bad.name]; return; }
    var email = fr.elements.email.value.trim().toLowerCase();
    if (!WF.users().some(function (u) { return u.email === email; })) { err.textContent = 'Aucun compte avec cet e-mail.'; return; }
    WF.hash(fr.elements.mdp.value).then(function (h) {
      WF.save('users', function (a) { a.forEach(function (u) { if (u.email === email) u.mdp = h; }); });
      show('connexion'); $('#eLogin').textContent = 'Mot de passe changé. Connectez-vous.';
    });
  });
  /* Connexion avec Google (démonstration : le jeton est lu dans le navigateur, sans vérification serveur) */
  function parseJwt(t) {
    var b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(b).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
  }
  function onGoogle(resp) {
    var p;
    try { p = parseJwt(resp.credential); } catch (e) { return; }
    var fail = function (m) { $(forms.inscription.hidden ? '#eLogin' : '#eSignup').textContent = m; };
    if (p.aud !== WF.GOOGLE_CLIENT_ID || !p.email || p.email_verified === false || (p.exp && p.exp * 1000 < Date.now())) { fail('Connexion Google refusée. Réessayez.'); return; }
    var email = p.email.toLowerCase();
    var u = WF.users().filter(function (x) { return x.email === email; })[0];
    if (u) { WF.login(u.id); location.href = params.get('retour') || 'espace.html'; return; }
    if (forms.inscription.hidden) {
      show('inscription');
      $('#eSignup').textContent = 'Aucun compte avec cette adresse Google. Choisissez Vendre ou Acheter, puis cliquez sur « Continuer avec Google ».';
      return;
    }
    var isSeller = seller();
    if (isSeller) {
      if (!f.elements.boutique.value.trim()) { fail('Entrez le nom de votre boutique avant de continuer avec Google.'); f.elements.boutique.focus(); return; }
      if (!slugState()) { fail('Cette adresse de boutique n\'est pas disponible. Modifiez le nom.'); return; }
    }
    var nu = { id: WF.id(), role: isSeller ? 'vendeur' : 'acheteur', nom: p.name || email, tel: '', email: email, mdp: null, google: p.sub, created: Date.now() };
    WF.save('users', function (a) { a.push(nu); });
    if (isSeller) {
      WF.save('stores', function (a) {
        a.push({ id: WF.id(), owner: nu.id, slug: WF.slug(f.elements.boutique.value), name: f.elements.boutique.value.trim(), desc: '', tel: '', whatsapp: '', color: '#B3326E', plan: f.elements.plan.value, paid: false, trialStart: Date.now(), subEnd: Date.now() + 30 * WF.DAY, payments: [] });
      });
    }
    WF.login(nu.id);
    location.href = 'espace.html';
  }
  function initGoogle() {
    if (!(window.google && google.accounts && google.accounts.id)) return false;
    google.accounts.id.initialize({ client_id: WF.GOOGLE_CLIENT_ID, callback: onGoogle, ux_mode: 'popup' });
    ['gBtnLogin', 'gBtnSignup'].forEach(function (id) {
      google.accounts.id.renderButton($('#' + id), { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'fr', width: 320 });
    });
    return true;
  }
  var tries = 0;
  (function waitGoogle() {
    if (initGoogle()) return;
    if (++tries < 40) { setTimeout(waitGoogle, 250); return; }
    document.querySelectorAll('.gbtn').forEach(function (el) { el.innerHTML = '<p class="hint">Connexion Google indisponible pour le moment. Vérifiez votre connexion internet.</p>'; });
  })();
})();
