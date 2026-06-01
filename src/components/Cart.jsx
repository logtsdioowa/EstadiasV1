function Cart({ cart, onIncrease, onDecrease, onRemove }) {
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="cart">
      <h2>Carrito</h2>

      {cart.length === 0 ? (
        <p>No hay productos agregados.</p>
      ) : (
        cart.map((item, index) => (
          <div className="cart-item" key={`${item.productId}-${index}`}>
            <div>
              <strong>{item.name}</strong>
              {item.rentalTimeLabel && (
                  <p className="cart-extra-info">
                    Tiempo: {item.rentalTimeLabel}
                  </p>
                )}

              {item.selectedBeerName && (
                <p className="cart-extra-info">
                  Cerveza: {item.selectedBeerName}
                </p>
              )}

              <p>
                ${Number(item.unitPrice).toFixed(2)} x {item.quantity}
              </p>

              <p>Subtotal: ${Number(item.subtotal).toFixed(2)}</p>
            </div>

            <div className="cart-actions">
              <button onClick={() => onDecrease(index)}>-</button>
              <button onClick={() => onIncrease(index)}>+</button>
              <button onClick={() => onRemove(index)}>Eliminar</button>
            </div>
          </div>
        ))
      )}

      <hr />

      <h3>Total: ${Number(total).toFixed(2)}</h3>
    </div>
  );
}

export default Cart;