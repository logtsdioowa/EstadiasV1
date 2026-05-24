import { useEffect, useState } from "react";
import api from "../services/api";
import InventoryPanel from "../components/InventoryPanel";

function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [toast, setToast] = useState(null);

  const [stockModal, setStockModal] = useState({
    isOpen: false,
    mode: "",
    product: null,
    quantity: "",
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const loadInventory = async () => {
    try {
      const response = await api.get("/Products/Inventory");

      const normalizedInventory = response.data.map((p) => ({
        productId: p.productId ?? p.ProductId,
        name: p.name ?? p.Name,
        category: p.category ?? p.Category,
        price: p.price ?? p.Price,
        stock: p.stock ?? p.Stock ?? 0,
        minStock: p.minStock ?? p.MinStock ?? 0,
        inventoryStatus: p.inventoryStatus ?? p.InventoryStatus ?? "OK",
        updatedAt: p.updatedAt ?? p.UpdatedAt,
      }));

      setInventory(normalizedInventory);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      showToast("No se pudo cargar el inventario.", "error");
    }
  };

  const openStockModal = (mode, product) => {
    setStockModal({
      isOpen: true,
      mode,
      product,
      quantity: mode === "adjust" ? String(product.stock ?? 0) : "",
    });
  };

  const closeStockModal = () => {
    setStockModal({
      isOpen: false,
      mode: "",
      product: null,
      quantity: "",
    });
  };

  const handleStockModalChange = (e) => {
    setStockModal((prev) => ({
      ...prev,
      quantity: e.target.value,
    }));
  };

  const submitStockModal = async () => {
    if (!stockModal.product) {
      showToast("No hay producto seleccionado.", "warning");
      return;
    }

    const parsedQuantity = Number(stockModal.quantity);

    if (stockModal.mode === "restock" && parsedQuantity <= 0) {
      showToast("La cantidad a reabastecer debe ser mayor a cero.", "warning");
      return;
    }

    if (stockModal.mode === "adjust" && parsedQuantity < 0) {
      showToast("La existencia no puede ser negativa.", "warning");
      return;
    }

    try {
      if (stockModal.mode === "restock") {
        await api.put(`/Products/Restock/${stockModal.product.productId}`, {
          quantity: parsedQuantity,
        });

        showToast("Producto reabastecido correctamente.", "success");
      }

      if (stockModal.mode === "adjust") {
        await api.put(`/Products/AdjustStock/${stockModal.product.productId}`, {
          quantity: parsedQuantity,
        });

        showToast("Inventario ajustado correctamente.", "success");
      }

      closeStockModal();
      loadInventory();
    } catch (error) {
      console.error("Error al actualizar inventario:", error);

      if (error.response && error.response.data) {
        showToast(error.response.data.message || error.response.data, "error");
      } else {
        showToast("No se pudo actualizar el inventario.", "error");
      }
    }
  };

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      {stockModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>
              {stockModal.mode === "restock"
                ? "Reabastecer producto"
                : "Ajustar inventario"}
            </h2>

            <p>
              Producto: <strong>{stockModal.product?.name}</strong>
            </p>

            <label>
              {stockModal.mode === "restock"
                ? "Cantidad a agregar"
                : "Nueva existencia exacta"}
            </label>

            <input
              type="number"
              min="0"
              step="1"
              value={stockModal.quantity}
              onChange={handleStockModalChange}
              className="modal-input"
              autoFocus
            />

            <div className="modal-actions">
              <button className="modal-cancel-button" onClick={closeStockModal}>
                Cancelar
              </button>

              <button className="modal-confirm-button" onClick={submitStockModal}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <InventoryPanel
        inventory={inventory}
        onRestock={(product) => openStockModal("restock", product)}
        onAdjust={(product) => openStockModal("adjust", product)}
      />
    </div>
  );
}

export default InventoryPage;