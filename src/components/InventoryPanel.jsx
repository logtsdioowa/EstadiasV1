import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function InventoryPanel() {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [loadingProductId, setLoadingProductId] = useState(null);

  const [resetStockInputs, setResetStockInputs] = useState({});
  const [addStockInputs, setAddStockInputs] = useState({});

  useEffect(() => {
    loadInventory();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const normalizeApiError = (error, fallbackMessage) => {
    if (error.response && error.response.data) {
      return (
        error.response.data.message ||
        error.response.data.Message ||
        error.response.data
      );
    }

    return fallbackMessage;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    const baseUrl = api.defaults.baseURL.replace("/api", "");

    return `${baseUrl}${imageUrl}`;
  };

  const normalizeText = (value) => {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  };

  const getBeerOrder = (productName) => {
    const name = normalizeText(productName);

    if (name.includes("tecate")) return 1;
    if (name.includes("indio")) return 2;
    if (name.includes("miller") || name.includes("miler")) return 3;
    if (name.includes("ultra")) return 4;
    if (name.includes("bud light") || name.includes("budlight")) return 5;
    if (name.includes("corona")) return 6;

    return 99;
  };

  const isBeerProduct = (product) => {
    const name = normalizeText(product?.name);
    const category = normalizeText(product?.category);

    return (
      Boolean(product?.isBeer) ||
      category.includes("cerveza") ||
      name.includes("tecate") ||
      name.includes("indio") ||
      name.includes("miller") ||
      name.includes("miler") ||
      name.includes("ultra") ||
      name.includes("bud light") ||
      name.includes("budlight") ||
      name.includes("corona")
    );
  };

  const sortProductsByBeerOrder = (a, b) => {
    const isBeerA = isBeerProduct(a);
    const isBeerB = isBeerProduct(b);

    if (isBeerA && isBeerB) {
      const orderA = getBeerOrder(a.name);
      const orderB = getBeerOrder(b.name);

      if (orderA !== orderB) {
        return orderA - orderB;
      }
    }

    return normalizeText(a.name).localeCompare(normalizeText(b.name));
  };

  const sortInventoryProducts = (a, b) => {
    if (a.isProtected !== b.isProtected) {
      return a.isProtected ? 1 : -1;
    }

    const categoryA = normalizeText(a.category);
    const categoryB = normalizeText(b.category);

    const isBeerA = isBeerProduct(a);
    const isBeerB = isBeerProduct(b);

    if (isBeerA && isBeerB) {
      return sortProductsByBeerOrder(a, b);
    }

    if (isBeerA !== isBeerB) {
      return isBeerA ? -1 : 1;
    }

    const categoryCompare = categoryA.localeCompare(categoryB);
    if (categoryCompare !== 0) return categoryCompare;

    return normalizeText(a.name).localeCompare(normalizeText(b.name));
  };

  const isProtectedInventoryProduct = (product) => {
    const productType = product.productType ?? product.ProductType;
    const name = product.name ?? product.Name ?? "";

    return (
      productType === "INVENTORY_BASE" ||
      normalizeText(name).startsWith("inventario base")
    );
  };

  const normalizeInventoryProduct = (product) => {
    const productId = product.productId ?? product.ProductId;

    const stock = product.stock ?? product.Stock ?? 0;
    const baseStock = product.baseStock ?? product.BaseStock ?? stock;

    const normalizedProduct = {
      productId,
      name: product.name ?? product.Name ?? "Producto",
      category: product.category ?? product.Category ?? "Sin categoría",
      price: product.price ?? product.Price ?? 0,

      stock,
      baseStock,
      minStock: product.minStock ?? product.MinStock ?? 0,

      trackInventory:
        product.trackInventory ?? product.TrackInventory ?? false,

      requiresBeerSelection:
        product.requiresBeerSelection ??
        product.RequiresBeerSelection ??
        false,

      isBeer: product.isBeer ?? product.IsBeer ?? false,

      inventorySourceProductId:
        product.inventorySourceProductId ??
        product.InventorySourceProductId ??
        null,

      inventoryMultiplier:
        product.inventoryMultiplier ?? product.InventoryMultiplier ?? 1,

      bottleVolumeMl:
        product.bottleVolumeMl ?? product.BottleVolumeMl ?? null,

      servingVolumeMl:
        product.servingVolumeMl ?? product.ServingVolumeMl ?? null,

      productType:
        product.productType ?? product.ProductType ?? "BOTTLED_DRINK",

      inventoryStatus:
        product.inventoryStatus ??
        product.InventoryStatus ??
        "NO_TRACK",

      imageUrl: getImageUrl(product.imageUrl ?? product.ImageUrl ?? ""),

      updatedAt:
        product.updatedAt ??
        product.UpdatedAt ??
        null,
    };

    return {
      ...normalizedProduct,
      isProtected: isProtectedInventoryProduct(normalizedProduct),
    };
  };

  const loadInventory = async () => {
    try {
      const response = await api.get("/Products/Inventory");

      const normalizedInventory = response.data
        .map(normalizeInventoryProduct)
        .sort(sortInventoryProducts);

      setInventory(normalizedInventory);

      const nextResetInputs = {};
      const nextAddInputs = {};

      normalizedInventory.forEach((product) => {
        nextResetInputs[product.productId] = "";
        nextAddInputs[product.productId] = "";
      });

      setResetStockInputs(nextResetInputs);
      setAddStockInputs(nextAddInputs);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
      showToast("No se pudo cargar el inventario.", "error");
    }
  };

  const handleResetStockInputChange = (productId, value) => {
    setResetStockInputs((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const handleAddStockInputChange = (productId, value) => {
    setAddStockInputs((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const resetStock = async (product) => {
    if (product.isProtected) {
      showToast(
        "Este producto es un inventario base y no se puede modificar desde este panel.",
        "warning"
      );
      return;
    }

    const value = Number(resetStockInputs[product.productId]);

    if (resetStockInputs[product.productId] === "") {
      showToast("Ingresa la existencia final del producto.", "warning");
      return;
    }

    if (Number.isNaN(value) || value < 0) {
      showToast("La existencia final no puede ser negativa.", "warning");
      return;
    }

    try {
      setLoadingProductId(product.productId);

      await api.put(`/Products/AdjustStock/${product.productId}`, {
        quantity: value,
      });

      showToast(
        `Stock restablecido correctamente. Nueva existencia: ${formatNumber(
          value
        )}.`,
        "success"
      );

      await loadInventory();
    } catch (error) {
      console.error("Error al restablecer inventario:", error);
      console.log("Respuesta backend:", error.response?.data);

      showToast(
        normalizeApiError(error, "No se pudo restablecer el inventario."),
        "error"
      );
    } finally {
      setLoadingProductId(null);
    }
  };

  const addStock = async (product) => {
    if (product.isProtected) {
      showToast(
        "Este producto es un inventario base y no se puede modificar desde este panel.",
        "warning"
      );
      return;
    }

    const value = Number(addStockInputs[product.productId]);

    if (addStockInputs[product.productId] === "") {
      showToast("Ingresa la cantidad nueva que se agregará.", "warning");
      return;
    }

    if (Number.isNaN(value) || value <= 0) {
      showToast("La cantidad a agregar debe ser mayor a cero.", "warning");
      return;
    }

    try {
      setLoadingProductId(product.productId);

      await api.put(`/Products/Restock/${product.productId}`, {
        quantity: value,
      });

      const expectedTotal = Number(product.baseStock || 0) + value;

      showToast(
        `Stock agregado correctamente. ${formatNumber(
          product.baseStock
        )} + ${formatNumber(value)} = ${formatNumber(expectedTotal)}.`,
        "success"
      );

      await loadInventory();
    } catch (error) {
      console.error("Error al agregar inventario:", error);
      console.log("Respuesta backend:", error.response?.data);

      showToast(
        normalizeApiError(error, "No se pudo agregar inventario."),
        "error"
      );
    } finally {
      setLoadingProductId(null);
    }
  };

  const getStatusLabel = (status) => {
    if (status === "OUT_OF_STOCK") return "Agotado";
    if (status === "LOW_STOCK") return "Stock bajo";
    if (status === "OK") return "Disponible";

    return "Sin control";
  };

  const getStatusClass = (status) => {
    if (status === "OUT_OF_STOCK") return "inventory-status-out";
    if (status === "LOW_STOCK") return "inventory-status-low";
    if (status === "OK") return "inventory-status-ok";

    return "inventory-status-none";
  };

  const getProductTypeLabel = (productType) => {
    const labels = {
      BOTTLED_DRINK: "Bebida embotellada",
      PREPARED_DRINK: "Bebida preparada",
      LIQUOR_DRINK: "Bebida con licor",
      SHOT: "Shot",
      BEER_BUCKET: "Cubeta",
      PACK: "Paquete / Cajetilla",
      CIGARETTE_UNIT: "Cigarro suelto",
      SERVICE: "Servicio",
      INVENTORY_BASE: "Inventario base",
      BOTTLE: "Botella",
    };

    return labels[productType] || productType || "Producto";
  };

const getInventoryCategoryOrder = (categoryName) => {
  const name = normalizeText(categoryName);

  if (name.includes("cerveza")) return 1;
  if (name.includes("bebidas preparadas")) return 2;
  if (name.includes("shots")) return 3;
  if (name.includes("bebidas embotelladas")) return 4;
  if (name.includes("botellas")) return 5;
  if (name.includes("snacks")) return 6;
  if (name.includes("cigarros")) return 7;
  if (name.includes("servicios")) return 8;
  if (name.includes("inventarios base protegidos")) return 99;

  return 50;
};

  const filteredInventory = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    const filtered = !normalizedSearch
      ? inventory
      : inventory.filter((product) => {
          return (
            normalizeText(product.name).includes(normalizedSearch) ||
            normalizeText(product.category).includes(normalizedSearch) ||
            normalizeText(product.productType).includes(normalizedSearch)
          );
        });

    return [...filtered].sort(sortInventoryProducts);
  }, [inventory, searchTerm]);

  const groupedInventory = filteredInventory.reduce((groups, product) => {
    const categoryName = product.isProtected
      ? "Inventarios base protegidos"
      : product.category || "Sin categoría";

    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }

    groups[categoryName].push(product);

    return groups;
  }, {});

  const orderedCategoryNames = Object.keys(groupedInventory).sort((a, b) => {
  const orderA = getInventoryCategoryOrder(a);
  const orderB = getInventoryCategoryOrder(b);

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.localeCompare(b);
});

  return (
    <div className="page-card inventory-panel">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="inventory-page-header">
        <div>
          <h1>Inventario</h1>
          <p>
            Restablece existencias finales o agrega nueva mercancía al stock
            actual. Los inventarios base permanecen protegidos.
          </p>
        </div>

        <input
          type="text"
          className="inventory-search"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {orderedCategoryNames.length === 0 ? (
        <p>No hay productos en inventario.</p>
      ) : (
        <div className="inventory-category-sections">
          {orderedCategoryNames.map((categoryName) => (
            <section className="inventory-category-section" key={categoryName}>
              <div className="product-category-header">
                <h2>{categoryName}</h2>
                <span>
                  {groupedInventory[categoryName].length} producto(s)
                </span>
              </div>

              <div className="inventory-grid">
                {[...groupedInventory[categoryName]].sort(sortInventoryProducts).map((product) => {
                  const isLoading = loadingProductId === product.productId;
                  const isDisabled = product.isProtected || isLoading;

                  const addValue = Number(
                    addStockInputs[product.productId] || 0
                  );

                  const previewTotal =
                    Number(product.baseStock || 0) +
                    (Number.isNaN(addValue) ? 0 : addValue);

                  return (
                    <article
                      className={`inventory-card ${
                        product.isProtected ? "inventory-card-protected" : ""
                      }`}
                      key={product.productId}
                    >
                      <div className="inventory-card-image">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} />
                        ) : (
                          <span>Sin imagen</span>
                        )}
                      </div>

                      <div className="inventory-card-body">
                        <div className="inventory-card-header">
                          <div>
                            <h3>{product.name}</h3>
                            <span>{getProductTypeLabel(product.productType)}</span>
                          </div>

                          <div className="inventory-card-badges">
                            {product.isProtected && (
                              <span className="inventory-protected-badge">
                                Protegido
                              </span>
                            )}

                            <span
                              className={`inventory-status ${getStatusClass(
                                product.inventoryStatus
                              )}`}
                            >
                              {getStatusLabel(product.inventoryStatus)}
                            </span>
                          </div>
                        </div>

                        <div className="inventory-main-stock">
                          <span>Existencia actual</span>
                          <strong>{formatNumber(product.baseStock)}</strong>
                        </div>

                        <div className="inventory-info-grid">
                          <div>
                            <span>Stock visible</span>
                            <strong>{formatNumber(product.stock)}</strong>
                          </div>

                          <div>
                            <span>Stock mínimo</span>
                            <strong>{formatNumber(product.minStock)}</strong>
                          </div>

                          {product.bottleVolumeMl && (
                            <div>
                              <span>Botella</span>
                              <strong>
                                {formatNumber(product.bottleVolumeMl)} ml
                              </strong>
                            </div>
                          )}

                          {product.inventorySourceProductId && (
                            <div>
                              <span>Derivado</span>
                              <strong>Sí</strong>
                            </div>
                          )}

                          {product.inventoryMultiplier && (
                            <div>
                              <span>Multiplicador</span>
                              <strong>
                                {formatNumber(product.inventoryMultiplier)}
                              </strong>
                            </div>
                          )}
                        </div>

                        {product.isProtected ? (
                          <div className="inventory-protected-message">
                            <strong>Inventario base protegido</strong>
                            <p>
                              Este registro controla descuentos internos de
                              botellas, cigarros o productos derivados. Para
                              modificar existencias, actualiza el producto
                              vendible correspondiente.
                            </p>
                          </div>
                        ) : (
                          <div className="inventory-actions-layout">
                            <div className="inventory-action-box reset-stock-box">
                              <div className="inventory-action-title">
                                <strong>Restablecer stock</strong>
                                <small>
                                  Escribe la existencia final. Ejemplo: si hay
                                  30 y escribes 17, quedará en 17.
                                </small>
                              </div>

                              <div className="inventory-action-row">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Nueva existencia"
                                  value={
                                    resetStockInputs[product.productId] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleResetStockInputChange(
                                      product.productId,
                                      e.target.value
                                    )
                                  }
                                  disabled={isDisabled}
                                />

                                <button
                                  type="button"
                                  onClick={() => resetStock(product)}
                                  disabled={isDisabled}
                                >
                                  {isLoading ? "Guardando..." : "Restablecer"}
                                </button>
                              </div>
                            </div>

                            <div className="inventory-action-box add-stock-box">
                              <div className="inventory-action-title">
                                <strong>Agregar stock nuevo</strong>
                                <small>
                                  Escribe solo lo nuevo. Ejemplo: 30 + 24 = 54.
                                </small>
                              </div>

                              <div className="inventory-action-row">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Cantidad nueva"
                                  value={
                                    addStockInputs[product.productId] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleAddStockInputChange(
                                      product.productId,
                                      e.target.value
                                    )
                                  }
                                  disabled={isDisabled}
                                />

                                <button
                                  type="button"
                                  onClick={() => addStock(product)}
                                  disabled={isDisabled}
                                >
                                  {isLoading ? "Sumando..." : "Agregar"}
                                </button>
                              </div>

                              {addStockInputs[product.productId] !== "" && (
                                <div className="inventory-add-preview">
                                  <span>
                                    {formatNumber(product.baseStock)} +{" "}
                                    {formatNumber(addValue)} =
                                  </span>
                                  <strong>{formatNumber(previewTotal)}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {product.updatedAt && (
                          <p className="inventory-updated-at">
                            Última actualización:{" "}
                            {new Date(product.updatedAt).toLocaleString(
                              "es-MX"
                            )}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default InventoryPanel;