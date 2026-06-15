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
  const [tableBucketPromos, setTableBucketPromos] = useState({});

  const TABLE_BUCKET_PROMOS_STORAGE_KEY = "nuevoEjidoTableBucketPromos";
  const TABLE_BUCKET_PROMO_FREE_SECONDS = 3600;

  const notify = (message, type = "success") => {
    if (typeof onNotify === "function") {
      onNotify(message, type);
    }
  };

  const readTableBucketPromos = () => {
    try {
      const rawPromos = localStorage.getItem(TABLE_BUCKET_PROMOS_STORAGE_KEY);
      return rawPromos ? JSON.parse(rawPromos) : {};
    } catch (error) {
      console.error("Error al leer promociones de cubeta:", error);
      return {};
    }
  };

  const loadTableBucketPromos = () => {
    setTableBucketPromos(readTableBucketPromos());
  };

  const saveTableBucketPromos = (promos) => {
    localStorage.setItem(TABLE_BUCKET_PROMOS_STORAGE_KEY, JSON.stringify(promos));
    setTableBucketPromos(promos);
    window.dispatchEvent(new Event("table-bucket-promo-updated"));
  };

  const removeTableBucketPromo = (tableId) => {
    if (!tableId) return;

    const promos = readTableBucketPromos();
    delete promos[String(tableId)];
    saveTableBucketPromos(promos);
  };

  useEffect(() => {
    loadTables();
    loadTableBucketPromos();

    const interval = setInterval(() => {
      loadTables(false);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePromoUpdate = () => loadTableBucketPromos();

    window.addEventListener("table-bucket-promo-updated", handlePromoUpdate);
    window.addEventListener("storage", handlePromoUpdate);

    return () => {
      window.removeEventListener("table-bucket-promo-updated", handlePromoUpdate);
      window.removeEventListener("storage", handlePromoUpdate);
    };
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

  const calculateTableLiveChargeBySeconds = (
    elapsedSeconds,
    { allowZero = false } = {}
  ) => {
    const seconds = Math.max(0, Number(elapsedSeconds || 0));

    if (allowZero && seconds <= 0) {
      return {
        totalMinutes: 0,
        total: 0,
      };
    }

    const totalMinutes = Math.max(1, Math.ceil(seconds / 60));
    const rawTotal = totalMinutes * 0.85;

    return {
      totalMinutes,
      total: rawTotal,
    };
  };

  const roundUpToNextTen = (amount) => {
    const value = Number(amount || 0);

    if (value <= 0) return 0;

    return Math.ceil(value / 10) * 10;
  };

  const calculateTableFinalChargeBySeconds = (elapsedSeconds) => {
    const liveCharge = calculateTableLiveChargeBySeconds(elapsedSeconds);
    const roundedTotal = roundUpToNextTen(liveCharge.total);

    return {
      totalMinutes: liveCharge.totalMinutes,
      total: roundedTotal,
    };
  };

  const getTableBucketPromo = (table) => {
    if (!table) return null;

    return tableBucketPromos[String(table.poolTableId)] || null;
  };

  const normalizePromoGrants = (promo) => {
    if (!promo) return [];

    if (Array.isArray(promo.grants) && promo.grants.length > 0) {
      return promo.grants
        .map((grant) => ({
          createdAt: grant.createdAt || promo.createdAt,
          freeSeconds: Number(grant.freeSeconds || TABLE_BUCKET_PROMO_FREE_SECONDS),
        }))
        .filter((grant) => grant.createdAt && grant.freeSeconds > 0);
    }

    return [
      {
        createdAt: promo.createdAt,
        freeSeconds: Number(promo.freeSeconds || TABLE_BUCKET_PROMO_FREE_SECONDS),
      },
    ].filter((grant) => grant.createdAt && grant.freeSeconds > 0);
  };

  const getPromotionChargeData = (table, elapsedSeconds) => {
    const promo = getTableBucketPromo(table);
    const elapsed = Math.max(0, Number(elapsedSeconds || 0));

    if (!promo || !table?.startedAt) {
      return {
        hasPromo: false,
        chargeableSeconds: elapsed,
        freeRemainingSeconds: 0,
        discountedSeconds: 0,
        totalFreeSeconds: 0,
        promoCount: 0,
        isPromoActiveNow: false,
      };
    }

    const startedDate = new Date(table.startedAt);

    if (Number.isNaN(startedDate.getTime())) {
      return {
        hasPromo: false,
        chargeableSeconds: elapsed,
        freeRemainingSeconds: 0,
        discountedSeconds: 0,
        totalFreeSeconds: 0,
        promoCount: 0,
        isPromoActiveNow: false,
      };
    }

    const grants = normalizePromoGrants(promo)
      .map((grant) => {
        const grantDate = new Date(grant.createdAt);

        if (Number.isNaN(grantDate.getTime())) return null;

        return {
          startSecond: Math.max(
            0,
            Math.floor((grantDate.getTime() - startedDate.getTime()) / 1000)
          ),
          freeSeconds: Number(grant.freeSeconds || TABLE_BUCKET_PROMO_FREE_SECONDS),
        };
      })
      .filter((grant) => grant && grant.freeSeconds > 0)
      .sort((a, b) => a.startSecond - b.startSecond);

    if (grants.length === 0) {
      return {
        hasPromo: false,
        chargeableSeconds: elapsed,
        freeRemainingSeconds: 0,
        discountedSeconds: 0,
        totalFreeSeconds: 0,
        promoCount: 0,
        isPromoActiveNow: false,
      };
    }

    let currentSecond = 0;
    let availableFreeSeconds = 0;
    let discountedSeconds = 0;
    let chargeableSeconds = 0;

    grants.forEach((grant) => {
      const eventSecond = Math.min(Math.max(0, grant.startSecond), elapsed);
      const segmentSeconds = Math.max(0, eventSecond - currentSecond);

      if (segmentSeconds > 0) {
        const freeUsed = Math.min(segmentSeconds, availableFreeSeconds);
        discountedSeconds += freeUsed;
        chargeableSeconds += segmentSeconds - freeUsed;
        availableFreeSeconds -= freeUsed;
        currentSecond = eventSecond;
      }

      if (grant.startSecond <= elapsed) {
        availableFreeSeconds += grant.freeSeconds;
      }
    });

    const finalSegmentSeconds = Math.max(0, elapsed - currentSecond);

    if (finalSegmentSeconds > 0) {
      const freeUsed = Math.min(finalSegmentSeconds, availableFreeSeconds);
      discountedSeconds += freeUsed;
      chargeableSeconds += finalSegmentSeconds - freeUsed;
      availableFreeSeconds -= freeUsed;
    }

    const totalFreeSeconds = grants.reduce(
      (total, grant) => total + Number(grant.freeSeconds || 0),
      0
    );

    return {
      hasPromo: true,
      chargeableSeconds,
      freeRemainingSeconds: availableFreeSeconds,
      discountedSeconds,
      totalFreeSeconds,
      promoCount: grants.length,
      isPromoActiveNow: availableFreeSeconds > 0,
      promo,
    };
  };

  const calculateTableLiveChargeWithPromotion = (table, elapsedSeconds) => {
    const promoData = getPromotionChargeData(table, elapsedSeconds);
    const charge = calculateTableLiveChargeBySeconds(
      promoData.chargeableSeconds,
      { allowZero: promoData.hasPromo }
    );

    return {
      ...charge,
      ...promoData,
    };
  };

  const calculateTableFinalChargeWithPromotion = (table, elapsedSeconds) => {
    const liveCharge = calculateTableLiveChargeWithPromotion(table, elapsedSeconds);
    const roundedTotal = roundUpToNextTen(liveCharge.total);

    return {
      ...liveCharge,
      total: roundedTotal,
    };
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
      removeTableBucketPromo(table.poolTableId);
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
      const finalCharge = calculateTableFinalChargeWithPromotion(
        table,
        elapsedSeconds
      );
      const { totalMinutes, total } = finalCharge;

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
        realElapsedSeconds: elapsedSeconds,
        freePromotionApplied: finalCharge.hasPromo,
        freePromotionDiscountedSeconds: finalCharge.discountedSeconds || 0,
      });

      await api.post(`/PoolTables/${table.poolTableId}/Stop`);
      removeTableBucketPromo(table.poolTableId);
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
    const pendingBucketPromo = getTableBucketPromo(table);
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
    const liveCharge = calculateTableLiveChargeWithPromotion(table, elapsedSeconds);
    const finalCharge = calculateTableFinalChargeWithPromotion(table, elapsedSeconds);

    const tableNote = getTableNote(table);
    const itemCount = getTableNoteItemCount(tableNote);
    const pendingBucketPromo = getTableBucketPromo(table);

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
            {liveCharge.hasPromo && liveCharge.freeRemainingSeconds > 0 ? (
              <div className="pool-table-note-summary pool-table-bucket-hour">
                <span>
                  {liveCharge.promoCount > 1
                    ? `${liveCharge.promoCount} horas por cubeta`
                    : "Hora por cubeta"}
                </span>
                <strong>{formatElapsedTime(liveCharge.freeRemainingSeconds)}</strong>
                <small>Sin cobro de mesa</small>
              </div>
            ) : (
              <>
                <div className="pool-table-charge">
                  Cobro actual: {formatCurrency(liveCharge.total)}
                </div>

                <div className="pool-table-charge">
                  Final redondeado: {formatCurrency(finalCharge.total)}
                </div>
              </>
            )}

            {liveCharge.hasPromo && liveCharge.freeRemainingSeconds <= 0 && (
              <div className="pool-table-note-summary">
                <span>Promo cubeta</span>
                <strong>1 hora aplicada</strong>
              </div>
            )}
          </>
        ) : (
          <div className="pool-table-charge">Disponible</div>
        )}

        {!table.isActive && pendingBucketPromo && (
          <div className="pool-table-note-summary">
            <span>Promo cubeta pendiente</span>
            <strong>
              {Number(pendingBucketPromo.freeSeconds || 3600) / 3600} hora(s) gratis al iniciar
            </strong>
          </div>
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
