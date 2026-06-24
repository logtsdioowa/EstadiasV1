import { Fragment, useEffect, useState } from "react";
import api from "../services/api";

function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [productReport, setProductReport] = useState([]);
  const [productReportTotal, setProductReportTotal] = useState(0);
  const [courtesyReportTotal, setCourtesyReportTotal] = useState(0);
  const [creditReportTotal, setCreditReportTotal] = useState(0);

  const [cutReports, setCutReports] = useState([]);
  const [cutSummary, setCutSummary] = useState(null);
  const [reportMode, setReportMode] = useState("period"); // period | cuts

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setTodayFilter();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      if (reportMode === "cuts") {
        loadCutReports();
      } else {
        loadReports();
      }
    }
  }, [startDate, endDate, reportMode]);

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

  const formatDateTimeForDisplay = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const validateDates = () => {
    if (!startDate || !endDate) {
      showToast("Selecciona fecha inicial y fecha final.", "warning");
      return false;
    }

    if (!isValidApiDate(startDate) || !isValidApiDate(endDate)) {
      showToast("Usa el formato dd/mm/aa en ambas fechas.", "warning");
      return false;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast("La fecha inicial no puede ser mayor que la fecha final.", "warning");
      return false;
    }

    return true;
  };

  const isDateInsideFilter = (dateValue) => {
    if (!dateValue || !startDate || !endDate) return false;

    const cleanDate = normalizeReportDate(dateValue);

    return cleanDate >= startDate && cleanDate <= endDate;
  };

  const loadReports = async () => {
    if (!validateDates()) return;

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

  const loadCutReports = async () => {
    if (!validateDates()) return;

    try {
      setLoading(true);

      const response = await api.get("/CashBox/Cuts");
      const allCuts = Array.isArray(response.data) ? response.data : [];

      const filteredCuts = allCuts.filter((cut) =>
        isDateInsideFilter(cut.createdAt || cut.cutEndDate)
      );

      setCutReports(filteredCuts);

      const totalSold = filteredCuts.reduce(
        (sum, cut) =>
          sum +
          (cut.soldItems || []).reduce(
            (itemSum, item) => itemSum + Number(item.subtotal || 0),
            0
          ),
        0
      );

      const totalCourtesy = filteredCuts.reduce(
        (sum, cut) =>
          sum +
          (cut.courtesyItems || []).reduce(
            (courtesySum, courtesy) => courtesySum + Number(courtesy.total || 0),
            0
          ),
        0
      );

      const totalWithdrawals = filteredCuts.reduce(
        (sum, cut) =>
          sum +
          (cut.withdrawals || []).reduce(
            (withdrawalSum, withdrawal) =>
              withdrawalSum + Number(withdrawal.amount || 0),
            0
          ),
        0
      );

      const totalFinalAmount = filteredCuts.reduce(
        (sum, cut) => sum + Number(cut.finalAmount || 0),
        0
      );

      setCutSummary({
        cuts: filteredCuts.length,
        totalSold,
        totalCourtesy,
        totalWithdrawals,
        totalFinalAmount,
      });
    } catch (error) {
      console.error("Error al cargar reportes por corte:", error);
      showToast("No se pudieron cargar los reportes por corte.", "error");
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

  const handleRefresh = () => {
    if (reportMode === "cuts") {
      loadCutReports();
    } else {
      loadReports();
    }
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

    

          <button
            type="button" class="btn btn-primary"
            className={reportMode === "cuts" ? "active" : ""}
            onClick={() => setReportMode("cuts")}
          >
            Por corte
          </button>

          <button type="button" onClick={handleRefresh}>
            Actualizar
          </button>
        </div>
      </div>

      {loading && <p>Cargando reportes...</p>}

      {reportMode === "period" && summary && (
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

      {reportMode === "cuts" && cutSummary && (
        <div className="reports-summary">
          <div className="report-summary-card">
            <strong>Cortes</strong>
            <span>{formatNumber(cutSummary.cuts)}</span>
          </div>

          <div className="report-summary-card">
            <strong>Vendido en cortes</strong>
            <span>{formatCurrency(cutSummary.totalSold)}</span>
          </div>

          <div className="report-summary-card">
            <strong>Cortesías</strong>
            <span className="courtesy-red">
              {formatCurrency(cutSummary.totalCourtesy)}
            </span>
          </div>

          <div className="report-summary-card">
            <strong>Retiros</strong>
            <span>{formatCurrency(cutSummary.totalWithdrawals)}</span>
          </div>
        </div>
      )}

      {reportMode === "period" && (
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
                    <td colSpan="3">No hay ventas en el periodo seleccionado.</td>
                  </tr>
                )}

                {groupProductReportByCategory().map((group) => (
                  <Fragment key={`category-fragment-${group.category}`}>
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
                  </Fragment>
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
      )}

      {reportMode === "cuts" && (
        <section className="report-section">
          <h2>Reportes por corte de caja</h2>

          {cutReports.length === 0 && (
            <p>No hay cortes en el periodo seleccionado.</p>
          )}

          {cutReports.map((cut) => {
            const soldItems = cut.soldItems || [];
            const courtesyItems = cut.courtesyItems || [];
            const withdrawals = cut.withdrawals || [];

            const soldTotal = soldItems.reduce(
              (sum, item) => sum + Number(item.subtotal || 0),
              0
            );

            const courtesyTotal = courtesyItems.reduce(
              (sum, courtesy) => sum + Number(courtesy.total || 0),
              0
            );

            const withdrawalsTotal = withdrawals.reduce(
              (sum, withdrawal) => sum + Number(withdrawal.amount || 0),
              0
            );

            return (
              <article
                className="report-cut-card"
                key={`cut-${cut.cashBoxCutId || cut.cashMovementId}`}
              >
                <div className="report-cut-header">
                  <div>
                    <h3>Corte #{cut.cashBoxCutId || cut.cashMovementId}</h3>
                    <p>
                      <strong>Periodo:</strong>{" "}
                      {formatDateTimeForDisplay(cut.cutStartDate)} - {" "}
                      {formatDateTimeForDisplay(cut.cutEndDate || cut.createdAt)}
                    </p>
                    <p>
                      <strong>Descripción:</strong> {cut.description || "Sin descripción"}
                    </p>
                  </div>

                  <div className="report-cut-totals">
                    <span>Vendido: {formatCurrency(soldTotal)}</span>
                    <span>Cortesías: {formatCurrency(courtesyTotal)}</span>
                    <span>Retiros: {formatCurrency(withdrawalsTotal)}</span>
                    <span>Caja final: {formatCurrency(cut.finalAmount)}</span>
                  </div>
                </div>

                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Producto / Concepto vendido</th>
                        <th>Cantidad / Tiempo</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soldItems.length === 0 && (
                        <tr>
                          <td colSpan="4">No hay productos vendidos en este corte.</td>
                        </tr>
                      )}

                      {soldItems.map((item, index) => (
                        <tr key={`cut-item-${index}-${item.productName}`}>
                          <td>
                            {item.productName}
                            {item.drinkSizeName ? ` - ${item.drinkSizeName}` : ""}
                          </td>
                          <td>
                            {item.totalMinutes
                              ? `${formatNumber(item.totalMinutes)} min`
                              : formatNumber(item.quantity)}
                          </td>
                          <td>{formatCurrency(item.unitPrice)}</td>
                          <td>{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {soldItems.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan="3">Total vendido del corte</td>
                          <td>{formatCurrency(soldTotal)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <div className="report-table-wrapper">
                  <h4>Retiros de caja</h4>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Mensaje / motivo</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 && (
                        <tr>
                          <td colSpan="3">No hay retiros registrados en este corte.</td>
                        </tr>
                      )}

                      {withdrawals.map((withdrawal) => (
                        <tr key={`withdrawal-${withdrawal.cashMovementId}`}>
                          <td>{formatDateTimeForDisplay(withdrawal.createdAt)}</td>
                          <td>{withdrawal.description || "Sin descripción"}</td>
                          <td>{formatCurrency(withdrawal.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {withdrawals.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan="2">Total retiros</td>
                          <td>{formatCurrency(withdrawalsTotal)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                <div className="report-table-wrapper">
                  <h4>Cortesías</h4>
                  {courtesyItems.length === 0 && (
                    <p>No hay cortesías registradas en este corte.</p>
                  )}

                  {courtesyItems.map((courtesy) => (
                    <div
                      className="report-courtesy-card"
                      key={`courtesy-${courtesy.saleId}`}
                    >
                      <h5>{courtesy.courtesyName || "Cortesía sin nombre"}</h5>
                      <p>
                        <strong>Total no cobrado:</strong>{" "}
                        {formatCurrency(courtesy.total)}
                      </p>

                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Producto / Concepto</th>
                            <th>Cantidad / Tiempo</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(courtesy.products || []).map((product, index) => (
                            <tr
                              key={`courtesy-product-${courtesy.saleId}-${index}`}
                            >
                              <td>
                                {product.productName}
                                {product.drinkSizeName
                                  ? ` - ${product.drinkSizeName}`
                                  : ""}
                              </td>
                              <td>
                                {product.totalMinutes
                                  ? `${formatNumber(product.totalMinutes)} min`
                                  : formatNumber(product.quantity)}
                              </td>
                              <td>{formatCurrency(product.unitPrice)}</td>
                              <td>{formatCurrency(product.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default ReportsPage;
