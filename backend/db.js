const Database = require('better-sqlite3');
const db = new Database('elmojito.db');

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS variantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  direccion TEXT,
  estado TEXT NOT NULL DEFAULT 'recibido',
  total REAL NOT NULL,
  ref_pago TEXT,
  metodo_pago TEXT,
  creado_en TEXT DEFAULT (datetime('now')),
  actualizado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  nombre_snapshot TEXT NOT NULL,
  variantes_snapshot TEXT NOT NULL,
  precio_unitario REAL NOT NULL,
  cantidad INTEGER NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);
`);

const count = db.prepare('SELECT COUNT(*) as n FROM productos').get().n;
if (count === 0) {
  const insertProd = db.prepare(
    'INSERT INTO productos (nombre, descripcion, categoria) VALUES (?, ?, ?)'
  );
  const insertVar = db.prepare(
    'INSERT INTO variantes (producto_id, tipo, nombre, precio) VALUES (?, ?, ?, ?)'
  );

  // --- PIZZAS ---
  const margarita = insertProd.run('Pizza Margarita', 'Salsa de tomate, mozzarella y albahaca fresca', 'pizza').lastInsertRowid;
  insertVar.run(margarita, 'tamaño', 'Personal', 350);
  insertVar.run(margarita, 'tamaño', 'Mediana', 550);
  insertVar.run(margarita, 'tamaño', 'Familiar', 750);

  const pepperoni = insertProd.run('Pizza Pepperoni', 'Mozzarella derretida y pepperoni picante', 'pizza').lastInsertRowid;
  insertVar.run(pepperoni, 'tamaño', 'Personal', 400);
  insertVar.run(pepperoni, 'tamaño', 'Mediana', 620);
  insertVar.run(pepperoni, 'tamaño', 'Familiar', 820);

  const jamon = insertProd.run('Pizza de Jamón y Queso', 'La clásica cubana, con jamón y queso Gouda', 'pizza').lastInsertRowid;
  insertVar.run(jamon, 'tamaño', 'Personal', 380);
  insertVar.run(jamon, 'tamaño', 'Mediana', 600);
  insertVar.run(jamon, 'tamaño', 'Familiar', 800);

  // --- BEBIDAS (¡Más ofertas!) ---
  const mojito = insertProd.run('Mojito Cubano', 'Ron Havana Club, hierbabuena, limón y soda', 'bebida').lastInsertRowid;
  insertVar.run(mojito, 'tamaño', 'Normal', 450);
  insertVar.run(mojito, 'tamaño', 'Doble', 650);

  const pina = insertProd.run('Piña Colada', 'Ron, crema de coco y piña natural', 'bebida').lastInsertRowid;
  insertVar.run(pina, 'tamaño', 'Normal', 500);

  const ginFizz = insertProd.run('Gin Fizz Azul', 'Ginebra, limón, azúcar y un toque de color', 'bebida').lastInsertRowid;
  insertVar.run(ginFizz, 'tamaño', 'Normal', 480);

  const michelada = insertProd.run('Michelada', 'Cerveza Cristal, limón y salsa picante', 'bebida').lastInsertRowid;
  insertVar.run(michelada, 'tamaño', 'Normal', 350);

  const refresco = insertProd.run('Refresco Cubano', 'Cola o limón bien frío', 'bebida').lastInsertRowid;
  insertVar.run(refresco, 'tamaño', 'Lata', 150);

  // --- POSTRES Y PICADERAS ---
  const tresLeches = insertProd.run('Vaso de 3 Leches', 'Bizcocho bañado en tres leches con merengue', 'postre').lastInsertRowid;
  insertVar.run(tresLeches, 'tamaño', 'Individual', 300);

  const flan = insertProd.run('Flan Casero', 'Flan de caramelo tradicional', 'postre').lastInsertRowid;
  insertVar.run(flan, 'tamaño', 'Individual', 250);

  const croquetas = insertProd.run('Croquetas Caseras', 'Rellenas de jamón, con salsa de miel y soja', 'picadera').lastInsertRowid;
  insertVar.run(croquetas, 'tamaño', 'Orden de 6', 350);

  const espaguetis = insertProd.run('Espaguetis c/ Jamón', 'Pasta con salsa de tomate, jamón y queso rallado', 'picadera').lastInsertRowid;
  insertVar.run(espaguetis, 'tamaño', 'Plato', 450);
}

module.exports = db;
