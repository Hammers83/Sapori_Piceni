// js/admin.js

function switchAdminSubTab(subTabId, evt) {
  document.querySelectorAll('.admin-sub-content').forEach(el => {
    el.classList.add('hidden');
  });

  const target = document.getElementById('admin-sub-' + subTabId);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.tab-group .tab-btn').forEach(btn => btn.classList.remove('active'));
  if (evt && evt.target) {
    evt.target.classList.add('active');
  }
}

// Carica tutti i dati della dashboard executive: KPI + tabelle
async function loadAdminData() {
  if (!currentProfile || currentProfile.role !== 'admin') {
    document.getElementById('view-admin').innerHTML = '<p class="muted">Accesso riservato agli amministratori.</p>';
    return;
  }

  await Promise.all([
    loadAdminOrders(),
    loadAdminOffers(),
    loadAdminUsers()
  ]);
}

async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTable');
  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    document.getElementById('kpiOrders').innerText = orders ? orders.length : 0;
    const revenue = (orders || []).reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    document.getElementById('kpiRevenue').innerText = '€ ' + revenue.toFixed(2);

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Nessun ordine ricevuto.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${String(o.id).slice(0, 8)}</td>
        <td>${o.created_at ? new Date(o.created_at).toLocaleDateString('it-IT') : '—'}</td>
        <td>${escapeHtml(o.shipping_address || '')}</td>
        <td>€ ${parseFloat(o.total_price || 0).toFixed(2)}</td>
        <td>${escapeHtml(o.status || 'In Attesa')}</td>
        <td>
          <select class="form-control" onchange="adminUpdateOrderStatus('${o.id}', this.value)">
            ${['In Attesa', 'In Lavorazione', 'Spedito', 'Consegnato', 'Annullato'].map(s =>
              `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Errore nel caricamento ordini.</td></tr>';
    console.error(err);
  }
}

async function adminUpdateOrderStatus(orderId, status) {
  try {
    const { error } = await supabaseClient.from('orders').update({ status }).eq('id', orderId);
    if (error) throw error;
  } catch (err) {
    alert('Errore aggiornamento stato ordine: ' + err.message);
  }
}

async function loadAdminOffers() {
  const tbody = document.getElementById('adminOffersTable');
  try {
    const { data: offers, error } = await supabaseClient
      .from('supplier_offers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    document.getElementById('kpiOffers').innerText = offers ? offers.length : 0;

    if (!offers || offers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Nessuna offerta ricevuta.</td></tr>';
      return;
    }

    tbody.innerHTML = offers.map(o => `
      <tr>
        <td>${o.created_at ? new Date(o.created_at).toLocaleDateString('it-IT') : '—'}</td>
        <td>${escapeHtml(o.item_name || '')}</td>
        <td>${escapeHtml(o.quantity || '')}</td>
        <td>€ ${parseFloat(o.price_total || 0).toFixed(2)}</td>
        <td>${escapeHtml(o.status || 'In Revisione')}</td>
        <td>
          <select class="form-control" onchange="adminUpdateOfferStatus('${o.id}', this.value)">
            ${['In Revisione', 'Accettata', 'Rifiutata'].map(s =>
              `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Errore nel caricamento offerte.</td></tr>';
    console.error(err);
  }
}

async function adminUpdateOfferStatus(offerId, status) {
  try {
    const { error } = await supabaseClient.from('supplier_offers').update({ status }).eq('id', offerId);
    if (error) throw error;
  } catch (err) {
    alert('Errore aggiornamento stato offerta: ' + err.message);
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTable');
  try {
    const { data: users, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;

    document.getElementById('kpiUsers').innerText = users ? users.length : 0;

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Nessun utente registrato.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.full_name || '')}</td>
        <td>${escapeHtml(u.company_name || '—')}</td>
        <td>${escapeHtml(u.phone || '—')}</td>
        <td>${escapeHtml(u.role || 'cliente')}</td>
        <td>
          <select class="form-control" onchange="adminUpdateUserRole('${u.id}', this.value)">
            ${['cliente', 'fornitore', 'admin'].map(r =>
              `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Errore nel caricamento utenti.</td></tr>';
    console.error(err);
  }
}

async function adminUpdateUserRole(userId, role) {
  try {
    const { error } = await supabaseClient.from('profiles').update({ role }).eq('id', userId);
    if (error) throw error;
  } catch (err) {
    alert('Errore aggiornamento ruolo utente: ' + err.message);
  }
}

async function adminAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById('pName').value;
  const price = parseFloat(document.getElementById('pPrice').value);
  const image_url = document.getElementById('pImg').value;
  const description = document.getElementById('pDesc').value;

  try {
    const { error } = await supabaseClient
      .from('products')
      .insert([{ name, price, image_url, description }]);

    if (error) throw error;

    alert('Prodotto aggiunto con successo al database!');
    document.querySelector('#admin-sub-products form').reset();

    if (typeof loadProducts === 'function') loadProducts();
  } catch (err) {
    alert('Errore durante l\'aggiunta del prodotto: ' + err.message);
  }
}
