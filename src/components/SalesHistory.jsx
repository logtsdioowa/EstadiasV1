function SalesHistory({ sales, onViewDetail }) {
  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const formatDate = (value) => {
    if (!value) return "Sin fecha";

    return new Date(value).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const normalizeText = (value) => {
    return String(value || "").toLowerCase();
  };

  const getSaleId = (sale) => {
    return sale.saleId || sale.SaleId;
  };

  const getPaymentMethod = (sale) => {
    return (
      sale.paymentMethod ||
      sale.paymentMethodName ||
      sale.PaymentMethod ||
      sale.PaymentMethodName ||
      "Sin método"
    );
  };

  const getPaymentReference = (sale) => {
    return (
      sale.paymentReference ||
      sale.PaymentReference ||
      sale.reference ||
      sale.Reference ||
      ""
    );
  };

  const getCreditStatus = (sale) => {
    return sale.creditStatus || sale.CreditStatus || "";
  };

  const getDisplayStatus = (sale) => {
    const paymentMethod = normalizeText(getPaymentMethod(sale));
    const paymentReference = normalizeText(getPaymentReference(sale));
    const creditStatus = normalizeText(getCreditStatus(sale));

    if (paymentReference.includes("pago de crédito")) {
      return {
        label: "Pago de crédito",
        className: "sale-status-paid-credit",
      };
    }

    if (paymentMethod.includes("cortesía") || paymentMethod.includes("cortesia")) {
      return {
        label: "Cortesía",
        className: "sale-status-courtesy",
      };
    }

    if (paymentMethod.includes("crédito") || paymentMethod.includes("credito")) {
      if (creditStatus === "paid") {
        return {
          label: "Crédito pagado",
          className: "sale-status-paid-credit",
        };
      }

      return {
        label: "Crédito pendiente",
        className: "sale-status-credit",
      };
    }

    return {
      label: sale.saleStatus || sale.SaleStatus || "Completada",
      className: "sale-status-completed",
    };
  };

  const getDisplayedTotal = (sale) => {
    const paymentMethod = normalizeText(getPaymentMethod(sale));

    if (paymentMethod.includes("cortesía") || paymentMethod.includes("cortesia")) {
      return "Sin cobro";
    }

    return formatCurrency(sale.total || sale.Total || 0);
  };

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
          {sales.map((sale) => {
            const saleId = getSaleId(sale);
            const status = getDisplayStatus(sale);
            const paymentReference = getPaymentReference(sale);
            const creditStatus = normalizeText(getCreditStatus(sale));

            return (
              <article className="sale-card" key={saleId}>
                <div className="sale-card-header">
                  <div>
                    <span className="sale-folio">Folio #{saleId}</span>
                    <h3>{getDisplayedTotal(sale)}</h3>
                  </div>

                  <span className={`sale-status ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="sale-card-info">
                  <div>
                    <small>Usuario</small>
                    <strong>{sale.userName || sale.UserName || "Sin usuario"}</strong>
                  </div>

                  <div>
                    <small>Método de pago</small>
                    <strong>{getPaymentMethod(sale)}</strong>
                  </div>

                  <div>
                    <small>Fecha</small>
                    <strong>{formatDate(sale.createdAt || sale.CreatedAt)}</strong>
                  </div>

                  {paymentReference && (
                    <div className="sale-card-info-full">
                      <small>Referencia</small>
                      <strong>{paymentReference}</strong>
                    </div>
                  )}

                  {creditStatus && (
                    <div className="sale-card-info-full">
                      <small>Estado de crédito</small>
                      <strong>
                        {creditStatus === "paid"
                          ? "Pagado"
                          : creditStatus === "pending"
                          ? "Pendiente"
                          : creditStatus}
                      </strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="sale-detail-button"
                  onClick={() => onViewDetail(saleId)}
                >
                  Ver detalle
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SalesHistory;