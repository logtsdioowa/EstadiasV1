import { Link } from "react-router-dom";

function AdminNav() {
  return (
    <nav className="admin-nav">
      <Link to="/">Punto de venta</Link>
      <Link to="/inventario">Inventario</Link>
      <Link to="/productos">Productos</Link>
      <Link to="/ventas">Ventas</Link>
    </nav>
  );
}

export default AdminNav;