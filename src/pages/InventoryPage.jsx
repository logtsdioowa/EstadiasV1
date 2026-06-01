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
        baseStock: p.baseStock ?? p.BaseStock ?? null,
        minStock: p.minStock ?? p.MinStock ?? 0,
        trackInventory: p.trackInventory ?? p.TrackInventory ?? true,
        inventoryStatus: p.inventoryStatus ?? p.InventoryStatus ?? "OK",
        updatedAt: p.updatedAt ?? p.UpdatedAt,
        productType: p.productType ?? p.ProductType ?? "",
        imageUrl: p.imageUrl ?? p.ImageUrl ?? "",
        inventorySourceProductId:
          p.inventorySourceProductId ?? p.InventorySourceProductId ?? null,
        inventoryMultiplier:
          p.inventoryMultiplier ?? p.InventoryMultiplier ?? 1,
      }));

      setInventory(normalizedInventory);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      showToast("No se pudo cargar el inventario.", "error");
    }
  };

  const isDerivedProduct = (product) => {
    return Boolean(
      product?.inventorySourceProductId &&
        product.inventorySourceProductId !== ""
    );
  };

  const isCigaretteBaseProduct = (product) => {
    if (!product) return false;

    const name = (product.name || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    const productType = product.productType || "";

    return (
      productType === "INVENTORY_BASE" &&
      (name.includes("cigarro") || category.includes("cigarro"))
    );
  };

  const isCigarettePackProduct = (product) => {
    if (!product) return false;

    const name = (product.name || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    const productType = product.productType || "";

    return (
      productType === "PACK" &&
      (name.includes("cajetilla") || category.includes("cigarro"))
    );
  };

  const isCigaretteInventoryInput = (product) => {
    return isCigaretteBaseProduct(product) || isCigarettePackProduct(product);
  };

  const getQuantityToSend = () => {
    const parsedQuantity = Number(stockModal.quantity || 0);

    if (isCigaretteInventoryInput(stockModal.product)) {
      return parsedQuantity * 20;
    }

    return parsedQuantity;
  };
const openStockModal = (mode, product) => {
  const isInventoryBase = product?.productType === "INVENTORY_BASE";
  const isBottle = product?.productType === "BOTTLE";

  if (
    isDerivedProduct(product) &&
    !isCigarettePackProduct(product) &&
    !isInventoryBase &&
    !isBottle
  ) {
    showToast(
      "Este producto descuenta de un inventario base. Ajusta la botella, cajetilla o producto base correspondiente.",
      "warning"
    );
    return;
  }

  const initialQuantity =
    mode === "adjust"
      ? isCigaretteInventoryInput(product)
        ? String(Number(product.stock ?? 0))
        : String(product.stock ?? 0)
      : "";

  setStockModal({
    isOpen: true,
    mode,
    product,
    quantity: initialQuantity,
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
    const quantityToSend = getQuantityToSend();

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
          quantity: quantityToSend,
        });

        showToast("Producto reabastecido correctamente.", "success");
      }

      if (stockModal.mode === "adjust") {
        await api.put(`/Products/AdjustStock/${stockModal.product.productId}`, {
          quantity: quantityToSend,
        });

        showToast("Inventario ajustado correctamente.", "success");
      }

      closeStockModal();
      loadInventory();
    } catch (error) {
      console.error("Error al actualizar inventario:", error);

      if (error.response && error.response.data) {
        const apiError =
          error.response.data.message ||
          error.response.data.Message ||
          error.response.data;

        showToast(apiError, "error");
      } else {
        showToast("No se pudo actualizar el inventario.", "error");
      }
    }
  };

  return (
    <div className="page-card">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

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
              {isCigaretteInventoryInput(stockModal.product)
                ? stockModal.mode === "restock"
                  ? "Cajetillas a agregar"
                  : "Nueva existencia exacta en cajetillas"
                : stockModal.mode === "restock"
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

            {isCigaretteInventoryInput(stockModal.product) && (
              <p className="inventory-help-text">
                Cada cajetilla equivale a 20 cigarros. El sistema convertirá la
                cantidad automáticamente.
              </p>
            )}

            {isCigaretteInventoryInput(stockModal.product) && (
              <p className="inventory-help-text">
                Cantidad que se guardará en inventario base:{" "}
                <strong>{getQuantityToSend()} cigarros</strong>
              </p>
            )}

            <div className="modal-actions">
              <button className="modal-cancel-button" onClick={closeStockModal}>
                Cancelar
              </button>

              <button
                className="modal-confirm-button"
                onClick={submitStockModal}
              >
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