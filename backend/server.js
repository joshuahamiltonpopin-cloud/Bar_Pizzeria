const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// --- SALUD ---
app.get('/api/health', (req, res) => {
  res.json({ ok: true, hora: new Date().toISOString() });
});

// --- MENÚ ---
app.get('/api/menu', (req, res) => {
  const productos = db.prepare(
    'SELECT * FROM productos WHERE activo = 1 ORDER BY categoria, nombre'
  ).all();
  const variantes = db.prepare('SELECT * FROM variantes').all();

  const menu = productos.map(p => ({
    ...p,
    variantes: variantes.filter(v => v.producto_id === p.id)
  }));

  res.json(menu);
});

// --- CREAR PEDIDO ---
app.post('/api/pedidos', (req, res) => {
  const { cliente_nombre, cliente_telefono, direccion, items, metodo_pago, ref_pago } = req.body;

  if (!cliente_nombre || !cliente_telefono || !items || items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const validarItem = db.prepare(`
    SELECT v.id, v.precio, v.nombre as var_nombre, v.tipo
    FROM variantes v JOIN productos p ON p.id = v.producto_id
    WHERE v.id = ?
  `);

  let total = 0;
  const itemsPreparados = [];

  for (const item of items) {
    const variantesDetalle = [];
    let precioUnitario = 0;

    for (const varId of item.variantes_ids) {
      const v = validarItem.get(varId);
      if (!v) return res.status(400).json({ error: `Variante ${varId} no existe` });
      variantesDetalle.push({ tipo: v.tipo, nombre: v.var_nombre, precio: v.precio });
      precioUnitario += v.precio;
    }

    if (precioUnitario === 0) {
      return res.status(400).json({ error: 'El ítem no tiene variantes válidas' });
    }

    total += precioUnitario * item.cantidad;

    itemsPreparados.push({
      producto_id: item.producto_id,
      nombre_snapshot: item.nombre || 'Producto',
      variantes_snapshot: JSON.stringify(variantesDetalle),
      precio_unitario: precioUnitario,
      cantidad: item.cantidad
    });
  }

  const crearPedido = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO pedidos (cliente_nombre, cliente_telefono, direccion, total, metodo_pago, ref_pago)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cliente_nombre, cliente_telefono, direccion || null, total, metodo_pago || null, ref_pago || null);

    const pedidoId = info.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO pedido_items
      (pedido_id, producto_id, nombre_snapshot, variantes_snapshot, precio_unitario, cantidad)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const it of itemsPreparados) {
      insertItem.run(pedidoId, it.producto_id, it.nombre_snapshot,
        it.variantes_snapshot, it.precio_unitario, it.cantidad);
    }

    return pedidoId;
  });

  try {
    const pedidoId = crearPedido();
    
    // ¡EMITIR EL EVENTO A LA COCINA!
    const pedidoNuevo = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
    io.emit('pedido_nuevo', pedidoNuevo);

    res.status(201).json({ ok: true, pedido_id: pedidoId, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear el pedido' });
  }
});

// --- LISTAR PEDIDOS ---
app.get('/api/pedidos', (req, res) => {
  const estado = req.query.estado;
  let query = 'SELECT * FROM pedidos';
  const params = [];
  if (estado) {
    query += ' WHERE estado = ?';
    params.push(estado);
  }
  query += ' ORDER BY creado_en DESC';

  const pedidos = db.prepare(query).all(...params);
  const itemsStmt = db.prepare('SELECT * FROM pedido_items WHERE pedido_id = ?');

  const resultado = pedidos.map(p => ({
    ...p,
    items: itemsStmt.all(p.id).map(i => ({
      ...i,
      variantes_snapshot: JSON.parse(i.variantes_snapshot)
    }))
  }));

  res.json(resultado);
});

// --- CAMBIAR ESTADO ---
const ESTADOS_VALIDOS = ['recibido', 'preparando', 'listo', 'en_camino', 'entregado', 'cancelado'];

app.patch('/api/pedidos/:id/estado', (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(req.params.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  db.prepare(`
    UPDATE pedidos SET estado = ?, actualizado_en = datetime('now') WHERE id = ?
  `).run(estado, req.params.id);

  // ¡EMITIR EL EVENTO DE ACTUALIZACIÓN!
  io.emit('pedido_actualizado', { id: Number(req.params.id), estado });

  res.json({ ok: true, pedido_id: Number(req.params.id), estado });
});

// --- WEBSOCKETS ---
io.on('connection', (socket) => {
  console.log('🔌 Pantalla conectada al WebSocket');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🍕 El Mojito backend corriendo en http://localhost:${PORT}`);
});
