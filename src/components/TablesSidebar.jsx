import { useEffect, useState } from "react";

const getTableType = (tableNumber) => {
  if (tableNumber >= 5 && tableNumber <= 7) {
    return "carambola";
  }

  return "pool";
};

const createDefaultTables = () =>
  Array.from({ length: 11 }, (_, index) => {
    const tableNumber = index + 1;
    const tableType = getTableType(tableNumber);

    return {
      id: tableNumber,
      name: `Mesa ${tableNumber}`,
      tableType,
      status: "available",
      startTime: null,
      elapsedSeconds: 0,
      stoppedSeconds: null,
      charged: false,
    };
  });

const DEFAULT_TABLES = createDefaultTables();

function TablesSidebar({ onAddTableCharge, tableRentalProduct, onNotify }) {
  const [tables, setTables] = useState(() => {
    const savedTables = localStorage.getItem("poolTables");

    if (savedTables) {
      try {
        const parsedTables = JSON.parse(savedTables);

        return DEFAULT_TABLES.map((defaultTable) => {
          const savedTable = parsedTables.find(
            (table) => table.id === defaultTable.id
          );

          return {
            ...defaultTable,
            ...(savedTable || {}),
            tableType: defaultTable.tableType,
            name: defaultTable.name,
          };
        });
      } catch (error) {
        console.error("Error al leer mesas guardadas:", error);
        return DEFAULT_TABLES;
      }
    }

    return DEFAULT_TABLES;
  });

  useEffect(() => {
    localStorage.setItem("poolTables", JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTables((prevTables) =>
        prevTables.map((table) => {
          if (table.status !== "occupied") return table;
          if (!table.startTime) return table;
          if (table.stoppedSeconds !== null) return table;
          if (table.charged) return table;

          const elapsedSeconds = Math.floor(
            (Date.now() - table.startTime) / 1000
          );

          return {
            ...table,
            elapsedSeconds,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.resetChargedTables = resetChargedTables;
    window.resetPoolTable = resetPoolTable;

    return () => {
      delete window.resetChargedTables;
      delete window.resetPoolTable;
    };
  });

  const notify = (message, type = "warning") => {
    if (onNotify) {
      onNotify(message, type);
      return;
    }

    console.warn(message);
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

  const calculateTableCharge = (seconds) => {
    const minutes = Math.ceil(seconds / 60);

    if (minutes <= 0) return 0;

    const fractions = Math.ceil(minutes / 30);

    return fractions * 25;
  };

  const startTable = (tableId) => {
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              status: "occupied",
              startTime: Date.now(),
              elapsedSeconds: 0,
              stoppedSeconds: null,
              charged: false,
            }
          : table
      )
    );
  };

  const stopTable = (tableId) => {
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              stoppedSeconds: table.elapsedSeconds,
            }
          : table
      )
    );
  };

  const resetPoolTable = (tableId) => {
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              status: "available",
              startTime: null,
              elapsedSeconds: 0,
              stoppedSeconds: null,
              charged: false,
            }
          : table
      )
    );
  };

  const chargeTable = (table) => {
    const secondsToCharge = table.stoppedSeconds ?? table.elapsedSeconds;
    const amount = calculateTableCharge(secondsToCharge);

    if (!tableRentalProduct) {
      notify("No existe el producto de renta de mesa de billar.", "error");
      return;
    }

    if (amount <= 0) {
      notify("No hay tiempo suficiente para cobrar.", "warning");
      return;
    }

    onAddTableCharge({
      productId: tableRentalProduct.productId,
      name: `${tableRentalProduct.name} - ${table.name}`,
      quantity: 1,
      unitPrice: amount,
      subtotal: amount,
      trackInventory: false,
      stock: 0,
      requiresBeerSelection: false,
      selectedBeerProductId: null,
      selectedBeerName: null,
      tableId: table.id,
      tableName: table.name,
      tableType: table.tableType,
      rentalSeconds: secondsToCharge,
      rentalTimeLabel: formatTime(secondsToCharge),
    });

    setTables((prevTables) =>
      prevTables.map((item) =>
        item.id === table.id
          ? {
              ...item,
              charged: true,
              stoppedSeconds: secondsToCharge,
            }
          : item
      )
    );
  };

  const resetChargedTables = () => {
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.charged
          ? {
              ...table,
              status: "available",
              startTime: null,
              elapsedSeconds: 0,
              stoppedSeconds: null,
              charged: false,
            }
          : table
      )
    );
  };

  return (
    <aside className="main-sidebar tables-sidebar">
      <h2>Mesas</h2>

      <div className="tables-list">
        {tables.map((table) => {
          const isOccupied = table.status === "occupied";
          const isStopped = table.stoppedSeconds !== null;
          const secondsToShow = table.stoppedSeconds ?? table.elapsedSeconds;
          const amount = calculateTableCharge(secondsToShow);
          const isCarambola = table.tableType === "carambola";

          return (
            <div
              className={`pool-table-wrapper ${
                isOccupied ? "pool-table-occupied" : "pool-table-available"
              }`}
              key={table.id}
            >
              <div className="pool-table-header">
  <strong>
    {table.name}: {isCarambola ? "Carambola" : "Pool"}
  </strong>

  <span>
    {isOccupied
      ? table.charged
        ? "Agregada"
        : isStopped
        ? "Detenida"
        : "Ocupada"
      : "Disponible"}
  </span>
</div>


              <div
                className={`pool-table-shape ${
                  isCarambola ? "carambola-table-shape" : "normal-table-shape"
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
                    {formatTime(secondsToShow)}
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
                  onClick={() => startTable(table.id)}
                >
                  Iniciar
                </button>
              ) : (
                <div className="table-action-buttons">
                  <button
                    className="table-stop-button"
                    onClick={() => stopTable(table.id)}
                    disabled={isStopped || table.charged}
                  >
                    Parar
                  </button>

                  <button
                    className="table-charge-button"
                    onClick={() => chargeTable(table)}
                    disabled={table.charged}
                  >
                    {table.charged ? "Agregada" : "Cobrar"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default TablesSidebar;