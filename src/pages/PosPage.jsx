import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import TablesSidebar from "../components/TablesSidebar";

function PosPage() {
  const [products, setProducts] = useState([]);
  const [beers, setBeers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [cart, setCart] = useState([]);

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [cashReceived, setCashReceived] = useState("");

  const [beerModal, setBeerModal] = useState({
    isOpen: false,
    product: null,
  });

  const [drinkSizeModal, setDrinkSizeModal] = useState({
    isOpen: false,
    product: null,
    sizes: [],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCart();

    const interval = setInterval(() => {
      loadCart();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  }, [cart]);

  const selectedPaymentMethod = paymentMethods.find(
    (method) =>
      Number(method.paymentMethodId) === Number(selectedPaymentMethodId)
  );

  const selectedPaymentName = selectedPaymentMethod?.name?.toLowerCase() || "";

  const isCashPayment = selectedPaymentName.includes("efectivo");

  const isCardOrTransferPayment =
    selectedPaymentName.includes("tarjeta") ||
    selectedPaymentName.includes("transferencia");

  const cashReceivedNumber = Number(cashReceived || 0);
  const cashChange = cashReceivedNumber - cartTotal;

  const loadInitialData = async () => {
    await Promise.all([
      loadProducts(),
      loadBeers(),
      loadPaymentMethods(),
      loadCart(),
    ]);
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const normalizeApiError = (error, fallbackMessage) => {
    if (error.response && error.response.data) {
      return (
        error.response.data.message ||
        error.response.data.Message ||
        error.response.data
      );
    }

    return fallbackMessage;
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    const baseUrl = api.defaults.baseURL.replace("/api", "");

    return `${baseUrl}${imageUrl}`;
  };

  const isDrinkSizeProduct = (product) => {
    return (
      product.productType === "PREPARED_DRINK" ||
      product.productType === "LIQUOR_DRINK" ||
      product.productType === "SHOT"
    );
  };

  const normalizeCartItem = (item) => {
    const activeCartItemId = item.activeCartItemId ?? item.ActiveCartItemId;

    return {
      activeCartItemId,
      cartItemId: String(activeCartItemId),

      productId: item.productId ?? item.ProductId ?? null,

      productDrinkSizeId:
        item.productDrinkSizeId ?? item.ProductDrinkSizeId ?? null,
      drinkSizeName: item.drinkSizeName ?? item.DrinkSizeName ?? null,
      ouncesUsed: item.ouncesUsed ?? item.OuncesUsed ?? null,

      name: item.name ?? item.Name ?? "Producto",
      quantity: item.quantity ?? item.Quantity ?? 1,
      unitPrice: item.unitPrice ?? item.UnitPrice ?? 0,
      subtotal: item.subtotal ?? item.Subtotal ?? 0,
      productType: item.productType ?? item.ProductType ?? "INDIVIDUAL",

      selectedBeerProductId:
        item.selectedBeerProductId ?? item.SelectedBeerProductId ?? null,
      selectedBottleProductId:
        item.selectedBottleProductId ?? item.SelectedBottleProductId ?? null,

      totalMinutes: item.totalMinutes ?? item.TotalMinutes ?? null,
    };
  };

  const loadCart = async () => {
    try {
      const response = await api.get("/ActiveCart");

      const items = response.data.items ?? response.data.Items ?? [];

      const normalizedCart = items.map(normalizeCartItem);

      setCart(normalizedCart);

      return normalizedCart;
    } catch (error) {
      console.error("Error al cargar carrito:", error);
      return [];
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get("/Products");

      const normalizedProducts = response.data.map((product) => ({
        productId: product.productId ?? product.ProductId,
        name: product.name ?? product.Name,
        description: product.description ?? product.Description,
        category: product.category ?? product.Category ?? "Sin categoría",
        price: product.price ?? product.Price ?? 0,
        stock: product.stock ?? product.Stock ?? 0,
        baseStock: product.baseStock ?? product.BaseStock ?? null,
        minStock: product.minStock ?? product.MinStock ?? 0,
        trackInventory:
          product.trackInventory ?? product.TrackInventory ?? false,
        requiresBeerSelection:
          product.requiresBeerSelection ??
          product.RequiresBeerSelection ??
          false,
        isBeer: product.isBeer ?? product.IsBeer ?? false,
        inventoryStatus:
          product.inventoryStatus ?? product.InventoryStatus ?? "NO_TRACK",
        imageUrl: getImageUrl(product.imageUrl ?? product.ImageUrl ?? ""),
        productType:
          product.productType ?? product.ProductType ?? "BOTTLED_DRINK",
        inventorySourceProductId:
          product.inventorySourceProductId ??
          product.InventorySourceProductId ??
          null,
        inventoryMultiplier:
          product.inventoryMultiplier ?? product.InventoryMultiplier ?? 1,
        servingVolumeMl:
          product.servingVolumeMl ?? product.ServingVolumeMl ?? null,
        bottleVolumeMl:
          product.bottleVolumeMl ?? product.BottleVolumeMl ?? null,
      }));

      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      showToast("No se pudieron cargar los productos.", "error");
    }
  };

  const loadBeers = async () => {
    try {
      const response = await api.get("/Products/Beers");

      const normalizedBeers = response.data.map((beer) => ({
        productId: beer.productId ?? beer.ProductId,
        name: beer.name ?? beer.Name,
        description: beer.description ?? beer.Description,
        category: beer.category ?? beer.Category ?? "Cervezas",
        price: beer.price ?? beer.Price ?? 0,
        stock: beer.stock ?? beer.Stock ?? 0,
        minStock: beer.minStock ?? beer.MinStock ?? 0,
        trackInventory: beer.trackInventory ?? beer.TrackInventory ?? true,
        isBeer: beer.isBeer ?? beer.IsBeer ?? true,
        imageUrl: getImageUrl(beer.imageUrl ?? beer.ImageUrl ?? ""),
        productType: beer.productType ?? beer.ProductType ?? "BOTTLED_DRINK",
      }));

      setBeers(normalizedBeers);
    } catch (error) {
      console.error("Error al cargar cervezas:", error);
      showToast("No se pudieron cargar las cervezas.", "error");
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await api.get("/PaymentMethods");

      const normalizedPaymentMethods = response.data.map((method) => ({
        paymentMethodId: method.paymentMethodId ?? method.PaymentMethodId,
        name: method.name ?? method.Name,
      }));

      setPaymentMethods(normalizedPaymentMethods);

      if (normalizedPaymentMethods.length > 0) {
        setSelectedPaymentMethodId((prev) =>
          prev || normalizedPaymentMethods[0].paymentMethodId
        );
      }
    } catch (error) {
      console.error("Error al cargar métodos de pago:", error);
      showToast("No se pudieron cargar los métodos de pago.", "error");
    }
  };

  const openBeerModal = (product) => {
    setBeerModal({
      isOpen: true,
      product,
    });
  };

  const closeBeerModal = () => {
    setBeerModal({
      isOpen: false,
      product: null,
    });
  };

  const openDrinkSizeModal = async (product) => {
    try {
      const response = await api.get(`/Products/${product.productId}/DrinkSizes`);

      const sizes = response.data.map((size) => ({
        productDrinkSizeId:
          size.productDrinkSizeId ?? size.ProductDrinkSizeId,
        productId: size.productId ?? size.ProductId,
        sizeName: size.sizeName ?? size.SizeName,
        ouncesUsed: size.ouncesUsed ?? size.OuncesUsed,
        price: size.price ?? size.Price,
        imageUrl: getImageUrl(size.imageUrl ?? size.ImageUrl ?? ""),
        inventorySourceProductId:
          size.inventorySourceProductId ??
          size.InventorySourceProductId ??
          null,
        inventorySourceProductName:
          size.inventorySourceProductName ??
          size.InventorySourceProductName ??
          "",
      }));

      if (sizes.length === 0) {
        showToast("Este producto no tiene tamaños configurados.", "warning");
        return;
      }

      setDrinkSizeModal({
        isOpen: true,
        product,
        sizes,
      });
    } catch (error) {
      console.error("Error al cargar tamaños:", error);
      showToast("No se pudieron cargar los tamaños.", "error");
    }
  };

  const closeDrinkSizeModal = () => {
    setDrinkSizeModal({
      isOpen: false,
      product: null,
      sizes: [],
    });
  };

  const getRequiredBeerQuantity = (product) => {
    if (!product) return 1;

    if (product.productType === "BEER_BUCKET") {
      return Number(product.inventoryMultiplier || 10);
    }

    return Number(product.inventoryMultiplier || 1);
  };

  const addPreparedDrinkToCart = async (selectedBeer) => {
    const product = beerModal.product;

    if (!product) {
      showToast("No se encontró el producto seleccionado.", "error");
      return;
    }

    if (!selectedBeer) {
      showToast("Selecciona una cerveza.", "warning");
      return;
    }

    const requiredQuantity = getRequiredBeerQuantity(product);

    if (Number(selectedBeer.stock || 0) < requiredQuantity) {
      showToast(
        `No hay suficiente stock de ${selectedBeer.name}. Se requieren ${requiredQuantity}.`,
        "warning"
      );
      return;
    }

    try {
      const item = {
        productId: product.productId,
        name: `${product.name} - ${selectedBeer.name}`,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        subtotal: Number(product.price || 0),
        productType: product.productType,

        selectedBeerProductId: selectedBeer.productId,
        selectedBottleProductId: null,

        productDrinkSizeId: null,
        drinkSizeName: null,
        ouncesUsed: null,

        totalMinutes: null,
      };

      await api.post("/ActiveCart/Items", item);
      await loadCart();

      closeBeerModal();
      showToast("Producto agregado al carrito.", "success");
    } catch (error) {
      console.error("Error al agregar bebida con cerveza:", error);
      showToast("No se pudo agregar el producto al carrito.", "error");
    }
  };

  const handleDrinkSizeSelection = async (selectedSize) => {
    const product = drinkSizeModal.product;

    if (!product) {
      showToast("No se encontró el producto seleccionado.", "error");
      return;
    }

    if (!selectedSize.inventorySourceProductId) {
      showToast(
        "Este tamaño no tiene botella configurada. Corrige el producto en administración.",
        "warning"
      );
      return;
    }

    const productWithSize = {
      ...product,
      selectedDrinkSizeId: selectedSize.productDrinkSizeId,
      selectedDrinkSizeName: selectedSize.sizeName,
      ouncesUsed: Number(selectedSize.ouncesUsed || 0),
      price: Number(selectedSize.price || 0),
      drinkSizeImageUrl: selectedSize.imageUrl || "",
      inventorySourceProductId: selectedSize.inventorySourceProductId,
      inventorySourceProductName: selectedSize.inventorySourceProductName || "",
    };

    closeDrinkSizeModal();

    await addDrinkWithSizeToCart(productWithSize);
  };

  const addDrinkWithSizeToCart = async (product) => {
    if (!product.selectedDrinkSizeId) {
      showToast("Selecciona un tamaño.", "warning");
      return;
    }

    if (!product.inventorySourceProductId) {
      showToast(
        "Este tamaño no tiene botella configurada. Revisa el producto.",
        "warning"
      );
      return;
    }

    try {
      const item = {
        productId: product.productId,

        productDrinkSizeId: product.selectedDrinkSizeId,
        drinkSizeName: product.selectedDrinkSizeName,
        ouncesUsed: Number(product.ouncesUsed || 0),

        name: `${product.name} - ${product.selectedDrinkSizeName}`,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        subtotal: Number(product.price || 0),
        productType: product.productType,

        selectedBeerProductId: null,

        /*
          La botella ya viene configurada desde el tamaño.
          En POS ya no se selecciona manualmente.
        */
        selectedBottleProductId: product.inventorySourceProductId,

        totalMinutes: null,
      };

      await api.post("/ActiveCart/Items", item);
      await loadCart();

      showToast("Producto agregado al carrito.", "success");
    } catch (error) {
      console.error("Error al agregar bebida con tamaño:", error);
      showToast("No se pudo agregar la bebida al carrito.", "error");
    }
  };

  const addToCart = async (product) => {
    if (isDrinkSizeProduct(product)) {
      openDrinkSizeModal(product);
      return;
    }

    if (product.requiresBeerSelection || product.productType === "BEER_BUCKET") {
      openBeerModal(product);
      return;
    }

    if (product.trackInventory && Number(product.stock || 0) <= 0) {
      showToast("Producto agotado.", "warning");
      return;
    }

    try {
      const item = {
        productId: product.productId,
        name: product.name,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        subtotal: Number(product.price || 0),
        productType: product.productType,

        selectedBeerProductId: null,
        selectedBottleProductId: null,

        productDrinkSizeId: null,
        drinkSizeName: null,
        ouncesUsed: null,

        totalMinutes: null,
      };

      await api.post("/ActiveCart/Items", item);
      await loadCart();

      showToast("Producto agregado al carrito.", "success");
    } catch (error) {
      console.error("Error al agregar producto al carrito:", error);
      showToast("No se pudo agregar el producto al carrito.", "error");
    }
  };

  const increaseQuantity = async (cartItemId) => {
    const item = cart.find((cartItem) => cartItem.cartItemId === cartItemId);

    if (!item) return;

    try {
      await api.put(`/ActiveCart/Items/${item.activeCartItemId}`, {
        quantity: Number(item.quantity || 0) + 1,
      });

      await loadCart();
    } catch (error) {
      console.error("Error al aumentar cantidad:", error);
      showToast("No se pudo actualizar la cantidad.", "error");
    }
  };

  const decreaseQuantity = async (cartItemId) => {
    const item = cart.find((cartItem) => cartItem.cartItemId === cartItemId);

    if (!item) return;

    try {
      const newQuantity = Number(item.quantity || 0) - 1;

      if (newQuantity <= 0) {
        await api.delete(`/ActiveCart/Items/${item.activeCartItemId}`);
      } else {
        await api.put(`/ActiveCart/Items/${item.activeCartItemId}`, {
          quantity: newQuantity,
        });
      }

      await loadCart();
    } catch (error) {
      console.error("Error al disminuir cantidad:", error);
      showToast("No se pudo actualizar la cantidad.", "error");
    }
  };

  const removeFromCart = async (cartItemId) => {
    const item = cart.find((cartItem) => cartItem.cartItemId === cartItemId);

    if (!item) return;

    try {
      await api.delete(`/ActiveCart/Items/${item.activeCartItemId}`);
      await loadCart();

      showToast("Producto eliminado del carrito.", "success");
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      showToast("No se pudo eliminar el producto.", "error");
    }
  };

  const clearCart = async () => {
    try {
      await api.delete("/ActiveCart/Clear");
      await loadCart();

      setCashReceived("");

      showToast("Carrito vaciado correctamente.", "success");
    } catch (error) {
      console.error("Error al vaciar carrito:", error);
      showToast("No se pudo vaciar el carrito.", "error");
    }
  };

  const tableRentalProduct = products.find(
    (product) =>
      product.productType === "SERVICE" &&
      product.name.toLowerCase().includes("mesa")
  );

  const onAddTableCharge = async (tableCharge) => {
    try {
      const unitPrice = Number(
        tableCharge.total ?? tableCharge.unitPrice ?? tableCharge.subtotal ?? 0
      );

      const item = {
        productId:
          tableCharge.productId ??
          tableCharge.ProductId ??
          tableRentalProduct?.productId ??
          null,
        name:
          tableCharge.name ??
          tableCharge.Name ??
          `Mesa ${tableCharge.tableNumber ?? tableCharge.TableNumber ?? ""}`,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice,
        productType: "SERVICE",

        selectedBeerProductId: null,
        selectedBottleProductId: null,

        productDrinkSizeId: null,
        drinkSizeName: null,
        ouncesUsed: null,

        totalMinutes:
          tableCharge.totalMinutes ?? tableCharge.TotalMinutes ?? null,
      };

      await api.post("/ActiveCart/Items", item);
      await loadCart();

      showToast("Mesa agregada al carrito.", "success");
    } catch (error) {
      console.error("Error al agregar mesa al carrito:", error);
      showToast("No se pudo agregar la mesa al carrito.", "error");
    }
  };

  const validateAndCleanCart = async () => {
    await loadProducts();
    await loadBeers();

    const currentCart = await loadCart();

    return currentCart;
  };

  const processSale = async () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío.", "warning");
      return;
    }

    if (!selectedPaymentMethodId) {
      showToast("Selecciona un método de pago.", "warning");
      return;
    }

    if (isCashPayment && cashReceivedNumber < cartTotal) {
      showToast("El efectivo recibido es menor al total.", "warning");
      return;
    }

    try {
      setLoading(true);

      const cleanedCart = await validateAndCleanCart();

      if (cleanedCart.length === 0) {
        showToast("No hay productos disponibles para cobrar.", "warning");
        return;
      }

      const payload = {
        userId: 1,
        paymentMethodId: Number(selectedPaymentMethodId),
        details: cleanedCart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          customUnitPrice: item.unitPrice,

          selectedBeerProductId: item.selectedBeerProductId || null,
          selectedBottleProductId: item.selectedBottleProductId || null,

          productDrinkSizeId: item.productDrinkSizeId || null,
          drinkSizeName: item.drinkSizeName || null,
          ouncesUsed: item.ouncesUsed || null,
        })),
      };

      await api.post("/Sales", payload);

      showToast("Venta registrada correctamente.", "success");

      await clearCart();

      await loadProducts();
      await loadBeers();

      setCashReceived("");
    } catch (error) {
      console.error("Error al registrar venta:", error);
      showToast(
        normalizeApiError(error, "No se pudo registrar la venta."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío.", "warning");
      return;
    }

    if (!selectedPaymentMethodId) {
      showToast("Selecciona un método de pago.", "warning");
      return;
    }

    if (isCardOrTransferPayment) {
      await processSale();
      return;
    }

    await processSale();
  };

  const appendCashValue = (value) => {
    setCashReceived((prev) => {
      if (value === "." && prev.includes(".")) return prev;

      if (prev === "0" && value !== ".") {
        return String(value);
      }

      return `${prev}${value}`;
    });
  };

  const deleteCashValue = () => {
    setCashReceived((prev) => prev.slice(0, -1));
  };

  const clearCashValue = () => {
    setCashReceived("");
  };

  const setExactCash = () => {
    setCashReceived(String(Number(cartTotal).toFixed(2)));
  };

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    if (!normalizedSearch) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        (product.category || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, searchTerm]);

  const categoryPriority = [
    "Cervezas",
    "Bebidas preparadas",
    "Shots",
    "Bebidas embotelladas",
    "Snacks",
    "Cigarros",
    "Servicios",
    "Otros",
    "Sin categoría",
  ];

  const groupedProducts = filteredProducts.reduce((groups, product) => {
    const categoryName = product.category || "Sin categoría";

    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }

    groups[categoryName].push(product);

    return groups;
  }, {});

  const orderedCategoryNames = Object.keys(groupedProducts).sort((a, b) => {
    const indexA = categoryPriority.indexOf(a);
    const indexB = categoryPriority.indexOf(b);

    const priorityA = indexA === -1 ? 999 : indexA;
    const priorityB = indexB === -1 ? 999 : indexB;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.localeCompare(b);
  });

  return (
    <div className="pos-page">
      <header className="pos-logo-bar">
        <img
          className="pos-logo-image"
          src="/nuevo-ejido-logo.jpg"
          alt="Club Deportivo Billar El Nuevo Ejido"
        />
      </header>

      <div className="pos-layout">
        {toast && (
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        )}

        {beerModal.isOpen && (
          <div className="modal-overlay">
            <div className="beer-selector-modal">
              <div className="beer-selector-header">
                <div>
                  <h2>
                    {beerModal.product?.productType === "BEER_BUCKET"
                      ? "Seleccionar cerveza para cubeta"
                      : "Seleccionar cerveza"}
                  </h2>

                  <p>
                    {beerModal.product?.productType === "BEER_BUCKET"
                      ? "La cubeta descontará 10 unidades de la cerveza seleccionada."
                      : "La bebida descontará 1 unidad de la cerveza seleccionada."}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={closeBeerModal}
                >
                  ×
                </button>
              </div>

              {beers.length === 0 ? (
                <p>No hay cervezas disponibles.</p>
              ) : (
                <div className="beer-card-grid">
                  {beers.map((beer) => {
                    const requiredQuantity = getRequiredBeerQuantity(
                      beerModal.product
                    );

                    const hasEnoughStock =
                      Number(beer.stock || 0) >= requiredQuantity;

                    const availableSales = Math.floor(
                      Number(beer.stock || 0) / requiredQuantity
                    );

                    return (
                      <button
                        type="button"
                        className={`beer-select-card ${
                          !hasEnoughStock ? "beer-select-card-disabled" : ""
                        }`}
                        key={beer.productId}
                        disabled={!hasEnoughStock}
                        onClick={() => addPreparedDrinkToCart(beer)}
                      >
                        <div className="beer-select-image">
                          {beer.imageUrl ? (
                            <img src={beer.imageUrl} alt={beer.name} />
                          ) : (
                            <span>Sin imagen</span>
                          )}
                        </div>

                        <div className="beer-select-info">
                          <strong>{beer.name}</strong>
                          <span>Stock: {Number(beer.stock || 0)}</span>
                          <span>Disponible para: {availableSales} venta(s)</span>

                          {!hasEnoughStock && <em>Stock insuficiente</em>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {drinkSizeModal.isOpen && (
          <div className="modal-overlay">
            <div className="beer-selector-modal">
              <div className="beer-selector-header">
                <div>
                  <h2>Seleccionar tamaño</h2>
                  <p>{drinkSizeModal.product?.name}</p>
                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={closeDrinkSizeModal}
                >
                  ×
                </button>
              </div>

              <div className="drink-size-grid">
                {drinkSizeModal.sizes.map((size) => (
                  <button
                    type="button"
                    className="drink-size-card"
                    key={size.productDrinkSizeId}
                    onClick={() => handleDrinkSizeSelection(size)}
                  >
                    <div className="drink-size-card-image">
                      {size.imageUrl ? (
                        <img src={size.imageUrl} alt={size.sizeName} />
                      ) : (
                        <span>Sin imagen</span>
                      )}
                    </div>

                    <strong>{size.sizeName}</strong>
                    <span>{formatCurrency(size.price)}</span>
                    <small>{Number(size.ouncesUsed || 0)} oz</small>

                    {size.inventorySourceProductName && (
                      <small>Botella: {size.inventorySourceProductName}</small>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <TablesSidebar
          onAddTableCharge={onAddTableCharge}
          tableRentalProduct={tableRentalProduct}
          onNotify={showToast}
        />

        <main className="pos-main">
          <div className="pos-header">
            <h1>Punto de venta</h1>

            <input
              type="text"
              className="pos-search"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {orderedCategoryNames.length === 0 ? (
            <p>No hay productos disponibles.</p>
          ) : (
            <div className="category-sections">
              {orderedCategoryNames.map((categoryName) => (
                <section
                  className="product-category-section"
                  key={categoryName}
                >
                  <div className="product-category-header">
                    <h2>{categoryName}</h2>
                    <span>
                      {groupedProducts[categoryName].length} producto(s)
                    </span>
                  </div>

                  <div className="products-grid">
                    {groupedProducts[categoryName].map((product) => (
                      <ProductCard
                        key={product.productId}
                        product={product}
                        onAdd={addToCart}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>

        <aside className="cart-sidebar">
          <h2>Carrito</h2>

          {cart.length === 0 ? (
            <p className="empty-cart-text">No hay productos agregados.</p>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.cartItemId}>
                  <div className="cart-item-header">
                    <strong>{item.name}</strong>

                    <button
                      type="button"
                      className="cart-remove-button"
                      onClick={() => removeFromCart(item.cartItemId)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="cart-item-meta">
                    <span>{formatCurrency(item.unitPrice)}</span>
                    <span>Subtotal: {formatCurrency(item.subtotal)}</span>
                  </div>

                  {item.drinkSizeName && (
                    <div className="cart-item-meta">
                      <span>Tamaño: {item.drinkSizeName}</span>
                      {item.ouncesUsed && (
                        <span>{Number(item.ouncesUsed)} oz</span>
                      )}
                    </div>
                  )}

                  {item.totalMinutes && (
                    <div className="cart-item-meta">
                      <span>Tiempo: {item.totalMinutes} minuto(s)</span>
                    </div>
                  )}

                  <div className="cart-quantity-controls">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.cartItemId)}
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.cartItemId)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-total">
            <span>Total</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>

          <div className="payment-box">
            <label>Método de pago</label>

            <select
              value={selectedPaymentMethodId}
              onChange={(e) => {
                setSelectedPaymentMethodId(e.target.value);
                setCashReceived("");
              }}
            >
              <option value="">Selecciona método</option>

              {paymentMethods.map((method) => (
                <option
                  key={method.paymentMethodId}
                  value={method.paymentMethodId}
                >
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {isCashPayment && (
            <div className="cash-sidebar-box">
              <label>Efectivo recibido</label>

              <input
                type="text"
                inputMode="none"
                className="cash-sidebar-input"
                value={cashReceived}
                readOnly
                placeholder="0.00"
              />

              <div className="cash-sidebar-change">
                <span>Cambio</span>
                <strong className={cashChange < 0 ? "cash-change-negative" : ""}>
                  {formatCurrency(cashChange > 0 ? cashChange : 0)}
                </strong>
              </div>

              {cashReceivedNumber < cartTotal && cart.length > 0 && (
                <p className="cash-warning">
                  Falta {formatCurrency(cartTotal - cashReceivedNumber)}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="checkout-button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
          >
            {loading ? "Procesando..." : "Cobrar"}
          </button>

          {isCashPayment && (
            <div className="pos-numpad-sidebar">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                <button
                  type="button"
                  key={number}
                  onClick={() => appendCashValue(number)}
                >
                  {number}
                </button>
              ))}

              <button type="button" onClick={() => appendCashValue(".")}>
                .
              </button>

              <button type="button" onClick={() => appendCashValue(0)}>
                0
              </button>

              <button type="button" onClick={deleteCashValue}>
                ⌫
              </button>

              <button
                type="button"
                className="numpad-wide"
                onClick={setExactCash}
              >
                Exacto
              </button>

              <button
                type="button"
                className="numpad-wide"
                onClick={clearCashValue}
              >
                Limpiar
              </button>
            </div>
          )}

          <button
            type="button"
            className="clear-cart-button"
            onClick={clearCart}
            disabled={cart.length === 0 || loading}
          >
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
}

export default PosPage;