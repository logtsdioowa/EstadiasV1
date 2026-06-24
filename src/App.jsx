import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PosPage from "./pages/PosPage";
import AdminPage from "./pages/AdminPage";
import ProductsPage from "./pages/ProductsPage";
import InventoryPanel from "./components/InventoryPanel";
import ReportsPage from "./pages/ReportsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />

        <Route path="/pos" element={<PosPage />} />

        <Route path="/admin" element={<AdminPage />}>
          <Route index element={<Navigate to="/admin/productos" replace />} />
          <Route path="productos" element={<ProductsPage hideAdminNav />} />
          <Route path="inventario" element={<InventoryPanel />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="ventas" element={<SalesHistoryPage />} />
          
        </Route>

        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;