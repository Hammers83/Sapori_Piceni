// js/admin.js

const ORDER_STATUSES = Object.freeze(['In Attesa', 'In Lavorazione', 'Spedito', 'Consegnato', 'Annullato']);
const OFFER_STATUSES = Object.freeze(['In Revisione', 'Accettata', 'Rifiutata']);

function switchAdminSubTab(subTabId, evt) {
  document.querySelectorAll('.admin-sub-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== 'admin-sub-' + subTabId);
  });

  document.querySelectorAll('.tab-group .tab-btn').forEach(btn => btn.classList.remove('active'));
  evt?.currentTarget?.classList.add('active');
}

async function loadAdminData() {
  if (currentProfile?.role !== 'admin') {
    const view = document.getElementById('view-admin');
    if (view) view.innerHTML = '<p class="muted">Accesso riservato agli amministratori.</p>';
    return;
  }

  await Promise.allSettled([
    loadAdminOrders(),
    loadAdminOffers(),
    loadAdminUsers(),
    loadSiteSettingsForm()
  ]);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderOptions(values, selected) {
  return values.map(value =>
    `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`
  ).join('');
}

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTable');
  if (!tbody) return;

  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('id,created_at,shipping_address,total_price,status')
      .order('created_at', { ascending: false });

    if (error) throw error;

    setText('kpiOrders', orders?.length || 0);
    const revenue = (orders || []).reduce((sum, order) => sum + Number(order.total_price || 0), 0);
    setText('kpiRevenue', '€ ' + revenue.toFixed(2));

    if (!orders?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Nessun ordine ricevuto.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(order => {
      const id = escapeHtml(String(order.id));
      const status = order.status || ORDER_STATUSES[0];

      return `
        <tr>
          <td>#${escapeHtml(String(order.id).slice(0, 8))}</td>
          <td>${order.created_at ? new Date(order.created_at).toLocaleDateString('it-IT') : '—'}</td>
          <td>${escapeHtml(order.shipping_address || '')}</td>
          <td>€ ${Number(order.total_price || 0).toFixed(2)}</td>
          <td>${escapeHtml(status)}</td>
          <td>
            <select class="form-control" data-order-id="${id}" onchange="adminUpdateOrderStatus(this.dataset.orderId, this.value)">
              ${renderOptions(ORDER_STATUSES, status)}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Errore caricamento ordini admin:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Errore nel caricamento ordini.</td></tr>';
  }
}

async function adminUpdateOrderStatus(orderId, status) {
  if (!ORDER_STATUSES.includes(status)) return;

  try {
    const { error } = await supabaseClient
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw error;
  } catch (error) {
    console.error('Errore aggiornamento stato ordine:', error);
    alert('Errore aggiornamento stato ordine: ' + error.message);
    await loadAdminOrders();
  }
}

async function loadAdminOffers() {
  const tbody = document.getElementById('adminOffersTable');
  if (!tbody) return;

  try {
    const { data: offers, error } = await supabaseClient
      .from('supplier_offers')
      .select('id,created_at,item_name,quantity,price_total,status')
      .order('created_at', { ascending: false });

    if (error) throw error;

    setText('kpiOffers', offers?.length || 0);

    if (!offers?.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Nessuna offerta ricevuta.</td></tr>';
      return;
    }

    tbody.innerHTML = offers.map(offer => {
      const id = escapeHtml(String(offer.id));
      const status = offer.status || OFFER_STATUSES[0];

      return `
        <tr>
          <td>${offer.created_at ? new Date(offer.created_at).toLocaleDateString('it-IT') : '—'}</td>
          <td>${escapeHtml(offer.item_name || '')}</td>
          <td>${escapeHtml(offer.quantity || '')}</td>
          <td>€ ${Number(offer.price_total || 0).toFixed(2)}</td>
          <td>${escapeHtml(status)}</td>
          <td>
            <select class="form-control" data-offer-id="${id}" onchange="adminUpdateOfferStatus(this.dataset.offerId, this.value)">
              ${renderOptions(OFFER_STATUSES, status)}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Errore caricamento offerte admin:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Errore nel caricamento offerte.</td></tr>';
  }
}

async function adminUpdateOfferStatus(offerId, status) {
  if (!OFFER_STATUSES.includes(status)) return;

  try {
    const { error } = await supabaseClient
      .from('supplier_offers')
      .update({ status })
      .eq('id', offerId);

    if (error) throw error;
  } catch (error) {
    console.error('Errore aggiornamento stato offerta:', error);
    alert('Errore aggiornamento stato offerta: ' + error.message);
    await loadAdminOffers();
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTable');
  if (!tbody) return;

  try {
    const { data: users, error } = await supabaseClient
      .from('profiles')
      .select('id,full_name,company_name,phone,role')
      .order('full_name', { ascending: true });

    if (error) throw error;

    setText('kpiClients', (users || []).filter(user => user.role === 'cliente').length);
    setText('kpiSuppliers', (users || []).filter(user => user.role === 'fornitore').length);

    if (!users?.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Nessun utente registrato.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => {
      const id = escapeHtml(String(user.id));
      const role = APP_CONFIG.allowedRoles.includes(user.role) ? user.role : 'cliente';

      return `
        <tr>
          <td>${escapeHtml(user.full_name || '')}</td>
          <td>${escapeHtml(user.company_name || '—')}</td>
          <td>${escapeHtml(user.phone || '—')}</td>
          <td>${escapeHtml(role)}</td>
          <td>
            <select class="form-control" data-user-id="${id}" onchange="adminUpdateUserRole(this.dataset.userId, this.value)">
              ${renderOptions(APP_CONFIG.allowedRoles, role)}
            </select>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Errore caricamento utenti admin:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Errore nel caricamento utenti.</td></tr>';
  }
}

async function adminUpdateUserRole(userId, role) {
  if (!APP_CONFIG.allowedRoles.includes(role)) return;

  // Nota: questo controllo UI non sostituisce una policy RLS/server-side.
  try {
    const { error } = await supabaseClient
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
    await loadAdminUsers();
  } catch (error) {
    console.error('Errore aggiornamento ruolo:', error);
    alert('Errore aggiornamento ruolo utente: ' + error.message);
    await loadAdminUsers();
  }
}

async function loadSiteSettingsForm() {
  const settings = await fetchSiteSettings();
  const currentText = id => document.getElementById(id)?.textContent.trim() || '';

  const values = {
    setAddress: settings?.address || currentText('contactAddress'),
    setPhone: settings?.phone || currentText('contactPhone'),
    setEmail: settings?.email || currentText('contactEmail'),
    setHeroTitle: settings?.hero_title || currentText('heroTitle'),
    setHeroLead: settings?.hero_subtitle || currentText('heroLead'),
    setHeroAward: settings?.hero_award || currentText('heroAwardText'),
    setAboutP1: settings?.about_p1 || currentText('aboutP1'),
    setAboutP2: settings?.about_p2 || currentText('aboutP2')
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
}

async function adminSaveSiteSettings(e) {
  e.preventDefault();

  const payload = {
    id: 1,
    address: document.getElementById('setAddress')?.value.trim(),
    phone: document.getElementById('setPhone')?.value.trim(),
    email: document.getElementById('setEmail')?.value.trim(),
    hero_title: document.getElementById('setHeroTitle')?.value.trim(),
    hero_subtitle: document.getElementById('setHeroLead')?.value.trim(),
    hero_award: document.getElementById('setHeroAward')?.value.trim(),
    about_p1: document.getElementById('setAboutP1')?.value.trim(),
    about_p2: document.getElementById('setAboutP2')?.value.trim()
  };

  if (Object.values(payload).some(value => value === undefined || value === '')) {
    alert('Compila tutti i campi delle impostazioni.');
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('site_settings')
      .upsert([payload], { onConflict: 'id' });

    if (error) throw error;

    alert('Informazioni del sito aggiornate con successo!');
    await loadSiteSettings();
    await loadSiteSettingsForm();
  } catch (error) {
    console.error('Errore salvataggio impostazioni:', error);
    alert('Errore durante il salvataggio delle impostazioni: ' + error.message);
  }
}

async function adminAddProduct(e) {
  e.preventDefault();

  const name = document.getElementById('pName')?.value.trim();
  const price = Number(document.getElementById('pPrice')?.value);
  const imageUrl = document.getElementById('pImg')?.value.trim();
  const description = document.getElementById('pDesc')?.value.trim();

  if (!name || !description || !Number.isFinite(price) || price < 0) {
    alert('Controlla nome, prezzo e descrizione del prodotto.');
    return;
  }

  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    alert('L\'URL immagine deve iniziare con http:// o https://.');
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('products')
      .insert([{
        name,
        price: Number(price.toFixed(2)),
        image_url: imageUrl || null,
        description
      }]);

    if (error) throw error;

    alert('Prodotto aggiunto con successo al database!');
    document.querySelector('#admin-sub-products form')?.reset();
    await loadProducts();
  } catch (error) {
    console.error('Errore aggiunta prodotto:', error);
    alert('Errore durante l\'aggiunta del prodotto: ' + error.message);
  }
}
