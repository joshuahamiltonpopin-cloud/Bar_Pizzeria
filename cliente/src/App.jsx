import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:3000/api";

// Mapeo inteligente de imágenes basado en el nombre del producto
const getImagen = (nombre) => {
  const n = nombre.toLowerCase();
  if (n.includes("margarita") || n.includes("queso")) return "/img/pizza-queso.jpg";
  if (n.includes("pepperoni") || n.includes("jamón") || n.includes("jamon")) return "/img/pizza-jamon.jpg";
  if (n.includes("mojito")) return "/img/mojito.jpg";
  if (n.includes("piña") || n.includes("pina")) return "/img/pina-colada.jpg";
  if (n.includes("espagueti")) return "/img/espaguetis.jpg";
  if (n.includes("flan") || n.includes("leche")) return "/img/tres-leches.jpg";
  if (n.includes("croqueta")) return "/img/croquetas.jpg";
  return "/img/fondo-bar.jpg"; // Fallback
};

export default function App() {
  const [menu, setMenu] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("menu");
  const [pedidoExitoso, setPedidoExitoso] = useState(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState("transfermovil");
  const [refPago, setRefPago] = useState("");

  useEffect(() => {
    axios.get(`${API}/menu`).then((res) => {
      setMenu(res.data);
      setCargando(false);
    }).catch(() => alert("Error cargando el menú."));
  }, []);

  const agregarAlCarrito = (producto, variante) => {
    setCarrito([...carrito, { producto, variante, idUnico: Date.now() }]);
  };

  const calcularTotal = () => carrito.reduce((acc, item) => acc + item.variante.precio, 0);

  const enviarPedido = async () => {
    if (!nombre || !telefono || carrito.length === 0) return alert("Llena tus datos y añade algo al carrito.");
    const items = carrito.map((item) => ({
      producto_id: item.producto.id,
      nombre: item.producto.nombre,
      cantidad: 1,
      variantes_ids: [item.variante.id],
    }));
    try {
      const res = await axios.post(`${API}/pedidos`, {
        cliente_nombre: nombre, cliente_telefono: telefono, direccion,
        metodo_pago: metodoPago, ref_pago: refPago, items,
      });
      setPedidoExitoso(res.data.pedido_id);
      setCarrito([]);
    } catch (error) { alert("Error al enviar el pedido."); }
  };

  if (cargando) return <div className="loader">Cargando la magia de El Mojito...</div>;

  if (pedidoExitoso) {
    return (
      <div className="exito-overlay">
        <div className="exito-card">
          <h1>¡Pedido Confirmado! 🍕</h1>
          <p>Tu número es el <strong>#{pedidoExitoso}</strong></p>
          <p>La cocina ya está encendida. ¡Prepárate!</p>
          <button onClick={() => { setPedidoExitoso(null); setVista("menu"); }}>Volver al Menú</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-cliente">
      <div className="contenido-interno">
      <header className="cabecera-cliente">
        <div className="logo-contenedor">
          <h1>Bar Pizzería El Mojito</h1>
          <span className="eslogan">¡Vente pa'cá!</span>
        </div>
        <button className="btn-carrito" onClick={() => setVista(vista === "menu" ? "carrito" : "menu")}>
          {vista === "menu" ? `🛒 Carrito (${carrito.length})` : "⬅ Volver"}
        </button>
      </header>

      {vista === "menu" && (
        <main className="menu-grid">
          {menu.map((producto) => (
            <div key={producto.id} className="tarjeta-producto">
              <div className="img-producto">
                <img src={getImagen(producto.nombre)} alt={producto.nombre} />
              </div>
              <div className="info-producto">
                <h3>{producto.nombre}</h3>
                <p className="desc">{producto.descripcion}</p>
                <div className="variantes-lista">
                  {producto.variantes.map((v) => (
                    <button key={v.id} className="btn-variante" onClick={() => agregarAlCarrito(producto, v)}>
                      {v.nombre} <span className="precio">${v.precio}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </main>
      )}

      {vista === "carrito" && (
        <main className="carrito">
          <div className="carrito-card">
            <h2>Tu Pedido</h2>
            {carrito.length === 0 ? <p className="vacio">El carrito está vacío. ¡Agrega una pizza!</p> : (
              <>
                <ul>
                  {carrito.map((item) => (
                    <li key={item.idUnico}>
                      <div>
                        <strong>{item.producto.nombre}</strong> ({item.variante.nombre})
                      </div>
                      <div className="item-der">
                        <span>${item.variante.precio}</span>
                        <button onClick={() => setCarrito(carrito.filter(i => i.idUnico !== item.idUnico))}>❌</button>
                      </div>
                    </li>
                  ))}
                </ul>
                <h3 className="total">Total: ${calcularTotal()}</h3>

                <div className="datos-cliente">
                  <h3>Tus Datos</h3>
                  <input type="text" placeholder="Tu Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  <input type="text" placeholder="Tu Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  <input type="text" placeholder="Dirección de entrega" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                  
                  <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                    <option value="transfermovil">Transfermóvil</option>
                    <option value="enzona">Enzona</option>
                    <option value="efectivo">Efectivo al entregar</option>
                  </select>

                  {metodoPago !== "efectivo" && (
                    <input type="text" placeholder="Número de referencia de pago" value={refPago} onChange={(e) => setRefPago(e.target.value)} />
                  )}

                  <button className="btn-enviar" onClick={enviarPedido}>Confirmar Pedido</button>
                </div>
              </>
            )}
          </div>
        </main>
      )}
      </div>
    </div>
  );
}
