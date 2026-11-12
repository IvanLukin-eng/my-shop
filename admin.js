const API = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

const rows = document.getElementById('rows');
const select = document.getElementById('category-select');
let items = [];

async function request(path, method = 'GET', body) {
  const response = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

function render() {
  if (!rows) return;
  rows.innerHTML = items.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.title}</td>
      <td>${p.category}</td>
      <td><input id="price-${p.id}" type="number" step="0.01" value="${p.price}"></td>
      <td><input id="stock-${p.id}" type="number" value="${p.stock_quantity}"></td>
      <td>
        <button class="save" data-save="${p.id}">Сохранить</button>
        <button class="danger" data-delete="${p.id}">Удалить</button>
      </td>
    </tr>
  `).join('');
}

async function load() {
  try {
    const [products, categories] = await Promise.all([request('/products'), request('/categories')]);
    items = products;
    if (select) {
      select.innerHTML = categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
    render();
  } catch (err) {
    console.error('Ошибка загрузки:', err);
    alert(err.message);
  }
}

if (rows) {
  rows.addEventListener('click', async e => {
    try {
      const saveId = e.target.dataset.save;
      const deleteId = e.target.dataset.delete;
      if (saveId) {
        const p = items.find(x => x.id === Number(saveId));
        await request('/products/' + saveId, 'PUT', {
          title: p.title,
          category: p.category,
          price: document.getElementById('price-' + saveId).value,
          stock: document.getElementById('stock-' + saveId).value
        });
        alert('Сохранено');
        await load();
      }
      if (deleteId && confirm('Удалить товар?')) {
        await request('/products/' + deleteId, 'DELETE');
        await load();
      }
    } catch (err) {
      alert(err.message);
    }
  });
}

const addForm = document.getElementById('add-form');
if (addForm) {
  addForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await request('/products', 'POST', Object.fromEntries(f));
      e.target.reset();
      await load();
    } catch (err) {
      alert(err.message);
    }
  });
}

if (user && user.role === 'admin') {
  const panel = document.getElementById('panel');
  if (panel) panel.hidden = false;
  load();
} else {
  const denied = document.getElementById('denied');
  if (denied) denied.hidden = false;
}