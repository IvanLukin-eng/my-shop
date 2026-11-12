const API = 'http://localhost:3000/api';
let products = [];
let cart = [];
let currentPage = 1;
let totalPages = 1;

const catalog = document.getElementById('catalog');
const cartCount = document.getElementById('cart-count');
const cartSum = document.getElementById('cart-sum');
const searchInput = document.getElementById('search');
const categorySelect = document.getElementById('category');
const sortSelect = document.getElementById('sort');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

function renderProducts() {
  if (!catalog) return;
  if (!products || products.length === 0) {
    catalog.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">Товары не найдены</p>';
    return;
  }
  catalog.innerHTML = products.map(p => `
    <div class="card">
      <div class="category">${p.category}</div>
      <h3>${p.title}</h3>
      <div class="price">${Number(p.price).toLocaleString('ru-RU')} ₽</div>
      <div class="stock">В наличии: ${p.stock_quantity} шт.</div>
      <button data-id="${p.id}" ${p.stock_quantity === 0 ? 'disabled' : ''}>В корзину</button>
    </div>
  `).join('');
}

function renderCart() {
  if (!cartCount || !cartSum) return;
  cartCount.textContent = cart.length;
  cartSum.textContent = cart.reduce((sum, p) => sum + Number(p.price), 0).toLocaleString('ru-RU');
}

async function loadProducts() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 8,
      search: searchInput ? searchInput.value : '',
      category: categorySelect ? categorySelect.value : '',
      sort: sortSelect ? sortSelect.value : ''
    });

    const response = await fetch(API + '/products?' + params.toString());
    if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);
    
    const data = await response.json();
    console.log('Данные от сервера:', data); // Для отладки

    // Проверяем, в каком формате пришли данные (массив или объект с items)
    if (Array.isArray(data)) {
      products = data;
      totalPages = 1;
    } else {
      products = data.items || [];
      totalPages = data.pages || 1;
    }

    renderProducts();

    if (pageInfo) pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  } catch (err) {
    console.error(err);
    if (catalog) catalog.innerHTML = '<p style="color: red; grid-column: 1/-1; text-align: center;">Не удалось загрузить товары. Проверьте консоль (F12).</p>';
  }
}

// Корзина
function groupCart() {
  const counts = {};
  cart.forEach(p => { counts[p.id] = (counts[p.id] || 0) + 1; });
  return Object.entries(counts).map(([id, quantity]) => ({ id: Number(id), quantity }));
}

if (catalog) {
  catalog.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    const product = products.find(p => p.id === Number(e.target.dataset.id));
    if (!product) return;
    const inCart = cart.filter(p => p.id === product.id).length;
    if (inCart >= product.stock_quantity) return alert('Больше нет в наличии');
    cart.push(product);
    renderCart();
  });
}

// Оформление заказа
async function checkout() {
  const token = localStorage.getItem('token');
  if (!token) return alert('Сначала войдите');
  if (cart.length === 0) return alert('Корзина пуста');
  try {
    const response = await fetch(API + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ items: groupCart() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка');
    alert('Заказ №' + data.orderId + ' оформлен. Сумма: ' + Number(data.total).toLocaleString('ru-RU') + ' ₽');
    cart = [];
    renderCart();
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

const checkoutBtn = document.getElementById('checkout');
if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);

// Фильтры
if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; loadProducts(); });
if (categorySelect) categorySelect.addEventListener('change', () => { currentPage = 1; loadProducts(); });
if (sortSelect) sortSelect.addEventListener('change', () => { currentPage = 1; loadProducts(); });
if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadProducts(); } });
if (nextBtn) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; loadProducts(); } });

// Авторизация
function updateAuthUI() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const authGuest = document.getElementById('auth-guest');
  const authUser = document.getElementById('auth-user');
  const userEmail = document.getElementById('user-email');

  if (token && user) {
    if (authGuest) authGuest.hidden = true;
    if (authUser) authUser.hidden = false;
    if (userEmail) userEmail.textContent = user.email;
  } else {
    if (authGuest) authGuest.hidden = false;
    if (authUser) authUser.hidden = true;
  }
}

const loginBtn = document.getElementById('login-btn');
if (loginBtn) loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const response = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка входа');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    updateAuthUI();
    alert('Вы вошли!');
  } catch (err) { alert(err.message); }
});

const registerBtn = document.getElementById('register-btn');
if (registerBtn) registerBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    const response = await fetch(API + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка');
    alert('Регистрация выполнена. Теперь войдите.');
  } catch (err) { alert(err.message); }
});

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateAuthUI();
});

// Запуск
updateAuthUI();
loadProducts();