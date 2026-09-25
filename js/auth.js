// js/auth.js

// Alterna i Form tra Login e Registrazione
function toggleAuthMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authTitle = document.getElementById('authTitle');
  const notice = document.getElementById('authNotice');

  notice.classList.add('hidden');
  notice.innerText = '';

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authTitle.innerText = 'Crea un Account';
  } else {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authTitle.innerText = 'Accedi al Portale';
  }
}

// Mostra/Nasconde la Ragione Sociale se Fornitore
function toggleCompanyField(role) {
  const companyGroup = document.getElementById('companyGroup');
  if (role === 'fornitore') {
    companyGroup.classList.remove('hidden');
  } else {
    companyGroup.classList.add('hidden');
  }
}

function showAuthNotice(message) {
  switchTab('auth');
  toggleAuthMode('login');
  const notice = document.getElementById('authNotice');
  notice.innerText = message;
  notice.classList.remove('hidden');
}

// Applica allo stato dell'interfaccia il fatto che l'utente sia loggato o meno:
// - Mostra/nasconde il carrello nella barra di navigazione
// - Mostra/nasconde i link dedicati al ruolo (cliente / fornitore / admin)
// - Fa riapparire il pulsante Accedi/Registrati quando non si è più loggati
function applyAuthUI() {
  const userInfoBar = document.getElementById('userInfoBar');
  const cartNavItem = document.getElementById('nav-cart-item');
  const accountLinks = document.getElementById('nav-account-links');

  if (currentUser) {
    const role = currentProfile ? currentProfile.role : 'cliente';
    const name = (currentProfile && currentProfile.full_name) ? currentProfile.full_name : currentUser.email;

    // Barra utente: nome + logout
    userInfoBar.innerHTML = `
      <span class="me-2"><i class="fa-solid fa-user"></i> ${escapeHtml(name)} (${escapeHtml(role)})</span>
      <span class="sep">|</span>
      <a role="button" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
    `;

    // Il carrello diventa visibile solo per gli utenti registrati e loggati
    cartNavItem.classList.remove('hidden');

    // Link dedicati al ruolo dell'utente
    let links = '';
    if (role === 'admin') {
      links += `<a class="nav-link" onclick="switchTab('admin')" id="nav-admin" role="button"><i class="fa-solid fa-user-shield"></i> Admin</a>`;
    } else if (role === 'fornitore') {
      links += `<a class="nav-link" onclick="switchTab('supplier-dashboard')" id="nav-supplier" role="button">Area Fornitore</a>`;
    } else {
      links += `<a class="nav-link" onclick="switchTab('client-dashboard')" id="nav-client" role="button">Area Personale</a>`;
    }
    links += `<a class="nav-link" onclick="switchTab('chat')" id="nav-chat" role="button"><i class="fa-solid fa-comments"></i> Assistenza</a>`;
    accountLinks.innerHTML = links;

  } else {
    // Utente non autenticato: pulsante Accedi/Registrati sempre visibile
    userInfoBar.innerHTML = `
      <a role="button" onclick="switchTab('auth'); toggleAuthMode('login');"><i class="fa-solid fa-right-to-bracket"></i> Accedi</a>
      <span class="sep">|</span>
      <a role="button" class="register-link" onclick="switchTab('auth'); toggleAuthMode('register');"><i class="fa-solid fa-user-plus"></i> Registrati</a>
    `;

    // Il carrello resta nascosto agli utenti non registrati
    cartNavItem.classList.add('hidden');
    accountLinks.innerHTML = '';

    // Se l'utente era su una vista riservata, lo riportiamo alla home
    const restrictedViews = ['cart', 'client-dashboard', 'supplier-dashboard', 'admin', 'chat'];
    const activeSection = document.querySelector('.view-section.active');
    if (activeSection && restrictedViews.includes(activeSection.id.replace('view-', ''))) {
      switchTab('home');
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Carica il profilo (ruolo, nome, azienda...) collegato all'utente autenticato
async function loadCurrentProfile(user) {
  if (!user) { currentProfile = null; return; }
  try {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    currentProfile = profile;
  } catch (err) {
    console.warn('Impossibile caricare il profilo utente:', err.message);
    currentProfile = null;
  }
}

// Verifica lo stato della sessione utente all'avvio dell'app
async function checkUserSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session ? session.user : null;
    await loadCurrentProfile(currentUser);
  } catch (err) {
    console.error('Errore nel controllo della sessione:', err);
    currentUser = null;
    currentProfile = null;
  }
  applyAuthUI();
}

// Resta in ascolto dei cambi di stato dell'autenticazione (login / logout / refresh)
// così l'interfaccia (in particolare il carrello) si aggiorna sempre in automatico.
supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session ? session.user : null;
  await loadCurrentProfile(currentUser);
  applyAuthUI();
});

// Login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = data.user;
    await loadCurrentProfile(currentUser);
    applyAuthUI();

    document.getElementById('loginForm').reset();
    switchTab('home');
  } catch (err) {
    showAuthNotice('Errore di accesso: ' + err.message);
  }
}

// Registrazione
async function handleRegister(e) {
  e.preventDefault();
  const role = document.getElementById('regRole').value;
  const fullName = document.getElementById('regFullName').value.trim();
  const company = document.getElementById('regCompany').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    const user = data.user;
    if (user) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: user.id,
          full_name: fullName,
          company_name: company,
          phone: phone,
          role: role
        }]);
      if (profileError) console.error('Errore salvataggio profilo:', profileError);
    }

    // Se la conferma via email è disabilitata, Supabase restituisce già una sessione attiva
    if (data.session) {
      currentUser = data.user;
      await loadCurrentProfile(currentUser);
      applyAuthUI();
      document.getElementById('registerForm').reset();
      switchTab('home');
    } else {
      document.getElementById('registerForm').reset();
      toggleAuthMode('login');
      showAuthNotice('Registrazione completata! Controlla la tua email per confermare l\'account, poi accedi.');
    }
  } catch (err) {
    showAuthNotice('Errore durante la registrazione: ' + err.message);
  }
}

// Logout
async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  applyAuthUI();
  switchTab('home');
}
