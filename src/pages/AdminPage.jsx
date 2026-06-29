import { NavLink, Outlet } from "react-router-dom";

function AdminPage() {
  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <div className="admin-brand">
          <img
            src="/nuevo-ejido-logo.jpg"
            alt="Club Deportivo Billar El Nuevo Ejido"
          />
        </div>

        <div className="admin-nav-links">
          <NavLink
            to="/admin/productos"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Productos
          </NavLink>

          <NavLink
            to="/admin/inventario"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Inventario
          </NavLink>

          <NavLink
            to="/admin/reportes"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Reportes
          </NavLink>

          <NavLink
            to="/admin/ventas"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Tickets
          </NavLink>

          <NavLink className="pos-access-button" to="/pos">
            Ir al POS
          </NavLink>
        </div>
      </nav>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminPage;