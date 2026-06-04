function ProductDrinkSizesForm({ drinkSizes, setDrinkSizes }) {
  const [sizeForm, setSizeForm] = useState({
    sizeName: "",
    ouncesUsed: "",
    price: "",
  });

  const handleSizeFormChange = (field, value) => {
    setSizeForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addDrinkSize = () => {
    const sizeName = sizeForm.sizeName.trim();
    const ouncesUsed = Number(sizeForm.ouncesUsed || 0);
    const price = Number(sizeForm.price || 0);

    if (!sizeName) {
      alert("Ingresa el nombre del tamaño.");
      return;
    }

    if (ouncesUsed <= 0) {
      alert("Las onzas usadas deben ser mayores a cero.");
      return;
    }

    if (price <= 0) {
      alert("El precio debe ser mayor a cero.");
      return;
    }

    const duplicatedSize = drinkSizes.some(
      (size) => size.sizeName.toLowerCase() === sizeName.toLowerCase()
    );

    if (duplicatedSize) {
      alert("Ya existe un tamaño con ese nombre.");
      return;
    }

    setDrinkSizes((prev) => [
      ...prev,
      {
        sizeName,
        ouncesUsed,
        price,
      },
    ]);

    setSizeForm({
      sizeName: "",
      ouncesUsed: "",
      price: "",
    });
  };

  const removeDrinkSize = (indexToRemove) => {
    setDrinkSizes((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const updateDrinkSize = (indexToUpdate, field, value) => {
    setDrinkSizes((prev) =>
      prev.map((size, index) =>
        index === indexToUpdate
          ? {
              ...size,
              [field]:
                field === "sizeName"
                  ? value
                  : Number(value || 0),
            }
          : size
      )
    );
  };

  return (
    <div className="drink-sizes-section">
      <div className="drink-sizes-header">
        <h3>Tamaños de bebida</h3>
        <p>
          Agrega los tamaños disponibles para este producto. Cada tamaño debe
          tener nombre, onzas usadas de botella y precio de venta.
        </p>
      </div>

      <div className="drink-size-form">
        <input
          type="text"
          placeholder="Nombre del tamaño, ej. Jaibolero"
          value={sizeForm.sizeName}
          onChange={(e) =>
            handleSizeFormChange("sizeName", e.target.value)
          }
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Onzas usadas"
          value={sizeForm.ouncesUsed}
          onChange={(e) =>
            handleSizeFormChange("ouncesUsed", e.target.value)
          }
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio"
          value={sizeForm.price}
          onChange={(e) =>
            handleSizeFormChange("price", e.target.value)
          }
        />

        <button
          type="button"
          className="add-drink-size-button"
          onClick={addDrinkSize}
        >
          Agregar tamaño
        </button>
      </div>

      {drinkSizes.length === 0 ? (
        <p className="empty-drink-sizes">
          No se han agregado tamaños para esta bebida.
        </p>
      ) : (
        <div className="drink-sizes-list">
          {drinkSizes.map((size, index) => (
            <div className="drink-size-item" key={`${size.sizeName}-${index}`}>
              <input
                type="text"
                value={size.sizeName}
                onChange={(e) =>
                  updateDrinkSize(index, "sizeName", e.target.value)
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={size.ouncesUsed}
                onChange={(e) =>
                  updateDrinkSize(index, "ouncesUsed", e.target.value)
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={size.price}
                onChange={(e) =>
                  updateDrinkSize(index, "price", e.target.value)
                }
              />

              <button
                type="button"
                className="remove-drink-size-button"
                onClick={() => removeDrinkSize(index)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";

export default ProductDrinkSizesForm;