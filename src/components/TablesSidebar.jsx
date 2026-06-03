import { useEffect, useState } from "react";
import api from "../services/api";

const getDefaultTableType = (tableNumber) => {
  if (tableNumber >= 5 && tableNumber <= 7) {
    return "carambola";
  }

  return "pool";
};

function TablesSidebar({ onAddTableCharge, tableRentalProduct, onNotify }) {
  const [tables, setTables] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loadingTableId, setLoadingTableId] = useState(null);

  useEffect(() => {
    loadTables();

    const interval = setInterval(() => {
      loadTables();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
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
    const tableNumber = table.tableNumber ?? table.TableNumber ?? table.id ?? table.Id;

    const rawStatus = table.status ?? table.Status ?? "Disponible";
    const normalizedStatus = String(rawStatus).toLowerCase();

    const isOccupied =
      normalizedStatus === "ocupada" ||
      normalizedStatus === "occupied";

    const tableType =
      table.tableType ??
      table.TableType ??
      getDefaultTableType(Number(tableNumber));

    return {
      poolTableId:
        table.poolTableId ??
        table.PoolTableId ??
        table.id ??
        table.Id,
      tableNumber: Number(tableNumber),
      name:
        table.name ??
        table.Name ??
        `Mesa ${tableNumber}`,
      tableType: String(tableType).toLowerCase(),
      status: isOccupied ? "occupied" : "available",
      startedAt:
        table.startedAt ??
        table.StartedAt ??
        null,
      currentCharge:
        table.currentCharge ??
        table.CurrentCharge ??
        0,
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

  const getElapsedSeconds = (startedAt) => {
    if (!startedAt) return 0;

    const start = new Date(startedAt);
    const diff = Math.floor((now - start) / 1000);

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

  const calculateTableCharge = (startedAt) => {
    if (!startedAt) return 0;

    const elapsedSeconds = getElapsedSeconds(startedAt);
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

    if (!table.startedAt) {
      notify("La mesa no tiene hora de inicio registrada.", "warning");
      return;
    }

    try {
      setLoadingTableId(table.poolTableId);

      const response = await api.post(`/PoolTables/${table.poolTableId}/Stop`);

      const data = response.data || {};

      const total =
        data.total ??
        data.Total ??
        calculateTableCharge(table.startedAt);

      const totalMinutes =
        data.totalMinutes ??
        data.TotalMinutes ??
        Math.ceil(getElapsedSeconds(table.startedAt) / 60);

      const tableName =
        data.name ??
        data.Name ??
        `Mesa ${table.tableNumber}`;

      onAddTableCharge({
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
            const elapsedSeconds = getElapsedSeconds(table.startedAt);
            const amount = isOccupied
              ? calculateTableCharge(table.startedAt)
              : 0;

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