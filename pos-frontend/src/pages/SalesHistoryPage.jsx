import { useEffect, useState } from "react";
import api from "../services/api";
import SalesHistory from "../components/SalesHistory";

function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const response = await api.get("/Sales");

      const normalizedSales = response.data.map((s) => ({
        saleId: s.saleId ?? s.SaleId,
        userName: s.userName ?? s.UserName,
        paymentMethod: s.paymentMethod ?? s.PaymentMethod,
        subtotal: s.subtotal ?? s.Subtotal,
        total: s.total ?? s.Total,
        saleStatus: s.saleStatus ?? s.SaleStatus,
        createdAt: s.createdAt ?? s.CreatedAt,
      }));

      setSales(normalizedSales);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    }
  };

  const viewSaleDetail = async (saleId) => {
    try {
      const response = await api.get(`/Sales/${saleId}`);
      const sale = response.data;

      const normalizedSale = {
        saleId: sale.saleId ?? sale.SaleId,
        userName: sale.userName ?? sale.UserName,
        paymentMethod: sale.paymentMethod ?? sale.PaymentMethod,
        subtotal: sale.subtotal ?? sale.Subtotal,
        total: sale.total ?? sale.Total,
        saleStatus: sale.saleStatus ?? sale.SaleStatus,
        createdAt: sale.createdAt ?? sale.CreatedAt,
        details: (sale.details ?? sale.Details ?? []).map((d) => ({
          saleDetailId: d.saleDetailId ?? d.SaleDetailId,
          productId: d.productId ?? d.ProductId,
          productName: d.productName ?? d.ProductName,
          quantity: d.quantity ?? d.Quantity,
          unitPrice: d.unitPrice ?? d.UnitPrice,
          subtotal: d.subtotal ?? d.Subtotal,
        })),
      };

      setSelectedSale(normalizedSale);
    } catch (error) {
      console.error("Error al cargar detalle:", error);
    }
  };

  return (
    <div>
      <SalesHistory sales={sales} onViewDetail={viewSaleDetail} />

      {selectedSale && (
        <div className="sale-detail-box">
          <div className="sale-detail-header">
            <h2>Detalle de venta #{selectedSale.saleId}</h2>

            <button onClick={() => setSelectedSale(null)}>Cerrar</button>
          </div>

          <p>Usuario: {selectedSale.userName}</p>
          <p>Método de pago: {selectedSale.paymentMethod}</p>
          <p>
            Fecha:{" "}
            {selectedSale.createdAt
              ? new Date(selectedSale.createdAt).toLocaleString()
              : "Sin fecha"}
          </p>

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
              {selectedSale.details.map((item) => (
                <tr key={item.saleDetailId}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>${Number(item.unitPrice || 0).toFixed(2)}</td>
                  <td>${Number(item.subtotal || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Total: ${Number(selectedSale.total || 0).toFixed(2)}</h3>
        </div>
      )}
    </div>
  );
}

export default SalesHistoryPage;