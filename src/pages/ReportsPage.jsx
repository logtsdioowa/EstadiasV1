import { Fragment, useEffect, useState } from "react";
import jsPDF from "jspdf";
import api from "../services/api";

function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [productReport, setProductReport] = useState([]);
  const [productReportTotal, setProductReportTotal] = useState(0);
  const [courtesyReportTotal, setCourtesyReportTotal] = useState(0);
  const [creditReportTotal, setCreditReportTotal] = useState(0);
  const [hotelReportTotal, setHotelReportTotal] = useState(0);

  const [cutReports, setCutReports] = useState([]);
  const [cutSummary, setCutSummary] = useState(null);
  const [selectedCutId, setSelectedCutId] = useState("");
  const [reportMode, setReportMode] = useState("period"); // period | cuts

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setTodayFilter();
  }, []);

  useEffect(() => {
    if (reportMode === "cuts") {
      loadCutReports();
      return;
    }

    if (startDate && endDate) {
      loadReports();
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


  const normalizePdfText = (value) => {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const addWrappedPdfLine = (doc, text, x, y, maxWidth, lineHeight = 5) => {
    const lines = doc.splitTextToSize(normalizePdfText(text), maxWidth);

    lines.forEach((line) => {
      if (y.value > 260) {
        doc.addPage();
        y.value = 14;
      }

      doc.text(line, x, y.value);
      y.value += lineHeight;
    });
  };

  const addPdfSectionTitle = (doc, title, y) => {
    if (y.value > 250) {
      doc.addPage();
      y.value = 14;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 12, y.value);
    y.value += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
  };

  const downloadCutPdf = (cut) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const blue = [24, 0, 255];
    const lightBlue = [235, 232, 255];
    const veryLightGray = [248, 248, 248];
    const lineGray = [215, 215, 215];
    const textGray = [70, 70, 70];
    const cutId = cut.cashBoxCutId || cut.cashMovementId || "sin-numero";

    let y = 12;

    const sanitize = (value) =>
      String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();

    const money = (value) =>
      Number(value || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
      });

    const checkPage = (requiredHeight = 10) => {
      if (y + requiredHeight <= pageHeight - 14) return;
      doc.addPage();
      y = 16;
    };

    const addFooter = () => {
      const pages = doc.internal.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Página ${page} de ${pages}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: "right" }
        );
      }
    };

    const getCutDisplayNumber = (cut, cutsList) => {
  const orderedCuts = [...cutsList].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.cutEndDate || 0).getTime();
    const dateB = new Date(b.createdAt || b.cutEndDate || 0).getTime();

    return dateA - dateB;
  });

  const index = orderedCuts.findIndex(
    (item) =>
      Number(item.cashMovementId) === Number(cut.cashMovementId) ||
      Number(item.cashBoxCutId) === Number(cut.cashBoxCutId)
  );

  return index >= 0 ? index + 1 : "";
};
    const drawHeader = () => {
      doc.setFillColor(...blue);
      doc.rect(0, 0, pageWidth, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text(`Corte #${cutId}`, pageWidth / 2, 18, { align: "center" });

      y = 42;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Inicio del corte:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        formatDateTimeForDisplay(cut.cutStartDate) || "Sin inicio",
        margin + 31,
        y
      );

      doc.setFont("helvetica", "bold");
      doc.text("Fecha de corte:", pageWidth / 2 + 4, y);
      doc.setFont("helvetica", "normal");
      doc.text(
        formatDateTimeForDisplay(cut.cutEndDate || cut.createdAt) || "Sin fecha",
        pageWidth / 2 + 34,
        y
      );

      y += 13;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Resumen del corte", pageWidth / 2, y, { align: "center" });
      y += 8;
    };

    const drawSummary = (soldTotal, courtesyTotal, withdrawalsTotal) => {
      checkPage(20);

      const cards = [
        ["Vendido", money(soldTotal)],
        ["Cortesías", money(courtesyTotal)],
        ["Retiros", money(withdrawalsTotal)],
        ["Caja final", money(cut.finalAmount)],
      ];

      const gap = 3;
      const cardWidth = (contentWidth - gap * 3) / 4;
      const cardHeight = 16;

      cards.forEach(([label, value], index) => {
        const x = margin + index * (cardWidth + gap);

        doc.setFillColor(...veryLightGray);
        doc.setDrawColor(...lineGray);
        doc.rect(x, y, cardWidth, cardHeight, "FD");

        doc.setTextColor(...textGray);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label, x + 2.5, y + 5.5);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(value, x + 2.5, y + 12);
      });

      y += cardHeight + 9;
    };

    const sectionTitle = (title) => {
      checkPage(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(title, pageWidth / 2, y, { align: "center" });
      y += 8;
    };

    const drawTableHeader = (columns, widths) => {
      checkPage(10);

      const rowHeight = 8;
      doc.setFillColor(...blue);
      doc.rect(margin, y, contentWidth, rowHeight, "F");

      let x = margin;
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.25);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);

      columns.forEach((column, index) => {
        if (index > 0) {
          doc.line(x, y, x, y + rowHeight);
        }

        doc.text(column, x + widths[index] / 2, y + 5.3, {
          align: "center",
        });
        x += widths[index];
      });

      y += rowHeight;
    };

    const drawCategoryRow = (category, total) => {
      checkPage(9);

      const rowHeight = 8;
      doc.setFillColor(...lightBlue);
      doc.rect(margin, y, contentWidth, rowHeight, "F");
      doc.setDrawColor(...lineGray);
      doc.rect(margin, y, contentWidth, rowHeight, "S");

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(sanitize(category || "Sin categoría"), margin + 3, y + 5.4);
      doc.text(`Total: ${money(total)}`, pageWidth - margin - 3, y + 5.4, {
        align: "right",
      });

      y += rowHeight;
    };

    const getTextLines = (text, width) => {
      return doc.splitTextToSize(sanitize(text), Math.max(8, width - 4));
    };

    const drawDataRow = (values, widths, options = {}) => {
      const fontSize = options.fontSize || 8.5;
      const lineHeight = 4.2;
      const linesByCell = values.map((value, index) =>
        getTextLines(value, widths[index])
      );
      const maxLines = Math.max(1, ...linesByCell.map((lines) => lines.length));
      const rowHeight = Math.max(8, maxLines * lineHeight + 4);

      checkPage(rowHeight);

      doc.setFillColor(options.alt ? 252 : 255, options.alt ? 252 : 255, options.alt ? 252 : 255);
      doc.rect(margin, y, contentWidth, rowHeight, "F");
      doc.setDrawColor(...lineGray);
      doc.rect(margin, y, contentWidth, rowHeight, "S");

      let x = margin;
      doc.setLineWidth(0.2);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", options.bold ? "bold" : "normal");
      doc.setFontSize(fontSize);

      values.forEach((value, index) => {
        if (index > 0) {
          doc.setDrawColor(...lineGray);
          doc.line(x, y, x, y + rowHeight);
        }

        const lines = linesByCell[index];
        const align = index === 0 ? "left" : "center";
        const textX = index === 0 ? x + 2 : x + widths[index] / 2;
        let textY = y + 5;

        lines.forEach((line) => {
          doc.text(line, textX, textY, { align });
          textY += lineHeight;
        });

        x += widths[index];
      });

      y += rowHeight;
    };

    const drawGroupedItemsTable = (groups, emptyText = "Sin registros.") => {
      const widths = [
        contentWidth * 0.48,
        contentWidth * 0.17,
        contentWidth * 0.17,
        contentWidth * 0.18,
      ];

      drawTableHeader(["Producto", "Cantidad", "Precio", "Subtotal"], widths);

      if (!groups || groups.length === 0) {
        drawDataRow([emptyText, "", "", ""], widths);
        return;
      }

      groups.forEach((group) => {
        drawCategoryRow(group.category, group.total);

        group.items.forEach((item, index) => {
          const itemName = `${item.productName || "Producto"}${
            item.drinkSizeName ? ` - ${item.drinkSizeName}` : ""
          }`;
          const quantityLabel = item.totalMinutes
            ? `${formatNumber(item.totalMinutes)} min`
            : formatNumber(item.quantity);

          drawDataRow(
            [
              itemName,
              quantityLabel,
              money(item.unitPrice),
              money(item.subtotal),
            ],
            widths,
            { alt: index % 2 === 1 }
          );
        });
      });
    };

    const drawWithdrawalsTable = (withdrawals) => {
      const widths = [contentWidth * 0.25, contentWidth * 0.55, contentWidth * 0.2];

      drawTableHeader(["Fecha", "Mensaje / motivo", "Monto"], widths);

      if (!withdrawals || withdrawals.length === 0) {
        drawDataRow(["Sin retiros", "No hay retiros registrados en este corte.", ""], widths);
        return;
      }

      withdrawals.forEach((withdrawal, index) => {
        drawDataRow(
          [
            formatDateTimeForDisplay(withdrawal.createdAt),
            withdrawal.description || "Sin descripción",
            money(withdrawal.amount),
          ],
          widths,
          { alt: index % 2 === 1 }
        );
      });
    };

    drawHeader();

    const soldItems = cut.soldItems || [];
    const courtesyItems = cut.courtesyItems || [];
    const withdrawals = cut.withdrawals || [];
    const soldGroups = groupCutItemsByCategory(soldItems);

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

    drawSummary(soldTotal, courtesyTotal, withdrawalsTotal);

    sectionTitle("Productos vendidos");
    drawGroupedItemsTable(soldGroups, "No hay productos vendidos en este corte.");

    y += 7;
    sectionTitle("Retiros de caja");
    drawWithdrawalsTable(withdrawals);

    y += 7;
    sectionTitle("Cortesías");

    if (courtesyItems.length === 0) {
      drawGroupedItemsTable([], "No hay cortesías registradas en este corte.");
    } else {
      courtesyItems.forEach((courtesy) => {
        checkPage(14);
        doc.setFillColor(...veryLightGray);
        doc.setDrawColor(...lineGray);
        doc.rect(margin, y, contentWidth, 10, "FD");
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(courtesy.courtesyName || "Cortesía sin nombre", margin + 3, y + 6.5);
        doc.text(`Total: ${money(courtesy.total)}`, pageWidth - margin - 3, y + 6.5, {
          align: "right",
        });
        y += 12;

        drawGroupedItemsTable(
          groupCutItemsByCategory(courtesy.products || []),
          "Sin productos de cortesía."
        );
        y += 5;
      });
    }

    addFooter();
    doc.save(`corte-${cutId}.pdf`);
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


  const getReportItemQuantity = (item, keyBase) => {
    return Number(
      item?.[`${keyBase}Quantity`] ??
        item?.[`${keyBase}Count`] ??
        item?.[`${keyBase}Tickets`] ??
        0
    );
  };

  const getReportItemTotal = (item, keyBase) => {
    return Number(
      item?.[`${keyBase}Total`] ??
        item?.[`${keyBase}Amount`] ??
        item?.[`${keyBase}Subtotal`] ??
        0
    );
  };

  const getUnchargedReportRows = (type) => {
    const config = {
      courtesy: {
        keyBase: "courtesy",
        label: "Cortesía",
        referenceKeys: ["courtesyReference", "courtesyName", "courtesyReason"],
      },
      credit: {
        keyBase: "credit",
        label: "Crédito",
        referenceKeys: ["creditReference", "creditName", "creditReason"],
      },
      hotel: {
        keyBase: "hotel",
        label: "Hotel",
        referenceKeys: ["hotelReference", "hotelName", "hotelReason"],
      },
    }[type];

    if (!config) return [];

    return productReport
      .map((item) => {
        const quantity = getReportItemQuantity(item, config.keyBase);
        const total = getReportItemTotal(item, config.keyBase);

        const reference =
          config.referenceKeys
            .map((key) => item?.[key])
            .find((value) => String(value || "").trim()) || config.label;

        return {
          productId: item.productId,
          productName: item.productName || "Producto",
          category: item.category || "Sin categoría",
          quantity,
          total,
          reference,
        };
      })
      .filter((item) => Number(item.quantity || 0) > 0 || Number(item.total || 0) > 0);
  };

  const groupUnchargedRowsByCategory = (rows = []) => {
    const grouped = {};

    rows.forEach((item) => {
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

        const hotelTotal = productData.reduce(
          (sum, item) => sum + Number(item.hotelTotal || 0),
          0
        );

        setProductReportTotal(paidTotal);
        setCourtesyReportTotal(courtesyTotal);
        setCreditReportTotal(creditTotal);
        setHotelReportTotal(hotelTotal);

        setSummary({
          tickets: getPaidTicketsCount(productData),
          total: paidTotal,
          courtesyTotal,
          creditTotal,
          hotelTotal,
          courtesyTickets: productData.filter(
            (item) =>
              Number(item.courtesyQuantity || 0) > 0 ||
              Number(item.courtesyTotal || 0) > 0
          ).length,
          creditTickets: productData.filter(
            (item) =>
              Number(item.creditQuantity || 0) > 0 ||
              Number(item.creditTotal || 0) > 0
          ).length,
          hotelTickets: productData.filter(
            (item) =>
              Number(item.hotelQuantity || 0) > 0 ||
              Number(item.hotelTotal || 0) > 0
          ).length,
        });
      } else {
        const items = productData.items || [];

        const hotelTotal =
          productData.hotelTotal ??
          items.reduce((sum, item) => sum + Number(item.hotelTotal || 0), 0);

        setProductReport(items);
        setProductReportTotal(productData.total || 0);
        setCourtesyReportTotal(productData.courtesyTotal || 0);
        setCreditReportTotal(productData.creditTotal || 0);
        setHotelReportTotal(hotelTotal || 0);

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

        const hotelItems = items.filter(
          (item) =>
            Number(item.hotelQuantity || 0) > 0 ||
            Number(item.hotelTotal || 0) > 0
        );

        const backendTickets =
          productData.paidTickets ??
          productData.cashTickets ??
          productData.chargedTickets ??
          null;

        setSummary({
          tickets: getPaidTicketsCount(items, backendTickets),
          total: productData.total || 0,
          courtesyTotal: productData.courtesyTotal || 0,
          creditTotal: productData.creditTotal || 0,
          hotelTotal: hotelTotal || 0,
          courtesyTickets: courtesyItems.length,
          creditTickets: creditItems.length,
          hotelTickets: hotelItems.length,
        });
      }
    } catch (error) {
      console.error("Error al cargar reportes:", error);
      showToast("No se pudieron cargar los reportes.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getCutIdentifier = (cut) => {
    return String(cut?.cashBoxCutId ?? cut?.cashMovementId ?? "");
  };

  const getCutTimeValue = (cut) => {
    const rawDate = cut?.cutEndDate || cut?.createdAt || cut?.cutStartDate || 0;
    const parsedDate = new Date(rawDate).getTime();

    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  };

  const getCutsOldestFirst = (cuts = []) => {
    return [...cuts].sort((a, b) => getCutTimeValue(a) - getCutTimeValue(b));
  };

  const getCutsNewestFirst = (cuts = []) => {
    return [...cuts].sort((a, b) => getCutTimeValue(b) - getCutTimeValue(a));
  };

  const getCutDisplayNumber = (cut, cuts = cutReports) => {
    const cutId = getCutIdentifier(cut);

    const orderedCuts = getCutsOldestFirst(cuts);
    const cutIndex = orderedCuts.findIndex(
      (item) => getCutIdentifier(item) === cutId
    );

    return cutIndex >= 0 ? cutIndex + 1 : "";
  };

  const getCutLabel = (cut, cuts = cutReports) => {
    const displayNumber = getCutDisplayNumber(cut, cuts);
    const start = formatDateTimeForDisplay(cut?.cutStartDate) || "Sin inicio";
    const end =
      formatDateTimeForDisplay(cut?.cutEndDate || cut?.createdAt) ||
      "Sin cierre";

    return `Corte #${displayNumber} — ${start} a ${end}`;
  };

  const buildCutSummary = (cuts = []) => {
    const totalSold = cuts.reduce(
      (sum, cut) =>
        sum +
        (cut.soldItems || []).reduce(
          (itemSum, item) => itemSum + Number(item.subtotal || 0),
          0
        ),
      0
    );

    const totalCourtesy = cuts.reduce(
      (sum, cut) =>
        sum +
        (cut.courtesyItems || []).reduce(
          (courtesySum, courtesy) => courtesySum + Number(courtesy.total || 0),
          0
        ),
      0
    );

    const totalWithdrawals = cuts.reduce(
      (sum, cut) =>
        sum +
        (cut.withdrawals || []).reduce(
          (withdrawalSum, withdrawal) =>
            withdrawalSum + Number(withdrawal.amount || 0),
          0
        ),
      0
    );

    const totalFinalAmount = cuts.reduce(
      (sum, cut) => sum + Number(cut.finalAmount || 0),
      0
    );

    return {
      cuts: cuts.length,
      totalSold,
      totalCourtesy,
      totalWithdrawals,
      totalFinalAmount,
    };
  };

  const loadCutReports = async () => {
    try {
      setLoading(true);

      const response = await api.get("/CashBox/Cuts");
      const allCuts = getCutsNewestFirst(
        Array.isArray(response.data) ? response.data : []
      );

      setCutReports(allCuts);

      if (allCuts.length === 0) {
        setSelectedCutId("");
        setCutSummary(buildCutSummary([]));
        return;
      }

      const currentExists = allCuts.some(
        (cut) => getCutIdentifier(cut) === String(selectedCutId)
      );

      const nextSelectedCutId = currentExists
        ? String(selectedCutId)
        : getCutIdentifier(allCuts[0]);

      setSelectedCutId(nextSelectedCutId);

      const selectedCuts = allCuts.filter(
        (cut) => getCutIdentifier(cut) === nextSelectedCutId
      );

      setCutSummary(buildCutSummary(selectedCuts));
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

  const isPaidReportItem = (item) => {
    const paidQuantity = Number(
      item?.quantity ??
        item?.paidQuantity ??
        item?.saleQuantity ??
        item?.soldQuantity ??
        0
    );

    const paidTotal = Number(
      item?.total ??
        item?.paidTotal ??
        item?.saleTotal ??
        item?.soldTotal ??
        0
    );

    return paidQuantity > 0 || paidTotal > 0;
  };

  const getPaidProductReportRows = () => {
    return productReport.filter(isPaidReportItem);
  };

  const getPaidTicketsCount = (items = [], fallbackTickets = null) => {
    const paidRows = items.filter(isPaidReportItem);

    if (fallbackTickets !== null && fallbackTickets !== undefined) {
      const numericFallback = Number(fallbackTickets || 0);

      if (Number.isFinite(numericFallback) && numericFallback > 0) {
        return numericFallback;
      }
    }

    return paidRows.length;
  };

  const groupProductReportByCategory = () => {
    const grouped = {};

    getPaidProductReportRows().forEach((item) => {
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

  const getCutItemCategory = (item) => {
    const explicitCategory =
      item?.category ??
      item?.Category ??
      item?.categoryName ??
      item?.CategoryName ??
      item?.productCategory ??
      item?.ProductCategory ??
      null;

    if (explicitCategory) {
      return explicitCategory;
    }

    const productType = String(
      item?.productType ?? item?.ProductType ?? ""
    ).toUpperCase();

    if (productType === "SERVICE") return "Servicios";
    if (productType === "BEER_BUCKET") return "Cubetas";
    if (productType === "PREPARED_DRINK") return "Bebidas preparadas";
    if (productType === "LIQUOR_DRINK") return "Bebidas con licor";
    if (productType === "SHOT") return "Shots";
    if (productType === "BOTTLED_DRINK") return "Bebidas embotelladas";
    if (productType === "PACK") return "Paquetes";
    if (productType === "CIGARETTE_UNIT") return "Cigarros";

    return "Sin categoría";
  };

  const groupCutItemsByCategory = (items = []) => {
    const grouped = {};

    items.forEach((item) => {
      const category = getCutItemCategory(item);

      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(item);
    });

    return Object.entries(grouped)
      .map(([category, categoryItems]) => ({
        category,
        items: categoryItems,
        total: categoryItems.reduce(
          (sum, item) => sum + Number(item.subtotal ?? item.total ?? 0),
          0
        ),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, "es-MX"));
  };

  const orderedCutReports = getCutsNewestFirst(cutReports);

  const visibleCutReports =
    reportMode === "cuts" && selectedCutId
      ? orderedCutReports.filter(
          (cut) => getCutIdentifier(cut) === String(selectedCutId)
        )
      : orderedCutReports;

  const activeCutSummary = buildCutSummary(visibleCutReports);

  return (
    <div className="page-card reports-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <style>
        {`
          .reports-cut-picker {
            width: min(680px, 100%);
          }

          .reports-cut-scroll-list {
            display: grid;
            gap: 8px;
            max-height: 220px;
            overflow-y: auto;
            padding: 8px;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            background: #f8fafc;
          }

          .reports-cut-scroll-list::-webkit-scrollbar {
            width: 8px;
          }

          .reports-cut-scroll-list::-webkit-scrollbar-track {
            background: #e5e7eb;
            border-radius: 999px;
          }

          .reports-cut-scroll-list::-webkit-scrollbar-thumb {
            background: #111827;
            border-radius: 999px;
          }

          .reports-cut-option {
            display: grid;
            grid-template-columns: 110px 1fr;
            align-items: center;
            gap: 12px;
            width: 100%;
            padding: 12px 14px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #ffffff;
            color: #111827;
            text-align: left;
            cursor: pointer;
            transition: transform 0.15s ease, border-color 0.15s ease,
              box-shadow 0.15s ease, background 0.15s ease;
          }

          .reports-cut-option:hover {
            transform: translateY(-1px);
            border-color: #111827;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
          }

          .reports-cut-option strong {
            font-size: 0.95rem;
          }

          .reports-cut-option span {
            color: #4b5563;
            font-size: 0.88rem;
          }

          .reports-cut-option-active {
            background: #111827;
            color: #ffffff;
            border-color: #111827;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
          }

          .reports-cut-option-active span {
            color: #e5e7eb;
          }

          .reports-cut-empty {
            padding: 14px;
            border: 1px dashed #d1d5db;
            border-radius: 12px;
            background: #f9fafb;
            color: #6b7280;
          }

          @media (max-width: 760px) {
            .reports-cut-option {
              grid-template-columns: 1fr;
              gap: 4px;
            }
          }
        `}
      </style>

      <div className="pos-header">
        <h1>Reportes de ventas</h1>
      </div>

      <div className="reports-filters">
        {reportMode === "cuts" ? (
          <>
            <div className="reports-cut-select-field reports-cut-picker">
              <label>Cortes disponibles</label>

              {orderedCutReports.length === 0 ? (
                <div className="reports-cut-empty">
                  No hay cortes registrados.
                </div>
              ) : (
                <div className="reports-cut-scroll-list">
                  {orderedCutReports.map((cut) => {
                    const cutId = getCutIdentifier(cut);
                    const isSelected = String(selectedCutId) === cutId;
                    const displayNumber = getCutDisplayNumber(
                      cut,
                      orderedCutReports
                    );
                    const start =
                      formatDateTimeForDisplay(cut?.cutStartDate) ||
                      "Sin inicio";
                    const end =
                      formatDateTimeForDisplay(
                        cut?.cutEndDate || cut?.createdAt
                      ) || "Sin cierre";

                    return (
                      <button
                        type="button"
                        key={`cut-option-${cutId}`}
                        className={`reports-cut-option ${
                          isSelected ? "reports-cut-option-active" : ""
                        }`}
                        onClick={() => {
                          setSelectedCutId(cutId);

                          const selectedCuts = orderedCutReports.filter(
                            (item) => getCutIdentifier(item) === cutId
                          );

                          setCutSummary(buildCutSummary(selectedCuts));
                        }}
                      >
                        <strong>Corte #{displayNumber}</strong>
                        <span>
                          {start} a {end}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <small>
                Selecciona un corte por su rango de fechas. La numeración es
                consecutiva únicamente para cortes, no usa el ID interno de caja.
              </small>
            </div>

            <div className="reports-filter-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setReportMode("period")}
              >
                Ver por fechas
              </button>

              <button type="button" onClick={loadCutReports}>
                Actualizar cortes
              </button>
            </div>
          </>
        ) : (
          <>
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
                type="button"
                className="btn btn-primary"
                onClick={() => setReportMode("cuts")}
              >
                Por corte
              </button>

              <button type="button" onClick={handleRefresh}>
                Actualizar
              </button>
            </div>
          </>
        )}
      </div>

      {loading && <p>Cargando reportes...</p>}

      {reportMode === "period" && summary && (
        <>
          <div className="reports-summary">
            <div className="report-summary-card">
              <strong>Ventas cobradas</strong>
              <span>{formatNumber(summary.tickets)}</span>
              <small>No incluye cortesías, créditos ni Hotel</small>
            </div>

            <div className="report-summary-card">
              <strong>Total cobrado</strong>
              <span>{formatCurrency(summary.total)}</span>
              <small>Solo ventas cobradas</small>
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

          <div className="reports-summary reports-summary-hotel">
            <div
              className="report-summary-card report-summary-card-hotel"
              style={{ borderColor: "#f97316", background: "#fff7ed" }}
            >
              <strong>Hotel</strong>
              <span className="credit-orange">
                {formatNumber(summary.hotelTickets || 0)} registro(s)
              </span>
              <small>{formatCurrency(summary.hotelTotal || 0)} no cobrado</small>
            </div>
          </div>
        </>
      )}

      {reportMode === "cuts" && activeCutSummary && (
        <div className="reports-summary">
          <div className="report-summary-card">
            <strong>Cortes</strong>
            <span>{formatNumber(activeCutSummary.cuts)}</span>
          </div>

          <div className="report-summary-card">
            <strong>Vendido en cortes</strong>
            <span>{formatCurrency(activeCutSummary.totalSold)}</span>
          </div>

          <div className="report-summary-card">
            <strong>Cortesías</strong>
            <span className="courtesy-red">
              {formatCurrency(activeCutSummary.totalCourtesy)}
            </span>
          </div>

          <div className="report-summary-card">
            <strong>Retiros</strong>
            <span>{formatCurrency(activeCutSummary.totalWithdrawals)}</span>
          </div>
        </div>
      )}

      {reportMode === "period" && (
        <section className="report-section">
          <h2 style={{ color: "#111827" }}>Ventas por producto / concepto</h2>

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
                {getPaidProductReportRows().length === 0 && (
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
                        <td>{item.quantityLabel ?? item.quantity}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>

              {getPaidProductReportRows().length > 0 && (
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

      {reportMode === "period" && productReport.length > 0 && (
        <section className="report-section">
          <h2 style={{ color: "#111827" }}>Registros no cobrados del periodo</h2>

          {[
            {
              type: "courtesy",
              title: "Cortesías",
              total: courtesyReportTotal,
              empty: "No hay cortesías registradas en este periodo.",
            },
            {
              type: "credit",
              title: "Créditos",
              total: creditReportTotal,
              empty: "No hay créditos registrados en este periodo.",
            },
            {
              type: "hotel",
              title: "Hotel",
              total: hotelReportTotal,
              empty: "No hay registros de Hotel en este periodo.",
            },
          ].map((section) => {
            const rows = getUnchargedReportRows(section.type);
            const groups = groupUnchargedRowsByCategory(rows);

            return (
              <div className="report-table-wrapper" key={`uncharged-${section.type}`}>
                <h4 style={{ color: "#111827" }}>{section.title}</h4>
                <p>
                  <strong>Total no cobrado:</strong> {formatCurrency(section.total || 0)}
                </p>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Producto / Concepto</th>
                      <th>Cantidad / Tiempo</th>
                      <th>Referencia</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan="4">{section.empty}</td>
                      </tr>
                    )}

                    {groups.map((group) => (
                      <Fragment key={`uncharged-${section.type}-${group.category}`}>
                        <tr className="report-category-row">
                          <td colSpan="3">
                            <strong>{group.category}</strong>
                          </td>
                          <td>
                            <strong>{formatCurrency(group.total)}</strong>
                          </td>
                        </tr>

                        {group.items.map((item, index) => (
                          <tr key={`uncharged-${section.type}-${group.category}-${index}`}>
                            <td>{item.productName}</td>
                            <td>{formatNumber(item.quantity)}</td>
                            <td>{item.reference}</td>
                            <td>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
      )}

      {reportMode === "cuts" && (
        <section className="report-section">
          <h2>Detalle del corte seleccionado</h2>

          {cutReports.length === 0 && (
            <p>No hay cortes registrados.</p>
          )}

          {cutReports.length > 0 && visibleCutReports.length === 0 && (
            <p>Selecciona un corte disponible para ver su detalle.</p>
          )}

          {visibleCutReports.map((cut) => {
            const soldItems = cut.soldItems || [];
            const courtesyItems = cut.courtesyItems || [];
            const withdrawals = cut.withdrawals || [];
            const soldGroups = groupCutItemsByCategory(soldItems);

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

                    <button
                      type="button"
                      className="report-cut-pdf-button"
                      onClick={() => downloadCutPdf(cut)}
                      title="Descargar este corte en PDF"
                    >
                      <span aria-hidden="true">PDF</span>
                      Descargar corte
                    </button>
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

                      {soldGroups.map((group) => (
                        <Fragment key={`cut-category-${cut.cashBoxCutId || cut.cashMovementId}-${group.category}`}>
                          <tr className="report-category-row">
                            <td colSpan="3">
                              <strong>{group.category}</strong>
                            </td>
                            <td>
                              <strong>{formatCurrency(group.total)}</strong>
                            </td>
                          </tr>

                          {group.items.map((item, index) => (
                            <tr key={`cut-item-${group.category}-${index}-${item.productName}`}>
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
                        </Fragment>
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
                          {groupCutItemsByCategory(courtesy.products || []).map((group) => (
                            <Fragment key={`courtesy-category-${courtesy.saleId}-${group.category}`}>
                              <tr className="report-category-row">
                                <td colSpan="3">
                                  <strong>{group.category}</strong>
                                </td>
                                <td>
                                  <strong>{formatCurrency(group.total)}</strong>
                                </td>
                              </tr>

                              {group.items.map((product, index) => (
                                <tr
                                  key={`courtesy-product-${courtesy.saleId}-${group.category}-${index}`}
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
                            </Fragment>
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
