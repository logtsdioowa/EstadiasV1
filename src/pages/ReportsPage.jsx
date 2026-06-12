import { useEffect, useState } from "react";
import api from "../services/api";

function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [productReport, setProductReport] = useState([]);
  const [productReportTotal, setProductReportTotal] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [courtesyReportTotal, setCourtesyReportTotal] = useState(0);
const [creditReportTotal, setCreditReportTotal] = useState(0);

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

    if (startDate) {
      params.append("startDate", startDate);
    }

    if (endDate) {
      params.append("endDate", endDate);
    }

    return params.toString();
  };

  const normalizeReportDate = (dateValue) => {
    if (!dateValue) return "";

    const dateText = String(dateValue);

    if (dateText.includes("T")) {
      return dateText.split("T")[0];
    }

    return dateText;
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "";

    const cleanDate = normalizeReportDate(dateValue);
    const [year, month, day] = cleanDate.split("-");

    if (!year || !month || !day) return dateValue;

    return `${day}/${month}/${year.slice(-2)}`;
  };

  const formatDateForApi = (displayValue) => {
    if (!displayValue) return "";

    const cleanValue = displayValue.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
      return cleanValue;
    }

    const [day, month, year] = cleanValue.split("/");

    if (!day || !month || !year) {
      return cleanValue;
    }

    const normalizedDay = day.padStart(2, "0");
    const normalizedMonth = month.padStart(2, "0");
    const fullYear = year.length === 2 ? `20${year}` : year;

    return `${fullYear}-${normalizedMonth}-${normalizedDay}`;
  };

  const isValidApiDate = (dateValue) => {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
  };
const loadReports = async () => {
  if (!startDate || !endDate) {
    showToast("Selecciona fecha inicial y fecha final.", "warning");
    return;
  }

  if (!isValidApiDate(startDate) || !isValidApiDate(endDate)) {
    showToast("Usa el formato dd/mm/aa en ambas fechas.", "warning");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    showToast(
      "La fecha inicial no puede ser mayor que la fecha final.",
      "warning"
    );
    return;
  }

  try {
    setLoading(true);

    const query = buildQueryString();

    const productResponse = await api.get(`/Sales/Reports/ByProduct?${query}`);

    const productData = productResponse.data || {};

    if (Array.isArray(productData)) {
      setProductReport(productData);

      const paidTotal = productData.reduce(
        (sum, item) => sum + Number(item.total || 0),
        0
      );

      const courtesyTotal = productData.reduce(
        (sum, item) => sum + Number(item.courtesyTotal || 0),
        0
      );

      const creditTotal = productData.reduce(
        (sum, item) => sum + Number(item.creditTotal || 0),
        0
      );

      setProductReportTotal(paidTotal);
      setCourtesyReportTotal(courtesyTotal);
      setCreditReportTotal(creditTotal);

      setSummary({
        tickets: 0,
        total: paidTotal,
        courtesyTotal,
        creditTotal,
        courtesyTickets: 0,
        creditTickets: 0,
      });
    } else {
      const items = productData.items || [];

      setProductReport(items);
      setProductReportTotal(productData.total || 0);
      setCourtesyReportTotal(productData.courtesyTotal || 0);
      setCreditReportTotal(productData.creditTotal || 0);

      const courtesyItems = items.filter(
        (item) =>
          Number(item.courtesyQuantity || 0) > 0 ||
          Number(item.courtesyTotal || 0) > 0
      );

      const creditItems = items.filter(
        (item) =>
          Number(item.creditQuantity || 0) > 0 ||
          Number(item.creditTotal || 0) > 0
      );

      setSummary({
        tickets: items.length,
        total: productData.total || 0,
        courtesyTotal: productData.courtesyTotal || 0,
        creditTotal: productData.creditTotal || 0,
        courtesyTickets: courtesyItems.length,
        creditTickets: creditItems.length,
      });
    }
  } catch (error) {
    console.error("Error al cargar reportes:", error);
    showToast("No se pudieron cargar los reportes.", "error");
  } finally {
    setLoading(false);
  }
};
  

  const handleStartDateChange = (value) => {
    const apiDate = formatDateForApi(value);
    setStartDate(apiDate);
  };

  const handleEndDateChange = (value) => {
    const apiDate = formatDateForApi(value);
    setEndDate(apiDate);
  };

  const groupProductReportByCategory = () => {
    const grouped = {};

    productReport.forEach((item) => {
      const category = item.category || "Sin categoría";

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(item);
    });

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
      total: items.reduce((sum, item) => sum + Number(item.total || 0), 0),
    }));
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
            type="text"
            value={formatDateForDisplay(startDate)}
            onChange={(e) => handleStartDateChange(e.target.value)}
            placeholder="dd/mm/aa"
            maxLength={8}
          />
        </div>

        <div>
          <label>Fecha final</label>

          <input
            type="text"
            value={formatDateForDisplay(endDate)}
            onChange={(e) => handleEndDateChange(e.target.value)}
            placeholder="dd/mm/aa"
            maxLength={8}
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
      <strong>Total cobrado</strong>
      <span>{formatCurrency(summary.total)}</span>
    </div>

    <div className="report-summary-card">
      <strong>Cortesías</strong>
      <span className="courtesy-red">
        {formatNumber(summary.courtesyTickets || 0)} venta(s)
      </span>
      <small>{formatCurrency(summary.courtesyTotal || 0)} no cobrado</small>
    </div>

    <div className="report-summary-card">
      <strong>Crédito</strong>
      <span className="credit-orange">
        {formatNumber(summary.creditTickets || 0)} pendiente(s)
      </span>
      <small>{formatCurrency(summary.creditTotal || 0)} pendiente</small>
    </div>
  </div>
)}
      

      <section className="report-section">
        <h2>Ventas por producto / concepto</h2>

        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Producto / Concepto</th>
                <th>Cantidad / Tiempo</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {productReport.length === 0 && (
                <tr>
                  <td colSpan="3">
                    No hay ventas en el periodo seleccionado.
                  </td>
                </tr>
              )}

              {groupProductReportByCategory().map((group) => (
                  <>
                    <tr
                      key={`category-${group.category}`}
                      className="report-category-row"
                    >
                    <td colSpan="2">
                      <strong>{group.category}</strong>
                    </td>

                    <td>
                      <strong>{formatCurrency(group.total)}</strong>
                    </td>
                  </tr>

                  {group.items.map((item, index) => (
                    <tr
                      key={`${group.category}-${item.productId}-${item.productName}-${index}`}
                    >
                      <td>{item.productName}</td>
                      <td>
  <span>{item.quantityLabel ?? item.quantity}</span>

  {Number(item.courtesyQuantity || 0) > 0 && (
    <span className="courtesy-count">
      {" "}
      + {formatNumber(item.courtesyQuantity)} cortesía(s)
    </span>
  )}

  {Number(item.creditQuantity || 0) > 0 && (
    <span className="credit-count">
      {" "}
      + {formatNumber(item.creditQuantity)} crédito
    </span>
  )}
</td>
                      <td>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>

            {productReport.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="2">Total general</td>
                  <td>{formatCurrency(productReportTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}

export default ReportsPage;