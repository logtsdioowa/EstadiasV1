import { Link, Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="app-layout">
      <aside className="main-sidebar">
        <h2>POS Billar</h2>

        <nav>
          <Link to="/">Punto de venta</Link>
          <Link to="/inventario">Inventario</Link>
          <Link to="/productos">Productos</Link>
          <Link to="/ventas">Historial de ventas</Link>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;