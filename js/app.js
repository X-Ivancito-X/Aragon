(() => {
  const STORAGE_KEY = 'familia.gastos';
  const BUDGET_KEY = 'familia.presupuesto';
  const THEME_KEY = 'familia.tema';
  const MEMBERS_KEY = 'familia.integrantes';
  const ACCOUNTS_KEY = 'familia.cuentas';

  const defaultCategories = [
    'Hogar',
    'Alimentación',
    'Transporte',
    'Salud',
    'Educación',
    'Ocio',
    'Otros'
  ];

  const state = {
    expenses: [],
    budgetByMonth: {},
    members: [],
    filters: { month: null, year: null, category: '', member: '', query: '' },
    sort: { key: 'date', dir: 'desc' },
    auth: { loggedIn: false, role: null, parentUser: null, childName: null },
    accounts: {},
  };

  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

  function monthKey(y, m) { return `${y}-${String(m).padStart(2, '0')}`; }
  function parseAmount(val) { return Math.round(Number(val) * 100) / 100; }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.expenses = raw ? JSON.parse(raw) : [];
    } catch { state.expenses = []; }

    try {
      const rawB = localStorage.getItem(BUDGET_KEY);
      state.budgetByMonth = rawB ? JSON.parse(rawB) : {};
    } catch { state.budgetByMonth = {}; }

    try {
      const rawM = localStorage.getItem(MEMBERS_KEY);
      state.members = rawM ? JSON.parse(rawM) : [];
    } catch { state.members = []; }

    const theme = localStorage.getItem(THEME_KEY) || 'dark';
    if (theme === 'light') document.body.setAttribute('data-theme', 'light');

    // cuentas y sesión
    try {
      const rawA = localStorage.getItem(ACCOUNTS_KEY);
      state.accounts = rawA ? JSON.parse(rawA) : {};
    } catch { state.accounts = {}; }
    try {
      const rawS = localStorage.getItem(ACCOUNTS_KEY + '.session');
      const s = rawS ? JSON.parse(rawS) : null;
      if (s && s.role && s.parentUser) {
        state.auth = { loggedIn: true, role: s.role, parentUser: s.parentUser, childName: s.childName || null };
      }
    } catch {}
  }

  function saveExpenses() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses)); }
  function saveBudget() { localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgetByMonth)); }
  function saveMembers() { localStorage.setItem(MEMBERS_KEY, JSON.stringify(state.members)); }
  function saveAccounts() { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts)); }
  function saveSessionTo(storage) {
    const payload = JSON.stringify({ role: state.auth.role, parentUser: state.auth.parentUser, childName: state.auth.childName });
    storage.setItem(ACCOUNTS_KEY + '.session', payload);
  }

  function showAppForRole() {
    const isLogged = state.auth.loggedIn;
    const role = state.auth.role;
    const badge = document.getElementById('role-badge');
    const logout = document.getElementById('logout');
    const authSec = document.getElementById('auth');
    // Solo controlar visibilidad si la página es de autenticación
    if (authSec) {
      document.querySelectorAll('.app-sec').forEach(sec => { sec.hidden = !isLogged; });
      authSec.hidden = !!isLogged;
    }
    if (isLogged) {
      if (badge) { badge.hidden = false; badge.textContent = role === 'parent' ? 'Sos padre/madre' : 'Sos hijo/hija'; }
      if (logout) logout.hidden = false;
    } else {
      if (badge) { badge.hidden = true; badge.textContent=''; }
      if (logout) logout.hidden = true;
    }

    // permisos hijos
    const readOnly = role === 'child' && isLogged;
    const disableForm = (el) => { if (!el) return; el.querySelectorAll('input, select, button').forEach(x => { if (x.type !== 'button') x.disabled = true; }); };
    const enableForm = (el) => { if (!el) return; el.querySelectorAll('input, select, button').forEach(x => { x.disabled = false; }); };

    if (readOnly) {
      disableForm(document.getElementById('expense-form'));
      disableForm(document.getElementById('budget-form'));
      const mForm = document.getElementById('member-form');
      if (mForm) disableForm(mForm);
    } else {
      enableForm(document.getElementById('expense-form'));
      enableForm(document.getElementById('budget-form'));
      const mForm = document.getElementById('member-form');
      if (mForm) enableForm(mForm);
    }
    // acciones de edición
    document.querySelectorAll('.list-actions').forEach(el => { el.style.display = readOnly ? 'none' : ''; });
    document.querySelectorAll('.row-actions').forEach(el => { el.style.display = readOnly ? 'none' : ''; });
  }

  function bindAuthUI() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const contentLogin = document.getElementById('tab-content-login');
    const contentRegister = document.getElementById('tab-content-register');
    const roleSel = document.getElementById('login-role');
    const formParent = document.getElementById('login-form-parent');
    const formChild = document.getElementById('login-form-child');
    const logoutBtn = document.getElementById('logout');

    if (!tabLogin) return;

    const setTab = (name) => {
      if (name === 'login') { contentLogin.hidden = false; contentRegister.hidden = true; tabLogin.classList.remove('secondary'); tabRegister.classList.add('secondary'); }
      else { contentLogin.hidden = true; contentRegister.hidden = false; tabRegister.classList.remove('secondary'); tabLogin.classList.add('secondary'); }
    };
    tabLogin.addEventListener('click', () => setTab('login'));
    tabRegister.addEventListener('click', () => setTab('register'));
    setTab('login');

    roleSel.addEventListener('change', () => {
      const v = roleSel.value;
      if (formParent) formParent.hidden = v !== 'parent';
      if (formChild) formChild.hidden = v !== 'child';
    });

    if (formParent) formParent.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const user = document.getElementById('login-parent-user').value.trim();
      const pass = document.getElementById('login-parent-pass').value;
      const fam = state.accounts[user];
      if (!fam || fam.parent.pass !== pass) { alert('Usuario o contraseña incorrectos'); return; }
      state.auth = { loggedIn: true, role: 'parent', parentUser: user, childName: null };
      const remember = document.getElementById('remember-parent')?.checked;
      saveSessionTo(remember ? localStorage : sessionStorage);
      showAppForRole();
      renderAll();
      if (location.pathname.endsWith('auth.html')) location.href = 'index.html';
    });

    if (formChild) formChild.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = document.getElementById('login-child-name').value.trim();
      const pass = document.getElementById('login-child-pass').value;
      // Buscar al hijo por usuario en todas las familias
      let parent = null;
      let kid = null;
      for (const [pUser, fam] of Object.entries(state.accounts)) {
        const found = (fam.children || []).find(c => c.name === name);
        if (found) { parent = pUser; kid = found; break; }
      }
      if (!kid || kid.pass !== pass) { alert('Usuario o contraseña del hijo incorrectos'); return; }
      state.auth = { loggedIn: true, role: 'child', parentUser: parent, childName: name };
      const remember = document.getElementById('remember-child')?.checked;
      saveSessionTo(remember ? localStorage : sessionStorage);
      showAppForRole();
      renderAll();
      if (location.pathname.endsWith('auth.html')) location.href = 'index.html';
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      state.auth = { loggedIn: false, role: null, parentUser: null, childName: null };
      localStorage.removeItem(ACCOUNTS_KEY + '.session');
      sessionStorage.removeItem(ACCOUNTS_KEY + '.session');
      showAppForRole();
    });

    const addChildBtn = document.getElementById('add-child');
    const childrenList = document.getElementById('children-list');
    const regForm = document.getElementById('register-form');

    const addChildRow = (name = '', pass = '') => {
      const row = document.createElement('div');
      row.className = 'form-row';
      row.innerHTML = `
        <label>Usuario del hijo<input type="text" class="reg-child-name" placeholder="Ej. juan.perez" value="${name}" required /></label>
        <label>Contraseña<input type="password" class="reg-child-pass" value="${pass}" required /></label>
        <button type="button" class="btn-sm secondary">Quitar</button>
      `;
      const removeBtn = row.querySelector('button');
      removeBtn.addEventListener('click', () => row.remove());
      childrenList.appendChild(row);
    };
    if (addChildBtn) addChildBtn.addEventListener('click', () => addChildRow());

    if (regForm) regForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const user = document.getElementById('reg-parent-user').value.trim();
      const pass = document.getElementById('reg-parent-pass').value;
      if (!user || !pass) return;
      if (state.accounts[user]) { alert('Ese usuario de familia ya existe'); return; }
      const kids = Array.from(childrenList.querySelectorAll('.form-row')).map(row => {
        const name = row.querySelector('.reg-child-name').value.trim();
        const pass = row.querySelector('.reg-child-pass').value;
        return name ? { name, pass } : null;
      }).filter(Boolean);
      // Validaciones: credenciales de hijos distintas de las de la familia
      for (const k of kids) {
        if (k.name === user) { alert('El usuario del hijo no puede ser igual al usuario de familia'); return; }
        if (k.pass === pass) { alert('La contraseña del hijo debe ser distinta a la de la familia'); return; }
      }
      state.accounts[user] = { parent: { user, pass }, children: kids };
      saveAccounts();
      alert('Familia creada. Ahora podés ingresar.');
      document.getElementById('tab-login').click();
      const lp = document.getElementById('login-parent-user');
      if (lp) lp.value = user;
    });
  }

  function initSelectors() {
    const now = new Date();
    const mSel = $('#filter-month');
    const ySel = $('#filter-year');
    const catFilter = $('#filter-category');
    const catForm = $('#expense-category');
    const memFilter = $('#filter-member');
    const memForm = $('#expense-member');

    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement('option');
      opt.value = String(m);
      opt.textContent = new Date(2000, m - 1, 1).toLocaleString('es-AR', { month: 'long' });
      mSel.appendChild(opt);
    }

    const yearStart = now.getFullYear() - 5;
    const yearEnd = now.getFullYear() + 5;
    for (let y = yearStart; y <= yearEnd; y++) {
      const opt = document.createElement('option'); opt.value = String(y); opt.textContent = String(y); ySel.appendChild(opt);
    }

    state.filters.month = now.getMonth() + 1;
    state.filters.year = now.getFullYear();
    mSel.value = String(state.filters.month);
    ySel.value = String(state.filters.year);

    const cats = [...new Set([...defaultCategories, ...state.expenses.map(e => e.category)])];
    cats.forEach(c => {
      const opt1 = document.createElement('option'); opt1.value = c; opt1.textContent = c; catFilter.appendChild(opt1);
      const opt2 = document.createElement('option'); opt2.value = c; opt2.textContent = c; catForm.appendChild(opt2);
    });

    // Members
    const uniqueMembers = [...new Set([...(state.members || []), ...state.expenses.map(e => e.member).filter(Boolean)])];
    uniqueMembers.forEach(n => {
      const optF = document.createElement('option'); optF.value = n; optF.textContent = n; memFilter.appendChild(optF);
      const optE = document.createElement('option'); optE.value = n; optE.textContent = n; memForm.appendChild(optE);
    });
  }

  function addExpense(expense) {
    state.expenses.push(expense);
    saveExpenses();
  }

  function deleteExpense(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveExpenses();
  }

  function updateBudgetForCurrentMonth(value) {
    const k = monthKey(state.filters.year, state.filters.month);
    state.budgetByMonth[k] = value;
    saveBudget();
  }

  function getBudgetForCurrentMonth() {
    const k = monthKey(state.filters.year, state.filters.month);
    return state.budgetByMonth[k] || 0;
  }

  function filtered() {
    const { month, year, category, member, query } = state.filters;
    const q = (query || '').toLowerCase();
    return state.expenses.filter(e => {
      const d = new Date(e.date);
      const okMonth = d.getMonth() + 1 === Number(month);
      const okYear = d.getFullYear() === Number(year);
      const okCat = !category || e.category === category;
      const okMember = !member || e.member === member;
      const okQuery = !q || e.desc.toLowerCase().includes(q);
      return okMonth && okYear && okCat && okMember && okQuery;
    }).sort((a, b) => {
      const dir = state.sort.dir === 'asc' ? 1 : -1;
      const key = state.sort.key;
      if (key === 'date') return (new Date(a.date) - new Date(b.date)) * dir;
      if (key === 'amount') return (a.amount - b.amount) * dir;
      if (key === 'category') return a.category.localeCompare(b.category) * dir;
      if (key === 'member') return (a.member || '').localeCompare(b.member || '') * dir;
      if (key === 'desc') return a.desc.localeCompare(b.desc) * dir;
      return 0;
    });
  }

  function monthSequenceBetween(minY, minM, maxY, maxM) {
    const seq = [];
    for (let y = minY; y <= maxY; y++) {
      const startM = y === minY ? minM : 1;
      const endM = y === maxY ? maxM : 12;
      for (let m = startM; m <= endM; m++) seq.push([y, m]);
    }
    return seq;
  }

  function computeCarryoverUpTo(year, month) {
    const allDates = state.expenses.map(e => new Date(e.date));
    const budgetYears = Object.keys(state.budgetByMonth).map(k => Number(k.slice(0,4)));
    const expenseYears = allDates.map(d => d.getFullYear());
    const minYear = Math.min(...[...(budgetYears.length?budgetYears:[year]), ...(expenseYears.length?expenseYears:[year])]);
    const minMonth = 1;
    let carry = 0;
    const seq = monthSequenceBetween(minYear, minMonth, year, month - 1);
    for (const [y, m] of seq) {
      const k = monthKey(y, m);
      const b = state.budgetByMonth[k] || 0;
      if (!b) continue;
      const spent = state.expenses.reduce((s, e) => {
        const d = new Date(e.date);
        return s + ((d.getMonth()+1===m && d.getFullYear()===y) ? e.amount : 0);
      }, 0);
      const leftover = b - spent;
      if (leftover > 0) carry += leftover;
    }
    return carry;
  }

  function renderSummary() {
    const list = filtered();
    const total = list.reduce((s, e) => s + e.amount, 0);
    $('#summary-total').textContent = money.format(total);
    const b = getBudgetForCurrentMonth();
    $('#summary-budget').textContent = money.format(b);
    const carry = computeCarryoverUpTo(state.filters.year, state.filters.month);
    $('#summary-carryover').textContent = money.format(carry);
    $('#summary-remaining').textContent = money.format(Math.max(0, b + carry - total));
    $('#table-total').textContent = money.format(total);

    $('#budget-period').textContent = `${new Date(2000, state.filters.month - 1, 1).toLocaleString('es-AR', { month: 'long' })} ${state.filters.year}`;
    $('#budget-value').value = b ? String(b) : '';
  }

  function renderTable() {
    const tbody = $('#expense-table tbody');
    tbody.innerHTML = '';
    const list = filtered();
    list.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(e.date).toLocaleDateString('es-AR')}</td>
        <td>${e.category}</td>
        <td>${e.member || ''}</td>
        <td>${e.desc}</td>
        <td class="amount">${money.format(e.amount)}</td>
        <td>
          <div class="row-actions">
            <button data-action="edit" data-id="${e.id}" class="secondary">Editar</button>
            <button data-action="delete" data-id="${e.id}" class="btn-danger">Eliminar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const id = btn.getAttribute('data-id');
        const exp = state.expenses.find(x => String(x.id) === String(id));
        if (!exp) return;
        const action = btn.getAttribute('data-action');
        if (action === 'delete') { deleteExpense(exp.id); renderAll(); }
        if (action === 'edit') {
          $('#expense-date').value = exp.date.slice(0, 10);
          $('#expense-category').value = exp.category;
          $('#expense-member').value = exp.member || '';
          $('#expense-amount').value = String(exp.amount);
          $('#expense-desc').value = exp.desc;
          deleteExpense(exp.id);
          renderAll();
          $('#expense-desc').focus();
        }
      });
    });
  }

  function renderCategoriesSummary() {
    const container = $('#category-summary');
    container.innerHTML = '';
    const map = new Map();
    for (const e of filtered()) {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const maxTotal = entries.length ? Math.max(...entries.map(e => e[1])) : 0;
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Sin datos para este periodo.';
      empty.className = 'card';
      container.appendChild(empty);
      return;
    }
    for (const [name, total] of entries) {
      const tile = document.createElement('div');
      tile.className = 'category-tile';
      const pct = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
      tile.innerHTML = `
        <div class="tile-top">
          <span class="name">${name}</span>
          <span class="val">${money.format(total)}</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      `;
      container.appendChild(tile);
    }
  }

  function renderAll() {
    renderSummary();
    renderTable();
    renderCategoriesSummary();
  }

  function bindEvents() {
    $('#expense-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const date = $('#expense-date').value;
      const category = $('#expense-category').value;
      const member = $('#expense-member').value;
      const amount = parseAmount($('#expense-amount').value);
      const desc = $('#expense-desc').value.trim();
      if (!date || !category || !member || !desc || !(amount >= 0)) return;
      addExpense({ id: Date.now(), date, category, member, amount, desc });
      $('#expense-form').reset();
      // set default date to selected month
      const d = new Date(state.filters.year, state.filters.month - 1, new Date().getDate());
      $('#expense-date').valueAsDate = d;
      renderAll();
    });

    $('#reset-form').addEventListener('click', () => {
      $('#expense-form').reset();
    });

    $('#budget-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const val = parseAmount($('#budget-value').value || 0);
      updateBudgetForCurrentMonth(val);
      renderAll();
    });

    $('#filter-month').addEventListener('change', (ev) => { state.filters.month = Number(ev.target.value); renderAll(); });
    $('#filter-year').addEventListener('change', (ev) => { state.filters.year = Number(ev.target.value); renderAll(); });
    $('#filter-category').addEventListener('change', (ev) => { state.filters.category = ev.target.value; renderAll(); });
    $('#filter-member').addEventListener('change', (ev) => { state.filters.member = ev.target.value; renderAll(); });
    $('#filter-query').addEventListener('input', (ev) => { state.filters.query = ev.target.value; renderAll(); });
    $('#clear-filters').addEventListener('click', () => { state.filters.category = ''; state.filters.member=''; state.filters.query = ''; $('#filter-category').value=''; $('#filter-member').value=''; $('#filter-query').value=''; renderAll(); });

    $$('#expense-table thead th[data-sort]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (state.sort.key === key) { state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'; }
        else { state.sort.key = key; state.sort.dir = 'asc'; }
        renderAll();
      });
    });

    $('#toggle-theme').addEventListener('click', () => {
      const isLight = document.body.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      if (next === 'light') document.body.setAttribute('data-theme', 'light'); else document.body.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, next);
    });

    $('#export-csv').addEventListener('click', () => {
      const rows = [['Fecha', 'Categoría', 'Integrante', 'Descripción', 'Monto']].concat(
        filtered().map(e => [new Date(e.date).toLocaleDateString('es-AR'), e.category, e.member || '', e.desc, String(e.amount)])
      );
      const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const k = monthKey(state.filters.year, state.filters.month);
      a.download = `gastos-${k}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  function renderMembers() {
    const list = $('#member-list');
    if (!list) return;
    list.innerHTML = '';
    state.members.forEach((name, idx) => {
      const li = document.createElement('li');
      li.textContent = name;
      const btn = document.createElement('button');
      btn.className = 'secondary btn-sm';
      btn.textContent = 'Eliminar';
      btn.addEventListener('click', () => {
        state.members.splice(idx, 1);
        saveMembers();
        // rebuild selectors
        $('#filter-member').innerHTML = '<option value="">Todos</option>';
        $('#expense-member').innerHTML = '';
        initSelectors();
        renderMembers();
      });
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center';
      row.appendChild(document.createTextNode(name));
      row.appendChild(btn);
      li.innerHTML = '';
      li.appendChild(row);
      list.appendChild(li);
    });
  }

  function boot() {
    loadData();
    const isAuthPage = location.pathname.endsWith('auth.html');
    if (!isAuthPage) {
      initSelectors();
      bindEvents();
    }
    bindAuthUI();
    showAppForRole();
    // member form
    const mForm = $('#member-form');
    if (!isAuthPage && mForm) {
      mForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const name = $('#member-name').value.trim();
        if (!name) return;
        if (!state.members.includes(name)) state.members.push(name);
        saveMembers();
        $('#member-name').value = '';
        // rebuild selectors
        $('#filter-member').innerHTML = '<option value="">Todos</option>';
        $('#expense-member').innerHTML = '';
        initSelectors();
        renderMembers();
      });
    }
    if (!isAuthPage) {
      renderMembers();
      const d = new Date(state.filters.year, state.filters.month - 1, new Date().getDate());
      const ed = document.getElementById('expense-date');
      if (ed) ed.valueAsDate = d;
      renderAll();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();