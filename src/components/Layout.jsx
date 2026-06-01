import { Outlet } from "react-router-dom";
import AdminNav from "./AdminNav";

function Layout() {
  return (
    <div className="app-layout">
      <main className="main-content no-left-sidebar">
        <AdminNav />
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;