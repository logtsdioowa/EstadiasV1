import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import TablesSidebar from "../components/TablesSidebar";

function PosPage() {
  const [products, setProducts] = useState([]);
  const [beers, setBeers] = useState([]);
  const [bottleBases, setBottleBases] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [cart, setCart] = useState([]);

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const [beerModal, setBeerModal] = useState({
    isOpen: false,
    product: null,
  });

  const [bottleModal, setBottleModal] = useState({
    isOpen: false,
    product: null,
  });

  const [confirmSaleModal, setConfirmSaleModal] = useState(false);

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

  const loadInitialData = async () => {
    await Promise.all([
      loadProducts(),
      loadBeers(),
      loadBottleBases(),
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

  const normalizeCartItem = (item) => {
    const activeCartItemId = item.activeCartItemId ?? item.ActiveCartItemId;

    return {
      activeCartItemId,
      cartItemId: String(activeCartItemId),
      productId: item.productId ?? item.ProductId ?? null,
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
    } catch (error) {
      console.error("Error al cargar carrito:", error);
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
        imageUrl: product.imageUrl ?? product.ImageUrl ?? "",
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
        imageUrl: beer.imageUrl ?? beer.ImageUrl ?? "",
        productType: beer.productType ?? beer.ProductType ?? "BOTTLED_DRINK",
      }));

      setBeers(normalizedBeers);
    } catch (error) {
      console.error("Error al cargar cervezas:", error);
      showToast("No se pudieron cargar las cervezas.", "error");
    }
  };

  const loadBottleBases = async () => {
    try {
      const response = await api.get("/Products/BottleBases");

      const normalizedBottleBases = response.data.map((bottle) => ({
        productId: bottle.productId ?? bottle.ProductId,
        name: bottle.name ?? bottle.Name,
        category: bottle.category ?? bottle.Category ?? "Botellas",
        stock: bottle.stock ?? bottle.Stock ?? 0,
        bottleVolumeMl: bottle.bottleVolumeMl ?? bottle.BottleVolumeMl ?? 0,
        imageUrl: bottle.imageUrl ?? bottle.ImageUrl ?? "",
      }));

      setBottleBases(normalizedBottleBases);
    } catch (error) {
      console.error("Error al cargar botellas:", error);
      showToast("No se pudieron cargar las botellas.", "error");
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

  const openBottleModal = (product) => {
    setBottleModal({
      isOpen: true,
      product,
    });
  };

  const closeBottleModal = () => {
    setBottleModal({
      isOpen: false,
      product: null,
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

  const addLiquorProductToCart = async (selectedBottle) => {
    const product = bottleModal.product;

    if (!product) {
      showToast("No se encontró el producto seleccionado.", "error");
      return;
    }

    if (!selectedBottle) {
      showToast("Selecciona una botella.", "warning");
      return;
    }

    const servingVolumeMl = Number(product.servingVolumeMl || 0);
    const bottleVolumeMl = Number(selectedBottle.bottleVolumeMl || 0);
    const bottleStock = Number(selectedBottle.stock || 0);

    if (servingVolumeMl <= 0) {
      showToast("Este producto no tiene mililitros configurados.", "warning");
      return;
    }

    if (bottleVolumeMl <= 0) {
      showToast(
        "La botella seleccionada no tiene mililitros configurados.",
        "warning"
      );
      return;
    }

    const requiredBottleAmount = servingVolumeMl / bottleVolumeMl;

    if (bottleStock < requiredBottleAmount) {
      showToast(`No hay suficiente stock de ${selectedBottle.name}.`, "warning");
      return;
    }

    try {
      const item = {
        productId: product.productId,
        name: `${product.name} - ${selectedBottle.name}`,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        subtotal: Number(product.price || 0),
        productType: product.productType,
        selectedBeerProductId: null,
        selectedBottleProductId: selectedBottle.productId,
        totalMinutes: null,
      };

      await api.post("/ActiveCart/Items", item);
      await loadCart();

      closeBottleModal();
      showToast("Producto agregado al carrito.", "success");
    } catch (error) {
      console.error("Error al agregar producto con botella:", error);
      showToast("No se pudo agregar el producto al carrito.", "error");
    }
  };

  const addToCart = async (product) => {
    if (product.requiresBeerSelection) {
      openBeerModal(product);
      return;
    }

    if (
      product.productType === "SHOT" ||
      product.productType === "LIQUOR_DRINK"
    ) {
      openBottleModal(product);
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
    await loadBottleBases();
    await loadCart();

    return cart;
  };

  const confirmSale = async () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío.", "warning");
      return;
    }

    if (!selectedPaymentMethodId) {
      showToast("Selecciona un método de pago.", "warning");
      return;
    }

    setConfirmSaleModal(true);
  };

  const processSale = async () => {
    try {
      setLoading(true);

      const cleanedCart = await validateAndCleanCart();

      if (cleanedCart.length === 0) {
        showToast("No hay productos disponibles para cobrar.", "warning");
        setConfirmSaleModal(false);
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
        })),
      };

      await api.post("/Sales", payload);

      showToast("Venta registrada correctamente.", "success");

      await clearCart();

      await loadProducts();
      await loadBeers();
      await loadBottleBases();

      setConfirmSaleModal(false);
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

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  }, [cart]);

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

        {confirmSaleModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h2>Confirmar venta</h2>

              <p>
                Total a cobrar: <strong>{formatCurrency(cartTotal)}</strong>
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={() => setConfirmSaleModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="modal-confirm-button"
                  onClick={processSale}
                  disabled={loading}
                >
                  {loading ? "Procesando..." : "Cobrar"}
                </button>
              </div>
            </div>
          </div>
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

        {bottleModal.isOpen && (
          <div className="modal-overlay">
            <div className="beer-selector-modal">
              <div className="beer-selector-header">
                <div>
                  <h2>Seleccionar botella</h2>

                  <p>
                    {bottleModal.product?.name} usa{" "}
                    <strong>
                      {Number(bottleModal.product?.servingVolumeMl || 0)} ml
                    </strong>{" "}
                    por venta.
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={closeBottleModal}
                >
                  ×
                </button>
              </div>

              {bottleBases.length === 0 ? (
                <p>No hay botellas disponibles.</p>
              ) : (
                <div className="beer-card-grid">
                  {bottleBases.map((bottle) => {
                    const servingVolumeMl = Number(
                      bottleModal.product?.servingVolumeMl || 0
                    );

                    const bottleVolumeMl = Number(bottle.bottleVolumeMl || 0);
                    const bottleStock = Number(bottle.stock || 0);

                    const requiredBottleAmount =
                      bottleVolumeMl > 0 ? servingVolumeMl / bottleVolumeMl : 0;

                    const maxSales =
                      requiredBottleAmount > 0
                        ? Math.floor(bottleStock / requiredBottleAmount)
                        : 0;

                    const hasEnoughStock = maxSales > 0;

                    return (
                      <button
                        type="button"
                        className={`beer-select-card ${
                          !hasEnoughStock ? "beer-select-card-disabled" : ""
                        }`}
                        key={bottle.productId}
                        disabled={!hasEnoughStock}
                        onClick={() => addLiquorProductToCart(bottle)}
                      >
                        <div className="beer-select-image">
                          {bottle.imageUrl ? (
                            <img src={bottle.imageUrl} alt={bottle.name} />
                          ) : (
                            <span>Sin imagen</span>
                          )}
                        </div>

                        <div className="beer-select-info">
                          <strong>{bottle.name}</strong>
                          <span>{Number(bottle.bottleVolumeMl || 0)} ml</span>
                          <span>
                            Stock: {Number(bottle.stock || 0).toFixed(2)}{" "}
                            botella(s)
                          </span>
                          <span>Disponible para: {maxSales} venta(s)</span>

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
              onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
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

          <button
            type="button"
            className="checkout-button"
            onClick={confirmSale}
            disabled={cart.length === 0 || loading}
          >
            Cobrar
          </button>

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