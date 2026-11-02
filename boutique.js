(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); }, E = WF.esc, F = WF.fcfa;
  var slug = new URLSearchParams(location.search).get('s');
  var st = WF.stores().filter(function (x) { return x.slug === slug; })[0];
  var root = $('#root');
  if (!st) { root.innerHTML = '<div class="shop__body" style="text-align:center;padding-top:90px"><h1>Boutique introuvable</h1><p class="hint">Cette adresse n\'existe pas ou a changé.</p><a class="btn btn--sun" href="index.html">Retour à WEBFORM</a></div>'; return; }
  document.title = st.name + ' — boutique en ligne';
  document.documentElement.style.setProperty('--brand', st.color || '#B3326E');
  var closed = WF.sub(st).status === 'expired';
  var key = 'cart_' + st.id, cart = WF.g(key, []), q = '', cat = '';
  var SHIP = [['Retrait en boutique', 0], ['Livraison Dakar', 1500], ['Livraison régions', 3000]];
  var PAYS = ['Wave', 'Orange Money', 'Free Money', 'Wizall', 'Carte bancaire', 'Paiement à la livraison'];
  var price = function (p) { return Math.round(p.price * (100 - (p.promo || 0)) / 100); };
  var prods = function () { return WF.products().filter(function (p) { return p.store === st.id; }); };
  var count = function () { return cart.reduce(function (a, i) { return a + i.qty; }, 0); };
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2400); }
  function save() { WF.s(key, cart); }

  function draw() {
    var all = prods(), cats = all.map(function (p) { return p.cat; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
    var list = all.filter(function (p) { return (!cat || p.cat === cat) && p.name.toLowerCase().indexOf(q.toLowerCase()) > -1; });
    var wa = (st.whatsapp || '').replace(/\D/g, '');
    root.innerHTML = '<header class="shop__top"><div class="shop__in"><div><a href="index.html" class="hint" style="color:#fff;opacity:.8">Propulsé par WEBFORM</a><h1>' + E(st.name) + '</h1>' + (st.desc ? '<p>' + E(st.desc) + '</p>' : '') + '</div><div style="display:flex;gap:10px;flex-wrap:wrap">' + (wa ? '<a class="btn btn--line btn--sm" style="color:#fff;border-color:#fff" href="https://wa.me/221' + wa.slice(-9) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '<button class="btn btn--sun" id="openCart">Panier (' + count() + ')</button></div></div></header>' +
      '<div class="shop__body">' + (closed ? '<div class="note bad">Cette boutique est momentanément indisponible à la commande.</div>' : '') +
      '<div class="filters"><input id="q" type="search" placeholder="Rechercher un produit" value="' + E(q) + '" aria-label="Rechercher"><select id="cat" aria-label="Catégorie"><option value="">Toutes les catégories</option>' + cats.map(function (c) { return '<option' + (c === cat ? ' selected' : '') + '>' + E(c) + '</option>'; }).join('') + '</select></div>' +
      (list.length ? '<div class="grid">' + list.map(function (p, i) {
        var vs = p.variants ? p.variants.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];
        return '<article class="prod">' + (p.hasImg ? '<img class="prod__img" data-m="' + p.id + 'i" alt="' + E(p.name) + '" style="object-fit:cover;width:100%;background:var(--tint)">' : '<div class="prod__img" style="background:linear-gradient(135deg,var(--brand),' + ['#FFA62B', '#2BD9A8', '#4A0E35', '#1B6E8F'][i % 4] + ')">' + E(p.name.charAt(0).toUpperCase()) + '</div>') + (p.hasVid ? '<video data-m="' + p.id + 'v" controls preload="metadata" playsinline aria-label="Vidéo de ' + E(p.name) + '" style="width:100%;border-radius:14px;background:#000;max-height:260px"></video>' : '') + '<h3>' + E(p.name) + '</h3><b>' + F(price(p)) + '</b>' + (p.promo ? '<small><s>' + F(p.price) + '</s> −' + p.promo + '%</small>' : '') + '<small>' + (p.stock > 0 ? (p.stock <= 3 ? 'Plus que ' + p.stock : 'En stock') : 'Épuisé') + '</small>' + (vs.length ? '<select id="v' + p.id + '" aria-label="Variante">' + vs.map(function (v) { return '<option>' + E(v) + '</option>'; }).join('') + '</select>' : '') + '<button class="btn btn--dark btn--sm" data-add="' + p.id + '" ' + (p.stock < 1 || closed ? 'disabled' : '') + '>Ajouter au panier</button></article>';
      }).join('') + '</div>' : '<p class="empty">' + (all.length ? 'Aucun produit ne correspond à votre recherche.' : 'Cette boutique prépare son catalogue. Revenez bientôt.') + '</p>') + '</div>';
    WF.hydrate(root);
    $('#openCart').onclick = cartDialog;
    $('#q').oninput = function (e) { q = e.target.value; var p = e.target.selectionStart; draw(); var n = $('#q'); n.focus(); n.setSelectionRange(p, p); };
    $('#cat').onchange = function (e) { cat = e.target.value; draw(); };
    root.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () {
      var p = prods().filter(function (x) { return x.id === b.dataset.add; })[0], vEl = $('#v' + p.id), v = vEl ? vEl.value : '';
      var line = cart.filter(function (i) { return i.pid === p.id && i.variant === v; })[0];
      if ((line ? line.qty : 0) + 1 > p.stock) { toast('Stock maximum atteint pour ce produit'); return; }
      if (line) line.qty++; else cart.push({ pid: p.id, name: p.name, price: price(p), variant: v, qty: 1 });
      save(); toast('Ajouté au panier'); $('#openCart').textContent = 'Panier (' + count() + ')';
    }; });
  }

  function cartDialog() {
    var d = $('#dlg'), me = WF.me();
    if (!cart.length) { d.innerHTML = '<form method="dialog"><h2>Votre panier est vide</h2><p class="hint">Ajoutez des produits pour passer commande.</p><button class="btn btn--sun">Continuer mes achats</button></form>'; d.showModal(); return; }
    var sub = cart.reduce(function (a, i) { return a + i.price * i.qty; }, 0);
    d.innerHTML = '<form id="orderForm" novalidate><h2>Mon panier</h2><div>' + cart.map(function (i, n) { return '<div class="cartline"><span>' + E(i.name) + (i.variant ? ' <small class="hint">(' + E(i.variant) + ')</small>' : '') + '</span><b>' + F(i.price * i.qty) + '</b><div class="qty"><button type="button" data-q="-1" data-n="' + n + '" aria-label="Moins">−</button>' + i.qty + '<button type="button" data-q="1" data-n="' + n + '" aria-label="Plus">+</button></div><button type="button" class="link" data-rm="' + n + '">Retirer</button></div>'; }).join('') + '</div>' +
      '<label>Nom complet<input name="nom" value="' + E(me ? me.nom : '') + '" required></label><div class="row"><label>Téléphone<input name="tel" type="tel" value="' + E(me ? me.tel : '') + '" required></label><label>Livraison<select name="ship">' + SHIP.map(function (s, i) { return '<option value="' + i + '">' + s[0] + (s[1] ? ' (' + F(s[1]) + ')' : ' (gratuit)') + '</option>'; }).join('') + '</select></label></div>' +
      '<label id="addr">Adresse de livraison<input name="adresse" placeholder="Quartier, rue, repère"></label><label>Paiement<select name="pay">' + PAYS.map(function (p) { return '<option>' + p + '</option>'; }).join('') + '</select></label>' +
      '<div class="total"><span>Total</span><span id="tot">' + F(sub) + '</span></div><p class="err" id="oErr" role="alert"></p><button class="btn btn--sun btn--full" type="submit">Confirmer la commande</button><button class="link" type="button" data-close>Continuer mes achats</button></form>';
    if (!d.open) d.showModal();
    var f = $('#orderForm');
    function tot() { var s = SHIP[+f.elements.ship.value][1]; $('#tot').textContent = F(sub + s); $('#addr').hidden = !s; }
    f.elements.ship.onchange = tot; tot();
    f.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () {
      var i = cart[+b.dataset.n], p = prods().filter(function (x) { return x.id === i.pid; })[0], nq = i.qty + +b.dataset.q;
      if (nq < 1) return; if (nq > p.stock) { toast('Stock insuffisant'); return; } i.qty = nq; save(); cartDialog(); draw();
    }; });
    f.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { cart.splice(+b.dataset.rm, 1); save(); draw(); if (cart.length) cartDialog(); else d.close(); }; });
    f.querySelector('[data-close]').onclick = function () { d.close(); };
    f.onsubmit = function (e) {
      e.preventDefault(); var err = $('#oErr'), sh = SHIP[+f.elements.ship.value];
      if (closed) { err.textContent = 'La boutique ne prend plus de commandes pour le moment.'; return; }
      if (!f.elements.nom.value.trim() || f.elements.tel.value.replace(/\D/g, '').length < 9) { err.textContent = 'Entrez votre nom et un numéro de téléphone valide.'; return; }
      if (sh[1] && !f.elements.adresse.value.trim()) { err.textContent = 'Entrez votre adresse de livraison.'; return; }
      var ps = prods();
      for (var k = 0; k < cart.length; k++) { var p = ps.filter(function (x) { return x.id === cart[k].pid; })[0]; if (!p || p.stock < cart[k].qty) { err.textContent = 'Stock insuffisant pour ' + cart[k].name + '. Modifiez votre panier.'; return; } }
      var online = f.elements.pay.value !== 'Paiement à la livraison';
      var o = { id: String(1000 + WF.orders().length + 1), store: st.id, buyer: me ? me.id : null, client: { nom: f.elements.nom.value.trim(), tel: f.elements.tel.value.trim(), adresse: f.elements.adresse.value.trim() }, items: cart.map(function (i) { return { pid: i.pid, name: i.name, price: i.price, qty: i.qty, variant: i.variant }; }), delivery: sh[0], total: sub + sh[1], pay: f.elements.pay.value, paid: online, status: 'Nouvelle', date: Date.now() };
      WF.save('orders', function (a) { a.push(o); });
      WF.save('products', function (a) { a.forEach(function (p) { cart.forEach(function (i) { if (p.id === i.pid) p.stock -= i.qty; }); }); });
      cart = []; save(); draw();
      d.innerHTML = '<form method="dialog"><h2>Commande confirmée</h2><p>Votre commande <b>#' + o.id + '</b> de ' + F(o.total) + ' est bien enregistrée. ' + E(st.name) + ' vous contactera au ' + E(o.client.tel) + '.</p>' + (me ? '<a class="btn btn--dark" href="espace.html#cmd">Suivre mes commandes</a>' : '<p class="hint">Créez un compte acheteur pour suivre vos commandes.</p><a class="btn btn--dark" href="connexion.html?mode=inscription">Créer un compte</a>') + '<button class="btn btn--line">Fermer</button></form>';
    };
  }
  draw();
})();
