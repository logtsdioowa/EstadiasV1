import { useEffect, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import Cart from "../components/Cart";

function PosPage() {
  const [products, setProducts] = useState([]);
  const [beers, setBeers] = useState([]);
  const [cart, setCart] = useState([]);

  const [paymentMethodId, setPaymentMethodId] = useState(1);
  const [cashReceived, setCashReceived] = useState("");

  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const [toast, setToast] = useState(null);

  const [beerModal, setBeerModal] = useState({
    isOpen: false,
    product: null,
    selectedBeerProductId: "",
  });

  const userId = 1;

  useEffect(() => {
    loadProducts();
    loadBeers();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const loadProducts = async () => {
    try {
      setApiMessage("Cargando productos...");

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
      setApiMessage("");
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setApiMessage("No se pudieron cargar los productos.");
    }
  };

  const loadBeers = async () => {
    try {
      const response = await api.get("/Products/Beers");

      const normalizedBeers = response.data.map((b) => ({
        productId: b.productId ?? b.ProductId,
        name: b.name ?? b.Name,
        price: b.price ?? b.Price,
        stock: b.stock ?? b.Stock ?? 0,
        minStock: b.minStock ?? b.MinStock ?? 0,
        imageUrl: b.imageUrl ?? b.ImageUrl,
      }));

      setBeers(normalizedBeers);
    } catch (error) {
      console.error("Error al cargar cervezas:", error);
      showToast("No se pudieron cargar las cervezas disponibles.", "error");
    }
  };

  const categories = [
    "Todos",
    ...new Set(products.map((product) => product.category || "Sin categoría")),
  ];

  const filteredProducts =
    selectedCategory === "Todos"
      ? products
      : products.filter((product) => product.category === selectedCategory);

  const openBeerModal = (product) => {
    const availableBeers = beers.filter((beer) => Number(beer.stock || 0) > 0);

    if (availableBeers.length === 0) {
      showToast(
        "No hay cervezas disponibles para preparar esta bebida.",
        "warning"
      );
      return;
    }

    setBeerModal({
      isOpen: true,
      product,
      selectedBeerProductId: String(availableBeers[0].productId),
    });
  };

  const closeBeerModal = () => {
    setBeerModal({
      isOpen: false,
      product: null,
      selectedBeerProductId: "",
    });
  };

  const handleBeerSelectionChange = (e) => {
    setBeerModal((prev) => ({
      ...prev,
      selectedBeerProductId: e.target.value,
    }));
  };

  const confirmBeerSelection = () => {
    if (!beerModal.product) {
      showToast("No hay producto seleccionado.", "warning");
      return;
    }

    if (!beerModal.selectedBeerProductId) {
      showToast("Selecciona una cerveza.", "warning");
      return;
    }

    const selectedBeer = beers.find(
      (beer) => beer.productId === Number(beerModal.selectedBeerProductId)
    );

    if (!selectedBeer) {
      showToast("La cerveza seleccionada no es válida.", "warning");
      return;
    }

    if (Number(selectedBeer.stock || 0) <= 0) {
      showToast(`No hay stock disponible de ${selectedBeer.name}.`, "warning");
      return;
    }

    addPreparedDrinkToCart(beerModal.product, selectedBeer);
    closeBeerModal();
  };

  const addToCart = (product) => {
    if (product.requiresBeerSelection) {
      openBeerModal(product);
      return;
    }

    addNormalProductToCart(product);
  };

  const addNormalProductToCart = (product) => {
    const productId = product.productId;
    const price = Number(product.price || 0);
    const stock = Number(product.stock || 0);

    if (product.trackInventory && stock <= 0) {
      showToast("Este producto está agotado.", "warning");
      return;
    }

    setCart((prevCart) => {
      const existingProduct = prevCart.find(
        (item) => item.productId === productId && !item.selectedBeerProductId
      );

      if (existingProduct) {
        const newQuantity = existingProduct.quantity + 1;

        if (product.trackInventory && newQuantity > stock) {
          showToast(`No hay suficiente stock. Disponible: ${stock}`, "warning");
          return prevCart;
        }

        return prevCart.map((item) =>
          item.productId === productId && !item.selectedBeerProductId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * item.unitPrice,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          productId,
          name: product.name,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
          trackInventory: product.trackInventory,
          stock,
          requiresBeerSelection: false,
          selectedBeerProductId: null,
          selectedBeerName: null,
        },
      ];
    });
  };

  const addPreparedDrinkToCart = (product, selectedBeer) => {
    const productId = product.productId;
    const selectedBeerProductId = selectedBeer.productId;
    const price = Number(product.price || 0);
    const beerStock = Number(selectedBeer.stock || 0);

    setCart((prevCart) => {
      const existingProduct = prevCart.find(
        (item) =>
          item.productId === productId &&
          item.selectedBeerProductId === selectedBeerProductId
      );

      if (existingProduct) {
        const newQuantity = existingProduct.quantity + 1;

        if (newQuantity > beerStock) {
          showToast(
            `No hay suficiente stock de ${selectedBeer.name}. Disponible: ${beerStock}`,
            "warning"
          );
          return prevCart;
        }

        return prevCart.map((item) =>
          item.productId === productId &&
          item.selectedBeerProductId === selectedBeerProductId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * item.unitPrice,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          productId,
          name: product.name,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
          trackInventory: false,
          stock: beerStock,
          requiresBeerSelection: true,
          selectedBeerProductId,
          selectedBeerName: selectedBeer.name,
        },
      ];
    });
  };

  const increaseQuantity = (cartIndex) => {
    setCart((prevCart) =>
      prevCart.map((item, index) => {
        if (index !== cartIndex) return item;

        const newQuantity = item.quantity + 1;

        if (item.trackInventory && newQuantity > Number(item.stock || 0)) {
          showToast("No hay suficiente stock disponible.", "warning");
          return item;
        }

        if (
          item.requiresBeerSelection &&
          newQuantity > Number(item.stock || 0)
        ) {
          showToast(
            `No hay suficiente stock de ${item.selectedBeerName}. Disponible: ${item.stock}`,
            "warning"
          );
          return item;
        }

        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * item.unitPrice,
        };
      })
    );
  };

  const decreaseQuantity = (cartIndex) => {
    setCart((prevCart) =>
      prevCart
        .map((item, index) =>
          index === cartIndex
            ? {
                ...item,
                quantity: item.quantity - 1,
                subtotal: (item.quantity - 1) * item.unitPrice,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (cartIndex) => {
    setCart((prevCart) => prevCart.filter((_, index) => index !== cartIndex));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  };

  const getCashReceived = () => {
    return Number(cashReceived || 0);
  };

  const getChange = () => {
    return getCashReceived() - getTotal();
  };

  const submitSale = async () => {
    if (cart.length === 0) {
      showToast("Agrega al menos un producto al carrito.", "warning");
      return;
    }

    if (Number(paymentMethodId) === 1 && getCashReceived() < getTotal()) {
      showToast("El efectivo recibido no puede ser menor al total.", "warning");
      return;
    }

    const saleData = {
      userId,
      paymentMethodId: Number(paymentMethodId),
      details: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedBeerProductId: item.selectedBeerProductId || null,
      })),
    };

    try {
      setLoading(true);

      const response = await api.post("/Sales", saleData);

      showToast(
        `Venta registrada correctamente. Folio: ${response.data.saleId}`,
        "success"
      );

      setCart([]);
      setPaymentMethodId(1);
      setCashReceived("");

      loadProducts();
      loadBeers();
    } catch (error) {
      console.error("Error al registrar venta:", error);

      if (error.response && error.response.data) {
        const apiError =
          error.response.data.message ||
          error.response.data.Message ||
          error.response.data;

        showToast(apiError, "error");
      } else {
        showToast("No se pudo registrar la venta.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {beerModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Seleccionar cerveza</h2>

            <p>
              Producto: <strong>{beerModal.product?.name}</strong>
            </p>

            <label>Cerveza base</label>

            <select
              className="modal-input"
              value={beerModal.selectedBeerProductId}
              onChange={handleBeerSelectionChange}
            >
              {beers
                .filter((beer) => Number(beer.stock || 0) > 0)
                .map((beer) => (
                  <option key={beer.productId} value={beer.productId}>
                    {beer.name} — Stock: {beer.stock}
                  </option>
                ))}
            </select>

            <div className="modal-actions">
              <button className="modal-cancel-button" onClick={closeBeerModal}>
                Cancelar
              </button>

              <button
                className="modal-confirm-button"
                onClick={confirmBeerSelection}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="products-section">
        <div className="pos-header">
          <h1>Punto de Venta</h1>
        </div>

        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category}
              className={selectedCategory === category ? "active-category" : ""}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {apiMessage && <p>{apiMessage}</p>}

        {filteredProducts.length === 0 && !apiMessage && (
          <p>No hay productos disponibles para mostrar.</p>
        )}

        <div className="products-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              onAdd={addToCart}
            />
          ))}
        </div>
      </section>

      <aside className="cart-section">
        <Cart
          cart={cart}
          onIncrease={increaseQuantity}
          onDecrease={decreaseQuantity}
          onRemove={removeFromCart}
        />

       <div class="payment-section">
          <label>Método de pago</label>
          <div class="payment-methods">
            <button class="payment-method-btn active" data-method="cash">
              <img src="https://img.icons8.com/fluency/48/cash.png" alt="Efectivo" />
              <span>Efectivo</span>
            </button>
            <button class="payment-method-btn" data-method="card">
              <img src="https://img.icons8.com/fluency/48/visa.png" alt="Tarjeta" />
              <span>Tarjeta</span>
            </button>
            <button class="payment-method-btn" data-method="transfer">
              <img src="https://img.icons8.com/fluency/48/bank-transfer-in-progress.png" alt="Transferencia" />
              <span>Transferencia</span>
            </button>
          </div>
        </div>

        {Number(paymentMethodId) === 1 && (
          <div className="cash-section">
            <label>Efectivo recibido</label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              placeholder="Ingrese efectivo recibido"
            />

            <div className="change-box">
              <p>Total: ${getTotal().toFixed(2)}</p>
              <p>Efectivo recibido: ${getCashReceived().toFixed(2)}</p>

              <h3
                className={
                  getChange() < 0 ? "negative-change" : "positive-change"
                }
              >
                Cambio: ${getChange() > 0 ? getChange().toFixed(2) : "0.00"}
              </h3>
            </div>
          </div>
        )}

        <button
          className="charge-button"
          onClick={submitSale}
          disabled={
            loading ||
            cart.length === 0 ||
            (Number(paymentMethodId) === 1 && getCashReceived() < getTotal())
          }
        >
          {loading ? "Registrando..." : `Cobrar $${getTotal().toFixed(2)}`}
        </button>
      </aside>
    </div>
  );
}

export default PosPage;