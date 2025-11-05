(() => {
  const STORAGE_KEY = 'familia.gastos';
  const BUDGET_KEY = 'familia.presupuesto';
  const THEME_KEY = 'familia.tema';

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
    filters: { month: null, year: null, category: '', query: '' },
    sort: { key: 'date', dir: 'desc' },
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

    const theme = localStorage.getItem(THEME_KEY) || 'dark';
    if (theme === 'light') document.body.setAttribute('data-theme', 'light');
  }

  function saveExpenses() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses)); }
  function saveBudget() { localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgetByMonth)); }

  function initSelectors() {
    const now = new Date();
    const mSel = $('#filter-month');
    const ySel = $('#filter-year');
    const catFilter = $('#filter-category');
    const catForm = $('#expense-category');

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
    const { month, year, category, query } = state.filters;
    const q = (query || '').toLowerCase();
    return state.expenses.filter(e => {
      const d = new Date(e.date);
      const okMonth = d.getMonth() + 1 === Number(month);
      const okYear = d.getFullYear() === Number(year);
      const okCat = !category || e.category === category;
      const okQuery = !q || e.desc.toLowerCase().includes(q);
      return okMonth && okYear && okCat && okQuery;
    }).sort((a, b) => {
      const dir = state.sort.dir === 'asc' ? 1 : -1;
      const key = state.sort.key;
      if (key === 'date') return (new Date(a.date) - new Date(b.date)) * dir;
      if (key === 'amount') return (a.amount - b.amount) * dir;
      if (key === 'category') return a.category.localeCompare(b.category) * dir;
      if (key === 'desc') return a.desc.localeCompare(b.desc) * dir;
      return 0;
    });
  }

  function renderSummary() {
    const list = filtered();
    const total = list.reduce((s, e) => s + e.amount, 0);
    $('#summary-total').textContent = money.format(total);
    const b = getBudgetForCurrentMonth();
    $('#summary-budget').textContent = money.format(b);
    $('#summary-remaining').textContent = money.format(Math.max(0, b - total));
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
      const amount = parseAmount($('#expense-amount').value);
      const desc = $('#expense-desc').value.trim();
      if (!date || !category || !desc || !(amount >= 0)) return;
      addExpense({ id: Date.now(), date, category, amount, desc });
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
    $('#filter-query').addEventListener('input', (ev) => { state.filters.query = ev.target.value; renderAll(); });
    $('#clear-filters').addEventListener('click', () => { state.filters.category = ''; state.filters.query = ''; $('#filter-category').value=''; $('#filter-query').value=''; renderAll(); });

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
      const rows = [['Fecha', 'Categoría', 'Descripción', 'Monto']].concat(
        filtered().map(e => [new Date(e.date).toLocaleDateString('es-AR'), e.category, e.desc, String(e.amount)])
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

  function boot() {
    loadData();
    initSelectors();
    bindEvents();
    const d = new Date(state.filters.year, state.filters.month - 1, new Date().getDate());
    $('#expense-date').valueAsDate = d;
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();