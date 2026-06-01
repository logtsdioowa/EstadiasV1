function ProductCard({ product, onAdd, onEdit, onDelete }) {
  const isOutOfStock =
    product.trackInventory && Number(product.stock || 0) <= 0;

  const isLowStock =
    product.trackInventory &&
    Number(product.stock || 0) > 0 &&
    Number(product.stock || 0) <= Number(product.minStock || 0);

  const handleCardClick = () => {
    if (!onAdd || isOutOfStock) return;
    onAdd(product);
  };

  return (
    <div
      className={`product-card ${isOutOfStock ? "out-of-stock-card" : ""} ${
        onAdd && !isOutOfStock ? "clickable-card" : ""
      }`}
      onClick={handleCardClick}
      role={onAdd ? "button" : undefined}
      tabIndex={onAdd && !isOutOfStock ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onAdd && !isOutOfStock) {
          e.preventDefault();
          onAdd(product);
        }
      }}
    >
      <div className="product-image">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <span>Sin imagen</span>
        )}
      </div>

      <div className="product-info">
        <h3>{product.name || "Producto sin nombre"}</h3>
        <p>{product.category || "Sin categoría"}</p>
        <strong>${Number(product.price || 0).toFixed(2)}</strong>

        {product.trackInventory ? (
          <div className="inventory-labels">
            <span>Stock: {Number(product.stock || 0)}</span>

            {isOutOfStock && (
              <span className="stock-badge out-stock">Agotado</span>
            )}

            {isLowStock && (
              <span className="stock-badge low-stock">Stock bajo</span>
            )}
          </div>
        ) : (
          <div className="inventory-labels">
            <span className="stock-badge no-track">Sin control de stock</span>
          </div>
        )}
      </div>

      <div className="product-card-actions">
        

        {onEdit && (
          <button
            className="edit-card-button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
          >
            Editar
          </button>
        )}

        {onDelete && (
          <button
            className="delete-card-button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(product);
            }}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;