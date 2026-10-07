// js/auth.js

const PUBLIC_ROLE = 'cliente';

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authTitle = document.getElementById('authTitle');
  const notice = document.getElementById('authNotice');

  if (!loginForm || !registerForm || !authTitle || !notice) return;

  notice.classList.add('hidden');
  notice.textContent = '';

  const register = mode === 'register';
  loginForm.classList.toggle('hidden', register);
  registerForm.classList.toggle('hidden', !register);
  authTitle.textContent = register ? 'Crea un Account' : 'Accedi al Portale';

  if (register) toggleCompanyField(document.getElementById('regRole')?.value || PUBLIC_ROLE);
}

function toggleCompanyField(role) {
  const companyGroup = document.getElementById('companyGroup');
  const companyInput = document.getElementById('regCompany');
  if (!companyGroup || !companyInput) return;

  const supplier = role === 'fornitore';
  companyGroup.classList.toggle('hidden', !supplier);
  companyInput.required = supplier;
  if (!supplier) companyInput.value = '';
}

function showAuthNotice(message) {
  switchTab('auth');
  toggleAuthMode('login');

  const notice = document.getElementById('authNotice');
  if (!notice) return;

  notice.textContent = message;
  notice.classList.remove('hidden');
}

function applyAuthUI() {
  const userInfoBar = document.getElementById('userInfoBar');
  const cartNavItem = document.getElementById('nav-cart-item');
  const accountLinks = document.getElementById('nav-account-links');
  const publicNavItems = document.querySelectorAll('.nav-public-item');

  if (!userInfoBar || !cartNavItem || !accountLinks) return;

  if (currentUser) {
    const role = currentProfile?.role || PUBLIC_ROLE;
    const name = currentProfile?.full_name || currentUser.email || 'Utente';
    const isAdmin = role === 'admin';

    userInfoBar.innerHTML = `
      <span class="me-2"><i class="fa-solid fa-user"></i> ${escapeHtml(name)} (${escapeHtml(role)})</span>
      <span class="sep">|</span>
      <a role="button" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
    `;

    if (isAdmin) {
      publicNavItems.forEach(el => el.classList.add('hidden'));
      cartNavItem.classList.add('hidden');
      accountLinks.innerHTML = '<a class="nav-link" onclick="switchTab(\'admin\')" id="nav-admin" role="button"><i class="fa-solid fa-user-shield"></i> Dashboard Admin</a>';
    } else {
      publicNavItems.forEach(el => el.classList.remove('hidden'));
      cartNavItem.classList.remove('hidden');

      const dashboard = role === 'fornitore' ? 'supplier-dashboard' : 'client-dashboard';
      const label = role === 'fornitore' ? 'Area Fornitore' : 'Area Personale';
      accountLinks.innerHTML = `
        <a class="nav-link" onclick="switchTab('${dashboard}')" id="nav-${dashboard}" role="button">${label}</a>
        <a class="nav-link" onclick="switchTab('chat')" id="nav-chat" role="button"><i class="fa-solid fa-comments"></i> Assistenza</a>
      `;
    }
    return;
  }

  userInfoBar.innerHTML = `
    <a role="button" onclick="switchTab('auth'); toggleAuthMode('login');"><i class="fa-solid fa-right-to-bracket"></i> Accedi</a>
    <span class="sep">|</span>
    <a role="button" class="register-link" onclick="switchTab('auth'); toggleAuthMode('register');"><i class="fa-solid fa-user-plus"></i> Registrati</a>
  `;

  publicNavItems.forEach(el => el.classList.remove('hidden'));
  cartNavItem.classList.add('hidden');
  accountLinks.innerHTML = '';

  const activeSection = document.querySelector('.view-section.active');
  if (activeSection && RESTRICTED_VIEWS.includes(activeSection.id.replace('view-', ''))) {
    switchTab('home');
  }
}

function postLoginRedirect() {
  switchTab(currentProfile?.role === 'admin' ? 'admin' : 'home');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function safeHttpUrl(value, fallback = APP_CONFIG.defaultProductImage) {
  try {
    const url = new URL(String(value || ''), window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

async function loadCurrentProfile(user) {
  currentProfile = null;
  if (!user) return;

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    currentProfile = data || null;
  } catch (error) {
    console.warn('Impossibile caricare il profilo utente:', error.message);
  }
}

async function checkUserSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    await loadCurrentProfile(currentUser);
  } catch (error) {
    console.error('Errore nel controllo della sessione:', error);
    currentUser = null;
    currentProfile = null;
  }

  applyAuthUI();
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;

  // Evita di bloccare il callback di Supabase con operazioni asincrone.
  queueMicrotask(async () => {
    await loadCurrentProfile(currentUser);
    applyAuthUI();
  });
});

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!email || !password) {
    showAuthNotice('Inserisci email e password.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = data.user;
    await loadCurrentProfile(currentUser);
    applyAuthUI();

    document.getElementById('loginForm')?.reset();
    postLoginRedirect();
  } catch (error) {
    showAuthNotice('Errore di accesso: ' + (error.message || 'credenziali non valide.'));
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const roleInput = document.getElementById('regRole')?.value;
  const role = APP_CONFIG.clientRoles.includes(roleInput) ? roleInput : PUBLIC_ROLE;
  const fullName = document.getElementById('regFullName')?.value.trim();
  const company = document.getElementById('regCompany')?.value.trim();
  const phone = document.getElementById('regPhone')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;

  if (!fullName || !phone || !email || !password) {
    showAuthNotice('Compila tutti i campi obbligatori.');
    return;
  }

  if (role === 'fornitore' && !company) {
    showAuthNotice('Per un account fornitore è obbligatoria la ragione sociale.');
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: company,
          phone,
          // Mai accettare "admin" dal client come ruolo di registrazione.
          role
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      // Compatibilità con l'installazione attuale: il profilo viene creato
      // anche quando Supabase richiede la conferma email e non esiste ancora una sessione.
      // Per sicurezza definitiva, il ruolo va comunque vincolato da RLS/trigger lato database.
      const { error: profileError } = await supabaseClient.from('profiles').upsert([{
        id: data.user.id,
        full_name: fullName,
        company_name: company || null,
        phone,
        role
      }], { onConflict: 'id' });

      if (profileError) throw profileError;
    }

    document.getElementById('registerForm')?.reset();
    toggleCompanyField(PUBLIC_ROLE);

    if (data.session) {
      currentUser = data.user;
      await loadCurrentProfile(currentUser);
      applyAuthUI();
      postLoginRedirect();
    } else {
      toggleAuthMode('login');
      showAuthNotice('Registrazione completata! Controlla la tua email per confermare l\'account, poi accedi.');
    }
  } catch (error) {
    showAuthNotice('Errore durante la registrazione: ' + (error.message || 'operazione non riuscita.'));
  }
}

async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Errore durante il logout:', error);
  } finally {
    currentUser = null;
    currentProfile = null;
    applyAuthUI();
    switchTab('home');
  }
}
