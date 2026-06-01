import { useEffect, useState } from "react";
import api from "../services/api";

function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [dailyReport, setDailyReport] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState([]);
  const [categoryReport, setCategoryReport] = useState([]);
  const [productReport, setProductReport] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [activeReport, setActiveReport] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setTodayFilter();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [startDate, endDate]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("es-MX");
  };

  const getDateString = (date) => {
    return date.toISOString().split("T")[0];
  };

  const setTodayFilter = () => {
    const today = new Date();
    const date = getDateString(today);

    setStartDate(date);
    setEndDate(date);
  };

  const setWeekFilter = () => {
    const today = new Date();
    const day = today.getDay();

    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStartDate(getDateString(monday));
    setEndDate(getDateString(sunday));
  };

  const setMonthFilter = () => {
    const today = new Date();

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(getDateString(firstDay));
    setEndDate(getDateString(lastDay));
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    return params.toString();
  };

  const loadReports = async () => {
    if (!startDate || !endDate) {
      showToast("Selecciona fecha inicial y fecha final.", "warning");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast("La fecha inicial no puede ser mayor que la fecha final.", "warning");
      return;
    }

    try {
      setLoading(true);

      const query = buildQueryString();

      const [
        summaryResponse,
        dailyResponse,
        weeklyResponse,
        categoryResponse,
        productResponse,
      ] = await Promise.all([
        api.get(`/Sales/Reports/Summary?${query}`),
        api.get(`/Sales/Reports/Daily?${query}`),
        api.get(`/Sales/Reports/Weekly?${query}`),
        api.get(`/Sales/Reports/ByCategory?${query}`),
        api.get(`/Sales/Reports/ByProduct?${query}`),
      ]);

      setSummary(summaryResponse.data);
      setDailyReport(dailyResponse.data || []);
      setWeeklyReport(weeklyResponse.data || []);
      setCategoryReport(categoryResponse.data || []);
      setProductReport(productResponse.data || []);
    } catch (error) {
      console.error("Error al cargar reportes:", error);
      showToast("No se pudieron cargar los reportes.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getProductTypeLabel = (productType) => {
    const labels = {
      BOTTLED_DRINK: "Bebida embotellada",
      PREPARED_DRINK: "Bebida preparada con cerveza",
      LIQUOR_DRINK: "Bebida preparada con licor",
      SHOT: "Shot",
      BEER_BUCKET: "Cubeta de cerveza",
      PACK: "Paquete",
      CIGARETTE_UNIT: "Cigarro suelto",
      SERVICE: "Servicio",
      BOTTLE: "Botella",
      INVENTORY_BASE: "Inventario base",
    };

    return labels[productType] || productType || "N/A";
  };

  return (
    <div className="page-card reports-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="pos-header">
        <h1>Reportes de ventas</h1>
      </div>

      <div className="reports-filters">
        <div>
          <label>Fecha inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>Fecha final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="reports-filter-actions">
          <button type="button" onClick={setTodayFilter}>
            Hoy
          </button>

          <button type="button" onClick={setWeekFilter}>
            Esta semana
          </button>

          <button type="button" onClick={setMonthFilter}>
            Este mes
          </button>

          <button type="button" onClick={loadReports}>
            Actualizar
          </button>
        </div>
      </div>

      {loading && <p>Cargando reportes...</p>}

      {summary && (
        <div className="reports-summary">
          <div className="report-summary-card">
            <strong>Ventas</strong>
            <span>{formatNumber(summary.tickets)}</span>
          </div>

          <div className="report-summary-card">
            <strong>Subtotal</strong>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>

          <div className="report-summary-card">
            <strong>Total vendido</strong>
            <span>{formatCurrency(summary.total)}</span>
          </div>

        
        </div>
      )}

      <div className="report-tabs">
        <button
          type="button"
          className={activeReport === "daily" ? "active-report-tab" : ""}
          onClick={() => setActiveReport("daily")}
        >
          Por día
        </button>

        <button
          type="button"
          className={activeReport === "weekly" ? "active-report-tab" : ""}
          onClick={() => setActiveReport("weekly")}
        >
          Por semana
        </button>

        <button
          type="button"
          className={activeReport === "category" ? "active-report-tab" : ""}
          onClick={() => setActiveReport("category")}
        >
          Por categoría
        </button>

        <button
          type="button"
          className={activeReport === "product" ? "active-report-tab" : ""}
          onClick={() => setActiveReport("product")}
        >
          Por producto
        </button>
      </div>

      {activeReport === "daily" && (
        <section className="report-section">
          <h2>Ventas por día</h2>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ventas</th>
                  <th>Subtotal</th>
                  <th>Total</th>
                  <th>Venta promedio</th>
                </tr>
              </thead>

              <tbody>
                {dailyReport.map((item) => (
                  <tr key={item.date}>
                    <td>{item.date}</td>
                    <td>{formatNumber(item.tickets)}</td>
                    <td>{formatCurrency(item.subtotal)}</td>
                    <td>{formatCurrency(item.total)}</td>
                    <td>{formatCurrency(item.averageTicket)}</td>
                  </tr>
                ))}

                {dailyReport.length === 0 && (
                  <tr>
                    <td colSpan="5">No hay ventas en el periodo seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeReport === "weekly" && (
        <section className="report-section">
          <h2>Ventas por semana</h2>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Venta</th>
                  <th>Subtotal</th>
                  <th>Total</th>
                  <th>Venta promedio</th>
                </tr>
              </thead>

              <tbody>
                {weeklyReport.map((item) => (
                  <tr key={item.weekStart}>
                    <td>{item.weekStart}</td>
                    <td>{item.weekEnd}</td>
                    <td>{formatNumber(item.tickets)}</td>
                    <td>{formatCurrency(item.subtotal)}</td>
                    <td>{formatCurrency(item.total)}</td>
                    <td>{formatCurrency(item.averageTicket)}</td>
                  </tr>
                ))}

                {weeklyReport.length === 0 && (
                  <tr>
                    <td colSpan="6">No hay ventas en el periodo seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeReport === "category" && (
        <section className="report-section">
          <h2>Ventas por categoría</h2>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Cantidad vendida</th>
                  <th>Total</th>
                  <th>Productos distintos</th>
                </tr>
              </thead>

              <tbody>
                {categoryReport.map((item) => (
                  <tr key={item.category}>
                    <td>{item.category}</td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td>{formatCurrency(item.total)}</td>
                    <td>{formatNumber(item.products)}</td>
                  </tr>
                ))}

                {categoryReport.length === 0 && (
                  <tr>
                    <td colSpan="4">No hay ventas en el periodo seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeReport === "product" && (
        <section className="report-section">
          <h2>Ventas por producto</h2>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                  <th>Precio promedio</th>
                </tr>
              </thead>

              <tbody>
                {productReport.map((item) => (
                  <tr key={`${item.productId}-${item.productName}`}>
                    <td>{item.productName}</td>
                    <td>{item.category}</td>
                    <td>{getProductTypeLabel(item.productType)}</td>
                    <td>{formatNumber(item.quantity)}</td>
                    <td>{formatCurrency(item.total)}</td>
                    <td>{formatCurrency(item.averageUnitPrice)}</td>
                  </tr>
                ))}

                {productReport.length === 0 && (
                  <tr>
                    <td colSpan="6">No hay ventas en el periodo seleccionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default ReportsPage;