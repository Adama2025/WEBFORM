(function () {
  'use strict';
  var u = WF.me();
  if (!u) { location.replace('connexion.html'); return; }
  var $ = function (s) { return document.querySelector(s); }, E = WF.esc, F = WF.fcfa;
  var SELL = u.role === 'vendeur';
  var TABS = SELL ? [['vue', 'Vue générale'], ['produits', 'Produits'], ['commandes', 'Commandes'], ['abo', 'Abonnement'], ['boutique', 'Ma boutique']]
                  : [['cmd', 'Mes commandes'], ['shops', 'Boutiques'], ['profil', 'Mon compte']];
  var FLOW = ['Nouvelle', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée', 'Refusée', 'Remboursée'];
  var LBL = { trial: 'Essai gratuit', active: 'Actif', expiring: 'Expire bientôt', expired: 'Expiré' };
  var PAYS = ['Wave', 'Orange Money', 'Free Money', 'Wizall', 'Carte bancaire'];
  var tab = location.hash.slice(1);
  if (!TABS.some(function (t) { return t[0] === tab; })) tab = TABS[0][0];
  var ST = function () { return WF.myStore(u.id); };
  var locked = function () { return SELL && WF.sub(ST()).status === 'expired'; };

  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function badge(s) { return '<span class="badge b-' + E(s) + '">' + E(LBL[s] || s) + '</span>'; }

  function banner() {
    var st = ST(), s = WF.sub(st);
    if (s.status === 'trial') return '<div class="note">Essai gratuit : <b>' + s.left + ' jours restants</b>. Aucun paiement avant le ' + WF.date(st.subEnd) + '. <a href="#abo">Choisir une formule</a></div>';
    if (s.status === 'expiring') return '<div class="note warn">Votre abonnement expire dans ' + s.left + ' jour(s). <a href="#abo">Renouveler mon abonnement</a></div>';
    if (s.status === 'expired') return '<div class="note bad"><b>Abonnement expiré.</b> Vos données sont conservées. Bloqués pour le moment : ajout de produits, modification de la boutique et prise de commandes. <a href="#abo">Renouveler mon abonnement</a></div>';
    return '';
  }

  var V = {
    vue: function () {
      var st = ST(), pr = WF.products().filter(function (p) { return p.store === st.id; }), or = WF.orders().filter(function (o) { return o.store === st.id; });
      var ok = or.filter(function (o) { return ['Annulée', 'Refusée', 'Remboursée'].indexOf(o.status) < 0; });
      var ca = ok.reduce(function (a, o) { return a + o.total; }, 0), top = {};
      or.forEach(function (o) { o.items.forEach(function (i) { top[i.name] = (top[i.name] || 0) + i.qty; }); });
      var tops = Object.keys(top).sort(function (a, b) { return top[b] - top[a]; }).slice(0, 4);
      var low = pr.filter(function (p) { return p.stock <= 3; });
      var s = WF.sub(st);
      return '<div class="head"><h1>Bonjour ' + E(u.nom.split(' ')[0]) + '</h1><a class="btn btn--dark" target="_blank" href="boutique.html?s=' + E(st.slug) + '">Voir ma boutique</a></div>' +
        '<div class="stats"><div class="stat"><span>Chiffre d\'affaires</span><b>' + F(ca) + '</b></div><div class="stat"><span>Commandes</span><b>' + or.length + '</b></div><div class="stat"><span>Produits</span><b>' + pr.length + '</b></div><div class="stat"><span>Clients</span><b>' + new Set(or.map(function (o) { return o.client.tel; })).size + '</b></div></div>' +
        '<div class="two"><div class="panel"><h2>Commandes récentes</h2>' + (or.length ? '<ul class="list">' + or.slice(-5).reverse().map(function (o) { return '<li><span>#' + o.id + ' · ' + E(o.client.nom) + '</span><span>' + F(o.total) + ' ' + badge(o.status) + '</span></li>'; }).join('') + '</ul>' : '<p class="empty">Aucune commande pour le moment. Partagez le lien de votre boutique.</p>') + '</div>' +
        '<div class="panel"><h2>Abonnement</h2><p>' + badge(s.status) + ' ' + WF.PLANS[st.plan].n + '</p><p class="hint" style="margin:8px 0">Valable jusqu\'au ' + WF.date(st.subEnd) + '</p><a class="btn btn--sun btn--sm" href="#abo">Gérer</a></div></div>' +
        '<div class="two"><div class="panel"><h2>Produits les plus vendus</h2>' + (tops.length ? '<ul class="list">' + tops.map(function (n) { return '<li><span>' + E(n) + '</span><b>' + top[n] + '</b></li>'; }).join('') + '</ul>' : '<p class="empty">Pas encore de ventes.</p>') + '</div>' +
        '<div class="panel"><h2>Stock faible</h2>' + (low.length ? '<ul class="list">' + low.map(function (p) { return '<li><span>' + E(p.name) + '</span><b>' + p.stock + ' restant(s)</b></li>'; }).join('') + '</ul>' : '<p class="empty">Tous vos stocks sont corrects.</p>') + '</div></div>' +
        '<div class="panel"><h2>Adresse de votre boutique</h2><p><b>' + E(st.slug) + '.webform.sn</b> <span class="hint">(en démonstration : boutique.html?s=' + E(st.slug) + ')</span></p></div>';
    },
    produits: function () {
      var st = ST(), pr = WF.products().filter(function (p) { return p.store === st.id; });
      return '<div class="head"><h1>Produits</h1><button class="btn btn--sun" data-act="addp" ' + (locked() ? 'disabled title="Abonnement expiré"' : '') + '>Ajouter un produit</button></div>' +
        (pr.length ? '<div class="panel tablewrap"><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th></th></tr></thead><tbody>' + pr.map(function (p) {
          return '<tr><td>' + (p.hasImg ? '<img data-m="' + p.id + 'i" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:10px;vertical-align:middle;margin-right:10px">' : '') + '<b>' + E(p.name) + '</b>' + (p.hasVid ? ' <span class="badge">vidéo</span>' : '') + (p.variants ? '<br><small class="hint">' + E(p.variants) + '</small>' : '') + '</td><td>' + E(p.cat || '—') + '</td><td>' + F(p.price) + (p.promo ? ' <small class="hint">−' + p.promo + '%</small>' : '') + '</td><td>' + p.stock + '</td><td><button class="btn btn--line btn--sm" data-act="editp" data-id="' + p.id + '" ' + (locked() ? 'disabled' : '') + '>Modifier</button> <button class="btn btn--line btn--sm" data-act="dupp" data-id="' + p.id + '" ' + (locked() ? 'disabled' : '') + '>Dupliquer</button> <button class="btn btn--line btn--sm" data-act="delp" data-id="' + p.id + '">Supprimer</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="panel empty">Votre catalogue est vide. Ajoutez votre premier produit pour ouvrir la vente.</div>');
    },
    commandes: function () {
      var st = ST(), or = WF.orders().filter(function (o) { return o.store === st.id; }).reverse();
      return '<h1>Commandes</h1>' + (or.length ? '<div class="panel tablewrap"><table><thead><tr><th>N°</th><th>Client</th><th>Articles</th><th>Total</th><th>Livraison / paiement</th><th>Statut</th></tr></thead><tbody>' + or.map(function (o) {
        return '<tr><td>#' + o.id + '<br><small class="hint">' + WF.date(o.date) + '</small></td><td>' + E(o.client.nom) + '<br><small class="hint">' + E(o.client.tel) + '<br>' + E(o.client.adresse || '') + '</small></td><td>' + o.items.map(function (i) { return E(i.name) + (i.variant ? ' (' + E(i.variant) + ')' : '') + ' ×' + i.qty; }).join('<br>') + '</td><td><b>' + F(o.total) + '</b></td><td>' + E(o.delivery) + '<br><small class="hint">' + E(o.pay) + (o.paid ? ' · payé' : ' · à encaisser') + '</small></td><td><select data-act="status" data-id="' + o.id + '" aria-label="Statut de la commande ' + o.id + '">' + FLOW.map(function (s) { return '<option' + (s === o.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="panel empty">Aucune commande. Elles apparaîtront ici dès le premier achat.</div>');
    },
    abo: function () {
      var st = ST(), s = WF.sub(st), pays = st.payments || [];
      return '<h1>Abonnement</h1><div class="panel"><p>' + badge(s.status) + ' Formule <b>' + WF.PLANS[st.plan].n + '</b> · jusqu\'au <b>' + WF.date(st.subEnd) + '</b> (' + s.left + ' jour(s))</p></div>' +
        '<form class="panel" id="payForm"><h2>' + (s.status === 'expired' ? 'Renouveler mon abonnement' : 'Payer et continuer après l\'essai') + '</h2><p class="hint">Les jours restants de votre essai sont conservés et s\'ajoutent à la nouvelle période.</p>' +
        '<fieldset class="plans3">' + Object.keys(WF.PLANS).map(function (k) { var p = WF.PLANS[k]; return '<label class="opt"><input type="radio" name="plan" value="' + k + '"' + (k === st.plan ? ' checked' : '') + '><b>' + p.n + '</b>' + F(p.p) + '<br><small>pour ' + p.m + ' mois</small></label>'; }).join('') + '</fieldset>' +
        '<fieldset class="pays">' + PAYS.map(function (m, i) { return '<label class="opt"><input type="radio" name="moyen" value="' + m + '"' + (i === 0 ? ' checked' : '') + '><b>' + m + '</b></label>'; }).join('') + '</fieldset>' +
        '<button class="btn btn--sun" type="submit">Payer maintenant</button><p class="hint">Démonstration : le paiement est simulé. En production, l\'abonnement s\'active uniquement après confirmation du prestataire.</p></form>' +
        '<div class="panel"><h2>Payer avec PayPal ou carte bancaire</h2><p class="hint">Pour la formule sélectionnée ci-dessus. Après avoir payé dans la fenêtre PayPal, cliquez sur « J\'ai terminé mon paiement ».</p><div id="ppBox" style="margin:14px 0"></div><button class="btn btn--dark" data-act="ppdone" id="ppDone" hidden>J\'ai terminé mon paiement</button></div>' +
        '<div class="panel"><h2>Historique des paiements</h2>' + (pays.length ? '<ul class="list">' + pays.slice().reverse().map(function (p) { return '<li><span>' + WF.date(p.date) + ' · ' + WF.PLANS[p.plan].n + ' · ' + E(p.moyen) + '<br><small class="hint">Réf. ' + E(p.ref) + ' · ' + E(p.statut || 'Confirmé') + '</small>' + (p.statut === 'En attente' ? '<br><small class="hint">L\'abonnement s\'activera après confirmation de PayPal.</small>' + (TEST ? ' <button class="btn btn--line btn--sm" data-act="confirmpp" data-ref="' + E(p.ref) + '">Confirmer (mode test)</button>' : '') : '') + '</span><b>' + F(p.montant) + '</b></li>'; }).join('') + '</ul>' : '<p class="empty">Aucun paiement. Votre essai gratuit est en cours.</p>') + '</div>';
    },
    boutique: function () {
      var st = ST(), d = locked() ? 'disabled' : '';
      return '<h1>Ma boutique</h1><form class="panel" id="shopForm"><label>Nom de la boutique<input name="name" value="' + E(st.name) + '" required ' + d + '></label><label>Description<textarea name="desc" rows="3" ' + d + '>' + E(st.desc) + '</textarea></label><div class="row"><label>Téléphone<input name="tel" value="' + E(st.tel) + '" ' + d + '></label><label>WhatsApp<input name="whatsapp" value="' + E(st.whatsapp) + '" ' + d + '></label></div><label>Couleur principale<input type="color" name="color" value="' + E(st.color) + '" style="height:48px;padding:4px" ' + d + '></label><p class="hint">Adresse : ' + E(st.slug) + '.webform.sn (non modifiable)</p><button class="btn btn--dark" ' + d + '>Enregistrer</button></form>';
    },
    cmd: function () {
      var or = WF.orders().filter(function (o) { return o.buyer === u.id; }).reverse(), sh = WF.stores();
      return '<h1>Mes commandes</h1>' + (or.length ? '<div class="panel"><ul class="list">' + or.map(function (o) {
        var s = sh.filter(function (x) { return x.id === o.store; })[0];
        return '<li><span><b>#' + o.id + '</b> · ' + E(s ? s.name : 'Boutique') + '<br><small class="hint">' + WF.date(o.date) + ' · ' + o.items.map(function (i) { return E(i.name) + ' ×' + i.qty; }).join(', ') + '</small></span><span>' + F(o.total) + '<br>' + badge(o.status) + '</span></li>';
      }).join('') + '</ul></div>' : '<div class="panel empty">Vous n\'avez pas encore commandé. Découvrez les boutiques.<br><br><a class="btn btn--sun" href="#shops">Voir les boutiques</a></div>');
    },
    shops: function () {
      var sh = WF.stores();
      return '<h1>Boutiques</h1>' + (sh.length ? '<div class="stats" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">' + sh.map(function (s) { return '<a class="stat" style="text-decoration:none;border-top:5px solid ' + E(s.color) + '" href="boutique.html?s=' + E(s.slug) + '"><b>' + E(s.name) + '</b><span>' + E(s.slug) + '.webform.sn</span></a>'; }).join('') + '</div>' : '<div class="panel empty">Aucune boutique n\'est encore ouverte.</div>');
    },
    profil: function () {
      return '<h1>Mon compte</h1><form class="panel" id="profForm"><label>Nom complet<input name="nom" value="' + E(u.nom) + '" required></label><label>Téléphone<input name="tel" value="' + E(u.tel) + '" required></label><label>E-mail<input value="' + E(u.email) + '" disabled></label><button class="btn btn--dark">Enregistrer</button></form>';
    }
  };

  function shell() {
    $('#app').innerHTML = '<aside class="side"><a class="logo" href="index.html"><span class="logo__mark">W</span>webform</a><nav id="nav" aria-label="Menu de l\'espace"></nav><div class="side__me"><span><b>' + E(u.nom) + '</b>' + (SELL ? 'Vendeur' : 'Acheteur') + '</span><button class="btn btn--sm" data-act="out">Déconnexion</button></div></aside><main class="main" id="main"></main>';
  }
  function render() {
    $('#nav').innerHTML = TABS.map(function (t) { return '<a href="#' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</a>'; }).join('');
    $('#main').innerHTML = (SELL ? banner() : '') + V[tab]();
    WF.hydrate($('#main'));
    if (tab === 'abo') { var chk = document.querySelector('#payForm [name=plan]:checked'); renderPayPal(chk ? chk.value : ST().plan); }
  }

  function prodDialog(id) {
    var p = WF.products().filter(function (x) { return x.id === id; })[0] || { name: '', price: '', stock: '', cat: '', variants: '', promo: 0 };
    var d = $('#dlg');
    d.innerHTML = '<form id="prodForm" data-id="' + (id || '') + '"><h2>' + (id ? 'Modifier le produit' : 'Nouveau produit') + '</h2><label>Nom<input name="name" value="' + E(p.name) + '" required></label><div class="row"><label>Prix (FCFA)<input name="price" type="number" min="0" value="' + E(p.price) + '" required></label><label>Stock<input name="stock" type="number" min="0" value="' + E(p.stock) + '" required></label></div><div class="row"><label>Catégorie<input name="cat" value="' + E(p.cat) + '" placeholder="Vêtements"></label><label>Réduction (%)<input name="promo" type="number" min="0" max="90" value="' + E(p.promo || 0) + '"></label></div><label>Variantes (séparées par une virgule)<input name="variants" value="' + E(p.variants) + '" placeholder="S, M, L ou Rouge, Noir"></label><label>Image du produit<input name="img" type="file" accept="image/jpeg,image/png,image/webp"><span class="hint">JPG, PNG ou WebP, 3 Mo maximum.' + (p.hasImg ? ' Une image existe déjà : choisissez un fichier pour la remplacer.' : '') + '</span></label>' + (p.hasImg ? '<label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="rmi" style="width:auto">Retirer l\'image</label>' : '') + '<label>Vidéo du produit<input name="vid" type="file" accept="video/mp4,video/webm"><span class="hint">MP4 ou WebM, 12 Mo maximum.' + (p.hasVid ? ' Une vidéo existe déjà : choisissez un fichier pour la remplacer.' : '') + '</span></label>' + (p.hasVid ? '<label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="rmv" style="width:auto">Retirer la vidéo</label>' : '') + '<p class="err" id="pErr" role="alert"></p><div class="row"><button class="btn btn--sun" type="submit">Enregistrer</button><button class="btn btn--line" type="button" data-act="close">Annuler</button></div></form>';
    d.showModal();
  }

  /* PayPal : chargement du kit et affichage du bouton de la formule choisie */
  var TEST = ['', 'localhost', '127.0.0.1'].indexOf(location.hostname) > -1;
  var ppLoad;
  function loadPayPal() {
    if (ppLoad) return ppLoad;
    ppLoad = new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = 'https://www.paypal.com/sdk/js?client-id=' + WF.PAYPAL.clientId + '&components=hosted-buttons&disable-funding=venmo&currency=' + WF.PAYPAL.currency;
      sc.onload = res; sc.onerror = function () { ppLoad = null; rej(new Error('paypal')); };
      document.head.appendChild(sc);
    });
    return ppLoad;
  }
  function renderPayPal(plan) {
    var box = $('#ppBox'), done = $('#ppDone'); if (!box) return;
    var id = WF.PAYPAL.buttons[plan];
    box.innerHTML = ''; done.hidden = true;
    if (!id) { box.innerHTML = '<p class="hint">PayPal n\'est pas encore disponible pour cette formule. Choisissez un autre moyen de paiement.</p>'; return; }
    box.innerHTML = '<p class="hint">Chargement de PayPal…</p>';
    loadPayPal().then(function () {
      if (!$('#ppBox')) return;
      var c = 'paypal-container-' + id;
      box.innerHTML = '<div id="' + c + '"></div>';
      paypal.HostedButtons({ hostedButtonId: id }).render('#' + c);
      done.hidden = false;
    }).catch(function () { box.innerHTML = '<p class="err">Impossible de charger PayPal. Vérifiez votre connexion et réessayez.</p>'; });
  }

  var A = {
    ppdone: function () {
      var st = ST(), plan = document.querySelector('#payForm [name=plan]:checked').value, P = WF.PLANS[plan];
      WF.save('stores', function (a) { a.forEach(function (s) { if (s.id === st.id) s.payments = (s.payments || []).concat({ date: Date.now(), plan: plan, moyen: 'PayPal', montant: P.p, ref: 'PP-' + WF.id().toUpperCase(), statut: 'En attente' }); }); });
      toast('Paiement PayPal en attente de vérification'); render();
    },
    confirmpp: function (el) {
      var st = ST(), pay = (st.payments || []).filter(function (x) { return x.ref === el.dataset.ref; })[0]; if (!pay) return;
      var P = WF.PLANS[pay.plan];
      WF.save('stores', function (a) { a.forEach(function (s) {
        if (s.id !== st.id) return;
        s.subEnd = Math.max(s.subEnd, Date.now()) + P.m * 30 * WF.DAY; s.plan = pay.plan; s.paid = true;
        s.payments.forEach(function (x) { if (x.ref === pay.ref) x.statut = 'Confirmé'; });
      }); });
      toast('Paiement confirmé (mode test). Abonnement activé.'); render();
    },
    out: function () { WF.logout(); location.href = 'index.html'; },
    close: function () { $('#dlg').close(); },
    addp: function () { if (!locked()) prodDialog(); },
    editp: function (el) { if (!locked()) prodDialog(el.dataset.id); },
    dupp: function (el) {
      if (locked()) return;
      var src = WF.products().filter(function (x) { return x.id === el.dataset.id; })[0];
      var c = JSON.parse(JSON.stringify(src)); c.id = WF.id(); c.name += ' (copie)';
      var jobs = [];
      if (src.hasImg) jobs.push(WF.media.get(src.id + 'i').then(function (b) { return WF.media.put(c.id + 'i', b); }));
      if (src.hasVid) jobs.push(WF.media.get(src.id + 'v').then(function (b) { return WF.media.put(c.id + 'v', b); }));
      Promise.all(jobs).then(function () { WF.save('products', function (a) { a.push(c); }); toast('Produit dupliqué'); render(); });
    },
    delp: function (el) {
      if (!confirm('Supprimer ce produit ?')) return;
      WF.media.del(el.dataset.id + 'i'); WF.media.del(el.dataset.id + 'v');
      WF.s('products', WF.products().filter(function (x) { return x.id !== el.dataset.id; })); toast('Produit supprimé'); render();
    }
  };
  document.addEventListener('click', function (e) { var el = e.target.closest('[data-act]'); if (el && A[el.dataset.act]) A[el.dataset.act](el); });
  document.addEventListener('change', function (e) {
    if (e.target.name === 'plan' && e.target.closest('#payForm')) renderPayPal(e.target.value);
    if (e.target.dataset.act !== 'status') return;
    WF.save('orders', function (a) { a.forEach(function (o) { if (o.id === e.target.dataset.id) o.status = e.target.value; }); });
    toast('Statut mis à jour : ' + e.target.value);
  });
  window.addEventListener('hashchange', function () { var t = location.hash.slice(1); if (V[t] && TABS.some(function (x) { return x[0] === t; })) { tab = t; render(); } });

  document.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    if (f.id === 'prodForm') {
      if (locked()) return;
      var n = f.elements, id = f.dataset.id, err = $('#pErr');
      if (!n.name.value.trim() || n.price.value === '' || n.stock.value === '') { err.textContent = 'Renseignez le nom, le prix et le stock.'; return; }
      var imgF = n.img.files[0], vidF = n.vid.files[0];
      if (imgF && (!/^image\/(jpeg|png|webp)$/.test(imgF.type) || imgF.size > WF.MAX_IMG)) { err.textContent = 'L\'image doit être au format JPG, PNG ou WebP et peser 3 Mo maximum (taille actuelle : ' + (imgF.size / 1048576).toFixed(1) + ' Mo).'; return; }
      if (vidF && (!/^video\/(mp4|webm)$/.test(vidF.type) || vidF.size > WF.MAX_VIDEO)) { err.textContent = 'La vidéo doit être au format MP4 ou WebM et peser 12 Mo maximum (taille actuelle : ' + (vidF.size / 1048576).toFixed(1) + ' Mo).'; return; }
      var old = id ? WF.products().filter(function (x) { return x.id === id; })[0] : {};
      var pid = id || WF.id();
      var data = { name: n.name.value.trim(), price: +n.price.value, stock: +n.stock.value, cat: n.cat.value.trim(), variants: n.variants.value.trim(), promo: +n.promo.value || 0,
        hasImg: imgF ? true : (n.rmi && n.rmi.checked ? false : !!old.hasImg), hasVid: vidF ? true : (n.rmv && n.rmv.checked ? false : !!old.hasVid) };
      var jobs = [];
      if (imgF) jobs.push(WF.media.put(pid + 'i', imgF)); else if (!data.hasImg && old.hasImg) jobs.push(WF.media.del(pid + 'i'));
      if (vidF) jobs.push(WF.media.put(pid + 'v', vidF)); else if (!data.hasVid && old.hasVid) jobs.push(WF.media.del(pid + 'v'));
      var btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi en cours…';
      Promise.all(jobs).then(function () {
        WF.save('products', function (a) {
          if (id) a.forEach(function (p) { if (p.id === id) Object.assign(p, data); });
          else { data.id = pid; data.store = ST().id; a.push(data); }
        });
        $('#dlg').close(); toast('Produit enregistré'); render();
      }).catch(function () { btn.disabled = false; btn.textContent = 'Enregistrer'; err.textContent = 'Impossible d\'enregistrer les fichiers. Vérifiez l\'espace disponible sur votre appareil.'; });
    } else if (f.id === 'shopForm') {
      if (locked()) return;
      WF.save('stores', function (a) { a.forEach(function (s) { if (s.id === ST().id) { s.name = f.elements.name.value.trim() || s.name; s.desc = f.elements.desc.value.trim(); s.tel = f.elements.tel.value.trim(); s.whatsapp = f.elements.whatsapp.value.trim(); s.color = f.elements.color.value; } }); });
      toast('Boutique mise à jour');
    } else if (f.id === 'profForm') {
      WF.save('users', function (a) { a.forEach(function (x) { if (x.id === u.id) { x.nom = f.elements.nom.value.trim() || x.nom; x.tel = f.elements.tel.value.trim(); } }); });
      u = WF.me(); shell(); render(); toast('Compte mis à jour');
    } else if (f.id === 'payForm') {
      var btn = f.querySelector('button'), plan = f.elements.plan.value, moyen = f.elements.moyen.value;
      btn.disabled = true; btn.textContent = 'Vérification du paiement…';
      setTimeout(function () {
        var st = ST(), P = WF.PLANS[plan];
        WF.save('stores', function (a) { a.forEach(function (s) {
          if (s.id !== st.id) return;
          s.subEnd = Math.max(s.subEnd, Date.now()) + P.m * 30 * WF.DAY; s.plan = plan; s.paid = true;
          s.payments = (s.payments || []).concat({ date: Date.now(), plan: plan, moyen: moyen, montant: P.p, ref: 'WF-' + WF.id().toUpperCase() });
        }); });
        toast('Paiement confirmé. Abonnement activé.'); render();
      }, 1400);
    }
  });

  shell(); render();
})();
