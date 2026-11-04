require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// Товары
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, title, price, stock_quantity, category FROM products ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Оформление заказа
app.post('/api/orders', async (req, res) => {
  const { customerName, items } = req.body;
  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Неверные данные заказа' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total = 0;
    const lines = [];

    for (const item of items) {
      const [found] = await conn.execute(
        `SELECT id, title, price, stock_quantity FROM products WHERE id = ? FOR UPDATE`,
        [item.id]
      );
      if (found.length === 0) throw new Error('Товар не найден');
      const product = found[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error('Недостаточно товара: ' + product.title);
      }
      total += product.price * item.quantity;
      lines.push({ product, quantity: item.quantity });
    }

    const [order] = await conn.execute(
      `INSERT INTO orders (customer_name, total) VALUES (?, ?)`,
      [customerName, total]
    );

    for (const line of lines) {
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [order.insertId, line.product.id, line.quantity, line.product.price]
      );
      await conn.execute(
        `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [line.quantity, line.product.id]
      );
    }

    await conn.commit();
    res.status(201).json({ orderId: order.insertId, total });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Ошибка сервера' });
  } finally {
    conn.release();
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(process.env.PORT, () => {
  console.log('Сервер запущен: http://localhost:' + process.env.PORT);
});