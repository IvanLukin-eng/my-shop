const API = 'http://localhost:3000/api';
let products = [];
const cart = [];

const catalog = document.getElementById('catalog');
const cartCount = document.getElementById('cart-count');
const cartSum = document.getElementById('cart-sum');
const nameInput = document.getElementById('customer-name');

function renderProducts() {
  if (!catalog) return;
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
  cartSum.textContent = cart
    .reduce((sum, p) => sum + Number(p.price), 0)
    .toLocaleString('ru-RU');
}

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
    if (inCart >= product.stock_quantity) {
      alert('Больше нет в наличии');
      return;
    }
    cart.push(product);
    renderCart();
  });
}

async function loadProducts() {
  try {
    const response = await fetch(API + '/products');
    if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);
    products = await response.json();
    renderProducts();
  } catch (err) {
    if (catalog) catalog.innerHTML = '<p>Не удалось загрузить товары. Запущен ли сервер?</p>';
    console.error(err);
  }
}

async function checkout() {
  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) return alert('Введите имя');
  if (cart.length === 0) return alert('Корзина пуста');
  try {
    const response = await fetch(API + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, items: groupCart() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка оформления заказа');
    alert('Заказ №' + data.orderId + ' оформлен. Сумма: ' + Number(data.total).toLocaleString('ru-RU') + ' ₽');
    cart.length = 0;
    renderCart();
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

const checkoutBtn = document.getElementById('checkout');
if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);

loadProducts();