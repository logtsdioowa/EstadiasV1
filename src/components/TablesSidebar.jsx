import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function TablesSidebar({
  onAddTableCharge,
  tableRentalProduct,
  onNotify,
  onOpenTableNote,
  activeTableNoteId,
  tableNotes = [],
}) {
  const [tables, setTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const notify = (message, type = "success") => {
    if (typeof onNotify === "function") {
      onNotify(message, type);
    }
  };

  useEffect(() => {
    loadTables();

    const interval = setInterval(() => {
      loadTables(false);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const normalizeTable = (table) => {
    const poolTableId =
      table.poolTableId ?? table.PoolTableId ?? table.tableId ?? table.TableId;

    const tableNumber = table.tableNumber ?? table.TableNumber ?? "";
    const tableType = table.tableType ?? table.TableType ?? "";
    const status = table.status ?? table.Status ?? "AVAILABLE";

    const startedAt =
      table.startedAt ??
      table.StartedAt ??
      table.startTime ??
      table.StartTime ??
      null;

    const elapsedSeconds =
      table.elapsedSeconds ?? table.ElapsedSeconds ?? null;

    return {
      poolTableId,
      tableNumber,
      tableType,
      status,
      startedAt,
      elapsedSeconds,
      isActive:
        status === "ACTIVE" ||
        status === "OCCUPIED" ||
        status === "BUSY" ||
        Boolean(startedAt),
    };
  };

  const loadTables = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingTables(true);
      }

      const response = await api.get("/PoolTables");

      const normalizedTables = (response.data || [])
        .map(normalizeTable)
        .sort(
          (a, b) => Number(a.tableNumber || 0) - Number(b.tableNumber || 0)
        );

      setTables(normalizedTables);
    } catch (error) {
      console.error("Error al cargar mesas:", error);
      notify("No se pudieron cargar las mesas de billar.", "error");
    } finally {
      if (showLoading) {
        setLoadingTables(false);
      }
    }
  };

  const calculateElapsedSeconds = (table) => {
    if (!table) return 0;

    if (table.elapsedSeconds !== null && table.elapsedSeconds !== undefined) {
      return Number(table.elapsedSeconds || 0);
    }

    if (!table.startedAt) return 0;

    const startedDate = new Date(table.startedAt);
    const now = new Date();

    if (Number.isNaN(startedDate.getTime())) {
      return 0;
    }

    return Math.max(0, Math.floor((now - startedDate) / 1000));
  };

  const TABLE_PRICE_PER_MINUTE = 0.83;

  const calculateTableLiveChargeBySeconds = (elapsedSeconds) => {
    const seconds = Math.max(0, Number(elapsedSeconds || 0));

    // Se cobran únicamente los minutos completos.
    // Ejemplo: 4:15 = 4 minutos cobrados; al llegar a 5:00 cambia a 5 minutos.
    const totalMinutes = Math.floor(seconds / 60);
    const rawTotal = Number((totalMinutes * TABLE_PRICE_PER_MINUTE).toFixed(2));

    return {
      totalMinutes,
      total: rawTotal,
    };
  };

  const calculateTableFinalChargeBySeconds = (elapsedSeconds) => {
    return calculateTableLiveChargeBySeconds(elapsedSeconds);
  };

  const formatElapsedTime = (secondsValue) => {
    const totalSeconds = Math.max(0, Number(secondsValue || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (value) => String(value).padStart(2, "0");

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const getTableName = (table) => {
    if (!table) return "Mesa";

    return `Mesa ${table.tableNumber || table.poolTableId || ""}`;
  };

  const getTableNote = (table) => {
    if (!table) return null;

    return (
      tableNotes.find(
        (note) => Number(note.tableId) === Number(table.poolTableId)
      ) || null
    );
  };

  const getTableNoteItemCount = (tableNote) => {
    if (!tableNote) return 0;

    const items = tableNote.items ?? tableNote.Items ?? [];

    return items.length;
  };

  const isTableNoteActive = (table) => {
    if (!table) return false;

    return Number(activeTableNoteId) === Number(table.poolTableId);
  };

  const handleOpenTableNote = async (table) => {
    if (typeof onOpenTableNote !== "function") {
      notify("La función de nota de mesa no está conectada.", "warning");
      return;
    }

    await onOpenTableNote(table);
  };

  const startTable = async (table) => {
    try {
      await api.post(`/PoolTables/${table.poolTableId}/Start`);
      await loadTables(false);
      notify(`${getTableName(table)} iniciada.`, "success");
    } catch (error) {
      console.error("Error al iniciar mesa:", error);
      notify("No se pudo iniciar la mesa.", "error");
    }
  };

  const cancelTable = async (table) => {
    try {
      await api.post(`/PoolTables/${table.poolTableId}/Cancel`);
      await loadTables(false);
      notify(`${getTableName(table)} cancelada.`, "success");
    } catch (error) {
      console.error("Error al cancelar mesa:", error);
      notify("No se pudo cancelar la mesa.", "error");
    }
  };

  const chargeTable = async (table) => {
    try {
      const elapsedSeconds = calculateElapsedSeconds(table);
      const { totalMinutes, total } =
        calculateTableFinalChargeBySeconds(elapsedSeconds);

      const tableName = getTableName(table);

      if (typeof onAddTableCharge !== "function") {
        notify("No está conectada la función para cobrar la mesa.", "error");
        return;
      }

      await onAddTableCharge({
        productId: tableRentalProduct?.productId ?? null,
        name: `Renta mesa de billar M${table.tableNumber}`,
        quantity: 1,
        unitPrice: Number(total || 0),
        subtotal: Number(total || 0),
        total: Number(total || 0),

        productType: "SERVICE",
        trackInventory: false,
        stock: 0,

        requiresBeerSelection: false,
        selectedBeerProductId: null,
        selectedBottleProductId: null,
        productDrinkSizeId: null,
        drinkSizeName: null,
        ouncesUsed: null,

        tableId: table.poolTableId,
        poolTableId: table.poolTableId,
        tableNumber: table.tableNumber,
        tableName,
        tableType: table.tableType,

        totalMinutes,
        rentalSeconds: totalMinutes * 60,
        rentalTimeLabel: `${totalMinutes} min`,
      });

      await api.post(`/PoolTables/${table.poolTableId}/Stop`);
      await loadTables(false);

      notify(`${tableName} enviada al carrito.`, "success");
    } catch (error) {
      console.error("Error al cobrar mesa:", error);
      notify("No se pudo cobrar la mesa.", "error");
    }
  };

  const tableGroups = useMemo(() => {
    const groups = {
      normal: [],
      vip: [],
      other: [],
    };

    tables.forEach((table) => {
      const type = String(table.tableType || "").toLowerCase();

      if (type.includes("vip")) {
        groups.vip.push(table);
        return;
      }

      if (
        type.includes("normal") ||
        type.includes("regular") ||
        type.trim() === ""
      ) {
        groups.normal.push(table);
        return;
      }

      groups.other.push(table);
    });

    return groups;
  }, [tables]);

  const renderTableNoteFlag = (table) => {
    const tableNote = getTableNote(table);
    const itemCount = getTableNoteItemCount(tableNote);
    const isActive = isTableNoteActive(table);

    return (
      <button
        type="button"
        className={`table-note-flag ${
          isActive ? "table-note-flag-active" : ""
        } ${tableNote ? "table-note-flag-has-note" : "table-note-flag-empty"}`}
        onClick={() => handleOpenTableNote(table)}
        title={tableNote ? "Abrir nota de mesa" : "Crear nota de mesa"}
      >
        <span className="table-note-flag-icon" aria-hidden="true">
          {tableNote ? "▣" : "+"}
        </span>

        {tableNote && itemCount > 0 && (
          <strong className="table-note-flag-count">{itemCount}</strong>
        )}
      </button>
    );
  };

  const renderTableShape = (table, elapsedSeconds) => {
    const isCarambola = String(table.tableType || "")
      .toLowerCase()
      .includes("carambola");

    return (
      <div
        className={`pool-table-shape ${
          isCarambola ? "carambola-table-shape" : ""
        }`}
      >
        <span className="pool-pocket pocket-top-left" />
        <span className="pool-pocket pocket-top-center" />
        <span className="pool-pocket pocket-top-right" />
        <span className="pool-pocket pocket-bottom-left" />
        <span className="pool-pocket pocket-bottom-center" />
        <span className="pool-pocket pocket-bottom-right" />

        {table.isActive && (
          <div className="pool-table-timer">
            {formatElapsedTime(elapsedSeconds)}
          </div>
        )}
      </div>
    );
  };

  const renderTableCard = (table) => {
    const elapsedSeconds = calculateElapsedSeconds(table);
    const liveCharge = calculateTableLiveChargeBySeconds(elapsedSeconds);
    const finalCharge = calculateTableFinalChargeBySeconds(elapsedSeconds);

    const tableNote = getTableNote(table);
    const itemCount = getTableNoteItemCount(tableNote);

    return (
      <article
        className={`pool-table-wrapper ${
          table.isActive ? "pool-table-occupied" : "pool-table-available"
        } ${isTableNoteActive(table) ? "pool-table-card-note-active" : ""}`}
        key={table.poolTableId}
      >
        {renderTableNoteFlag(table)}

        <div className="pool-table-header">
          <strong>Mesa {table.tableNumber}</strong>
          <span>{table.isActive ? "En uso" : "Libre"}</span>
        </div>

        {renderTableShape(table, elapsedSeconds)}

        {table.isActive ? (
          <>
            <div className="pool-table-charge">
              Cobro actual: {formatCurrency(liveCharge.total)}
            </div>

            <div className="pool-table-charge">
              Total final: {formatCurrency(finalCharge.total)}
            </div>
          </>
        ) : (
          <div className="pool-table-charge">Disponible</div>
        )}

        {tableNote && (
          <div className="pool-table-note-summary">
            <span>Nota vinculada</span>
            <strong>
              {itemCount} producto{itemCount === 1 ? "" : "s"}
            </strong>
          </div>
        )}

        <div className="table-action-buttons">
          {!table.isActive ? (
            <button
              type="button"
              className="table-start-button"
              onClick={() => startTable(table)}
            >
              Iniciar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="table-stop-button"
                onClick={() => cancelTable(table)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="table-charge-button"
                onClick={() => chargeTable(table)}
              >
                Cobrar
              </button>
            </>
          )}
        </div>
      </article>
    );
  };

  const renderTableSection = (title, sectionTables) => {
    if (!sectionTables || sectionTables.length === 0) {
      return null;
    }

    return (
      <section className="pool-table-section">
        <div className="pool-table-section-header">
          <h2>{title}</h2>
          <span>{sectionTables.length}</span>
        </div>

        <div className="tables-list">{sectionTables.map(renderTableCard)}</div>
      </section>
    );
  };

  return (
    <aside className="tables-sidebar">
      <div className="tables-sidebar-header">
        <div>
          <h2>Mesas</h2>
          <p>Control de tiempo y notas</p>
        </div>

        <button
          type="button"
          className="tables-refresh-button"
          onClick={() => loadTables()}
          disabled={loadingTables}
          title="Actualizar mesas"
        >
          ↻
        </button>
      </div>

      {loadingTables && tables.length === 0 ? (
        <p className="tables-loading-text">Cargando mesas...</p>
      ) : tables.length === 0 ? (
        <p className="tables-empty-text">No hay mesas registradas.</p>
      ) : (
        <div className="tables-sidebar-content">
          {renderTableSection("Mesas normales", tableGroups.normal)}
          {renderTableSection("Mesas VIP", tableGroups.vip)}
          {renderTableSection("Otras mesas", tableGroups.other)}
        </div>
      )}
    </aside>
  );
}

export default TablesSidebar;
