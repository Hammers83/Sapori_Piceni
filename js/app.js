// js/app.js

const RESTRICTED_VIEWS = Object.freeze(['cart', 'client-dashboard', 'supplier-dashboard', 'admin', 'chat']);
const CART_STORAGE_KEY = 'sapori-piceni:cart:v1';

let cart = loadCart();

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  setupNavToggle();
  setupProductActions();
  setupDateConstraints();

  await Promise.allSettled([
    loadSiteSettings(),
    loadProducts()
  ]);

  await checkUserSession();
  switchTab(currentProfile?.role === 'admin' ? 'admin' : 'home');
  updateCartUI();
}

function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const collapse = document.getElementById('mainNavCollapse');
  if (!toggle || !collapse) return;

  toggle.addEventListener('click', () => {
    const isOpen = collapse.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

function closeMobileNav() {
  const toggle = document.getElementById('navToggle');
  const collapse = document.getElementById('mainNavCollapse');
  collapse?.classList.remove('open');
  toggle?.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}

function setupDateConstraints() {
  const input = document.getElementById('shipDate');
  if (input) input.min = new Date().toISOString().slice(0, 10);
}

function switchTab(viewId) {
  if (RESTRICTED_VIEWS.includes(viewId) && !currentUser) {
    closeMobileNav();
    showAuthNotice('Devi accedere o registrarti per usare questa funzione.');
    return;
  }

  if (currentProfile?.role === 'admin' && viewId !== 'admin') viewId = 'admin';

  const target = document.getElementById('view-' + viewId);
  if (!target) return;

  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.toggle('active', section === target);
  });

  document.querySelectorAll('#mainNav .nav-link').forEach(link => {
    link.classList.remove('active');
  });

  document.getElementById('nav-' + viewId)?.classList.add('active');

  const loaders = {
    cart: updateCartUI,
    'client-dashboard': loadClientOrders,
    'supplier-dashboard': loadSupplierOffers,
    admin: loadAdminData,
    chat: loadChatMessages
  };

  loaders[viewId]?.();
  closeMobileNav();
}

let siteSettings = null;

async function fetchSiteSettings() {
  const { data, error } = await supabaseClient
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.warn('Impostazioni sito non disponibili:', error.message);
    return null;
  }

  siteSettings = data || null;
  return siteSettings;
}

async function loadSiteSettings() {
  const settings = await fetchSiteSettings();
  if (!settings) return;

  const fields = {
    topBarAddress: settings.address,
    contactAddress: settings.address,
    contactEmail: settings.email,
    contactPhone: settings.phone,
    heroTitle: settings.hero_title,
    heroLead: settings.hero_subtitle,
    heroAwardText: settings.hero_award,
    aboutP1: settings.about_p1,
    aboutP2: settings.about_p2
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element && value) element.textContent = value;
  });
}

function formatCurrency(value) {
  const amount = Number(value);
  return new Intl.NumberFormat(APP_CONFIG.locale, {
    style: 'currency',
    currency: APP_CONFIG.currency
  }).format(Number.isFinite(amount) ? amount : 0);
}

function parsePrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    return stored
      .filter(item => item && item.id && item.name)
      .map(item => ({
        id: String(item.id),
        name: String(item.name),
        price: parsePrice(item.price),
        qty: Math.min(Math.max(Number.parseInt(item.qty, 10) || 1, 1), APP_CONFIG.maxCartQuantity)
      }));
  } catch {
    return [];
  }
}

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn('Impossibile salvare il carrello localmente:', error);
  }
}

async function loadProducts() {
  const homeGrid = document.getElementById('homeProductGrid');
  const productGrid = document.getElementById('productGrid');
  const loading = '<p class="muted">Caricamento prodotti...</p>';

  if (homeGrid) homeGrid.innerHTML = loading;
  if (productGrid) productGrid.innerHTML = loading;

  try {
    const { data: products, error } = await supabaseClient
      .from('products')
      .select('id,name,price,image_url,description')
      .order('name', { ascending: true });

    if (error) throw error;

    if (!products?.length) {
      const empty = '<p class="muted">Nessun prodotto disponibile al momento.</p>';
      if (homeGrid) homeGrid.innerHTML = empty;
      if (productGrid) productGrid.innerHTML = empty;
      return;
    }

    const shopHtml = products.map(renderProductCard).join('');
    const homeHtml = products.slice(0, 3).map(renderProductCard).join('');

    if (homeGrid) homeGrid.innerHTML = homeHtml;
    if (productGrid) productGrid.innerHTML = shopHtml;
  } catch (error) {
    console.error('Errore durante il caricamento prodotti:', error);
    const message = '<p class="muted">Errore nel caricamento dei prodotti. Riprova più tardi.</p>';
    if (homeGrid) homeGrid.innerHTML = message;
    if (productGrid) productGrid.innerHTML = message;
  }
}

function renderProductCard(product) {
  const id = escapeHtml(product.id);
  const price = parsePrice(product.price);

  return `
    <article class="product-card">
      <img src="${safeHttpUrl(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
      <div class="product-card__body">
        <h5>${escapeHtml(product.name)}</h5>
        <p class="product-card__desc">${escapeHtml(product.description || '')}</p>
        <div class="product-card__footer">
          <span class="product-card__price">${formatCurrency(price)}</span>
          <button type="button" class="btn btn-green btn-sm js-add-to-cart" data-product-id="${id}" aria-label="Aggiungi ${escapeHtml(product.name)} al carrello">
            <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Aggiungi
          </button>
        </div>
      </div>
    </article>
  `;
}

function setupProductActions() {
  document.addEventListener('click', event => {
    const button = event.target.closest('.js-add-to-cart');
    if (!button) return;

    const id = button.dataset.productId;
    if (!id) return;

    addToCartById(id);
  });
}

async function addToCartById(productId) {
  if (!currentUser) {
    showAuthNotice('Accedi o registrati per aggiungere prodotti al carrello.');
    return;
  }

  const { data: product, error } = await supabaseClient
    .from('products')
    .select('id,name,price')
    .eq('id', productId)
    .maybeSingle();

  if (error || !product) {
    alert('Il prodotto non è più disponibile.');
    return;
  }

  addToCart(product.id, product.name, parsePrice(product.price));
}

function addToCart(id, name, price) {
  const existing = cart.find(item => String(item.id) === String(id));

  if (existing) {
    existing.qty = Math.min(existing.qty + 1, APP_CONFIG.maxCartQuantity);
  } else {
    cart.push({ id: String(id), name: String(name), price: parsePrice(price), qty: 1 });
  }

  persistCart();
  updateCartUI();
}

function updateCartUI() {
  const cartCnt = document.getElementById('cartCnt');
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cartCnt) cartCnt.textContent = String(totalQty);
  if (cartTotal) cartTotal.textContent = total.toFixed(2);

  if (!cartItems) return;

  cartItems.innerHTML = cart.length
    ? cart.map((item, index) => `
      <div class="cart-line">
        <div>
          <div class="cart-line__name">${escapeHtml(item.name)}</div>
          <div class="cart-line__unit">${formatCurrency(item.price)} × ${item.qty}</div>
        </div>
        <div class="cart-line__right">
          <span class="cart-line__total">${formatCurrency(item.price * item.qty)}</span>
          <button type="button" class="btn btn-outline-danger" onclick="removeFromCart(${index})" aria-label="Rimuovi ${escapeHtml(item.name)}">&times;</button>
        </div>
      </div>
    `).join('')
    : '<p class="muted mb-0">Il carrello è vuoto.</p>';
}

function removeFromCart(index) {
  if (!Number.isInteger(index) || index < 0 || index >= cart.length) return;
  cart.splice(index, 1);
  persistCart();
  updateCartUI();
}

async function submitClientOrder(e) {
  e.preventDefault();

  if (!currentUser) {
    showAuthNotice('Devi accedere per completare un ordine.');
    return;
  }

  if (!cart.length) {
    alert('Il carrello è vuoto.');
    return;
  }

  const address = document.getElementById('shipAddress')?.value.trim();
  const date = document.getElementById('shipDate')?.value;
  const notes = document.getElementById('shipNotes')?.value.trim() || '';

  if (!address || !date) {
    alert('Inserisci indirizzo e data di consegna.');
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const payload = {
    user_id: currentUser.id,
    items: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
    total_price: Number(total.toFixed(2)),
    shipping_address: address,
    delivery_date: date,
    notes,
    status: 'In Attesa'
  };

  try {
    const { error } = await supabaseClient.from('orders').insert([payload]);
    if (error) throw error;

    alert('Ordine inviato con successo!');
    cart = [];
    persistCart();
    updateCartUI();
    document.querySelector('#view-cart form')?.reset();
    switchTab('client-dashboard');
  } catch (error) {
    console.error('Errore invio ordine:', error);
    alert('Errore durante l\'invio dell\'ordine: ' + error.message);
  }
}

async function loadClientOrders() {
  const element = document.getElementById('clientOrdersList');
  if (!element || !currentUser) return;

  element.innerHTML = '<p class="muted">Caricamento ordini...</p>';

  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('id,created_at,shipping_address,delivery_date,status,total_price')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    element.innerHTML = orders?.length
      ? orders.map(order => `
        <div class="cart-line">
          <div>
            <div class="cart-line__name">#${escapeHtml(String(order.id).slice(0, 8))} · ${escapeHtml(order.shipping_address || '')}</div>
            <div class="cart-line__unit">Consegna: ${escapeHtml(order.delivery_date || '—')} · Stato: ${escapeHtml(order.status || 'In Attesa')}</div>
          </div>
          <div class="cart-line__total">${formatCurrency(order.total_price)}</div>
        </div>
      `).join('')
      : '<p class="muted">Non hai ancora effettuato ordini.</p>';
  } catch (error) {
    console.error('Errore caricamento ordini cliente:', error);
    element.innerHTML = '<p class="muted">Errore nel caricamento degli ordini.</p>';
  }
}

async function submitSupplierOffer(e) {
  e.preventDefault();
  if (!currentUser) return;

  const item = document.getElementById('supItem')?.value.trim();
  const quantity = document.getElementById('supQty')?.value.trim();
  const price = Number(document.getElementById('supPrice')?.value);

  if (!item || !quantity || !Number.isFinite(price) || price < 0) {
    alert('Controlla materia prima, quantità e prezzo.');
    return;
  }

  try {
    const { error } = await supabaseClient.from('supplier_offers').insert([{
      user_id: currentUser.id,
      item_name: item,
      quantity,
      price_total: Number(price.toFixed(2)),
      status: 'In Revisione'
    }]);

    if (error) throw error;

    alert('Offerta inviata con successo!');
    document.querySelector('#view-supplier-dashboard form')?.reset();
    await loadSupplierOffers();
  } catch (error) {
    console.error('Errore invio offerta:', error);
    alert('Errore durante l\'invio dell\'offerta: ' + error.message);
  }
}

async function loadSupplierOffers() {
  const element = document.getElementById('supplierOffersList');
  if (!element || !currentUser) return;

  element.innerHTML = '<p class="muted">Caricamento offerte...</p>';

  try {
    const { data: offers, error } = await supabaseClient
      .from('supplier_offers')
      .select('id,created_at,item_name,quantity,price_total,status')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    element.innerHTML = offers?.length
      ? offers.map(offer => `
        <div class="cart-line">
          <div>
            <div class="cart-line__name">${escapeHtml(offer.item_name || '')}</div>
            <div class="cart-line__unit">${escapeHtml(offer.quantity || '')} · Stato: ${escapeHtml(offer.status || 'In Revisione')}</div>
          </div>
          <div class="cart-line__total">${formatCurrency(offer.price_total)}</div>
        </div>
      `).join('')
      : '<p class="muted">Non hai ancora inviato offerte.</p>';
  } catch (error) {
    console.error('Errore caricamento offerte:', error);
    element.innerHTML = '<p class="muted">Errore nel caricamento delle offerte.</p>';
  }
}

async function loadChatMessages() {
  const element = document.getElementById('chatMessages');
  if (!element || !currentUser) return;

  try {
    const { data: messages, error } = await supabaseClient
      .from('chat_messages')
      .select('id,created_at,sender,content')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    element.innerHTML = messages?.length
      ? messages.map(renderChatMessage).join('')
      : '<div class="chat-msg chat-msg--system">Scrivi il tuo primo messaggio: il nostro staff ti risponderà al più presto.</div>';

    element.scrollTop = element.scrollHeight;
  } catch (error) {
    console.error('Errore caricamento chat:', error);
    element.innerHTML = '<div class="chat-msg chat-msg--system">Impossibile caricare la chat in questo momento.</div>';
  }
}

function renderChatMessage(message) {
  const mine = message.sender !== 'staff';
  return `<div class="chat-msg${mine ? ' chat-msg--me' : ''}">${escapeHtml(message.content)}</div>`;
}

async function sendChatMessage(e) {
  e.preventDefault();
  if (!currentUser) return;

  const input = document.getElementById('chatInput');
  const element = document.getElementById('chatMessages');
  const message = input?.value.trim();

  if (!input || !element || !message) return;

  input.disabled = true;

  try {
    const { error } = await supabaseClient.from('chat_messages').insert([{
      user_id: currentUser.id,
      sender: 'me',
      content: message
    }]);

    if (error) throw error;

    input.value = '';
    await loadChatMessages();
  } catch (error) {
    console.error('Errore invio messaggio:', error);
    alert('Messaggio non inviato: ' + error.message);
  } finally {
    input.disabled = false;
    input.focus();
  }
}
