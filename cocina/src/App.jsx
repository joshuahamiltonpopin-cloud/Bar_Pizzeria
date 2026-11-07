import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:3000/api";

const ESTADOS = ["recibido", "preparando", "listo", "en_camino", "entregado"];

const COLORES = {
  recibido: "#f39c12",
  preparando: "#3498db",
  listo: "#2ecc71",
  en_camino: "#9b59b6",
  entregado: "#95a5a6",
  cancelado: "#e74c3c",
};

export default function App() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarPedidos = async () => {
    try {
      const res = await axios.get(`${API}/pedidos`);
      setPedidos(res.data);
      setError(null);
    } catch (e) {
      setError("No se pudo conectar con el servidor. ¿Está corriendo el backend?");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    
    // Conectar al WebSocket del backend
    const socket = io("http://localhost:3000");

    socket.on("pedido_nuevo", (pedido) => {
      console.log("¡Nuevo pedido recibido!", pedido);
      cargarPedidos(); // Recargamos para traer los items completos
    });

    socket.on("pedido_actualizado", (data) => {
      console.log("Pedido actualizado", data);
      cargarPedidos(); // Recargamos para reflejar el cambio
    });

    // Mantenemos un intervalo de respaldo por si se cae el socket (muy útil en Cuba)
    const intervalo = setInterval(cargarPedidos, 30000); // cada 30s por si acaso

    return () => {
      socket.disconnect();
      clearInterval(intervalo);
    };
  }, []);

  if (cargando) return <div className="estado-carga">Cargando pedidos…</div>;
  if (error) return <div className="estado-error">{error}</div>;

  const activos = pedidos.filter((p) => !["entregado", "cancelado"].includes(p.estado));
  const finalizados = pedidos.filter((p) => ["entregado", "cancelado"].includes(p.estado));

  return (
    <div className="app">
      <header className="cabecera">
        <h1>🍕 El Mojito — Cocina</h1>
        <div className="stats">
          <span>Activos: {activos.length}</span>
          <span>Finalizados: {finalizados.length}</span>
          <button onClick={cargarPedidos}>🔄 Actualizar</button>
        </div>
      </header>

      <main className="tablero">
        {ESTADOS.map((estado) => (
          <section key={estado} className="columna">
            <h2 style={{ borderColor: COLORES[estado] }}>
              {estado.toUpperCase()} ({pedidos.filter((p) => p.estado === estado).length})
            </h2>
            <div className="tarjetas">
              {pedidos
                .filter((p) => p.estado === estado)
                .map((p) => (
                  <article key={p.id} className="tarjeta" style={{ borderLeftColor: COLORES[estado] }}>
                    <div className="tarjeta-cabecera">
                      <strong>#{p.id}</strong>
                      <span className="cliente">{p.cliente_nombre}</span>
                    </div>
                    <div className="telefono">📞 {p.cliente_telefono}</div>
                    {p.direccion && <div className="direccion">📍 {p.direccion}</div>}
                    <ul className="items">
                      {p.items.map((it) => (
                        <li key={it.id}>
                          {it.cantidad}× {it.nombre_snapshot}
                          <div className="variantes">
                            {it.variantes_snapshot.map((v, i) => (
                              <span key={i}>{v.nombre}{v.precio > 0 ? ` (+$${v.precio})` : ""}</span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="total">Total: ${p.total}</div>
                    {p.metodo_pago && (
                      <div className="pago">
                        💳 {p.metodo_pago} {p.ref_pago && `— Ref: ${p.ref_pago}`}
                      </div>
                    )}
                    <div className="acciones">
                      {estado !== "entregado" && (
                        <select
                          value={p.estado}
                          onChange={(e) => cambiarEstado(p.id, e.target.value)}
                        >
                          {ESTADOS.map((e) => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      )}
                      {estado !== "entregado" && estado !== "cancelado" && (
                        <button className="cancelar" onClick={() => cambiarEstado(p.id, "cancelado")}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
