import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function InventoryPanel() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [stockModal, setStockModal] = useState({
    isOpen: false,
    product: null,
    stock: "",
    minStock: "",
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

  const normalizeProduct = (product) => ({
    productId: product.productId ?? product.ProductId,
    name: product.name ?? product.Name,
    category: product.category ?? product.Category ?? "Sin categoría",
    productType: product.productType ?? product.ProductType ?? "",
    stock: product.stock ?? product.Stock ?? 0,
    minStock: product.minStock ?? product.MinStock ?? 0,
    baseStock: product.baseStock ?? product.BaseStock ?? null,
    trackInventory: product.trackInventory ?? product.TrackInventory ?? false,
    inventoryStatus:
      product.inventoryStatus ?? product.InventoryStatus ?? "NO_TRACK",
    imageUrl: product.imageUrl ?? product.ImageUrl ?? "",
    bottleVolumeMl: product.bottleVolumeMl ?? product.BottleVolumeMl ?? null,
    servingVolumeMl: product.servingVolumeMl ?? product.ServingVolumeMl ?? null,
    updatedAt: product.updatedAt ?? product.UpdatedAt ?? null,
    lastRestockAt: product.lastRestockAt ?? product.LastRestockAt ?? null,
  });

  const loadInventory = async () => {
    try {
      setLoading(true);

      const response = await api.get("/Products/Inventory");

      const normalizedInventory = (response.data || []).map(normalizeProduct);

      setInventory(normalizedInventory);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      showToast("No se pudo cargar el inventario.", "error");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const openStockModal = (product) => {
    setStockModal({
      isOpen: true,
      product,
      stock: product.stock ?? 0,
      minStock: product.minStock ?? 0,
    });
  };

  const closeStockModal = () => {
    setStockModal({
      isOpen: false,
      product: null,
      stock: "",
      minStock: "",
    });
  };

  const saveStock = async () => {
    if (!stockModal.product) return;

    const productId = stockModal.product.productId;

    const payload = {
      stock: Number(stockModal.stock || 0),
      minStock: Number(stockModal.minStock || 0),
    };

    try {
      setLoading(true);

      await api.put(`/Products/${productId}/Stock`, payload);

      showToast("Inventario actualizado correctamente.", "success");

      closeStockModal();
      await loadInventory();
    } catch (error) {
      console.error("Error al actualizar inventario:", error);
      showToast("No se pudo actualizar el inventario.", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Sin registro";

    return new Date(value).toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (product) => {
    if (!product.trackInventory) {
      return {
        text: "No controlado",
        className: "no-track",
      };
    }

    const stock = Number(product.stock || 0);
    const minStock = Number(product.minStock || 0);

    if (stock <= 0) {
      return {
        text: "Agotado",
        className: "out-stock",
      };
    }

    if (stock <= minStock) {
      return {
        text: "Stock bajo",
        className: "low-stock",
      };
    }

    return {
      text: "Disponible",
      className: "stock-ok",
    };
  };

  const summary = useMemo(() => {
    const trackedProducts = inventory.filter((item) => item.trackInventory);

    return {
      total: trackedProducts.length,
      out: trackedProducts.filter((item) => Number(item.stock || 0) <= 0)
        .length,
      low: trackedProducts.filter(
        (item) =>
          Number(item.stock || 0) > 0 &&
          Number(item.stock || 0) <= Number(item.minStock || 0)
      ).length,
      ok: trackedProducts.filter(
        (item) => Number(item.stock || 0) > Number(item.minStock || 0)
      ).length,
    };
  }, [inventory]);

  const groupedInventory = useMemo(() => {
    return inventory.reduce((groups, product) => {
      const category = product.category || "Sin categoría";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(product);

      return groups;
    }, {});
  }, [inventory]);

  const categoryNames = Object.keys(groupedInventory).sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <section className="inventory-panel">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="page-card">
        <div className="sales-history-header">
          <div>
            <h2>Inventario</h2>
            <p>Consulta y actualiza las existencias registradas.</p>
          </div>

          <button
            type="button"
            className="history-button"
            onClick={loadInventory}
            disabled={loading}
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        <div className="inventory-summary">
          <div className="inventory-alert-card ok">
            <small>Disponibles</small>
            <span>{summary.ok}</span>
          </div>

          <div className="inventory-alert-card low">
            <small>Stock bajo</small>
            <span>{summary.low}</span>
          </div>

          <div className="inventory-alert-card out">
            <small>Agotados</small>
            <span>{summary.out}</span>
          </div>
        </div>

        {loading && inventory.length === 0 ? (
          <p>Cargando inventario...</p>
        ) : categoryNames.length === 0 ? (
          <p>No hay productos en inventario.</p>
        ) : (
          <div className="inventory-category-sections">
            {categoryNames.map((category) => (
              <section className="inventory-category-section" key={category}>
                <div className="product-category-header">
                  <h2>{category}</h2>
                  <span>{groupedInventory[category].length} producto(s)</span>
                </div>

                <div className="inventory-table-wrapper">
                  <table className="sale-detail-table">
                    <thead>
                      <tr>
                        <th>Imagen</th>
                        <th>Producto</th>
                        <th>Existencia</th>
                        <th>Mínimo</th>
                        <th>Estado</th>
                        <th>Último relleno</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {groupedInventory[category].map((product) => {
                        const status = getStatusLabel(product);

                        return (
                          <tr key={product.productId}>
                            <td>
                              <div className="inventory-product-image">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                  />
                                ) : (
                                  <span>Sin imagen</span>
                                )}
                              </div>
                            </td>

                            <td>
                              <strong>{product.name}</strong>
                              <br />
                              <small>{product.productType}</small>
                            </td>

                            <td>{Number(product.stock || 0).toFixed(2)}</td>

                            <td>{Number(product.minStock || 0).toFixed(2)}</td>

                            <td>
                              <span className={`stock-badge ${status.className}`}>
                                {status.text}
                              </span>
                            </td>

                            <td>
                              {formatDate(
                                product.lastRestockAt || product.updatedAt
                              )}
                            </td>

                            <td>
                              <div className="inventory-actions">
                                <button
                                  type="button"
                                  onClick={() => openStockModal(product)}
                                >
                                  Editar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {stockModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Actualizar inventario</h2>

            <p>
              Producto: <strong>{stockModal.product?.name}</strong>
            </p>

            <div className="form-grid">
              <label>
                Existencia
                <input
                  type="number"
                  step="0.01"
                  value={stockModal.stock}
                  onChange={(event) =>
                    setStockModal((prev) => ({
                      ...prev,
                      stock: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Stock mínimo
                <input
                  type="number"
                  step="0.01"
                  value={stockModal.minStock}
                  onChange={(event) =>
                    setStockModal((prev) => ({
                      ...prev,
                      minStock: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeStockModal}
                disabled={loading}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="modal-confirm-button"
                onClick={saveStock}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default InventoryPanel;