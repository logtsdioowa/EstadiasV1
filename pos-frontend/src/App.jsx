import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import PosPage from "./pages/PosPage";
import InventoryPage from "./pages/InventoryPage";
import ProductsPage from "./pages/ProductsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PosPage />} />
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="ventas" element={<SalesHistoryPage />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;