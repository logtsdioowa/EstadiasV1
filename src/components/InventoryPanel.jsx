function InventoryPanel({ inventory, onRestock, onAdjust }) {
  const visibleInventory = inventory.filter((item) => {
    return item.productType !== "INVENTORY_BASE";
  });

  const outOfStock = visibleInventory.filter(
    (item) => item.inventoryStatus === "OUT_OF_STOCK"
  );

  const lowStock = visibleInventory.filter(
    (item) => item.inventoryStatus === "LOW_STOCK"
  );

  const categoryPriority = [
    "Cervezas",
    "Bebidas preparadas",
    "Shots",
    "Bebidas embotelladas",
    "Snacks",
    "Cigarros",
    "Botellas",
    "Otros",
    "Sin categoría",
  ];

  const getNormalizedText = (value) => {
    return (value || "").toString().toLowerCase().trim();
  };

  const isDerivedProduct = (item) => {
    return Boolean(
      item.inventorySourceProductId && item.inventorySourceProductId !== ""
    );
  };

  const isBottle = (item) => {
    return item.productType === "BOTTLE";
  };

  const isShot = (item) => {
    return item.productType === "SHOT";
  };

  const isLiquorDrink = (item) => {
    return item.productType === "LIQUOR_DRINK";
  };

  const isCigaretteUnit = (item) => {
    return item.productType === "CIGARETTE_UNIT";
  };

  const isBeerPreparedDrink = (item) => {
    return item.productType === "PREPARED_DRINK";
  };

  const isBeerBucket = (item) => {
    return item.productType === "BEER_BUCKET";
  };

  const isService = (item) => {
    return item.productType === "SERVICE";
  };

  const isCigarettePack = (item) => {
    const name = getNormalizedText(item.name);
    const category = getNormalizedText(item.category);

    return (
      item.productType === "PACK" &&
      (name.includes("cajetilla") || category.includes("cigarro"))
    );
  };

  const canEditInventory = (item) => {
    const derived = isDerivedProduct(item);

    if (isBottle(item)) return true;
    if (isCigarettePack(item)) return true;

    if (isShot(item)) return false;
    if (isLiquorDrink(item)) return false;
    if (isCigaretteUnit(item)) return false;
    if (isBeerPreparedDrink(item)) return false;
    if (isBeerBucket(item)) return false;
    if (isService(item)) return false;

    if (derived) return false;

    return Boolean(item.trackInventory);
  };

  const getInventoryNote = (item) => {
    if (isBottle(item)) {
      return "Se ajusta como botella";
    }

    if (isCigarettePack(item)) {
      return "Se ajusta como cajetilla";
    }

    if (isCigaretteUnit(item)) {
      return "Descuenta de cajetilla";
    }

    if (isShot(item)) {
      return "Descuenta de botella";
    }

    if (isLiquorDrink(item)) {
      return "Descuenta de botella";
    }

    if (isBeerPreparedDrink(item)) {
      return "Descuenta cerveza al vender";
    }

    if (isBeerBucket(item)) {
      return "Descuenta 10 cervezas";
    }

    if (isDerivedProduct(item)) {
      return "Descuenta de inventario base";
    }

    return "";
  };

  const getStockLabel = (item) => {
    const stock = Number(item.stock || 0);

    if (isBottle(item)) {
      return `${stock.toFixed(2)} botella(s)`;
    }

    if (isCigarettePack(item)) {
      return `${Math.floor(stock)} cajetilla(s)`;
    }

    if (isCigaretteUnit(item)) {
      return `${Math.floor(stock)} cigarro(s)`;
    }

    if (isShot(item)) {
      return `${Math.floor(stock)} shot(s)`;
    }

    if (isLiquorDrink(item)) {
      return `${Math.floor(stock)} bebida(s)`;
    }

    return Number.isInteger(stock) ? String(stock) : stock.toFixed(2);
  };

  const getBaseStockLabel = (item) => {
    if (!isDerivedProduct(item)) return "";

    const baseStock = Number(item.baseStock || 0);

    if (isShot(item) || isLiquorDrink(item) || isBottle(item)) {
      return `Base: ${baseStock.toFixed(2)} botella(s)`;
    }

    if (isCigarettePack(item) || isCigaretteUnit(item)) {
      return `Base: ${baseStock.toFixed(2)} cajetilla(s)`;
    }

    return `Base: ${baseStock.toFixed(2)} unidad(es)`;
  };

  const formatLastRestockDate = (value) => {
    if (!value) return "Sin registro";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Sin registro";
    }

    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderInventoryStatus = (status) => {
    if (status === "OUT_OF_STOCK") {
      return <span className="stock-badge out-stock">Agotado</span>;
    }

    if (status === "LOW_STOCK") {
      return <span className="stock-badge low-stock">Stock bajo</span>;
    }

    if (status === "OK") {
      return <span className="stock-badge stock-ok">OK</span>;
    }

    return <span className="stock-badge no-track">Sin control</span>;
  };

  const groupedInventory = visibleInventory.reduce((groups, item) => {
    const categoryName = item.category || "Sin categoría";

    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }

    groups[categoryName].push(item);

    return groups;
  }, {});

  const orderedCategoryNames = Object.keys(groupedInventory).sort((a, b) => {
    const indexA = categoryPriority.indexOf(a);
    const indexB = categoryPriority.indexOf(b);

    const priorityA = indexA === -1 ? 999 : indexA;
    const priorityB = indexB === -1 ? 999 : indexB;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.localeCompare(b);
  });

  return (
    <div className="inventory-panel">
      <h2>Inventario</h2>

      <div className="inventory-summary">
        <div className="inventory-alert-card out">
          <strong>Agotados</strong>
          <span>{outOfStock.length}</span>
        </div>

        <div className="inventory-alert-card low">
          <strong>Stock bajo</strong>
          <span>{lowStock.length}</span>
        </div>

        <div className="inventory-alert-card ok">
          <strong>Productos controlados</strong>
          <span>{visibleInventory.length}</span>
        </div>
      </div>

      {visibleInventory.length === 0 ? (
        <p>No hay productos con control de inventario.</p>
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

              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Imagen</th>
                      <th>Producto</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                      <th>Último relleno</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupedInventory[categoryName].map((item) => {
                      const note = getInventoryNote(item);
                      const baseStockLabel = getBaseStockLabel(item);

                      return (
                        <tr key={item.productId}>
                          <td>
                            <div className="inventory-product-image">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} />
                              ) : (
                                <span>Sin imagen</span>
                              )}
                            </div>
                          </td>

                          <td>
                            <strong>{item.name}</strong>

                            {note && (
                              <div className="inventory-derived-note">
                                {note}
                              </div>
                            )}

                            {baseStockLabel && (
                              <div className="inventory-base-note">
                                {baseStockLabel}
                              </div>
                            )}
                          </td>

                          <td>{getStockLabel(item)}</td>

                          <td>{Number(item.minStock || 0)}</td>

                          <td>{formatLastRestockDate(item.updatedAt)}</td>

                          <td>{renderInventoryStatus(item.inventoryStatus)}</td>

                          <td>
                            {canEditInventory(item) ? (
                              <div className="inventory-actions">
                                <button onClick={() => onRestock(item)}>
                                  Reabastecer
                                </button>

                                <button onClick={() => onAdjust(item)}>
                                  Ajustar
                                </button>
                              </div>
                            ) : (
                              <span className="inventory-derived-note">
                                No se ajusta directamente
                              </span>
                            )}
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
  );
}

export default InventoryPanel;    