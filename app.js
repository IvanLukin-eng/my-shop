const API = 'http://localhost:3000/api';
let products = [];
const cart = [];

const catalog = document.getElementById('catalog');
const cartCount = document.getElementById('cart-count');
const cartSum = document.getElementById('cart-sum');

function renderProducts() {
  catalog.innerHTML = products.map(p => `
    <div class="card">
      <div class="category">${p.category}</div>
      <h3>${p.title}</h3>
      <div class="price">${Number(p.price).toLocaleString('ru-RU')} ₽</div>
      <div class="stock">В наличии: ${p.stock} шт.</div>
      <button data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>В корзину</button>
    </div>
  `).join('');
}

function renderCart() {
  cartCount.textContent = cart.length;
  cartSum.textContent = cart
    .reduce((sum, p) => sum + Number(p.price), 0)
    .toLocaleString('ru-RU');
}

function groupCart() {
  const counts = {};
  cart.forEach(p => { counts[p.id] = (counts[p.id] || 0) + 1; });
  return Object.entries(counts).map(([id, quantity]) => ({ id: Number(id), quantity }));
}

catalog.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  const product = products.find(p => p.id === Number(e.target.dataset.id));
  const inCart = cart.filter(p => p.id === product.id).length;
  if (inCart >= product.stock) {
    alert('Больше нет в наличии');
    return;
  }
  cart.push(product);
  renderCart();
});

async function loadProducts() {
  try {
    const response = await fetch(API + '/products');
    if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);
    products = await response.json();
    renderProducts();
  } catch (err) {
    catalog.innerHTML = '<p>Не удалось загрузить товары. Запущен ли сервер?</p>';
    console.error(err);
  }
}

async function checkout() {
  const token = localStorage.getItem('token');
  if (!token) return alert('Сначала войдите или зарегистрируйтесь');
  if (cart.length === 0) return alert('Корзина пуста');
  try {
    const response = await fetch(API + '/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ items: groupCart() })
    });
    const data = await response.json();
    if (response.status === 401) {
      logout();
      throw new Error('Сессия истекла, войдите снова');
    }
    if (!response.ok) throw new Error(data.error || 'Ошибка оформления заказа');
    alert('Заказ №' + data.orderId + ' оформлен. Сумма: ' + Number(data.total).toLocaleString('ru-RU') + ' ₽');
    cart.length = 0;
    renderCart();
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Вход и регистрация ----------
function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  updateAuthUI();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateAuthUI();
}

function updateAuthUI() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  document.getElementById('auth-guest').hidden = !!user;
  document.getElementById('auth-user').hidden = !user;
  if (user) document.getElementById('user-email').textContent = user.email;
}

async function sendAuth(path) {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const response = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

async function login() {
  try {
    const data = await sendAuth('/login');
    saveAuth(data.token, data.user);
  } catch (err) {
    alert(err.message);
  }
}

async function register() {
  try {
    await sendAuth('/register');
    await login();
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById('checkout').addEventListener('click', checkout);
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('logout-btn').addEventListener('click', logout);

updateAuthUI();
loadProducts();