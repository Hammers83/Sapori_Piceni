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
    loadAdminUsers(),
    loadSiteSettingsForm()
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

    // Il conteggio esclude gli account admin (compreso l'admin attualmente collegato):
    // il totale si divide solo tra Clienti e Fornitori realmente registrati.
    const clientsCount = (users || []).filter(u => u.role === 'cliente').length;
    const suppliersCount = (users || []).filter(u => u.role === 'fornitore').length;
    document.getElementById('kpiClients').innerText = clientsCount;
    document.getElementById('kpiSuppliers').innerText = suppliersCount;

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

// Precompila il form "Impostazioni Sito" con i valori salvati (o, in mancanza, con i testi attuali della pagina)
async function loadSiteSettingsForm() {
  const s = await fetchSiteSettings();
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };
  const currentText = (id) => {
    const el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  };

  set('setAddress', (s && s.address) || currentText('contactAddress'));
  set('setPhone', (s && s.phone) || currentText('contactPhone'));
  set('setEmail', (s && s.email) || currentText('contactEmail'));
  set('setHeroTitle', (s && s.hero_title) || currentText('heroTitle'));
  set('setHeroLead', (s && s.hero_subtitle) || currentText('heroLead'));
  set('setHeroAward', (s && s.hero_award) || currentText('heroAwardText'));
  set('setAboutP1', (s && s.about_p1) || currentText('aboutP1'));
  set('setAboutP2', (s && s.about_p2) || currentText('aboutP2'));
}

// Salva le informazioni generali del sito (indirizzo, contatti, hero, chi siamo)
async function adminSaveSiteSettings(e) {
  e.preventDefault();
  const payload = {
    id: 1,
    address: document.getElementById('setAddress').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    hero_title: document.getElementById('setHeroTitle').value.trim(),
    hero_subtitle: document.getElementById('setHeroLead').value.trim(),
    hero_award: document.getElementById('setHeroAward').value.trim(),
    about_p1: document.getElementById('setAboutP1').value.trim(),
    about_p2: document.getElementById('setAboutP2').value.trim()
  };

  try {
    const { error } = await supabaseClient
      .from('site_settings')
      .upsert([payload], { onConflict: 'id' });
    if (error) throw error;

    alert('Informazioni del sito aggiornate con successo!');
    await loadSiteSettings(); // riallinea anche le pagine pubbliche già in memoria
  } catch (err) {
    alert('Errore durante il salvataggio delle impostazioni: ' + err.message);
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
