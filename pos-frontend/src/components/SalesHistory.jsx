function SalesHistory({ sales, onViewDetail }) {
  return (
    <div className="sales-history">
      <div className="sales-history-header">
        <h2>Historial de ventas</h2>
        <span>{sales.length} venta(s)</span>
      </div>

      {sales.length === 0 ? (
        <p>No hay ventas registradas.</p>
      ) : (
        <div className="sales-cards-grid">
          {sales.map((sale) => (
            <article className="sale-card" key={sale.saleId}>
              <div className="sale-card-header">
                <div>
                  <span className="sale-folio">Folio #{sale.saleId}</span>
                  <h3>${Number(sale.total || 0).toFixed(2)}</h3>
                </div>

                <span className="sale-status">
                  {sale.saleStatus || "Completada"}
                </span>
              </div>

              <div className="sale-card-info">
                <div>
                  <small>Usuario</small>
                  <strong>{sale.userName || "Sin usuario"}</strong>
                </div>

                <div>
                  <small>Método de pago</small>
                  <strong>{sale.paymentMethod || "Sin método"}</strong>
                </div>

                <div>
                  <small>Fecha</small>
                  <strong>
                    {sale.createdAt
                      ? new Date(sale.createdAt).toLocaleString()
                      : "Sin fecha"}
                  </strong>
                </div>
              </div>

              <button
                className="sale-detail-button"
                onClick={() => onViewDetail(sale.saleId)}
              >
                Ver detalle
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default SalesHistory;