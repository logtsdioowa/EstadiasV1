import { useEffect, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [toast, setToast] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

const [newProduct, setNewProduct] = useState({
  name: "",
  description: "",
  categoryId: "",
  price: "",
  stock: "",
  minStock: "10",
  trackInventory: true,
  requiresBeerSelection: false,
  isBeer: false,
  imageUrl: "",
  productType: "INDIVIDUAL",
});

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const resetProductForm = () => {
    setNewProduct({
      name: "",
      description: "",
      categoryId:
        categoriesList.length > 0 ? categoriesList[0].categoryId : "",
      price: "",
      stock: "",
      minStock: "10",
      trackInventory: true,
      requiresBeerSelection: false,
      isBeer: false,
      imageUrl: "",
      productType: "INDIVIDUAL",
    });

    setEditingProductId(null);
    setSelectedImageFile(null);
    setImagePreview("");
  };

  const loadProducts = async () => {
    try {
      const response = await api.get("/Products");

      const normalizedProducts = response.data.map((p) => ({
        productId: p.productId ?? p.ProductId,
        name: p.name ?? p.Name,
        description: p.description ?? p.Description,
        category: p.category ?? p.Category,
        price: p.price ?? p.Price,
        stock: p.stock ?? p.Stock ?? 0,
        minStock: p.minStock ?? p.MinStock ?? 0,
        trackInventory: p.trackInventory ?? p.TrackInventory ?? false,
        requiresBeerSelection:
          p.requiresBeerSelection ?? p.RequiresBeerSelection ?? false,
        isBeer: p.isBeer ?? p.IsBeer ?? false,
        inventoryStatus: p.inventoryStatus ?? p.InventoryStatus ?? "NO_TRACK",
        imageUrl: p.imageUrl ?? p.ImageUrl,
        productType: p.productType ?? p.ProductType,
      }));

      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      showToast("No se pudieron cargar los productos.", "error");
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get("/Categories");

      const normalizedCategories = response.data.map((c) => ({
        categoryId: c.categoryId ?? c.CategoryId,
        name: c.name ?? c.Name,
        description: c.description ?? c.Description,
      }));

      setCategoriesList(normalizedCategories);

      if (normalizedCategories.length > 0) {
        setNewProduct((prev) => ({
          ...prev,
          categoryId: prev.categoryId || normalizedCategories[0].categoryId,
        }));
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      showToast("No se pudieron cargar las categorías.", "error");
    }
  };

  const handleNewProductChange = (e) => {
    const { name, value, type, checked } = e.target;

    setNewProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setSelectedImageFile(null);
      setImagePreview("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Formato no permitido. Usa JPG, PNG o WEBP.", "warning");
      e.target.value = "";
      setSelectedImageFile(null);
      setImagePreview("");
      return;
    }

    setSelectedImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadProductImage = async () => {
    if (!selectedImageFile) {
      return newProduct.imageUrl || null;
    }

    const formData = new FormData();
    formData.append("file", selectedImageFile);

    const response = await api.post("/Images/UploadProductImage", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.imageUrl ?? response.data.ImageUrl;
  };

  const saveProduct = async () => {
    if (!newProduct.name.trim()) {
      showToast("El nombre del producto es obligatorio.", "warning");
      return;
    }

    if (Number(newProduct.price) <= 0) {
      showToast("El precio debe ser mayor a cero.", "warning");
      return;
    }

    if (!newProduct.categoryId) {
      showToast("Selecciona una categoría válida.", "warning");
      return;
    }

    let uploadedImageUrl = newProduct.imageUrl || null;

    try {
      uploadedImageUrl = await uploadProductImage();
    } catch (error) {
      console.error("Error al subir imagen:", error);
      showToast("No se pudo subir la imagen del producto.", "error");
      return;
    }

   const productData = {
      name: newProduct.name,
      description: newProduct.description,
      categoryId: Number(newProduct.categoryId),
      price: Number(newProduct.price),
      stock: newProduct.trackInventory ? Number(newProduct.stock || 0) : 0,
      minStock: newProduct.trackInventory
        ? Number(newProduct.minStock || 0)
        : 0,
      trackInventory: Boolean(newProduct.trackInventory),
      requiresBeerSelection: Boolean(newProduct.requiresBeerSelection),
      isBeer: Boolean(newProduct.isBeer),
      imageUrl: uploadedImageUrl,
      productType: newProduct.productType,
    };

    try {
      await api.post("/Products", productData);

      showToast("Producto agregado correctamente.", "success");

      resetProductForm();
      setShowProductForm(false);
      loadProducts();
    } catch (error) {
      console.error("Error al agregar producto:", error);

      if (error.response && error.response.data) {
        showToast(error.response.data.message || error.response.data, "error");
      } else {
        showToast("No se pudo agregar el producto.", "error");
      }
    }
  };

  const startEditProduct = (product) => {
    const category = categoriesList.find((c) => c.name === product.category);

    setEditingProductId(product.productId);

   setNewProduct({
      name: product.name || "",
      description: product.description || "",
      categoryId: category ? category.categoryId : "",
      price: product.price || "",
      stock: product.stock ?? "",
      minStock: product.minStock ?? "10",
      trackInventory: product.trackInventory ?? true,
      requiresBeerSelection: product.requiresBeerSelection ?? false,
      isBeer: product.isBeer ?? false,
      imageUrl: product.imageUrl || "",
      productType: product.productType || "INDIVIDUAL",
    });

    setSelectedImageFile(null);
    setImagePreview(product.imageUrl || "");
    setShowProductForm(true);
  };

  const updateProduct = async () => {
    if (!editingProductId) {
      showToast("No hay producto seleccionado para actualizar.", "warning");
      return;
    }

    if (!newProduct.name.trim()) {
      showToast("El nombre del producto es obligatorio.", "warning");
      return;
    }

    if (Number(newProduct.price) <= 0) {
      showToast("El precio debe ser mayor a cero.", "warning");
      return;
    }

    if (!newProduct.categoryId) {
      showToast("Selecciona una categoría válida.", "warning");
      return;
    }

    let uploadedImageUrl = newProduct.imageUrl || null;

    try {
      uploadedImageUrl = await uploadProductImage();
    } catch (error) {
      console.error("Error al subir imagen:", error);
      showToast("No se pudo subir la imagen del producto.", "error");
      return;
    }
    const productData = {
      name: newProduct.name,
      description: newProduct.description,
      categoryId: Number(newProduct.categoryId),
      price: Number(newProduct.price),
      stock: newProduct.trackInventory ? Number(newProduct.stock || 0) : 0,
      minStock: newProduct.trackInventory
        ? Number(newProduct.minStock || 0)
        : 0,
      trackInventory: Boolean(newProduct.trackInventory),
      requiresBeerSelection: Boolean(newProduct.requiresBeerSelection),
      isBeer: Boolean(newProduct.isBeer),
      imageUrl: uploadedImageUrl,
      productType: newProduct.productType,
    };
    

    try {
      await api.put(`/Products/${editingProductId}`, productData);

      showToast("Producto actualizado correctamente.", "success");

      resetProductForm();
      setShowProductForm(false);
      loadProducts();
    } catch (error) {
      console.error("Error al actualizar producto:", error);

      if (error.response && error.response.data) {
        showToast(error.response.data.message || error.response.data, "error");
      } else {
        showToast("No se pudo actualizar el producto.", "error");
      }
    }
  };

  const openConfirmModal = ({ title, message, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  };

  const handleConfirmAction = async () => {
    if (confirmModal.onConfirm) {
      await confirmModal.onConfirm();
    }

    closeConfirmModal();
  };

  const deleteProduct = async (product) => {
    openConfirmModal({
      title: "Desactivar producto",
      message: `¿Deseas desactivar el producto "${product.name}"? Esta acción lo ocultará del punto de venta.`,
      onConfirm: async () => {
        try {
          await api.delete(`/Products/${product.productId}`);

          showToast("Producto desactivado correctamente.", "success");
          loadProducts();
        } catch (error) {
          console.error("Error al desactivar producto:", error);

          if (error.response && error.response.data) {
            showToast(
              error.response.data.message || error.response.data,
              "error"
            );
          } else {
            showToast("No se pudo desactivar el producto.", "error");
          }
        }
      },
    });
  };

  return (
    <div className="page-card">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>{confirmModal.title}</h2>
            <p>{confirmModal.message}</p>

            <div className="modal-actions">
              <button className="modal-cancel-button" onClick={closeConfirmModal}>
                Cancelar
              </button>

              <button
                className="modal-danger-button"
                onClick={handleConfirmAction}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pos-header">
        <h1>Administración de productos</h1>

        <button
          className="add-product-button"
          onClick={() => {
            if (showProductForm) {
              resetProductForm();
              setShowProductForm(false);
            } else {
              resetProductForm();
              setShowProductForm(true);
            }
          }}
        >
          {showProductForm ? "Cerrar" : "+ Producto"}
        </button>
      </div>

      {showProductForm && (
        <div className="product-form">
          <h2>{editingProductId ? "Editar producto" : "Agregar producto"}</h2>

          <div className="form-grid">
            <div>
              <label>Nombre</label>
              <input
                type="text"
                name="name"
                value={newProduct.name}
                onChange={handleNewProductChange}
                placeholder="Ej. Agua embotellada"
              />
            </div>

            <div>
              <label>Precio</label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={handleNewProductChange}
                placeholder="Ej. 25.00"
              />
            </div>

            <div>
              <label>Stock inicial / actual</label>
              <input
                type="number"
                name="stock"
                min="0"
                step="1"
                value={newProduct.stock}
                onChange={handleNewProductChange}
                placeholder="Ej. 20"
                disabled={!newProduct.trackInventory}
              />
            </div>

            <div>
              <label>Stock mínimo</label>
              <input
                type="number"
                name="minStock"
                min="0"
                step="1"
                value={newProduct.minStock}
                onChange={handleNewProductChange}
                placeholder="Ej. 10"
                disabled={!newProduct.trackInventory}
              />
            </div>

            <div>
              <label>Categoría</label>
              <select
                name="categoryId"
                value={newProduct.categoryId}
                onChange={handleNewProductChange}
              >
                {categoriesList.length === 0 ? (
                  <option value="">Sin categorías disponibles</option>
                ) : (
                  categoriesList.map((category) => (
                    <option
                      key={category.categoryId}
                      value={category.categoryId}
                    >
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label>Tipo de producto</label>
              <select
                name="productType"
                value={newProduct.productType}
                onChange={handleNewProductChange}
              >
                <option value="PREPARED_DRINK">Bebida preparada</option>
                <option value="BOTTLED_DRINK">Bebida embotellada</option>
                <option value="INDIVIDUAL">Producto individual</option>
                <option value="SERVICE">Servicio</option>
              </select>
            </div>

            <div className="full-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="trackInventory"
                  checked={newProduct.trackInventory}
                  onChange={handleNewProductChange}
                />
                Controlar inventario de este producto
              </label>
            </div>
            <div className="full-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="isBeer"
                  checked={newProduct.isBeer}
                  onChange={handleNewProductChange}
                />
                Este producto es una cerveza
              </label>
            </div>

            <div className="full-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="requiresBeerSelection"
                  checked={newProduct.requiresBeerSelection}
                  onChange={handleNewProductChange}
                />
                Este producto requiere seleccionar cerveza al vender
              </label>
            </div>

            <div className="full-field">
              <label>Descripción</label>
              <textarea
                name="description"
                value={newProduct.description}
                onChange={handleNewProductChange}
                placeholder="Descripción breve del producto"
              />
            </div>

            <div className="full-field">
              <label>Imagen del producto</label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />

              {imagePreview && (
                <div className="image-preview-box">
                  <img src={imagePreview} alt="Vista previa del producto" />
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              className="save-product-button"
              onClick={editingProductId ? updateProduct : saveProduct}
            >
              {editingProductId ? "Actualizar producto" : "Guardar producto"}
            </button>

            <button
              className="cancel-product-button"
              onClick={() => {
                resetProductForm();
                setShowProductForm(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard
            key={product.productId}
            product={product}
            onEdit={startEditProduct}
            onDelete={deleteProduct}
          />
        ))}
      </div>

      {products.length === 0 && (
        <p>No hay productos disponibles para administrar.</p>
      )}
    </div>
  );
}

export default ProductsPage;