function InventoryPanel({ inventory, onRestock, onAdjust }) {
  const outOfStock = inventory.filter(
    (item) => item.inventoryStatus === "OUT_OF_STOCK"
  );

  const lowStock = inventory.filter(
    (item) => item.inventoryStatus === "LOW_STOCK"
  );

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
          <span>{inventory.length}</span>
        </div>
      </div>

      <table className="inventory-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {inventory.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td>{item.category || "Sin categoría"}</td>
              <td>{Number(item.stock || 0)}</td>
              <td>{Number(item.minStock || 0)}</td>
              <td>
                {item.inventoryStatus === "OUT_OF_STOCK" && (
                  <span className="stock-badge out-stock">Agotado</span>
                )}

                {item.inventoryStatus === "LOW_STOCK" && (
                  <span className="stock-badge low-stock">Stock bajo</span>
                )}

                {item.inventoryStatus === "OK" && (
                  <span className="stock-badge stock-ok">OK</span>
                )}
              </td>
              <td>
                <div className="inventory-actions">
                  <button onClick={() => onRestock(item)}>Restablecer</button>
                  <button onClick={() => onAdjust(item)}>Ajustar</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {inventory.length === 0 && (
        <p>No hay productos con control de inventario.</p>
      )}
    </div>
  );
}

export default InventoryPanel;