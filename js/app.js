// js/app.js

if (typeof window.cart === 'undefined') {
  window.cart = [];
}
var cart = window.cart;

// Viste accessibili solo agli utenti registrati e loggati
const RESTRICTED_VIEWS = ['cart', 'client-dashboard', 'supplier-dashboard', 'admin', 'chat'];

document.addEventListener('DOMContentLoaded', () => {
  checkUserSession();
  loadProducts();
  setupNavToggle();
  switchTab('home');
});

// MENU MOBILE (sostituisce bootstrap.Collapse)
function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const collapse = document.getElementById('mainNavCollapse');
  if (!toggle || !collapse) return;

  toggle.addEventListener('click', () => {
    const isOpen = collapse.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function closeMobileNav() {
  const toggle = document.getElementById('navToggle');
  const collapse = document.getElementById('mainNavCollapse');
  if (collapse && collapse.classList.contains('open')) {
    collapse.classList.remove('open');
    if (toggle) {
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }
}

// CAMBIO SCHEDA / VISTA
function switchTab(viewId) {
  // Il carrello e le aree riservate sono accessibili solo a chi ha effettuato l'accesso
  if (RESTRICTED_VIEWS.includes(viewId) && !currentUser) {
    closeMobileNav();
    showAuthNotice('Devi accedere o registrarti per usare questa funzione.');
    return;
  }

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetSection = document.getElementById('view-' + viewId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  document.querySelectorAll('#mainNav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.getElementById('nav-' + viewId);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  if (viewId === 'cart') updateCartUI();
  if (viewId === 'client-dashboard') loadClientOrders();
  if (viewId === 'supplier-dashboard') loadSupplierOffers();
  if (viewId === 'admin') loadAdminData();
  if (viewId === 'chat') loadChatMessages();

  closeMobileNav();
}

// CARICAMENTO PRODOTTI DA SUPABASE
async function loadProducts() {
  const homeGrid = document.getElementById('homeProductGrid');
  const productGrid = document.getElementById('productGrid');
  const loadingMsg = '<p class="muted">Caricamento prodotti...</p>';

  if (homeGrid) homeGrid.innerHTML = loadingMsg;
  if (productGrid) productGrid.innerHTML = loadingMsg;

  try {
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('*');

    if (error) throw error;

    if (!products || products.length === 0) {
      const emptyMsg = '<p class="muted">Nessun prodotto disponibile al momento.</p>';
      if (homeGrid) homeGrid.innerHTML = emptyMsg;
      if (productGrid) productGrid.innerHTML = emptyMsg;
      return;
    }

    let homeHTML = '';
    let shopHTML = '';

    products.forEach((p, index) => {
      const cardHTML = `
        <div class="product-card">
          <img src="${p.image_url || 'https://placehold.co/300x200?text=Sapori+Piceni'}" alt="${escapeHtml(p.name)}" loading="lazy">
          <div class="product-card__body">
            <h5>${escapeHtml(p.name)}</h5>
            <p class="product-card__desc">${escapeHtml(p.description || '')}</p>
            <div class="product-card__footer">
              <span class="product-card__price">€ ${parseFloat(p.price).toFixed(2)}</span>
              <button class="btn btn-green btn-sm" onclick="addToCart('${p.id}', '${String(p.name).replace(/'/g, "\\'")}', ${p.price})">
                <i class="fa-solid fa-cart-plus"></i> Aggiungi
              </button>
            </div>
          </div>
        </div>
      `;
      shopHTML += cardHTML;
      if (index < 3) homeHTML += cardHTML;
    });

    if (homeGrid) homeGrid.innerHTML = homeHTML;
    if (productGrid) productGrid.innerHTML = shopHTML;

  } catch (err) {
    console.error('Errore durante il caricamento prodotti:', err);
    const errorMsg = '<p class="muted">Errore nel caricamento dei prodotti.</p>';
    if (homeGrid) homeGrid.innerHTML = errorMsg;
    if (productGrid) productGrid.innerHTML = errorMsg;
  }
}

// GESTIONE CARRELLO (riservata agli utenti registrati e loggati)
function addToCart(id, name, price) {
  if (!currentUser) {
    showAuthNotice('Accedi o registrati per aggiungere prodotti al carrello.');
    return;
  }

  const existingItem = cart.find(item => item.id === id);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ id, name, price: parseFloat(price), qty: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  const cartCnt = document.getElementById('cartCnt');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');

  let totalQty = 0;
  let totalPrice = 0;
  let itemsHTML = '';

  cart.forEach((item, index) => {
    totalQty += item.qty;
    const itemTotal = item.price * item.qty;
    totalPrice += itemTotal;

    itemsHTML += `
      <div class="cart-line">
        <div>
          <div class="cart-line__name">${escapeHtml(item.name)}</div>
          <div class="cart-line__unit">€ ${item.price.toFixed(2)} x ${item.qty}</div>
        </div>
        <div class="cart-line__right">
          <span class="cart-line__total">€ ${itemTotal.toFixed(2)}</span>
          <button class="btn btn-outline-danger" onclick="removeFromCart(${index})">&times;</button>
        </div>
      </div>
    `;
  });

  if (cartCnt) cartCnt.innerText = totalQty;
  if (cartTotal) cartTotal.innerText = totalPrice.toFixed(2);
  if (cartItems) {
    cartItems.innerHTML = cart.length > 0 ? itemsHTML : '<p class="muted mb-0">Il carrello è vuoto.</p>';
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

async function submitClientOrder(e) {
  e.preventDefault();
  if (!currentUser) {
    showAuthNotice('Devi accedere per completare un ordine.');
    return;
  }
  if (cart.length === 0) {
    alert('Il carrello è vuoto!');
    return;
  }

  const address = document.getElementById('shipAddress').value;
  const date = document.getElementById('shipDate').value;
  const notes = document.getElementById('shipNotes').value;
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  try {
    const { error } = await supabaseClient
      .from('orders')
      .insert([{
        user_id: currentUser.id,
        items: cart,
        total_price: total,
        shipping_address: address,
        delivery_date: date,
        notes: notes,
        status: 'In Attesa'
      }]);

    if (error) throw error;

    alert('Ordine inviato con successo!');
    cart.length = 0;
    updateCartUI();
    document.querySelector('#view-cart form').reset();
    switchTab('client-dashboard');
  } catch (err) {
    alert('Errore durante l\'invio dell\'ordine: ' + err.message);
  }
}

// AREA CLIENTE: elenco ordini personali
async function loadClientOrders() {
  const el = document.getElementById('clientOrdersList');
  if (!el || !currentUser) return;
  el.innerHTML = '<p class="muted">Caricamento ordini...</p>';

  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      el.innerHTML = '<p class="muted">Non hai ancora effettuato ordini.</p>';
      return;
    }

    el.innerHTML = orders.map(o => `
      <div class="cart-line">
        <div>
          <div class="cart-line__name">${escapeHtml(o.shipping_address || '')}</div>
          <div class="cart-line__unit">Consegna: ${o.delivery_date || '—'} · Stato: ${escapeHtml(o.status || 'In Attesa')}</div>
        </div>
        <div class="cart-line__total">€ ${parseFloat(o.total_price || 0).toFixed(2)}</div>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = '<p class="muted">Errore nel caricamento degli ordini.</p>';
    console.error(err);
  }
}

// AREA FORNITORE: invio e storico offerte
async function submitSupplierOffer(e) {
  e.preventDefault();
  if (!currentUser) return;

  const item = document.getElementById('supItem').value;
  const qty = document.getElementById('supQty').value;
  const price = parseFloat(document.getElementById('supPrice').value);

  try {
    const { error } = await supabaseClient
      .from('supplier_offers')
      .insert([{
        user_id: currentUser.id,
        item_name: item,
        quantity: qty,
        price_total: price,
        status: 'In Revisione'
      }]);
    if (error) throw error;

    alert('Offerta inviata con successo!');
    document.querySelector('#view-supplier-dashboard form').reset();
    loadSupplierOffers();
  } catch (err) {
    alert('Errore durante l\'invio dell\'offerta: ' + err.message);
  }
}

async function loadSupplierOffers() {
  const el = document.getElementById('supplierOffersList');
  if (!el || !currentUser) return;
  el.innerHTML = '<p class="muted">Caricamento offerte...</p>';

  try {
    const { data: offers, error } = await supabaseClient
      .from('supplier_offers')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!offers || offers.length === 0) {
      el.innerHTML = '<p class="muted">Non hai ancora inviato offerte.</p>';
      return;
    }

    el.innerHTML = offers.map(o => `
      <div class="cart-line">
        <div>
          <div class="cart-line__name">${escapeHtml(o.item_name)}</div>
          <div class="cart-line__unit">${escapeHtml(o.quantity)} · Stato: ${escapeHtml(o.status || 'In Revisione')}</div>
        </div>
        <div class="cart-line__total">€ ${parseFloat(o.price_total || 0).toFixed(2)}</div>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = '<p class="muted">Errore nel caricamento delle offerte.</p>';
    console.error(err);
  }
}

// CHAT DI ASSISTENZA
async function loadChatMessages() {
  const el = document.getElementById('chatMessages');
  if (!el || !currentUser) return;

  try {
    const { data: messages, error } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    el.innerHTML = (messages && messages.length > 0)
      ? messages.map(renderChatMessage).join('')
      : '<div class="chat-msg chat-msg--system">Scrivi il tuo primo messaggio: il nostro staff ti risponderà al più presto.</div>';
    el.scrollTop = el.scrollHeight;
  } catch (err) {
    el.innerHTML = '<div class="chat-msg chat-msg--system">Scrivi il tuo primo messaggio: il nostro staff ti risponderà al più presto.</div>';
  }
}

function renderChatMessage(m) {
  const cls = m.sender === 'staff' ? 'chat-msg' : 'chat-msg chat-msg--me';
  return `<div class="${cls}">${escapeHtml(m.content)}</div>`;
}

async function sendChatMessage(e) {
  e.preventDefault();
  if (!currentUser) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const el = document.getElementById('chatMessages');
  el.insertAdjacentHTML('beforeend', renderChatMessage({ sender: 'me', content: text }));
  el.scrollTop = el.scrollHeight;
  input.value = '';

  try {
    await supabaseClient.from('chat_messages').insert([{
      user_id: currentUser.id,
      sender: 'me',
      content: text
    }]);
  } catch (err) {
    console.warn('Messaggio non salvato sul server:', err.message);
  }
}
