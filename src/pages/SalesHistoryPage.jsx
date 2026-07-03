import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const formatCurrency = (value) => {
    return `$${Number(value || 0).toFixed(2)}`;
  };

  const formatDateKey = (dateValue) => {
    if (!dateValue) return "Sin fecha";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatFullDate = (dateValue) => {
    if (!dateValue) return "Sin fecha";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadSales = async () => {
    try {
      setLoadingSales(true);

      const response = await api.get("/Sales");

      const normalizedSales = (response.data || []).map((s) => ({
        saleId: s.saleId ?? s.SaleId,
        userName: s.userName ?? s.UserName,
        paymentMethod: s.paymentMethod ?? s.PaymentMethod,
        paymentReference: s.paymentReference ?? s.PaymentReference,
        creditStatus: s.creditStatus ?? s.CreditStatus,
        subtotal: s.subtotal ?? s.Subtotal,
        total: s.total ?? s.Total,
        saleStatus: s.saleStatus ?? s.SaleStatus,
        createdAt: s.createdAt ?? s.CreatedAt,
      }));

      setSales(normalizedSales);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    } finally {
      setLoadingSales(false);
    }
  };

  const viewSaleDetail = async (saleId) => {
    try {
      setLoadingDetail(true);

      const response = await api.get(`/Sales/${saleId}`);
      const sale = response.data;

      const normalizedSale = {
        saleId: sale.saleId ?? sale.SaleId,
        userName: sale.userName ?? sale.UserName,
        paymentMethod: sale.paymentMethod ?? sale.PaymentMethod,
        paymentReference: sale.paymentReference ?? sale.PaymentReference,
        creditStatus: sale.creditStatus ?? sale.CreditStatus,
        subtotal: sale.subtotal ?? sale.Subtotal,
        total: sale.total ?? sale.Total,
        saleStatus: sale.saleStatus ?? sale.SaleStatus,
        createdAt: sale.createdAt ?? sale.CreatedAt,

        details: (sale.details ?? sale.Details ?? []).map((d) => ({
          saleDetailId: d.saleDetailId ?? d.SaleDetailId,
          productId: d.productId ?? d.ProductId,
          productName: d.productName ?? d.ProductName,
          selectedBeerName: d.selectedBeerName ?? d.SelectedBeerName,
          selectedBottleName: d.selectedBottleName ?? d.SelectedBottleName,
          quantity: d.quantity ?? d.Quantity,
          unitPrice: d.unitPrice ?? d.UnitPrice,
          totalMinutes: d.totalMinutes ?? d.TotalMinutes,
          subtotal: d.subtotal ?? d.Subtotal,
        })),
      };

      setSelectedSale(normalizedSale);
    } catch (error) {
      console.error("Error al cargar detalle:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const groupedSales = useMemo(() => {
    const groups = {};

    sales.forEach((sale) => {
      const key = formatDateKey(sale.createdAt);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(sale);
    });

    return Object.entries(groups).map(([dateLabel, items]) => ({
      dateLabel,
      items: items
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    }));
  }, [sales]);

  return (
    <div className="sales-history-layout">
      <aside className="sales-history-sidebar">
        <div className="sales-history-sidebar-header">
          <h2>Historial de ventas</h2>
          <button type="button" onClick={loadSales}>
            Actualizar
          </button>
        </div>

        {loadingSales ? (
          <p className="sales-history-empty">Cargando ventas...</p>
        ) : groupedSales.length === 0 ? (
          <p className="sales-history-empty">No hay ventas registradas.</p>
        ) : (
          <div className="sales-history-groups">
            {groupedSales.map((group) => (
              <div className="sales-history-date-group" key={group.dateLabel}>
                <h3>{group.dateLabel}</h3>

                <div className="sales-history-sale-list">
                  {group.items.map((sale, index) => {
                    const isSelected =
                      selectedSale && selectedSale.saleId === sale.saleId;

                    return (
                      <button
                        type="button"
                        key={sale.saleId}
                        className={`sales-history-sale-item ${
                          isSelected ? "active" : ""
                        }`}
                        onClick={() => viewSaleDetail(sale.saleId)}
                      >
                        <span className="sales-history-sale-version">
                          v{index + 1}
                        </span>

                        <span className="sales-history-sale-info">
                          <strong>Venta #{sale.saleId}</strong>
                          <small>{sale.paymentMethod || "Sin método"}</small>
                        </span>

                        <span className="sales-history-sale-total">
                          {formatCurrency(sale.total)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="sales-history-content">
        {loadingDetail && (
          <div className="sale-detail-box">
            <p>Cargando detalle de venta...</p>
          </div>
        )}

        {!loadingDetail && !selectedSale && (
          <div className="sale-detail-box sale-detail-placeholder">
            <h2>Detalle de venta</h2>
            <p>Selecciona una venta del panel lateral para consultar su detalle.</p>
          </div>
        )}

        {!loadingDetail && selectedSale && (
          <div className="sale-detail-box">
            <div className="sale-detail-header">
              <div>
                <h2>Detalle de venta #{selectedSale.saleId}</h2>
                <p>{formatFullDate(selectedSale.createdAt)}</p>
              </div>

              <button type="button" onClick={() => setSelectedSale(null)}>
                Cerrar
              </button>
            </div>

            <div className="sale-detail-summary">
              <div>
                <span>Usuario</span>
                <strong>{selectedSale.userName || "Sin usuario"}</strong>
              </div>

              <div>
                <span>Método de pago</span>
                <strong>{selectedSale.paymentMethod || "Sin método"}</strong>
              </div>

              <div>
                <span>Referencia</span>
                <strong>{selectedSale.paymentReference || "Sin referencia"}</strong>
              </div>

              <div>
                <span>Estatus</span>
                <strong>{selectedSale.saleStatus || "Sin estatus"}</strong>
              </div>
            </div>

            <table className="sale-detail-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {selectedSale.details.length === 0 ? (
                  <tr>
                    <td colSpan="4">Esta venta no tiene productos registrados.</td>
                  </tr>
                ) : (
                  selectedSale.details.map((item) => {
                    const productLabel = [
                      item.productName,
                      item.selectedBeerName
                        ? `Cerveza: ${item.selectedBeerName}`
                        : null,
                      item.selectedBottleName
                        ? `Botella: ${item.selectedBottleName}`
                        : null,
                      item.totalMinutes
                        ? `${item.totalMinutes} min`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" - ");

                    return (
                      <tr key={item.saleDetailId}>
                        <td>{productLabel}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="sale-detail-total">
              <span>Subtotal: {formatCurrency(selectedSale.subtotal)}</span>
              <strong>Total: {formatCurrency(selectedSale.total)}</strong>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SalesHistoryPage;