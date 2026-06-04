import { useEffect, useState } from "react";
import api from "../services/api";

const getDefaultTableType = (tableNumber) => {
  if (tableNumber >= 5 && tableNumber <= 7) {
    return "carambola";
  }

  return "pool";
};

const parseBackendDate = (dateValue) => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return dateValue.getTime();
  }

  const dateText = String(dateValue);

  const dotNetMatch = dateText.match(/\/Date\((\d+)\)\//);
  if (dotNetMatch) {
    return Number(dotNetMatch[1]);
  }

  const localDateMatch = dateText.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/
  );

  if (localDateMatch) {
    const [, year, month, day, hour, minute, second, milliseconds = "0"] =
      localDateMatch;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number(milliseconds.padEnd(3, "0").slice(0, 3))
    ).getTime();
  }

  const parsedTime = new Date(dateText).getTime();

  if (!Number.isNaN(parsedTime)) {
    return parsedTime;
  }

  return null;
};

function TablesSidebar({ onAddTableCharge, tableRentalProduct, onNotify }) {
  const [tables, setTables] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loadingTableId, setLoadingTableId] = useState(null);

  useEffect(() => {
    loadTables();

    const polling = setInterval(() => {
      loadTables();
    }, 3000);

    return () => clearInterval(polling);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const notify = (message, type = "warning") => {
    if (onNotify) {
      onNotify(message, type);
      return;
    }

    console.warn(message);
  };

  const normalizeTable = (table) => {
    const tableId =
      table.poolTableId ??
      table.PoolTableId ??
      table.id ??
      table.Id;

    const tableNumber =
      table.tableNumber ??
      table.TableNumber ??
      table.number ??
      table.Number ??
      tableId;

    const rawStatus = table.status ?? table.Status ?? "Disponible";
    const normalizedStatus = String(rawStatus).toLowerCase().trim();
    const elapsedSecondsFromServer =
      table.elapsedSeconds ??
      table.ElapsedSeconds ??
      0;

    const rawStartedAt =
      table.startedAt ??
      table.StartedAt ??
      table.started_at ??
      table.STARTEDAT ??
      null;

    const startedAtMs = parseBackendDate(rawStartedAt);

    const isOccupied =
      normalizedStatus === "ocupada" ||
      normalizedStatus === "ocupado" ||
      normalizedStatus === "occupied" ||
      normalizedStatus === "busy" ||
      Boolean(startedAtMs);

    const rawTableType =
      table.tableType ??
      table.TableType ??
      getDefaultTableType(Number(tableNumber));

    return {
  poolTableId: Number(tableId),
  tableNumber: Number(tableNumber),
  name: table.name ?? table.Name ?? `Mesa ${tableNumber}`,
  tableType: String(rawTableType).toLowerCase(),
  status: isOccupied ? "occupied" : "available",
  rawStatus,
  startedAt: rawStartedAt,
  startedAtMs,
  elapsedSecondsFromServer: Number(elapsedSecondsFromServer || 0),
  loadedAtMs: Date.now(),
  stoppedAt: table.stoppedAt ?? table.StoppedAt ?? null,
  currentCharge: table.currentCharge ?? table.CurrentCharge ?? 0,
};
  };

  const loadTables = async () => {
    try {
      const response = await api.get("/PoolTables");

      const normalizedTables = response.data
        .map(normalizeTable)
        .sort((a, b) => a.tableNumber - b.tableNumber);

      setTables(normalizedTables);
    } catch (error) {
      console.error("Error al cargar mesas:", error);
      notify("No se pudieron cargar las mesas de billar.", "error");
    }
  };

 const getElapsedSeconds = (table) => {
  if (!table || table.status !== "occupied") return 0;

  if (Number(table.elapsedSecondsFromServer) > 0) {
    const secondsSinceLoad = Math.floor(
      (currentTime - table.loadedAtMs) / 1000
    );

    return table.elapsedSecondsFromServer + Math.max(0, secondsSinceLoad);
  }

  if (!table.startedAtMs) return 0;

  const diff = Math.floor((currentTime - table.startedAtMs) / 1000);

  return diff > 0 ? diff : 0;
};

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  const calculateTableCharge = (table) => {
    const elapsedSeconds = getElapsedSeconds(table);
    const elapsedMinutes = Math.ceil(elapsedSeconds / 60);

    if (elapsedMinutes <= 0) return 0;

    if (elapsedMinutes <= 60) return 50;

    const extraMinutes = elapsedMinutes - 60;
    const extraHalfHours = Math.ceil(extraMinutes / 30);

    return 50 + extraHalfHours * 25;
  };

  const startTable = async (tableId) => {
    try {
      setLoadingTableId(tableId);

      await api.post(`/PoolTables/${tableId}/Start`);
      await loadTables();

      notify("Mesa iniciada correctamente.", "success");
    } catch (error) {
      console.error("Error al iniciar mesa:", error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.Message ||
        error.response?.data ||
        "No se pudo iniciar la mesa.";

      notify(message, "error");
    } finally {
      setLoadingTableId(null);
    }
  };

  const chargeTable = async (table) => {
    if (!onAddTableCharge) {
      notify("No existe la función para agregar la mesa al carrito.", "error");
      return;
    }

    if (!table.startedAtMs) {
      notify("La mesa no tiene hora de inicio registrada.", "warning");
      return;
    }

    try {
      setLoadingTableId(table.poolTableId);

      const response = await api.post(`/PoolTables/${table.poolTableId}/Stop`);

      const data = response.data || {};

      const total = data.total ?? data.Total ?? calculateTableCharge(table);

      const totalMinutes =
        data.totalMinutes ??
        data.TotalMinutes ??
        Math.ceil(getElapsedSeconds(table) / 60);

      const tableName = data.name ?? data.Name ?? `Mesa ${table.tableNumber}`;

      await onAddTableCharge({
        productId: tableRentalProduct?.productId ?? null,
        name: tableRentalProduct
          ? `${tableRentalProduct.name} - ${tableName}`
          : tableName,
        quantity: 1,
        unitPrice: Number(total || 0),
        subtotal: Number(total || 0),
        productType: "SERVICE",
        trackInventory: false,
        stock: 0,
        requiresBeerSelection: false,
        selectedBeerProductId: null,
        selectedBottleProductId: null,
        tableId: table.poolTableId,
        tableNumber: table.tableNumber,
        tableName,
        tableType: table.tableType,
        totalMinutes,
        rentalSeconds: totalMinutes * 60,
        rentalTimeLabel: formatTime(totalMinutes * 60),
      });

      await loadTables();

      notify("Mesa agregada al carrito.", "success");
    } catch (error) {
      console.error("Error al cobrar mesa:", error);

      const message =
        error.response?.data?.message ||
        error.response?.data?.Message ||
        error.response?.data ||
        "No se pudo cobrar la mesa.";

      notify(message, "error");
    } finally {
      setLoadingTableId(null);
    }
  };

  return (
    <aside className="main-sidebar tables-sidebar">
      <h2>Mesas</h2>

      <div className="tables-list">
        {tables.length === 0 ? (
          <p>No hay mesas disponibles.</p>
        ) : (
          tables.map((table) => {
            const isOccupied = table.status === "occupied";
            const isCarambola = table.tableType === "carambola";
            const elapsedSeconds = getElapsedSeconds(table);
            const amount = isOccupied ? calculateTableCharge(table) : 0;
            const isLoading = loadingTableId === table.poolTableId;

            return (
              <div
                className={`pool-table-wrapper ${
                  isOccupied ? "pool-table-occupied" : "pool-table-available"
                }`}
                key={table.poolTableId}
              >
                <div className="pool-table-header">
                  <strong>
                    {table.name}: {isCarambola ? "Carambola" : "Pool"}
                  </strong>

                  <span>{isOccupied ? "Ocupada" : "Disponible"}</span>
                </div>

                <div
                  className={`pool-table-shape ${
                    isCarambola
                      ? "carambola-table-shape"
                      : "normal-table-shape"
                  }`}
                >
                  {!isCarambola && (
                    <>
                      <div className="pool-pocket pocket-top-left"></div>
                      <div className="pool-pocket pocket-top-center"></div>
                      <div className="pool-pocket pocket-top-right"></div>

                      <div className="pool-pocket pocket-bottom-left"></div>
                      <div className="pool-pocket pocket-bottom-center"></div>
                      <div className="pool-pocket pocket-bottom-right"></div>
                    </>
                  )}

                  {isCarambola && (
                    <>
                      <div className="carambola-corner-line top-left-line"></div>
                      <div className="carambola-corner-line top-right-line"></div>
                      <div className="carambola-corner-line bottom-left-line"></div>
                      <div className="carambola-corner-line bottom-right-line"></div>
                    </>
                  )}

                  {isOccupied && (
                    <div className="pool-table-timer">
                      {formatTime(elapsedSeconds)}
                    </div>
                  )}
                </div>

                {isOccupied && (
                  <div className="pool-table-charge">
                    Cobro actual: ${amount.toFixed(2)}
                  </div>
                )}

                {!isOccupied ? (
                  <button
                    className="table-start-button"
                    onClick={() => startTable(table.poolTableId)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Iniciando..." : "Iniciar"}
                  </button>
                ) : (
                  <div className="table-action-buttons">
                    <button
                      className="table-charge-button"
                      onClick={() => chargeTable(table)}
                      disabled={isLoading}
                    >
                      {isLoading ? "Cobrando..." : "Cobrar"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default TablesSidebar;