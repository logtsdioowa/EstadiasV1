import { Link } from "react-router-dom";

function AdminNav() {
  return (
    <nav className="admin-nav">
      <Link to="/">Punto de venta</Link>
      <Link to="/inventario">Inventario</Link>
      <Link to="/productos">Productos</Link>
      <Link to="/ventas">Tickets</Link>
    </nav>
  );
}

export default AdminNav;