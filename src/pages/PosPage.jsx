import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import TablesSidebar from "../components/TablesSidebar";

function PosPage() {
  const [products, setProducts] = useState([]);
  const [beers, setBeers] = useState([]);
  const [bottleBases, setBottleBases] = useState([]);

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("posCart");

    if (!savedCart) return [];

    try {
      return JSON.parse(savedCart);
    } catch (error) {
      console.error("Error al leer carrito guardado:", error);
      return [];
    }
  });

  const [paymentMethodId, setPaymentMethodId] = useState("1");
  const [cashReceived, setCashReceived] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");

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
    localStorage.setItem("posCart", JSON.stringify(cart));
  }, [cart]);

  const loadInitialData = async () => {
    await Promise.all([loadProducts(), loadBeers(), loadBottleBases()]);
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

  const getTotal = () => {
    return cart.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  };

  const getCashReceived = () => {
    return Number(cashReceived || 0);
  };

  const getChange = () => {
    return getCashReceived() - getTotal();
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
    if (product?.productType === "BEER_BUCKET") {
      return Number(product.inventoryMultiplier || 10);
    }

    return Number(product?.inventoryMultiplier || 1);
  };

  const addPreparedDrinkToCart = (selectedBeer) => {
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
    const beerStock = Number(selectedBeer.stock || 0);

    if (beerStock < requiredQuantity) {
      showToast(
        `No hay suficiente stock de ${selectedBeer.name}. Se requieren ${requiredQuantity}.`,
        "warning"
      );
      return;
    }

    const maxQuantity = Math.floor(beerStock / requiredQuantity);
    const cartItemId = `${product.productId}-beer-${selectedBeer.productId}`;

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.cartItemId === cartItemId
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;

        if (newQuantity > maxQuantity) {
          showToast(
            `No hay suficiente stock de ${selectedBeer.name}. Disponible para ${maxQuantity} venta(s).`,
            "warning"
          );

          return prevCart;
        }

        return prevCart.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * Number(item.unitPrice || 0),
                selectedBeerStock: selectedBeer.stock,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          cartItemId,
          productId: product.productId,
          name: `${product.name} - ${selectedBeer.name}`,
          quantity: 1,
          unitPrice: Number(product.price || 0),
          subtotal: Number(product.price || 0),

          trackInventory: false,
          stock: maxQuantity,

          requiresBeerSelection: true,
          selectedBeerProductId: selectedBeer.productId,
          selectedBeerName: selectedBeer.name,
          selectedBeerStock: selectedBeer.stock,

          selectedBottleProductId: null,
          selectedBottleName: null,

          productType: product.productType,
          inventoryMultiplier: requiredQuantity,
        },
      ];
    });

    closeBeerModal();
    showToast("Producto agregado al carrito.", "success");
  };

  const addLiquorProductToCart = (selectedBottle) => {
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

    const maxQuantity = Math.floor(bottleStock / requiredBottleAmount);
    const cartItemId = `${product.productId}-bottle-${selectedBottle.productId}`;

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.cartItemId === cartItemId
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;

        if (newQuantity > maxQuantity) {
          showToast(
            `No hay suficiente stock de ${selectedBottle.name}. Disponible para ${maxQuantity} venta(s).`,
            "warning"
          );

          return prevCart;
        }

        return prevCart.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * Number(item.unitPrice || 0),
                selectedBottleStock: selectedBottle.stock,
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          cartItemId,
          productId: product.productId,
          name: `${product.name} - ${selectedBottle.name}`,
          quantity: 1,
          unitPrice: Number(product.price || 0),
          subtotal: Number(product.price || 0),

          trackInventory: false,
          stock: maxQuantity,

          requiresBeerSelection: false,
          selectedBeerProductId: null,
          selectedBeerName: null,

          selectedBottleProductId: selectedBottle.productId,
          selectedBottleName: selectedBottle.name,
          selectedBottleStock: selectedBottle.stock,

          productType: product.productType,
          servingVolumeMl,
          bottleVolumeMl,
          bottleRequiredAmount: requiredBottleAmount,
        },
      ];
    });

    closeBottleModal();
    showToast("Producto agregado al carrito.", "success");
  };

  const addToCart = (product) => {
    if (product.requiresBeerSelection) {
      openBeerModal(product);
      return;
    }

    if (product.productType === "SHOT" || product.productType === "LIQUOR_DRINK") {
      openBottleModal(product);
      return;
    }

    if (product.trackInventory && Number(product.stock || 0) <= 0) {
      showToast("Producto agotado.", "warning");
      return;
    }

    const cartItemId = String(product.productId);

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.cartItemId === cartItemId
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;

        if (product.trackInventory && newQuantity > Number(product.stock || 0)) {
          showToast("No hay suficiente stock disponible.", "warning");
          return prevCart;
        }

        return prevCart.map((item) =>
          item.cartItemId === cartItemId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * Number(item.unitPrice || 0),
              }
            : item
        );
      }

      return [
        ...prevCart,
        {
          cartItemId,
          productId: product.productId,
          name: product.name,
          quantity: 1,
          unitPrice: Number(product.price || 0),
          subtotal: Number(product.price || 0),

          trackInventory: product.trackInventory,
          stock: product.stock,

          requiresBeerSelection: false,
          selectedBeerProductId: null,
          selectedBeerName: null,

          selectedBottleProductId: null,
          selectedBottleName: null,

          productType: product.productType,
          inventoryMultiplier: product.inventoryMultiplier || 1,
        },
      ];
    });

    showToast("Producto agregado al carrito.", "success");
  };

  const increaseQuantity = (cartItemId) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cartItemId !== cartItemId) return item;

        const newQuantity = item.quantity + 1;

        if (item.selectedBeerProductId) {
          const selectedBeer = beers.find(
            (beer) =>
              Number(beer.productId) === Number(item.selectedBeerProductId)
          );

          if (!selectedBeer) {
            showToast("No se encontró la cerveza seleccionada.", "warning");
            return item;
          }

          const requiredQuantity = Number(item.inventoryMultiplier || 1);
          const maxQuantity = Math.floor(
            Number(selectedBeer.stock || 0) / requiredQuantity
          );

          if (newQuantity > maxQuantity) {
            showToast(
              `No hay suficiente stock de ${item.selectedBeerName}. Disponible para ${maxQuantity} venta(s).`,
              "warning"
            );

            return item;
          }
        } else if (item.selectedBottleProductId) {
          const selectedBottle = bottleBases.find(
            (bottle) =>
              Number(bottle.productId) === Number(item.selectedBottleProductId)
          );

          if (!selectedBottle) {
            showToast("No se encontró la botella seleccionada.", "warning");
            return item;
          }

          const servingVolumeMl = Number(item.servingVolumeMl || 0);
          const bottleVolumeMl = Number(selectedBottle.bottleVolumeMl || 0);
          const bottleStock = Number(selectedBottle.stock || 0);

          const requiredBottleAmount =
            bottleVolumeMl > 0 ? servingVolumeMl / bottleVolumeMl : 0;

          const maxQuantity =
            requiredBottleAmount > 0
              ? Math.floor(bottleStock / requiredBottleAmount)
              : 0;

          if (newQuantity > maxQuantity) {
            showToast(
              `No hay suficiente stock de ${item.selectedBottleName}. Disponible para ${maxQuantity} venta(s).`,
              "warning"
            );

            return item;
          }
        } else if (item.trackInventory && newQuantity > Number(item.stock || 0)) {
          showToast("No hay suficiente stock disponible.", "warning");
          return item;
        }

        return {
          ...item,
          quantity: newQuantity,
          subtotal: newQuantity * Number(item.unitPrice || 0),
        };
      })
    );
  };

  const decreaseQuantity = (cartItemId) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;

          const newQuantity = item.quantity - 1;

          if (newQuantity <= 0) return null;

          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * Number(item.unitPrice || 0),
          };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (cartItemId) => {
    const itemToRemove = cart.find((item) => item.cartItemId === cartItemId);

    if (itemToRemove?.tableId && window.resetPoolTable) {
      window.resetPoolTable(itemToRemove.tableId);
    }

    setCart((prevCart) =>
      prevCart.filter((item) => item.cartItemId !== cartItemId)
    );
  };

  const clearCart = () => {
    cart.forEach((item) => {
      if (item.tableId && window.resetPoolTable) {
        window.resetPoolTable(item.tableId);
      }
    });

    setCart([]);
    setCashReceived("");
  };

  const onAddTableCharge = (tableCharge) => {
    const cartItemId = `table-${tableCharge.tableId}`;

    setCart((prevCart) => {
      const exists = prevCart.some((item) => item.cartItemId === cartItemId);

      if (exists) {
        showToast("La mesa ya fue agregada al carrito.", "warning");
        return prevCart;
      }

      return [
        ...prevCart,
        {
          ...tableCharge,
          cartItemId,
          productType: "SERVICE",
          selectedBeerProductId: null,
          selectedBottleProductId: null,
        },
      ];
    });

    showToast("Mesa agregada al carrito.", "success");
  };

  const validateAndCleanCart = async () => {
    let wasModified = false;

    const cleanedCart = cart
      .map((item) => {
        if (item.selectedBeerProductId) {
          const selectedBeer = beers.find(
            (beer) =>
              Number(beer.productId) === Number(item.selectedBeerProductId)
          );

          if (!selectedBeer) {
            wasModified = true;
            return null;
          }

          const requiredQuantity = Number(item.inventoryMultiplier || 1);
          const maxQuantity = Math.floor(
            Number(selectedBeer.stock || 0) / requiredQuantity
          );

          if (maxQuantity <= 0) {
            wasModified = true;
            return null;
          }

          if (item.quantity > maxQuantity) {
            wasModified = true;

            return {
              ...item,
              quantity: maxQuantity,
              subtotal: maxQuantity * Number(item.unitPrice || 0),
              selectedBeerStock: selectedBeer.stock,
            };
          }

          return {
            ...item,
            selectedBeerStock: selectedBeer.stock,
          };
        }

        if (item.selectedBottleProductId) {
          const selectedBottle = bottleBases.find(
            (bottle) =>
              Number(bottle.productId) === Number(item.selectedBottleProductId)
          );

          if (!selectedBottle) {
            wasModified = true;
            return null;
          }

          const servingVolumeMl = Number(item.servingVolumeMl || 0);
          const bottleVolumeMl = Number(selectedBottle.bottleVolumeMl || 0);
          const bottleStock = Number(selectedBottle.stock || 0);

          if (servingVolumeMl <= 0 || bottleVolumeMl <= 0) {
            wasModified = true;
            return null;
          }

          const requiredBottleAmount = servingVolumeMl / bottleVolumeMl;
          const maxQuantity = Math.floor(bottleStock / requiredBottleAmount);

          if (maxQuantity <= 0) {
            wasModified = true;
            return null;
          }

          if (item.quantity > maxQuantity) {
            wasModified = true;

            return {
              ...item,
              quantity: maxQuantity,
              subtotal: maxQuantity * Number(item.unitPrice || 0),
              selectedBottleStock: selectedBottle.stock,
            };
          }

          return {
            ...item,
            selectedBottleStock: selectedBottle.stock,
          };
        }

        const product = products.find(
          (p) => Number(p.productId) === Number(item.productId)
        );

        if (!product && item.productType !== "SERVICE") {
          wasModified = true;
          return null;
        }

        if (product?.trackInventory && item.quantity > Number(product.stock || 0)) {
          const availableQuantity = Math.floor(Number(product.stock || 0));

          if (availableQuantity <= 0) {
            wasModified = true;
            return null;
          }

          wasModified = true;

          return {
            ...item,
            quantity: availableQuantity,
            subtotal: availableQuantity * Number(item.unitPrice || 0),
            stock: product.stock,
          };
        }

        return item;
      })
      .filter(Boolean);

    if (wasModified) {
      setCart(cleanedCart);
      showToast(
        "El carrito fue actualizado por cambios en el inventario.",
        "warning"
      );
    }

    return cleanedCart;
  };

  const confirmSale = () => {
    if (cart.length === 0) {
      showToast("El carrito está vacío.", "warning");
      return;
    }

    if (!paymentMethodId) {
      showToast("Selecciona un método de pago.", "warning");
      return;
    }

    if (Number(paymentMethodId) === 1 && getCashReceived() < getTotal()) {
      showToast("El efectivo recibido no cubre el total.", "warning");
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
        paymentMethodId: Number(paymentMethodId),
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

      clearCart();

      if (window.resetChargedTables) {
        window.resetChargedTables();
      }

      await loadProducts();
      await loadBeers();
      await loadBottleBases();

      setConfirmSaleModal(false);
    } catch (error) {
      console.error("Error al registrar venta:", error);
      showToast(normalizeApiError(error, "No se pudo registrar la venta."), "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        (product.category || "").toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        activeCategory === "Todas" || product.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category || "Sin categoría"))
    );

    return ["Todas", ...uniqueCategories.sort((a, b) => a.localeCompare(b))];
  }, [products]);

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

  const tableRentalProduct = products.find(
    (product) =>
      product.productType === "SERVICE" &&
      product.name.toLowerCase().includes("mesa")
  );

  return (
    <div className="pos-with-tables-layout">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {confirmSaleModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Confirmar venta</h2>

            <p>
              Total a cobrar: <strong>{formatCurrency(getTotal())}</strong>
            </p>

            {Number(paymentMethodId) === 1 && (
              <>
                <p>
                  Efectivo recibido:{" "}
                  <strong>{formatCurrency(getCashReceived())}</strong>
                </p>

                <p>
                  Cambio:{" "}
                  <strong>
                    {formatCurrency(getChange() > 0 ? getChange() : 0)}
                  </strong>
                </p>
              </>
            )}

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
          <div className="selector-modal-box">
            <div className="selector-modal-header">
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
              <div className="selector-card-grid">
                {beers.map((beer) => {
                  const requiredQuantity = getRequiredBeerQuantity(
                    beerModal.product
                  );

                  const availableSales = Math.floor(
                    Number(beer.stock || 0) / requiredQuantity
                  );

                  const hasEnoughStock = availableSales > 0;

                  return (
                    <button
                      type="button"
                      className={`selector-product-card ${
                        !hasEnoughStock ? "beer-select-card-disabled" : ""
                      }`}
                      key={beer.productId}
                      disabled={!hasEnoughStock}
                      onClick={() => addPreparedDrinkToCart(beer)}
                    >
                      <div className="selector-product-image">
                        {beer.imageUrl ? (
                          <img src={beer.imageUrl} alt={beer.name} />
                        ) : (
                          <span>Sin imagen</span>
                        )}
                      </div>

                      <div className="selector-product-info">
                        <strong>{beer.name}</strong>
                        <span>Stock: {Number(beer.stock || 0)}</span>
                        <span>Disponible: {availableSales} venta(s)</span>

                        {!hasEnoughStock && <span>Stock insuficiente</span>}
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
          <div className="selector-modal-box">
            <div className="selector-modal-header">
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
              <div className="selector-card-grid">
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
                      className={`selector-product-card ${
                        !hasEnoughStock ? "beer-select-card-disabled" : ""
                      }`}
                      key={bottle.productId}
                      disabled={!hasEnoughStock}
                      onClick={() => addLiquorProductToCart(bottle)}
                    >
                      <div className="selector-product-image">
                        {bottle.imageUrl ? (
                          <img src={bottle.imageUrl} alt={bottle.name} />
                        ) : (
                          <span>Sin imagen</span>
                        )}
                      </div>

                      <div className="selector-product-info">
                        <strong>{bottle.name}</strong>
                        <span>{Number(bottle.bottleVolumeMl || 0)} ml</span>
                        <span>
                          Stock: {Number(bottle.stock || 0).toFixed(2)} botella(s)
                        </span>
                        <span>Disponible: {maxSales} venta(s)</span>

                        {!hasEnoughStock && <span>Stock insuficiente</span>}
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

      <div className="pos-container">
        <main className="products-section">
          <div className="pos-header">
            <h1>Punto de venta</h1>

            <div className="header-actions">
              <input
                type="text"
                className="pos-search"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="category-filter">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={activeCategory === category ? "active-category" : ""}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {orderedCategoryNames.length === 0 ? (
            <p>No hay productos disponibles.</p>
          ) : (
            <div className="category-sections">
              {orderedCategoryNames.map((categoryName) => (
                <section className="product-category-section" key={categoryName}>
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

        <aside className="cart-section">
          <div className="cart">
            <h2>Carrito</h2>

            {cart.length === 0 ? (
              <p>No hay productos agregados.</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div className="cart-item" key={item.cartItemId}>
                    <strong>{item.name}</strong>

                    <p>Precio: {formatCurrency(item.unitPrice)}</p>
                    <p>Subtotal: {formatCurrency(item.subtotal)}</p>

                    {item.selectedBeerName && (
                      <p className="cart-extra-info">
                        Cerveza: {item.selectedBeerName}
                      </p>
                    )}

                    {item.selectedBottleName && (
                      <p className="cart-extra-info">
                        Botella: {item.selectedBottleName}
                      </p>
                    )}

                    {item.rentalTimeLabel && (
                      <p className="cart-extra-info">
                        Tiempo: {item.rentalTimeLabel}
                      </p>
                    )}

                    <div className="cart-actions">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.cartItemId)}
                      >
                        −
                      </button>

                      <button type="button" disabled>
                        {item.quantity}
                      </button>

                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.cartItemId)}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartItemId)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}

                <div className="cart-total">
                  <span>Total</span>
                  <strong>{formatCurrency(getTotal())}</strong>
                </div>

                <div className="payment-section">
                  <label>Método de pago</label>

                  <select
                    value={paymentMethodId}
                    onChange={(e) => {
                      setPaymentMethodId(e.target.value);
                      setCashReceived("");
                    }}
                  >
                    <option value="1">Efectivo</option>
                    <option value="2">Tarjeta</option>
                    <option value="3">Transferencia</option>
                  </select>
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
                      <p>Total: {formatCurrency(getTotal())}</p>
                      <p>
                        Efectivo recibido: {formatCurrency(getCashReceived())}
                      </p>

                      <h3
                        className={
                          getChange() < 0 ? "negative-change" : "positive-change"
                        }
                      >
                        Cambio:{" "}
                        {formatCurrency(getChange() > 0 ? getChange() : 0)}
                      </h3>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="charge-button"
                  onClick={confirmSale}
                  disabled={
                    loading ||
                    cart.length === 0 ||
                    (Number(paymentMethodId) === 1 &&
                      getCashReceived() < getTotal())
                  }
                >
                  {loading ? "Registrando..." : `Cobrar ${formatCurrency(getTotal())}`}
                </button>

                <button
                  type="button"
                  className="charge-button"
                  onClick={clearCart}
                  disabled={cart.length === 0 || loading}
                >
                  Vaciar carrito
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PosPage;