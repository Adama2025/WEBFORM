/* Couche de données locale (démo) : stockage dans le navigateur.
   À remplacer plus tard par l'API REST PHP + PostgreSQL. */
(function (w) {
  'use strict';
  var g = function (k, d) { try { var v = JSON.parse(localStorage.getItem('wf_' + k)); return v == null ? d : v; } catch (e) { return d; } };
  var s = function (k, v) { localStorage.setItem('wf_' + k, JSON.stringify(v)); };
  var DAY = 864e5;
  var WF = {
    g: g, s: s, DAY: DAY,
    PLANS: { starter: { n: 'Starter', p: 2500, m: 1 }, business: { n: 'Business', p: 7500, m: 2 }, premium: { n: 'Premium', p: 20000, m: 3 } },
    RESERVED: ['admin', 'www', 'api', 'app', 'webform', 'mail', 'support', 'wave', 'orange', 'boutique', 'connexion', 'espace'],
    id: function () { return Math.random().toString(36).slice(2, 10); },
    esc: function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    fcfa: function (n) { return Number(n || 0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' FCFA'; },
    date: function (d) { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); },
    slug: function (t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24); },
    hash: function (p) {
      var fb = function () { var h = 5381; for (var i = 0; i < p.length; i++) h = (h * 33) ^ p.charCodeAt(i); return 'x' + (h >>> 0).toString(16); };
      if (!(w.crypto && crypto.subtle)) return Promise.resolve(fb());
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode('wf:' + p)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
      }).catch(fb);
    },
    users: function () { return g('users', []); },
    stores: function () { return g('stores', []); },
    products: function () { return g('products', []); },
    orders: function () { return g('orders', []); },
    save: function (key, fn) { var a = g(key, []); fn(a); s(key, a); },
    me: function () { var id = g('session', null); return WF.users().filter(function (u) { return u.id === id; })[0]; },
    login: function (id) { s('session', id); },
    logout: function () { localStorage.removeItem('wf_session'); },
    myStore: function (uid) { return WF.stores().filter(function (x) { return x.owner === uid; })[0]; },
    /* Statuts : trial, active, expiring, expired */
    sub: function (st) {
      var left = Math.ceil((st.subEnd - Date.now()) / DAY);
      return { left: Math.max(left, 0), status: left <= 0 ? 'expired' : left <= 7 ? 'expiring' : st.paid ? 'active' : 'trial' };
    },
    slugFree: function (slug) { return slug.length >= 3 && WF.RESERVED.indexOf(slug) < 0 && !WF.stores().some(function (x) { return x.slug === slug; }); }
  };
  /* Médias (images et vidéos) : IndexedDB, car localStorage est limité à environ 5 Mo */
  var dbp;
  function openDb() {
    return dbp || (dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('webform_media', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('m'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    }));
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('m', mode), req = fn(t.objectStore('m'));
        t.oncomplete = function () { res(req && req.result); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  /* Connexion Google (identifiant public, sans danger dans le code du site) */
  WF.GOOGLE_CLIENT_ID = '906290373319-roqeelqssdqaecg0a4u68gp8ej9b5dj2.apps.googleusercontent.com';
  WF.MAX_IMG = 3 * 1024 * 1024;
  WF.MAX_VIDEO = 12 * 1024 * 1024;
  WF.media = {
    put: function (id, blob) { return tx('readwrite', function (s) { return s.put(blob, id); }); },
    get: function (id) { return tx('readonly', function (s) { return s.get(id); }); },
    del: function (id) { return tx('readwrite', function (s) { return s.delete(id); }).catch(function () {}); }
  };
  /* Remplit les éléments <img> / <video> portant data-m="idMedia" */
  WF.hydrate = function (root) {
    root.querySelectorAll('[data-m]').forEach(function (el) {
      WF.media.get(el.dataset.m).then(function (b) { if (b) el.src = URL.createObjectURL(b); }).catch(function () {});
    });
  };
  /* PayPal : boutons hébergés. Un bouton = un montant, défini dans votre compte PayPal.
     Renseignez ici l'identifiant du bouton de chaque formule.
     ATTENTION : le même bouton est utilisé pour les trois formules en attendant d'en créer deux autres
     dans PayPal (un par montant). Remplacez 'business' et 'premium' dès que possible. */
  WF.PAYPAL = {
    clientId: 'BAAwrTrFwR8AakmOqcQNqIpBDqy3-iVHovNNyYwIkp5Y3KSITCAFcMrV8GPfJ-vQxOijqt7BGExYpGc0CI',
    currency: 'USD',
    buttons: { starter: 'LGTSYV4ZURFPG', business: 'LGTSYV4ZURFPG', premium: 'LGTSYV4ZURFPG' }
  };
  w.WF = WF;
})(window);
