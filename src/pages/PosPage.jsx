import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import TablesSidebar from "../components/TablesSidebar";
import jsPDF from "jspdf";

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
  const [cashReceived, setCashReceived] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const [beerModal, setBeerModal] = useState({
    isOpen: false,
    product: null,
    sizes: [],
    selectedSize: null,
  });

  const [liquorModal, setLiquorModal] = useState({
    isOpen: false,
    product: null,
    sizes: [],
    selectedSize: null,
    selectedBottle: null,
  });

  const [barTabs, setBarTabs] = useState([]);
  const [activeBarTabId, setActiveBarTabId] = useState(null);
  const [barTabExpanded, setBarTabExpanded] = useState(false);
  const [barTabNameDraft, setBarTabNameDraft] = useState("");
  const [isEditingBarTabName, setIsEditingBarTabName] = useState(false);

  const [tableTabs, setTableTabs] = useState([]);
  const [activeTableTabId, setActiveTableTabId] = useState(null);
  const [activeTableInfo, setActiveTableInfo] = useState(null);
  const [tableTabExpanded, setTableTabExpanded] = useState(false);

  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [pendingCredits, setPendingCredits] = useState([]);
  const [sourceCreditSaleId, setSourceCreditSaleId] = useState(null);
  const [sourceCreditReference, setSourceCreditReference] = useState("");

  const [cashBox, setCashBox] = useState(null);
  const [cashMovementModal, setCashMovementModal] = useState({
    isOpen: false,
    type: null,
  });
  const [cashMovementAmount, setCashMovementAmount] = useState("");
  const [cashMovementDescription, setCashMovementDescription] = useState("");

  const [cashCutModalOpen, setCashCutModalOpen] = useState(false);
  const [cashCutPreview, setCashCutPreview] = useState(null);
  const [cashCutFinalAmount, setCashCutFinalAmount] = useState("0");
  const [cashCutDescription, setCashCutDescription] = useState("Corte de caja");

  const [cashCutsModalOpen, setCashCutsModalOpen] = useState(false);
  const [cashCuts, setCashCuts] = useState([]);

  const [manualCreditModalOpen, setManualCreditModalOpen] = useState(false);
  const [manualCreditName, setManualCreditName] = useState("");
  const [manualCreditAmount, setManualCreditAmount] = useState("");
  const [manualCreditDescription, setManualCreditDescription] = useState("");

  const ML_PER_OUNCE = 29.5735;
  const TABLE_BUCKET_PROMO_STORAGE_KEY = "nuevoEjidoTableBucketPromos";

  const readTableBucketPromos = () => {
    try {
      const rawPromos = window.localStorage.getItem(
        TABLE_BUCKET_PROMO_STORAGE_KEY
      );

      return rawPromos ? JSON.parse(rawPromos) : {};
    } catch (error) {
      console.error("Error al leer promociones de cubeta:", error);
      return {};
    }
  };

  const saveTableBucketPromos = (promos) => {
    try {
      window.localStorage.setItem(
        TABLE_BUCKET_PROMO_STORAGE_KEY,
        JSON.stringify(promos || {})
      );
    } catch (error) {
      console.error("Error al guardar promociones de cubeta:", error);
    }
  };

  useEffect(() => {
    document.title = "El Nuevo Ejido";

    const existingFavicon = document.querySelector("link[rel='icon']");
    const favicon = existingFavicon || document.createElement("link");

    favicon.rel = "icon";
    favicon.type = "image/jpeg";
    favicon.href = "/nuevo-ejido-logo.jpg";

    if (!existingFavicon) {
      document.head.appendChild(favicon);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadCart();

    const interval = setInterval(() => {
      loadCart();
      loadBarTabs();
      loadTableTabs();
      loadCashBox();
    }, 5000);

    return () => clearInterval(interval);
  }, [isEditingBarTabName, activeBarTabId, activeTableTabId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadProducts();
      loadBeers();
      loadBottleBases();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const normalizeNameForOrder = (value) => {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const getBeerOrder = (productName) => {
    const name = normalizeNameForOrder(productName);

    if (name.includes("tecate")) return 1;
    if (name.includes("indio")) return 2;
    if (name.includes("miller") || name.includes("miler")) return 3;
    if (name.includes("ultra")) return 4;
    if (name.includes("bud light") || name.includes("budlight")) return 5;
    if (name.includes("corona")) return 6;

    return 99;
  };

  const isBeerProduct = (product) => {
    const name = normalizeNameForOrder(product?.name);
    const category = normalizeNameForOrder(product?.category);

    return (
      Boolean(product?.isBeer) ||
      category.includes("cerveza") ||
      name.includes("tecate") ||
      name.includes("indio") ||
      name.includes("miller") ||
      name.includes("miler") ||
      name.includes("ultra") ||
      name.includes("bud light") ||
      name.includes("budlight") ||
      name.includes("corona")
    );
  };


  const isBeerBucketProduct = (product) => {
    const name = normalizeNameForOrder(product?.name);
    const category = normalizeNameForOrder(product?.category);
    const productType = String(product?.productType || "").toUpperCase();

    return (
      productType === "BEER_BUCKET" ||
      name.includes("cubeta") ||
      category.includes("cubeta")
    );
  };

  const registerTableBucketPromo = (product, targetTableId = null) => {
    if (!isBeerBucketProduct(product)) {
      return false;
    }

    const tableId =
      targetTableId ??
      activeTableInfo?.tableId ??
      activeTableTab?.tableId ??
      activeTableTab?.TableId ??
      null;

    if (!tableId) {
      return false;
    }

    const promos = readTableBucketPromos();
    const promoKey = String(tableId);
    const currentPromo = promos[promoKey] || null;

    const previousGrants = Array.isArray(currentPromo?.grants)
      ? currentPromo.grants
      : currentPromo
      ? [
          {
            createdAt: currentPromo.createdAt || new Date().toISOString(),
            freeSeconds: Number(currentPromo.freeSeconds || 3600),
            productId: currentPromo.productId ?? null,
            productName: currentPromo.productName || "Cubeta de cerveza",
          },
        ]
      : [];

    const nextGrant = {
      createdAt: new Date().toISOString(),
      freeSeconds: 3600,
      productId: product.productId ?? product.ProductId ?? null,
      productName:
        product.name ?? product.Name ?? product.productName ?? "Cubeta de cerveza",
    };

    const nextGrants = [...previousGrants, nextGrant];
    const totalFreeSeconds = nextGrants.reduce(
      (total, grant) => total + Number(grant.freeSeconds || 0),
      0
    );

    promos[promoKey] = {
      tableId,
      productId: nextGrant.productId,
      productName: nextGrant.productName,
      createdAt: previousGrants[0]?.createdAt || nextGrant.createdAt,
      activatedAt: previousGrants[0]?.createdAt || nextGrant.createdAt,
      freeSeconds: totalFreeSeconds,
      grants: nextGrants,
    };

    saveTableBucketPromos(promos);

    const promoHours = Math.floor(totalFreeSeconds / 3600);
    showToast(
      `Promoción aplicada: ${promoHours} hora${
        promoHours === 1 ? "" : "s"
      } gratis de mesa por cubeta.`,
      "success"
    );

    return true;
  };

  const sortProductsByBeerOrder = (a, b) => {
    const isBeerA = isBeerProduct(a);
    const isBeerB = isBeerProduct(b);

    if (isBeerA && isBeerB) {
      const orderA = getBeerOrder(a.name);
      const orderB = getBeerOrder(b.name);

      if (orderA !== orderB) return orderA - orderB;
    }

    return normalizeNameForOrder(a.name).localeCompare(
      normalizeNameForOrder(b.name)
    );
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    const baseUrl = api.defaults.baseURL.replace("/api", "");
    return `${baseUrl}${imageUrl}`;
  };

  const normalizeBoolean = (value, defaultValue = true) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;

    const text = String(value).toLowerCase().trim();

    if (text === "true" || text === "1" || text === "activo") return true;
    if (text === "false" || text === "0" || text === "inactivo") return false;

    return defaultValue;
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


//Funcion ppara crear el PDF

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

 const getPaymentMethodIconType = (methodName) => {
  const name = String(methodName || "").toLowerCase();

  if (name.includes("efectivo")) return "cash";
  if (name.includes("tarjeta")) return "card";
  if (name.includes("transferencia")) return "transfer";
  if (name.includes("cortesía") || name.includes("cortesia")) return "courtesy";
  if (name.includes("crédito") || name.includes("credito")) return "credit";
  if (name.includes("hotel")) return "hotel";

  return "default";
};

  const getCreditPaymentMethod = () => {
    return paymentMethods.find((method) => {
      const name = String(method.name || "").toLowerCase().trim();
      return name === "crédito" || name === "credito";
    });
  };

  const isManualCreditProduct = (product) => {
    const productType = String(product?.productType || "").toUpperCase();
    const name = normalizeNameForOrder(product?.name);

    return productType === "SERVICE" && name.includes("credito manual");
  };

  const getManualCreditProduct = () => {
    return products.find(isManualCreditProduct) || null;
  };

  const renderPaymentMethodIcon = (methodName) => {
    const iconType = getPaymentMethodIconType(methodName);

    if (iconType === "cash") {
      return (
        <span className="payment-method-icon payment-method-icon-cash">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M6 9h1.5" />
            <path d="M16.5 15H18" />
          </svg>
        </span>
      );
    }

    if (iconType === "card") {
      return (
        <span className="payment-method-icon payment-method-icon-card">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 9h18" />
            <path d="M7 15h4" />
          </svg>
        </span>
      );
    }

    if (iconType === "transfer") {
      return (
        <span className="payment-method-icon payment-method-icon-transfer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 10h16" />
            <path d="M7 7l-3 3 3 3" />
            <path d="M20 14H4" />
            <path d="M17 11l3 3-3 3" />
          </svg>
        </span>
      );
    }

    if (iconType === "courtesy") {
      return (
        <span className="payment-method-icon payment-method-icon-courtesy">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="8" width="16" height="12" rx="2" />
            <path d="M4 12h16" />
            <path d="M12 8v12" />
            <path d="M8.5 8c-1.5-1.5-.5-4 1.5-3 1 .5 2 3 2 3" />
            <path d="M15.5 8c1.5-1.5.5-4-1.5-3-1 .5-2 3-2 3" />
          </svg>
        </span>
      );
    }

    if (iconType === "credit") {
      return (
        <span className="payment-method-icon payment-method-icon-credit">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h9l3 3v15H6z" />
            <path d="M15 3v4h4" />
            <path d="M9 11h6" />
            <path d="M9 15h6" />
          </svg>
        </span>
      );
    }

    if (iconType === "hotel") {
      return (
        <span className="payment-method-icon payment-method-icon-hotel">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
            <path d="M16 9h2a2 2 0 0 1 2 2v10" />
            <path d="M8 7h2" />
            <path d="M8 11h2" />
            <path d="M8 15h2" />
            <path d="M3 21h18" />
          </svg>
        </span>
      );
    }

    return (
      <span className="payment-method-icon payment-method-icon-default">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </svg>
      </span>
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + Number(item.subtotal || 0), 0);
  }, [cart]);

  const selectedPaymentMethod = paymentMethods.find(
    (method) => Number(method.paymentMethodId) === Number(selectedPaymentMethodId)
  );

 const selectedPaymentName = selectedPaymentMethod?.name?.toLowerCase() || "";

const isCourtesyPayment =
  selectedPaymentName === "cortesía" || selectedPaymentName === "cortesia";

const isCreditPayment =
  selectedPaymentName === "crédito" || selectedPaymentName === "credito";

const isHotelPayment = selectedPaymentName === "hotel";

const isCashPayment = selectedPaymentName.includes("efectivo");

const isPayingPendingCredit = Boolean(sourceCreditSaleId);

const requiresPaymentReference =
  !isPayingPendingCredit &&
  (isCourtesyPayment || isCreditPayment || isHotelPayment);

  const cashReceivedNumber = Number(cashReceived || 0);
  const cashChange = cashReceivedNumber - cartTotal;

  const activeBarTab = useMemo(() => {
    return barTabs.find((tab) => Number(tab.barTabId) === Number(activeBarTabId)) || null;
  }, [barTabs, activeBarTabId]);

  const activeTableTab = useMemo(() => {
    return tableTabs.find((tab) => Number(tab.barTabId) === Number(activeTableTabId)) || null;
  }, [tableTabs, activeTableTabId]);

  const shouldSendProductsToTableTab =
    tableTabExpanded && activeTableTab && activeTableTab.barTabId;

  const shouldSendProductsToBarTab =
    !shouldSendProductsToTableTab &&
    barTabExpanded &&
    activeBarTab &&
    activeBarTab.barTabId;

  const loadInitialData = async () => {
    await Promise.all([
      loadProducts(),
      loadBeers(),
      loadBottleBases(),
      loadPaymentMethods(),
      loadCart(),
      loadBarTabs(),
      loadTableTabs(),
      loadCashBox(),
    ]);
  };

  const normalizeCartItem = (item) => {
    const activeCartItemId = item.activeCartItemId ?? item.ActiveCartItemId;

    return {
      activeCartItemId,
      cartItemId: String(activeCartItemId),
      productId: item.productId ?? item.ProductId ?? null,
      productDrinkSizeId: item.productDrinkSizeId ?? item.ProductDrinkSizeId ?? null,
      drinkSizeName: item.drinkSizeName ?? item.DrinkSizeName ?? null,
      ouncesUsed: item.ouncesUsed ?? item.OuncesUsed ?? null,
      name: item.name ?? item.Name ?? "Producto",
      quantity: item.quantity ?? item.Quantity ?? 1,
      unitPrice: item.unitPrice ?? item.UnitPrice ?? 0,
      subtotal: item.subtotal ?? item.Subtotal ?? 0,
      productType: item.productType ?? item.ProductType ?? "INDIVIDUAL",
      selectedBeerProductId: item.selectedBeerProductId ?? item.SelectedBeerProductId ?? null,
      selectedBottleProductId: item.selectedBottleProductId ?? item.SelectedBottleProductId ?? null,
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
        trackInventory: product.trackInventory ?? product.TrackInventory ?? false,
        requiresBeerSelection: product.requiresBeerSelection ?? product.RequiresBeerSelection ?? false,
        isBeer: product.isBeer ?? product.IsBeer ?? false,
        inventoryStatus: product.inventoryStatus ?? product.InventoryStatus ?? "NO_TRACK",
        imageUrl: getImageUrl(product.imageUrl ?? product.ImageUrl ?? ""),
        productType: product.productType ?? product.ProductType ?? "BOTTLED_DRINK",
        inventorySourceProductId: product.inventorySourceProductId ?? product.InventorySourceProductId ?? null,
        inventoryMultiplier: product.inventoryMultiplier ?? product.InventoryMultiplier ?? 1,
        servingVolumeMl: product.servingVolumeMl ?? product.ServingVolumeMl ?? null,
        bottleVolumeMl: product.bottleVolumeMl ?? product.BottleVolumeMl ?? null,
      }));

      setProducts([...normalizedProducts].sort(sortProductsByBeerOrder));
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

      setBeers([...normalizedBeers].sort(sortProductsByBeerOrder));
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
        imageUrl: getImageUrl(bottle.imageUrl ?? bottle.ImageUrl ?? ""),
        isActive: normalizeBoolean(
          bottle.isActive ??
            bottle.IsActive ??
            bottle.isAvailable ??
            bottle.IsAvailable ??
            bottle.active ??
            bottle.Active,
          true
        ),
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

      const normalizedPaymentMethods = response.data
        .map((method) => ({
          paymentMethodId: method.paymentMethodId ?? method.PaymentMethodId,
          name: method.name ?? method.Name,
        }))
        .sort((a, b) => {
          const order = (value) => {
            const name = String(value || "").toLowerCase();
            if (name.includes("efectivo")) return 1;
            if (name.includes("tarjeta")) return 2;
            if (name.includes("transferencia")) return 3;
            if (name.includes("cortesía") || name.includes("cortesia")) return 4;
            if (name.includes("crédito") || name.includes("credito")) return 5;
            if (name.includes("hotel")) return 6;
            return 99;
          };

          return order(a.name) - order(b.name);
        });

      setPaymentMethods(normalizedPaymentMethods);

      const cashMethod = normalizedPaymentMethods.find((method) =>
        String(method.name || "").toLowerCase().includes("efectivo")
      );

      if (cashMethod) {
        setSelectedPaymentMethodId(cashMethod.paymentMethodId);
        return;
      }

      if (normalizedPaymentMethods.length > 0) {
        setSelectedPaymentMethodId(normalizedPaymentMethods[0].paymentMethodId);
      }
    } catch (error) {
      console.error("Error al cargar métodos de pago:", error);
      showToast("No se pudieron cargar los métodos de pago.", "error");
    }
  };

  const normalizeBarTabItem = (item) => ({
    barTabItemId: item.barTabItemId ?? item.BarTabItemId,
    productId: item.productId ?? item.ProductId,
    productDrinkSizeId: item.productDrinkSizeId ?? item.ProductDrinkSizeId ?? null,
    drinkSizeName: item.drinkSizeName ?? item.DrinkSizeName ?? null,
    ouncesUsed: item.ouncesUsed ?? item.OuncesUsed ?? null,
    name: item.name ?? item.Name ?? "Producto",
    quantity: item.quantity ?? item.Quantity ?? 1,
    unitPrice: item.unitPrice ?? item.UnitPrice ?? 0,
    subtotal: item.subtotal ?? item.Subtotal ?? 0,
    productType: item.productType ?? item.ProductType ?? "INDIVIDUAL",
    selectedBeerProductId: item.selectedBeerProductId ?? item.SelectedBeerProductId ?? null,
    selectedBottleProductId: item.selectedBottleProductId ?? item.SelectedBottleProductId ?? null,
    totalMinutes: item.totalMinutes ?? item.TotalMinutes ?? null,
  });

  const normalizeBarTab = (tab) => {
    const rawItems = tab.items ?? tab.Items ?? [];

    return {
      barTabId: tab.barTabId ?? tab.BarTabId,
      customerName: tab.customerName ?? tab.CustomerName ?? "",
      total: tab.total ?? tab.Total ?? 0,
      status: tab.status ?? tab.Status ?? "OPEN",
      items: rawItems.map(normalizeBarTabItem),
    };
  };

  const normalizeTableTab = (tab) => {
    const normalized = normalizeBarTab(tab);

    return {
      ...normalized,
      tableId: tab.tableId ?? tab.TableId ?? null,
      tableNumber: tab.tableNumber ?? tab.TableNumber ?? null,
      tableName: tab.tableName ?? tab.TableName ?? "",
      tableType: tab.tableType ?? tab.TableType ?? "",
      isTableTab: tab.isTableTab ?? tab.IsTableTab ?? true,
    };
  };

  const loadBarTabs = async () => {
    try {
      const response = await api.get("/BarTabs/Open");
      const normalizedTabs = (response.data || []).map(normalizeBarTab);

      setBarTabs(normalizedTabs);

      if (normalizedTabs.length === 0) {
        setActiveBarTabId(null);

        if (!isEditingBarTabName) setBarTabNameDraft("");
        return normalizedTabs;
      }

      const stillExists = normalizedTabs.some(
        (tab) => Number(tab.barTabId) === Number(activeBarTabId)
      );

      if (stillExists) {
        const selectedTab = normalizedTabs.find(
          (tab) => Number(tab.barTabId) === Number(activeBarTabId)
        );

        if (!isEditingBarTabName) setBarTabNameDraft(selectedTab?.customerName || "");
        return normalizedTabs;
      }

      if (!activeBarTabId && !isEditingBarTabName) {
        const firstTab = normalizedTabs[0];
        setActiveBarTabId(firstTab.barTabId);
        setBarTabNameDraft(firstTab.customerName || "");
      }

      return normalizedTabs;
    } catch (error) {
      console.error("Error al cargar notas de barra:", error);
      return [];
    }
  };

  const loadTableTabs = async () => {
    try {
      const response = await api.get("/BarTabs/Table/Open");
      const normalizedTabs = (response.data || []).map(normalizeTableTab);

      setTableTabs(normalizedTabs);

      if (activeTableTabId) {
        const stillExists = normalizedTabs.some(
          (tab) => Number(tab.barTabId) === Number(activeTableTabId)
        );

        if (!stillExists) {
          setActiveTableTabId(null);
          setActiveTableInfo(null);
        }
      }

      return normalizedTabs;
    } catch (error) {
      console.error("Error al cargar notas de mesa:", error);
      return [];
    }
  };

  const openTableNote = async (table) => {
    try {
      const tableId = table.poolTableId ?? table.tableId ?? table.TableId;
      const tableNumber = table.tableNumber ?? table.TableNumber ?? null;
      const tableType = table.tableType ?? table.TableType ?? "";

      if (!tableId) {
        showToast("No se encontró la mesa seleccionada.", "error");
        return;
      }

      const tableName =
        table.tableName ?? table.TableName ?? `Mesa ${tableNumber || tableId}`;

      const response = await api.post("/BarTabs/Table/Open", {
        tableId,
        tableNumber,
        tableName,
        tableType,
      });

      const tab = normalizeTableTab(response.data);

      setActiveTableTabId(tab.barTabId);
      setActiveTableInfo({ tableId, tableNumber, tableName, tableType });
      setTableTabExpanded(true);
      setActiveBarTabId(null);
      setBarTabExpanded(false);

      await loadTableTabs();

      showToast(`Nota activa para ${tableName}.`, "success");
    } catch (error) {
      console.error("Error al abrir nota de mesa:", error);
      showToast(
        normalizeApiError(error, "No se pudo abrir la nota de mesa."),
        "error"
      );
    }
  };

  const createNewBarTab = () => {
    setActiveBarTabId(null);
    setActiveTableTabId(null);
    setActiveTableInfo(null);
    setTableTabExpanded(false);
    setBarTabNameDraft("");
    setIsEditingBarTabName(true);
    setBarTabExpanded(true);
  };

  const openBarTab = async () => {
    try {
      const response = await api.post("/BarTabs/Open", {
        customerName: barTabNameDraft.trim(),
      });

      const createdId = response.data.barTabId ?? response.data.BarTabId;

      setActiveBarTabId(createdId);
      setActiveTableTabId(null);
      setActiveTableInfo(null);
      setTableTabExpanded(false);
      setBarTabExpanded(true);
      setIsEditingBarTabName(false);

      await loadBarTabs();
      showToast("Nota de barra abierta.", "success");
    } catch (error) {
      console.error("Error al abrir nota:", error);
      showToast(
        normalizeApiError(error, "No se pudo abrir la nota de barra."),
        "error"
      );
    }
  };

  const updateBarTabName = async () => {
    if (!activeBarTabId) return;

    try {
      await api.put(`/BarTabs/${activeBarTabId}/Name`, {
        customerName: barTabNameDraft.trim(),
      });

      setIsEditingBarTabName(false);
      await loadBarTabs();
    } catch (error) {
      console.error("Error al actualizar nombre de nota:", error);
      showToast("No se pudo actualizar el nombre de la nota.", "error");
    }
  };

  const buildTabItemPayload = (product) => {
    const unitPrice = Number(product.unitPrice ?? product.price ?? 0);
    const quantity = Number(product.quantity ?? 1);

    return {
      productId: product.productId,
      productDrinkSizeId: product.productDrinkSizeId ?? product.selectedDrinkSizeId ?? null,
      drinkSizeName: product.drinkSizeName ?? product.selectedDrinkSizeName ?? null,
      ouncesUsed: product.ouncesUsed ?? null,
      name: product.name,
      quantity,
      unitPrice,
      subtotal: Number(product.subtotal ?? unitPrice * quantity),
      productType: product.productType,
      selectedBeerProductId: product.selectedBeerProductId ?? null,
      selectedBottleProductId: product.selectedBottleProductId ?? null,
      totalMinutes: product.totalMinutes ?? null,
    };
  };

  const addToBarTab = async (product) => {
    if (!activeBarTabId) {
      showToast("Primero selecciona o activa una nota de barra.", "warning");
      return;
    }

    try {
      await api.post(`/BarTabs/${activeBarTabId}/Items`, buildTabItemPayload(product));
      await loadBarTabs();
      showToast("Producto agregado a la nota.", "success");
    } catch (error) {
      console.error("Error al agregar producto a nota:", error);
      showToast(
        normalizeApiError(error, "No se pudo agregar el producto a la nota."),
        "error"
      );
    }
  };

  const addToTableTab = async (product) => {
    if (!activeTableTabId) {
      showToast("Primero selecciona una nota de mesa.", "warning");
      return;
    }

    try {
      await api.post(`/BarTabs/${activeTableTabId}/Items`, buildTabItemPayload(product));
      await loadTableTabs();
      showToast("Producto agregado a la nota de mesa.", "success");
    } catch (error) {
      console.error("Error al agregar producto a nota de mesa:", error);
      showToast(
        normalizeApiError(error, "No se pudo agregar el producto a la nota de mesa."),
        "error"
      );
    }
  };

  const sendItemsToActiveCart = async (items) => {
    for (const item of items) {
      await api.post("/ActiveCart/Items", {
        productId: item.productId,
        productDrinkSizeId: item.productDrinkSizeId || null,
        drinkSizeName: item.drinkSizeName || null,
        ouncesUsed: item.ouncesUsed || null,
        name: item.name,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        subtotal: Number(item.subtotal || 0),
        productType: item.productType,
        selectedBeerProductId: item.selectedBeerProductId || null,
        selectedBottleProductId: item.selectedBottleProductId || null,
        totalMinutes: item.totalMinutes || null,
      });
    }
  };

  const chargeBarTab = async () => {
    if (!activeBarTab) {
      showToast("No hay nota activa.", "warning");
      return;
    }

    if (activeBarTab.items.length === 0) {
      showToast("La nota no tiene productos.", "warning");
      return;
    }

    try {
      await sendItemsToActiveCart(activeBarTab.items);
      await api.post(`/BarTabs/${activeBarTab.barTabId}/SendToCart`);

      setActiveBarTabId(null);
      setBarTabNameDraft("");
      setIsEditingBarTabName(false);
      setBarTabExpanded(false);

      await loadBarTabs();
      await loadCart();
      showToast("Nota enviada al carrito.", "success");
    } catch (error) {
      console.error("Error al enviar nota al carrito:", error);
      showToast(
        normalizeApiError(error, "No se pudo enviar la nota al carrito."),
        "error"
      );
    }
  };

  const sendTableTabToCart = async (tableTabId = activeTableTabId) => {
    if (!tableTabId) {
      showToast("No hay nota de mesa activa.", "warning");
      return;
    }

    try {
      const currentTabs = await loadTableTabs();
      const tableTab =
        currentTabs.find((tab) => Number(tab.barTabId) === Number(tableTabId)) ||
        activeTableTab;

      if (!tableTab || tableTab.items.length === 0) {
        showToast("La nota de mesa no tiene productos.", "warning");
        return;
      }

      await sendItemsToActiveCart(tableTab.items);
      await api.post(`/BarTabs/${tableTabId}/SendToCart`);

      setTableTabExpanded(false);
      setActiveTableTabId(null);
      setActiveTableInfo(null);

      await loadTableTabs();
      await loadCart();
      showToast("Nota de mesa enviada al carrito.", "success");
    } catch (error) {
      console.error("Error al enviar nota de mesa al carrito:", error);
      showToast(
        normalizeApiError(error, "No se pudo enviar la nota de mesa al carrito."),
        "error"
      );
    }
  };

  const cancelTableTab = async (tableTabId = activeTableTabId) => {
    if (!tableTabId) {
      showToast("No hay nota de mesa activa.", "warning");
      return;
    }

    try {
      await api.post(`/BarTabs/${tableTabId}/Cancel`);

      setTableTabExpanded(false);
      setActiveTableTabId(null);
      setActiveTableInfo(null);

      await loadTableTabs();

      showToast("Nota de mesa cancelada correctamente.", "success");
    } catch (error) {
      console.error("Error al cancelar nota de mesa:", error);
      showToast(
        normalizeApiError(error, "No se pudo cancelar la nota de mesa."),
        "error"
      );
    }
  };

  const cancelBarTab = async () => {
    if (!activeBarTab) {
      showToast("No hay nota activa.", "warning");
      return;
    }

    try {
      await api.post(`/BarTabs/${activeBarTab.barTabId}/Cancel`);
      setActiveBarTabId(null);
      setBarTabNameDraft("");
      setIsEditingBarTabName(false);
      setBarTabExpanded(false);
      await loadBarTabs();
      showToast("Nota cancelada correctamente.", "success");
    } catch (error) {
      console.error("Error al cancelar nota:", error);
      showToast(normalizeApiError(error, "No se pudo cancelar la nota."), "error");
    }
  };

  const normalizeCashBox = (data) => {
    const currentAmount =
      data?.currentAmount ??
      data?.CurrentAmount ??
      data?.currentBalance ??
      data?.CurrentBalance ??
      data?.amount ??
      data?.Amount ??
      0;

    return {
      cashBoxId: data?.cashBoxId ?? data?.CashBoxId ?? data?.id ?? data?.Id ?? null,
      currentAmount: Number(currentAmount || 0),
      updatedAt: data?.updatedAt ?? data?.UpdatedAt ?? new Date().toISOString(),
    };
  };

  const loadCashBox = async () => {
    try {
      // Se agrega parámetro temporal para evitar que el navegador/IIS regrese una respuesta anterior.
      const response = await api.get(`/CashBox?_=${Date.now()}`);
      const normalizedCashBox = normalizeCashBox(response.data || {});

      setCashBox(normalizedCashBox);
      return normalizedCashBox;
    } catch (error) {
      console.error("Error al cargar caja:", error);

      if (!cashBox) {
        showToast("No se pudo cargar la caja.", "error");
      }

      return null;
    }
  };

  const openCashMovementModal = (type) => {
    setCashMovementModal({ isOpen: true, type });
    setCashMovementAmount("");
    setCashMovementDescription("");
  };

  const closeCashMovementModal = () => {
    setCashMovementModal({ isOpen: false, type: null });
    setCashMovementAmount("");
    setCashMovementDescription("");
  };

  const submitCashMovement = async () => {
    const amount = Number(cashMovementAmount || 0);

    if (amount <= 0) {
      showToast("El monto debe ser mayor a cero.", "warning");
      return;
    }

    if (!cashMovementDescription.trim()) {
      showToast("Ingresa el motivo del movimiento.", "warning");
      return;
    }

    try {
      setLoading(true);
      const endpoint = cashMovementModal.type === "add" ? "/CashBox/Add" : "/CashBox/Subtract";

      await api.post(endpoint, {
        amount,
        description: cashMovementDescription.trim(),
      });

      await loadCashBox();
      closeCashMovementModal();
      showToast(
        cashMovementModal.type === "add" ? "Entrada de efectivo registrada." : "Retiro de efectivo registrado.",
        "success"
      );
    } catch (error) {
      console.error("Error al registrar movimiento de caja:", error);
      showToast(normalizeApiError(error, "No se pudo registrar el movimiento."), "error");
    } finally {
      setLoading(false);
    }
  };

  const openCashCutModal = async () => {
    try {
      setLoading(true);
      const response = await api.get("/CashBox/CutPreview");
      const preview = response.data || {};

      setCashCutPreview(preview);
      setCashCutFinalAmount("0");
      setCashCutDescription("Corte de caja");
      setCashCutModalOpen(true);
    } catch (error) {
      console.error("Error al cargar corte de caja:", error);
      showToast("No se pudo cargar el corte de caja.", "error");
    } finally {
      setLoading(false);
    }
  };

  const closeCashCutModal = () => {
    setCashCutModalOpen(false);
    setCashCutPreview(null);
    setCashCutFinalAmount("0");
    setCashCutDescription("Corte de caja");
  };

  const submitCashCut = async () => {
    const finalAmount = Number(cashCutFinalAmount || 0);

    if (finalAmount < 0) {
      showToast("El monto final no puede ser negativo.", "warning");
      return;
    }

    if (!cashCutDescription.trim()) {
      showToast("Ingresa una descripción para el corte.", "warning");
      return;
    }

    try {
      setLoading(true);
      await api.post("/CashBox/Cut", {
        finalAmount,
        description: cashCutDescription.trim(),
      });

      await loadCashBox();
      closeCashCutModal();
      showToast("Corte de caja realizado correctamente.", "success");
    } catch (error) {
      console.error("Error al realizar corte de caja:", error);
      showToast(normalizeApiError(error, "No se pudo realizar el corte de caja."), "error");
    } finally {
      setLoading(false);
    }
  };

  const normalizeCashCut = (cut) => ({
    cashMovementId: cut.cashMovementId ?? cut.CashMovementId,
    movementType: cut.movementType ?? cut.MovementType,
    amount: cut.amount ?? cut.Amount ?? 0,
    description: cut.description ?? cut.Description ?? "",
    createdAt: cut.createdAt ?? cut.CreatedAt ?? null,
    cutStartDate: cut.cutStartDate ?? cut.CutStartDate ?? null,
    cutEndDate: cut.cutEndDate ?? cut.CutEndDate ?? null,
    saleCash: cut.saleCash ?? cut.SaleCash ?? 0,
    creditPaid: cut.creditPaid ?? cut.CreditPaid ?? 0,
    manualAdds: cut.manualAdds ?? cut.ManualAdds ?? 0,
    manualSubtracts: cut.manualSubtracts ?? cut.ManualSubtracts ?? 0,
    manualAdjusts: cut.manualAdjusts ?? cut.ManualAdjusts ?? 0,
    totalEntries: cut.totalEntries ?? cut.TotalEntries ?? 0,
    totalExits: cut.totalExits ?? cut.TotalExits ?? 0,
    finalAmount: cut.finalAmount ?? cut.FinalAmount ?? 0,
  });

  const loadCashCuts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/CashBox/Cuts");
      const normalizedCuts = (response.data || []).map(normalizeCashCut);
      setCashCuts(normalizedCuts);
      setCashCutsModalOpen(true);
    } catch (error) {
      console.error("Error al cargar cortes:", error);
      showToast("No se pudieron cargar los cortes de caja.", "error");
    } finally {
      setLoading(false);
    }
  };

  const closeCashCutsModal = () => {
    setCashCutsModalOpen(false);
    setCashCuts([]);
  };

  const openBeerModal = async (product) => {
    try {
      const sizes = await loadDrinkSizesForProduct(product);
      const selectedSize = sizes.length > 0 ? sizes[0] : null;

      setBeerModal({
        isOpen: true,
        product,
        sizes,
        selectedSize,
      });
    } catch (error) {
      console.error("Error al cargar tamaños de bebida con cerveza:", error);

      setBeerModal({
        isOpen: true,
        product,
        sizes: [],
        selectedSize: null,
      });
    }
  };

  const closeBeerModal = () => {
    setBeerModal({
      isOpen: false,
      product: null,
      sizes: [],
      selectedSize: null,
    });
  };

  const getRequiredBeerQuantity = (product) => {
    if (!product) return 1;
    if (product.productType === "BEER_BUCKET") return Number(product.inventoryMultiplier || 10);
    return Number(product.inventoryMultiplier || 1);
  };

  const getBeerTargetUnitPrice = (product) => {
    if (!product) return null;

    const requiredQuantity = getRequiredBeerQuantity(product);
    const productPrice = Number(product.price || 0);

    if (requiredQuantity <= 1 || productPrice <= 0) {
      return null;
    }

    return Number((productPrice / requiredQuantity).toFixed(2));
  };

  const beerMatchesRequiredPrice = (product, beer) => {
    const targetPrice = getBeerTargetUnitPrice(product);

    if (targetPrice === null) {
      return true;
    }

    const beerPrice = Number(beer?.price ?? beer?.unitPrice ?? 0);

    if (beerPrice <= 0) {
      return false;
    }

    return Math.abs(beerPrice - targetPrice) < 0.01;
  };

  const getBeersForProduct = (product) => {
    return beers.filter((beer) => beerMatchesRequiredPrice(product, beer));
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
      const selectedSize = beerModal.selectedSize;
      const unitPrice = Number(selectedSize?.price ?? product.price ?? 0);
      const drinkSizeName = selectedSize?.sizeName ?? null;

      const item = {
        productId: product.productId,
        productDrinkSizeId: selectedSize?.productDrinkSizeId ?? null,
        drinkSizeName,
        ouncesUsed: selectedSize?.ouncesUsed ?? null,
        name: drinkSizeName
          ? `${product.name} - ${drinkSizeName} - ${selectedBeer.name}`
          : `${product.name} - ${selectedBeer.name}`,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice,
        productType: product.productType,
        selectedBeerProductId: selectedBeer.productId,
        selectedBottleProductId: null,
        totalMinutes: null,
      };

      const promoTableId = shouldSendProductsToTableTab
        ? activeTableInfo?.tableId ??
          activeTableTab?.tableId ??
          activeTableTab?.TableId ??
          null
        : null;

      await sendItemToCurrentDestination(item, "Producto agregado al carrito.");

      if (promoTableId) {
        registerTableBucketPromo(product, promoTableId);
      }

      closeBeerModal();
    } catch (error) {
      console.error("Error al agregar bebida con cerveza:", error);
      showToast("No se pudo agregar el producto al carrito.", "error");
    }
  };

  const normalizeDrinkSize = (size, productId) => ({
    productDrinkSizeId: size.productDrinkSizeId ?? size.ProductDrinkSizeId ?? null,
    productId: size.productId ?? size.ProductId ?? productId,
    sizeName: size.sizeName ?? size.SizeName ?? "Tamaño",
    ouncesUsed: Number(size.ouncesUsed ?? size.OuncesUsed ?? 0),
    price: Number(size.price ?? size.Price ?? 0),
    imageUrl: getImageUrl(size.imageUrl ?? size.ImageUrl ?? ""),
    usesLiquor:
      size.usesLiquor ?? size.UsesLiquor ??
      (Number(size.ouncesUsed ?? size.OuncesUsed ?? 0) > 0 ||
        Boolean(size.inventorySourceProductId ?? size.InventorySourceProductId)),
  });

  const drinkSizeUsesLiquor = (size) => {
    if (!size) return false;

    const explicitValue = size.usesLiquor ?? size.UsesLiquor;

    if (explicitValue !== undefined && explicitValue !== null) {
      return normalizeBoolean(explicitValue, false);
    }

    return (
      Number(size.ouncesUsed ?? size.OuncesUsed ?? 0) > 0 ||
      Boolean(size.inventorySourceProductId ?? size.InventorySourceProductId)
    );
  };

  const loadDrinkSizesForProduct = async (product) => {
    const response = await api.get(`/Products/${product.productId}/DrinkSizes`);
    return (response.data || []).map((size) => normalizeDrinkSize(size, product.productId));
  };

  const getBottleRequiredAmount = (size, bottle) => {
    const ouncesUsed = Number(size?.ouncesUsed || 0);
    const bottleVolumeMl = Number(bottle?.bottleVolumeMl || 0);

    if (ouncesUsed <= 0 || bottleVolumeMl <= 0) return 0;

    const usedMl = ouncesUsed * ML_PER_OUNCE;
    return usedMl / bottleVolumeMl;
  };

  const bottleHasEnoughStock = (size, bottle) => {
    const stock = Number(bottle?.stock || 0);
    const requiredAmount = getBottleRequiredAmount(size, bottle);

    if (stock <= 0 || requiredAmount <= 0) return false;
    return stock >= requiredAmount;
  };

  const getApproxDrinksFromBottle = (size, bottle) => {
    const requiredAmount = getBottleRequiredAmount(size, bottle);
    const stock = Number(bottle?.stock || 0);

    if (stock <= 0 || requiredAmount <= 0) return 0;
    return Math.floor(stock / requiredAmount);
  };

  const getLiquorBottlesForSize = (size) => {
    return bottleBases.filter((bottle) => {
      const bottleVolumeMl = Number(bottle.bottleVolumeMl || 0);
      const stock = Number(bottle.stock || 0);
      const isActive = normalizeBoolean(bottle.isActive, true);

      return bottleVolumeMl > 0 && (isActive || stock > 0);
    });
  };

  const getSelectableLiquorBottlesForSize = (size) => {
    return getLiquorBottlesForSize(size).filter((bottle) =>
      bottleHasEnoughStock(size, bottle)
    );
  };

  const openLiquorModal = async (product) => {
    try {
      const sizes = await loadDrinkSizesForProduct(product);

      if (sizes.length === 0) {
        showToast("Este producto no tiene tamaños configurados.", "warning");
        return;
      }

      const firstSize = sizes[0];
      const firstSizeUsesLiquor = drinkSizeUsesLiquor(firstSize);
      const bottlesForSize = firstSizeUsesLiquor
        ? getLiquorBottlesForSize(firstSize)
        : [];
      const selectableBottles = firstSizeUsesLiquor
        ? getSelectableLiquorBottlesForSize(firstSize)
        : [];

      if (firstSizeUsesLiquor && bottlesForSize.length === 0) {
        showToast("No hay botellas activas configuradas para preparar esta bebida.", "warning");
        return;
      }

      setLiquorModal({
        isOpen: true,
        product,
        sizes,
        selectedSize: firstSize,
        selectedBottle: firstSizeUsesLiquor ? selectableBottles[0] || null : null,
      });
    } catch (error) {
      console.error("Error al cargar tamaños de licor:", error);
      showToast("No se pudieron cargar los tamaños de la bebida.", "error");
    }
  };

  const closeLiquorModal = () => {
    setLiquorModal({
      isOpen: false,
      product: null,
      sizes: [],
      selectedSize: null,
      selectedBottle: null,
    });
  };

  const addLiquorSelectionToCart = async () => {
    const product = liquorModal.product;
    const selectedSize = liquorModal.selectedSize;
    const selectedBottle = liquorModal.selectedBottle;

    if (!product) {
      showToast("No se encontró el producto seleccionado.", "error");
      return;
    }

    if (!selectedSize) {
      showToast("Selecciona un tamaño.", "warning");
      return;
    }

    const selectedSizeUsesLiquor = drinkSizeUsesLiquor(selectedSize);

    if (selectedSizeUsesLiquor && !selectedBottle) {
      showToast("Selecciona una botella.", "warning");
      return;
    }

    if (selectedSizeUsesLiquor && !bottleHasEnoughStock(selectedSize, selectedBottle)) {
      showToast(`No hay suficiente stock de ${selectedBottle.name}.`, "warning");
      return;
    }

    try {
      const item = {
        productId: product.productId,
        productDrinkSizeId: selectedSize.productDrinkSizeId,
        drinkSizeName: selectedSize.sizeName,
        ouncesUsed: selectedSizeUsesLiquor ? Number(selectedSize.ouncesUsed || 0) : 0,
        name: selectedSizeUsesLiquor
          ? `${product.name} - ${selectedSize.sizeName} - ${selectedBottle.name}`
          : `${product.name} - ${selectedSize.sizeName}`,
        quantity: 1,
        unitPrice: Number(selectedSize.price || 0),
        subtotal: Number(selectedSize.price || 0),
        productType: product.productType,
        selectedBeerProductId: null,
        selectedBottleProductId: selectedSizeUsesLiquor ? selectedBottle.productId : null,
        totalMinutes: null,
      };

      await sendItemToCurrentDestination(item, "Producto agregado al carrito.");
      closeLiquorModal();
    } catch (error) {
      console.error("Error al agregar bebida con licor:", error);
      showToast("No se pudo agregar el producto al carrito.", "error");
    }
  };

  const sendItemToCurrentDestination = async (item, successMessage = "Producto agregado al carrito.") => {
    if (shouldSendProductsToTableTab) {
      await addToTableTab(item);
      return;
    }

    if (shouldSendProductsToBarTab) {
      await addToBarTab(item);
      return;
    }

    await api.post("/ActiveCart/Items", item);
    await loadCart();
    showToast(successMessage, "success");
  };

  const addToCart = async (product) => {
    if (product.requiresBeerSelection) {
      await openBeerModal(product);
      return;
    }

    if (product.productType === "SHOT" || product.productType === "LIQUOR_DRINK") {
      openLiquorModal(product);
      return;
    }

    if (product.trackInventory && Number(product.stock || 0) <= 0) {
      showToast("Producto agotado.", "warning");
      return;
    }

    try {
      const item = {
        productId: product.productId,
        productDrinkSizeId: null,
        drinkSizeName: null,
        ouncesUsed: null,
        name: product.name,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        subtotal: Number(product.price || 0),
        productType: product.productType,
        selectedBeerProductId: null,
        selectedBottleProductId: null,
        totalMinutes: null,
      };

      const promoTableId = shouldSendProductsToTableTab
        ? activeTableInfo?.tableId ??
          activeTableTab?.tableId ??
          activeTableTab?.TableId ??
          null
        : null;

      await sendItemToCurrentDestination(item, "Producto agregado al carrito.");

      if (promoTableId) {
        registerTableBucketPromo(product, promoTableId);
      }
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

  const updateCartItemQuantity = async (cartItemId, rawQuantity) => {
    const item = cart.find((cartItem) => cartItem.cartItemId === cartItemId);
    if (!item) return;

    const parsedQuantity = Number(rawQuantity);

    if (!Number.isFinite(parsedQuantity)) {
      showToast("Ingresa una cantidad válida.", "warning");
      return;
    }

    const newQuantity = Math.floor(parsedQuantity);

    try {
      if (newQuantity <= 0) {
        await api.delete(`/ActiveCart/Items/${item.activeCartItemId}`);
      } else {
        await api.put(`/ActiveCart/Items/${item.activeCartItemId}`, {
          quantity: newQuantity,
        });
      }

      await loadCart();
    } catch (error) {
      console.error("Error al actualizar cantidad manual:", error);
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

  const clearCart = async (showSuccessMessage = true) => {
    try {
      await api.delete("/ActiveCart/Clear");
      await loadCart();
      setSourceCreditSaleId(null);
      setSourceCreditReference("");

      if (showSuccessMessage) {
        showToast("Carrito vaciado correctamente.", "success");
      }
    } catch (error) {
      console.error("Error al vaciar carrito:", error);
      showToast("No se pudo vaciar el carrito.", "error");
    }
  };

  const normalizePendingCreditDetail = (item) => ({
    saleDetailId: item.saleDetailId ?? item.SaleDetailId ?? null,
    productId: item.productId ?? item.ProductId ?? null,
    productDrinkSizeId: item.productDrinkSizeId ?? item.ProductDrinkSizeId ?? null,
    drinkSizeName: item.drinkSizeName ?? item.DrinkSizeName ?? null,
    ouncesUsed: item.ouncesUsed ?? item.OuncesUsed ?? null,
    name: item.name ?? item.Name ?? "Producto",
    quantity: item.quantity ?? item.Quantity ?? 1,
    unitPrice: item.unitPrice ?? item.UnitPrice ?? 0,
    subtotal: item.subtotal ?? item.Subtotal ?? 0,
    productType: item.productType ?? item.ProductType ?? "INDIVIDUAL",
    selectedBeerProductId: item.selectedBeerProductId ?? item.SelectedBeerProductId ?? null,
    selectedBottleProductId: item.selectedBottleProductId ?? item.SelectedBottleProductId ?? null,
    totalMinutes: item.totalMinutes ?? item.TotalMinutes ?? null,
  });

  const normalizePendingCredit = (credit) => {
    const rawDetails = credit.details ?? credit.Details ?? [];

    return {
      saleId: credit.saleId ?? credit.SaleId,
      paymentReference: credit.paymentReference ?? credit.PaymentReference ?? "Sin referencia",
      total: credit.total ?? credit.Total ?? 0,
      createdAt: credit.createdAt ?? credit.CreatedAt ?? null,
      details: rawDetails.map(normalizePendingCreditDetail),
    };
  };

  const loadPendingCredits = async () => {
    try {
      const response = await api.get("/Sales/Credits/Pending");
      const normalizedCredits = (response.data || []).map(normalizePendingCredit);
      setPendingCredits(normalizedCredits);
      setCreditModalOpen(true);
    } catch (error) {
      console.error("Error al cargar créditos pendientes:", error);
      showToast("No se pudieron cargar los créditos pendientes.", "error");
    }
  };

  const openManualCreditModal = () => {
    setManualCreditName("");
    setManualCreditAmount("");
    setManualCreditDescription("");
    setManualCreditModalOpen(true);
  };

  const closeManualCreditModal = () => {
    setManualCreditModalOpen(false);
    setManualCreditName("");
    setManualCreditAmount("");
    setManualCreditDescription("");
  };

  const submitManualCredit = async () => {
    const amount = Number(manualCreditAmount || 0);
    const debtorName = manualCreditName.trim();
    const description = manualCreditDescription.trim();

    if (!debtorName) {
      showToast("Ingresa el nombre o referencia de quien debe.", "warning");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("El monto del crédito debe ser mayor a cero.", "warning");
      return;
    }

    const creditPaymentMethod = getCreditPaymentMethod();

    if (!creditPaymentMethod) {
      showToast("No existe el método de pago Crédito.", "error");
      return;
    }

    const manualCreditProduct = getManualCreditProduct();

    if (!manualCreditProduct) {
      showToast("Falta crear el producto interno 'Crédito manual'.", "error");
      return;
    }

    try {
      setLoading(true);

      await api.post("/Sales", {
        userId: 1,
        paymentMethodId: Number(creditPaymentMethod.paymentMethodId),
        paymentReference: description
          ? `${debtorName} - ${description}`
          : debtorName,
        sourceCreditSaleId: null,
        details: [
          {
            productId: manualCreditProduct.productId,
            name: `Crédito manual - ${debtorName}`,
            quantity: 1,
            customUnitPrice: amount,
            selectedBeerProductId: null,
            selectedBottleProductId: null,
            productDrinkSizeId: null,
            drinkSizeName: null,
            ouncesUsed: null,
            totalMinutes: null,
          },
        ],
      });

      closeManualCreditModal();
      await loadPendingCredits();
      showToast("Crédito registrado correctamente.", "success");
    } catch (error) {
      console.error("Error al registrar crédito manual:", error);
      showToast(
        normalizeApiError(error, "No se pudo registrar el crédito."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const sendCreditToCart = async (credit) => {
    try {
      if (!credit.details || credit.details.length === 0) {
        showToast("El crédito no tiene productos.", "warning");
        return;
      }

      await api.delete("/ActiveCart/Clear");
      await sendItemsToActiveCart(credit.details);

      setSourceCreditSaleId(credit.saleId);
      setSourceCreditReference(credit.paymentReference || `Venta #${credit.saleId}`);
      setPaymentReference("");
      setCashReceived("");
      setCreditModalOpen(false);
      await loadCart();
      showToast("Crédito enviado al carrito. Selecciona efectivo, tarjeta o transferencia.", "success");
    } catch (error) {
      console.error("Error al mandar crédito al carrito:", error);
      showToast("No se pudo mandar el crédito al carrito.", "error");
    }
  };

  const tableRentalProduct = products.find(
    (product) =>
      product.productType === "SERVICE" &&
      String(product.name || "").toLowerCase().includes("mesa")
  );

  const onAddTableCharge = async (tableCharge) => {
    try {
      const unitPrice = Number(
        tableCharge.total ?? tableCharge.unitPrice ?? tableCharge.subtotal ?? 0
      );

      const tableId =
        tableCharge.tableId ?? tableCharge.poolTableId ?? tableCharge.TableId ?? null;
      const tableNumber = tableCharge.tableNumber ?? tableCharge.TableNumber ?? null;
      const tableName =
        tableCharge.tableName ?? tableCharge.TableName ?? `Mesa ${tableNumber || tableId || ""}`;
      const tableType = tableCharge.tableType ?? tableCharge.TableType ?? "";

      const hasTableNote = Boolean(
        tableCharge.hasTableNote ??
          tableCharge.HasTableNote ??
          Number(tableCharge.tableNoteItemCount || 0) > 0
      );

      let targetTableTabId = null;

      if (hasTableNote && tableId) {
        const response = await api.post("/BarTabs/Table/Open", {
          tableId,
          tableNumber,
          tableName,
          tableType,
        });

        const tableTab = normalizeTableTab(response.data);
        targetTableTabId = tableTab.barTabId;

        setActiveTableTabId(tableTab.barTabId);
        setActiveTableInfo({ tableId, tableNumber, tableName, tableType });
      }

      const item = {
        productId:
          tableCharge.productId ??
          tableCharge.ProductId ??
          tableRentalProduct?.productId ??
          null,
        productDrinkSizeId: null,
        drinkSizeName: null,
        ouncesUsed: null,
        name:
          tableCharge.name ??
          tableCharge.Name ??
          `Renta mesa de billar M${tableNumber || ""}`,
        quantity: 1,
        unitPrice,
        subtotal: unitPrice,
        productType: "SERVICE",
        selectedBeerProductId: null,
        selectedBottleProductId: null,
        totalMinutes: tableCharge.totalMinutes ?? tableCharge.TotalMinutes ?? null,
      };

      if (targetTableTabId) {
        await api.post(`/BarTabs/${targetTableTabId}/Items`, item);
        await loadTableTabs();
        await sendTableTabToCart(targetTableTabId);
        return;
      }

      await api.post("/ActiveCart/Items", item);
      await loadCart();
      showToast("Mesa agregada al carrito.", "success");
    } catch (error) {
      console.error("Error al agregar mesa al carrito:", error);
      showToast(
        normalizeApiError(error, "No se pudo agregar la mesa al carrito."),
        "error"
      );
    }
  };

  const validateAndCleanCart = async () => {
    return await loadCart();
  };

  const appendCashNumber = (value) => {
    setCashReceived((prev) => {
      const currentValue = String(prev || "");

      if (value === ".") {
        if (currentValue.includes(".")) return currentValue;
        return currentValue === "" ? "0." : currentValue + ".";
      }

      if (currentValue === "0") return value;
      return currentValue + value;
    });
  };

  const deleteCashNumber = () => {
    setCashReceived((prev) => {
      const currentValue = String(prev || "");
      if (currentValue.length <= 1) return "";
      return currentValue.slice(0, -1);
    });
  };

  const clearCashReceived = () => {
    setCashReceived("");
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

    if (isPayingPendingCredit && (isCourtesyPayment || isCreditPayment)) {
      showToast("El crédito pendiente debe pagarse con efectivo, tarjeta o transferencia.", "warning");
      return;
    }

    if (requiresPaymentReference && !paymentReference.trim()) {
      showToast("Ingresa el nombre o referencia.", "warning");
      return;
    }

    if (isCashPayment && !isCourtesyPayment && !isCreditPayment && cashReceivedNumber < cartTotal) {
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
        paymentReference: isPayingPendingCredit
          ? `Pago de crédito: ${sourceCreditReference}`
          : requiresPaymentReference
          ? paymentReference.trim()
          : null,
        sourceCreditSaleId: sourceCreditSaleId || null,
        details: cleanedCart.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          customUnitPrice: item.unitPrice,
          productDrinkSizeId: item.productDrinkSizeId || null,
          selectedBeerProductId: item.selectedBeerProductId || null,
          selectedBottleProductId: item.selectedBottleProductId || null,
          totalMinutes: item.totalMinutes || null,
        })),
      };

      const shouldIncreaseCashBox =
        isCashPayment && !isCourtesyPayment && !isCreditPayment && !isHotelPayment;

      const saleAmountForCashBox = cleanedCart.reduce(
        (total, item) => total + Number(item.subtotal || 0),
        0
      );

      await api.post("/Sales", payload);

      // Actualización visual inmediata de la tarjeta existente de Caja actual.
      // Después se vuelve a consultar la API para dejar el monto real del servidor.
      if (shouldIncreaseCashBox) {
        setCashBox((previousCashBox) => {
          if (!previousCashBox) return previousCashBox;

          return {
            ...previousCashBox,
            currentAmount: Number(previousCashBox.currentAmount || 0) + saleAmountForCashBox,
            updatedAt: new Date().toISOString(),
          };
        });
      }

      const successMessage = isHotelPayment
        ? "Hotel registrado correctamente. Se descuenta inventario y no se registra como efectivo cobrado."
        : isCourtesyPayment
        ? "Cortesía registrada correctamente. Se descuenta inventario y no se cobra efectivo."
        : isCreditPayment
        ? "Crédito registrado correctamente. Queda como pendiente de pago."
        : "Venta registrada correctamente.";

      showToast(successMessage, "success");

      await clearCart(false);

      await Promise.all([
        loadProducts(),
        loadBeers(),
        loadBottleBases(),
        loadCashBox(),
      ]);

      // Refresco adicional breve para cubrir pequeños retrasos del servidor/API después de guardar la venta.
      setTimeout(() => {
        loadCashBox();
      }, 700);

      setCashReceived("");
      setPaymentReference("");
      setSourceCreditSaleId(null);
      setSourceCreditReference("");
    } catch (error) {
      console.error("Error al registrar venta:", error);
      showToast(normalizeApiError(error, "No se pudo registrar la venta."), "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const visibleProducts = products.filter(
      (product) => !isManualCreditProduct(product)
    );

    const normalizedSearch = searchTerm.toLowerCase().trim();
    if (!normalizedSearch) return visibleProducts;

    return visibleProducts.filter((product) => {
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

  const groupedProducts = [...filteredProducts]
    .sort(sortProductsByBeerOrder)
    .reduce((groups, product) => {
      const categoryName = product.category || "Sin categoría";

      if (!groups[categoryName]) groups[categoryName] = [];
      groups[categoryName].push(product);
      return groups;
    }, {});

  const orderedCategoryNames = Object.keys(groupedProducts).sort((a, b) => {
    const indexA = categoryPriority.indexOf(a);
    const indexB = categoryPriority.indexOf(b);
    const priorityA = indexA === -1 ? 999 : indexA;
    const priorityB = indexB === -1 ? 999 : indexB;

    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.localeCompare(b);
  });

  const currentNoteLabel = activeBarTab?.customerName || "Barra";

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
        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

        {barTabExpanded && (
          <div className="bar-note-overlay">
            <div className="bar-note-panel">
              <div className="bar-note-panel-header">
                <h2>Notas de barra</h2>
                <button
                  type="button"
                  onClick={() => {
                    setBarTabExpanded(false);
                    setIsEditingBarTabName(false);
                  }}
                >
                  ×
                </button>
              </div>

              <div className="bar-notes-list">
                {barTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.barTabId}
                    className={`bar-note-chip ${
                      Number(tab.barTabId) === Number(activeBarTabId)
                        ? "bar-note-chip-active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveTableTabId(null);
                      setActiveTableInfo(null);
                      setActiveBarTabId(tab.barTabId);
                      setBarTabNameDraft(tab.customerName || "");
                      setIsEditingBarTabName(false);
                    }}
                  >
                    <strong>{tab.customerName || "Sin nombre"}</strong>
                    <small>
                      {tab.items.length} · {formatCurrency(tab.total)}
                    </small>
                  </button>
                ))}

                <button type="button" className="new-bar-note-button" onClick={createNewBarTab}>
                  + Nota
                </button>
              </div>

              <div className="bar-note-body">
                {!activeBarTab ? (
                  <>
                    <input
                      type="text"
                      className="bar-note-name-input"
                      placeholder="Nombre o mesa"
                      value={barTabNameDraft}
                      onChange={(e) => {
                        setIsEditingBarTabName(true);
                        setBarTabNameDraft(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openBarTab();
                      }}
                    />

                    <button type="button" className="bar-note-open-button" onClick={openBarTab}>
                      Activar nota
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      className="bar-note-name-input"
                      placeholder="Nombre o mesa"
                      value={barTabNameDraft}
                      onFocus={() => setIsEditingBarTabName(true)}
                      onChange={(e) => {
                        setIsEditingBarTabName(true);
                        setBarTabNameDraft(e.target.value);
                      }}
                      onBlur={updateBarTabName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateBarTabName();
                          e.target.blur();
                        }
                      }}
                    />

                    <div className="bar-note-items">
                      {activeBarTab.items.length === 0 ? (
                        <p className="bar-note-empty">No hay productos en la nota.</p>
                      ) : (
                        activeBarTab.items.map((item) => (
                          <div className="bar-note-item" key={item.barTabItemId}>
                            <strong>{item.name}</strong>
                            <span>
                              {item.totalMinutes
                                ? `${item.totalMinutes} min`
                                : `${Number(item.quantity || 1)} x`}
                            </span>
                            <b>{formatCurrency(item.subtotal || 0)}</b>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bar-note-total">
                      <span>Total</span>
                      <strong>{formatCurrency(activeBarTab.total)}</strong>
                    </div>

                    <div className="bar-note-actions">
                      <button type="button" className="bar-note-cancel-button" onClick={cancelBarTab}>
                        Cancelar nota
                      </button>
                      <button type="button" className="bar-note-charge-button" onClick={chargeBarTab}>
                        Mandar al carrito
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tableTabExpanded && activeTableTab && (
          <div className="bar-note-overlay">
            <div className="bar-note-panel table-note-panel">
              <div className="bar-note-panel-header">
                <div>
                  <h2>{activeTableTab.tableName || activeTableInfo?.tableName || "Nota de mesa"}</h2>
                  <p>Productos vinculados a esta mesa</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTableTabExpanded(false);
                    setActiveTableTabId(null);
                    setActiveTableInfo(null);
                  }}
                >
                  ×
                </button>
              </div>

              <div className="bar-note-body">
                <div className="bar-note-items">
                  {activeTableTab.items.length === 0 ? (
                    <p className="bar-note-empty">
                      No hay productos en la nota de esta mesa.
                    </p>
                  ) : (
                    activeTableTab.items.map((item) => (
                      <div className="bar-note-item" key={item.barTabItemId}>
                        <strong>{item.name}</strong>
                        <span>
                          {item.totalMinutes
                            ? `${item.totalMinutes} min`
                            : `${Number(item.quantity || 1)} x`}
                        </span>
                        <b>{formatCurrency(item.subtotal || 0)}</b>
                      </div>
                    ))
                  )}
                </div>

                <div className="bar-note-total">
                  <span>Total nota</span>
                  <strong>{formatCurrency(activeTableTab.total)}</strong>
                </div>

                <div className="bar-note-actions">
                  <button
                    type="button"
                    className="bar-note-cancel-button"
                    onClick={() => cancelTableTab(activeTableTab.barTabId)}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="bar-note-charge-button"
                    onClick={() => sendTableTabToCart(activeTableTab.barTabId)}
                  >
                    Mandar al carrito
                  </button>
                </div>
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
                      : "Seleccionar tamaño y cerveza"}
                  </h2>
                  <p>
                    {beerModal.product?.productType === "BEER_BUCKET"
                      ? "La cubeta descontará 10 unidades de la cerveza seleccionada."
                      : "Selecciona primero el tamaño de la bebida y después la cerveza."}
                  </p>
                </div>

                <button type="button" className="modal-close-button" onClick={closeBeerModal}>
                  ×
                </button>
              </div>

              {beerModal.sizes.length > 0 && (
                <div className="liquor-modal-section">
                  <div className="liquor-section-title">
                    <strong>Tamaños</strong>
                    <span>Elige la presentación que se cobrará</span>
                  </div>

                  <div className="liquor-size-grid">
                    {beerModal.sizes.map((size, index) => {
                      const sizeKey =
                        size.productDrinkSizeId ||
                        `${size.productId}-${size.sizeName}-${index}`;
                      const isSelected =
                        Number(beerModal.selectedSize?.productDrinkSizeId) ===
                          Number(size.productDrinkSizeId) ||
                        (!beerModal.selectedSize?.productDrinkSizeId &&
                          beerModal.selectedSize?.sizeName === size.sizeName);

                      return (
                        <button
                          type="button"
                          key={sizeKey}
                          className={`liquor-size-card ${
                            isSelected ? "liquor-size-card-active" : ""
                          }`}
                          onClick={() => {
                            setBeerModal((prev) => ({
                              ...prev,
                              selectedSize: size,
                            }));
                          }}
                        >
                          <div className="liquor-size-image">
                            {size.imageUrl ? (
                              <img src={size.imageUrl} alt={size.sizeName} />
                            ) : (
                              <span>Sin imagen</span>
                            )}
                          </div>

                          <div className="liquor-size-info">
                            <strong>{size.sizeName}</strong>
                            {Number(size.ouncesUsed || 0) > 0 && (
                              <span>{Number(size.ouncesUsed || 0)} oz</span>
                            )}
                            <b>{formatCurrency(size.price)}</b>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="liquor-modal-section">
                <div className="liquor-section-title">
                  <strong>Cervezas disponibles</strong>
                  <span>
                    {beerModal.product?.productType === "BEER_BUCKET"
                      ? "Solo se muestran cervezas compatibles con el precio de la cubeta."
                      : "Selecciona la cerveza que se descontará del inventario."}
                  </span>
                </div>

                {getBeersForProduct(beerModal.product).length === 0 ? (
                  <p>No hay cervezas disponibles para este precio.</p>
                ) : (
                  <div className="beer-card-grid">
                    {getBeersForProduct(beerModal.product).map((beer) => {
                      const requiredQuantity = getRequiredBeerQuantity(beerModal.product);
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
          </div>
        )}

        {liquorModal.isOpen && (
          <div className="modal-overlay">
            <div className="beer-selector-modal liquor-selection-modal">
              <div className="beer-selector-header">
                <div>
                  <h2>{liquorModal.product?.name}</h2>
                  <p>
                    Selecciona el tamaño. Si el tamaño no usa licor, se registra la venta sin descontar botella.
                  </p>
                </div>

                <button type="button" className="modal-close-button" onClick={closeLiquorModal}>
                  ×
                </button>
              </div>

              <div className="liquor-modal-section">
                <div className="liquor-section-title">
                  <strong>Tamaños</strong>
                  <span>Elige la presentación que se cobrará</span>
                </div>

                <div className="liquor-size-grid">
                  {liquorModal.sizes.map((size, index) => {
                    const sizeKey = size.productDrinkSizeId || `${size.productId}-${size.sizeName}-${index}`;
                    const isSelected =
                      Number(liquorModal.selectedSize?.productDrinkSizeId) === Number(size.productDrinkSizeId) ||
                      (!liquorModal.selectedSize?.productDrinkSizeId && liquorModal.selectedSize?.sizeName === size.sizeName);

                    return (
                      <button
                        type="button"
                        key={sizeKey}
                        className={`liquor-size-card ${isSelected ? "liquor-size-card-active" : ""}`}
                        onClick={() => {
                          const sizeUsesLiquor = drinkSizeUsesLiquor(size);
                          const selectableBottlesForSize = sizeUsesLiquor
                            ? getSelectableLiquorBottlesForSize(size)
                            : [];
                          const stillValidBottle = selectableBottlesForSize.find(
                            (bottle) => Number(bottle.productId) === Number(liquorModal.selectedBottle?.productId)
                          );
                          const nextBottle = sizeUsesLiquor
                            ? stillValidBottle || selectableBottlesForSize[0] || null
                            : null;

                          setLiquorModal((prev) => ({
                            ...prev,
                            selectedSize: size,
                            selectedBottle: nextBottle,
                          }));
                        }}
                      >
                        <div className="liquor-size-image">
                          {size.imageUrl ? <img src={size.imageUrl} alt={size.sizeName} /> : <span>Sin imagen</span>}
                        </div>
                        <div className="liquor-size-info">
                          <strong>{size.sizeName}</strong>
                          {drinkSizeUsesLiquor(size) ? (
                            <span>{Number(size.ouncesUsed || 0)} oz</span>
                          ) : (
                            <span>Sin licor · sin descuento de botella</span>
                          )}
                          <b>{formatCurrency(size.price)}</b>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {drinkSizeUsesLiquor(liquorModal.selectedSize) ? (
                <div className="liquor-modal-section liquor-bottle-section">
                  <div className="liquor-section-title">
                    <strong>Botellas disponibles</strong>
                    <span>
                      Se muestran las botellas activas del inventario. Las que no tengan existencia suficiente aparecen deshabilitadas.
                    </span>
                  </div>

                  <div className="liquor-bottle-row liquor-bottle-row-expanded">
                    {getLiquorBottlesForSize(liquorModal.selectedSize).map((bottle) => {
                      const stock = Number(bottle.stock || 0);
                      const hasEnoughStock = bottleHasEnoughStock(liquorModal.selectedSize, bottle);
                      const isSelected =
                        hasEnoughStock &&
                        Number(liquorModal.selectedBottle?.productId) === Number(bottle.productId);
                      const approxDrinks = getApproxDrinksFromBottle(liquorModal.selectedSize, bottle);

                      return (
                        <button
                          type="button"
                          key={bottle.productId}
                          className={`liquor-bottle-chip ${isSelected ? "liquor-bottle-chip-active" : ""} ${
                            !hasEnoughStock ? "liquor-bottle-chip-disabled" : ""
                          }`}
                          disabled={!hasEnoughStock}
                          onClick={() => {
                            if (!hasEnoughStock) return;

                            setLiquorModal((prev) => ({
                              ...prev,
                              selectedBottle: bottle,
                            }));
                          }}
                        >
                          <div className="liquor-bottle-image">
                            {bottle.imageUrl ? <img src={bottle.imageUrl} alt={bottle.name} /> : <span>Sin imagen</span>}
                          </div>

                          <div className="liquor-bottle-info">
                            <strong>{bottle.name}</strong>
                            <span>Stock: {stock.toFixed(2)}</span>
                            {hasEnoughStock ? (
                              <small>Aprox.: {approxDrinks} bebida(s)</small>
                            ) : (
                              <small className="liquor-bottle-unavailable">Sin existencia suficiente</small>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="liquor-modal-section">
                  <div className="liquor-section-title">
                    <strong>Sin licor</strong>
                    <span>Este tamaño solo registra la venta; no descuenta botella ni onzas del inventario.</span>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="modal-cancel-button" onClick={closeLiquorModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="modal-confirm-button"
                  onClick={addLiquorSelectionToCart}
                  disabled={
                    !liquorModal.selectedSize ||
                    (drinkSizeUsesLiquor(liquorModal.selectedSize) &&
                      (!liquorModal.selectedBottle ||
                        !bottleHasEnoughStock(liquorModal.selectedSize, liquorModal.selectedBottle)))
                  }
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        )}

        {creditModalOpen && (
          <div className="modal-overlay">
            <div className="beer-selector-modal credit-modal">
              <div className="beer-selector-header">
                <div>
                  <h2>Créditos pendientes</h2>
                  <p>Selecciona una nota de crédito para mandarla al carrito.</p>
                </div>
                <button type="button" className="modal-close-button" onClick={() => setCreditModalOpen(false)}>
                  ×
                </button>
              </div>

              {pendingCredits.length === 0 ? (
                <p>No hay créditos pendientes.</p>
              ) : (
                <div className="credit-notes-grid">
                  {pendingCredits.map((credit) => (
                    <div className="credit-note-card" key={credit.saleId}>
                      <div className="credit-note-header">
                        <strong>{credit.paymentReference || "Sin referencia"}</strong>
                        <span>Venta #{credit.saleId}</span>
                      </div>

                      <div className="credit-note-items">
                        {(credit.details || []).length === 0 ? (
                          <p className="credit-note-empty">Sin productos registrados.</p>
                        ) : (
                          (credit.details || []).map((item, index) => (
                            <div className="credit-note-item" key={`${credit.saleId}-${item.saleDetailId || item.productId || index}`}>
                              <strong>{item.name}</strong>
                              <span>{item.totalMinutes ? `${item.totalMinutes} min` : `${Number(item.quantity || 1)} x`}</span>
                              <b>{formatCurrency(item.subtotal)}</b>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="credit-note-total">
                        <span>Total pendiente</span>
                        <strong>{formatCurrency(credit.total)}</strong>
                      </div>

                      <button type="button" className="credit-note-send-button" onClick={() => sendCreditToCart(credit)}>
                        Mandar al carrito
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {manualCreditModalOpen && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h2>Registrar crédito en efectivo</h2>
              <p>Registra dinero que una persona queda debiendo sin agregar productos al carrito.</p>

              <div className="courtesy-reference-box">
                <label>Nombre o referencia</label>
                <input
                  type="text"
                  value={manualCreditName}
                  onChange={(e) => setManualCreditName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Mesa 4"
                />
              </div>

              <div className="cash-payment-box">
                <label>Monto del crédito</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="cash-input"
                  value={manualCreditAmount}
                  onChange={(e) => setManualCreditAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="courtesy-reference-box">
                <label>Descripción opcional</label>
                <input
                  type="text"
                  value={manualCreditDescription}
                  onChange={(e) => setManualCreditDescription(e.target.value)}
                  placeholder="Ej. Dinero prestado / cuenta pendiente"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeManualCreditModal}
                  disabled={loading}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="modal-confirm-button"
                  onClick={submitManualCredit}
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar crédito"}
                </button>
              </div>
            </div>
          </div>
        )}

        {cashMovementModal.isOpen && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h2>{cashMovementModal.type === "add" ? "Entrada de efectivo" : "Retiro de efectivo"}</h2>

              <div className="cash-payment-box">
                <label>Monto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="cash-input"
                  value={cashMovementAmount}
                  onChange={(e) => setCashMovementAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="courtesy-reference-box">
                <label>Motivo</label>
                <input
                  type="text"
                  value={cashMovementDescription}
                  onChange={(e) => setCashMovementDescription(e.target.value)}
                  placeholder={
                    cashMovementModal.type === "add"
                      ? "Ej. Cambio inicial / ingreso manual"
                      : "Ej. Retiro para compra de insumos"
                  }
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-cancel-button" onClick={closeCashMovementModal} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="modal-confirm-button" onClick={submitCashMovement} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar movimiento"}
                </button>
              </div>
            </div>
          </div>
        )}

        {cashCutsModalOpen && (
          <div className="modal-overlay">
            <div className="modal-box cash-cuts-modal">
              <div className="beer-selector-header">
                <div>
                  <h2>Cortes de caja</h2>
                  <p>Historial detallado de cortes realizados.</p>
                </div>
                <button type="button" className="modal-close-button" onClick={closeCashCutsModal}>
                  ×
                </button>
              </div>

              {cashCuts.length === 0 ? (
                <p>No hay cortes registrados.</p>
              ) : (
                <div className="cash-cuts-list">
                  {cashCuts.map((cut) => (
                    <article className="cash-cut-card" key={cut.cashMovementId}>
                      <div className="cash-cut-card-header">
                        <div>
                          <strong>Corte #{cut.cashMovementId}</strong>
                          <small>{cut.createdAt ? new Date(cut.createdAt).toLocaleString("es-MX") : "Sin fecha"}</small>
                        </div>
                        <span>Corte realizado</span>
                      </div>

                      <div className="cash-cut-card-period">
                        <span>Periodo</span>
                        <strong>
                          {cut.cutStartDate ? new Date(cut.cutStartDate).toLocaleString("es-MX") : "Sin inicio"} — {cut.cutEndDate ? new Date(cut.cutEndDate).toLocaleString("es-MX") : "Sin cierre"}
                        </strong>
                      </div>

                      <div className="cash-cut-detail-grid">
                        <div><span>Caja antes del corte</span><strong>{formatCurrency(cut.amount)}</strong></div>
                        <div><span>Ventas en efectivo</span><strong>{formatCurrency(cut.saleCash)}</strong></div>
                        <div><span>Créditos liquidados en efectivo</span><strong>{formatCurrency(cut.creditPaid)}</strong></div>
                        <div><span>Caja inicial</span><strong>{formatCurrency(cut.manualAdds)}</strong></div>
                        <div><span>Retiros manuales</span><strong>{formatCurrency(cut.manualSubtracts)}</strong></div>
                        <div><span>Ajustes manuales</span><strong>{formatCurrency(cut.manualAdjusts)}</strong></div>
                        <div className="cash-cut-total-row"><span>Total entradas</span><strong>{formatCurrency(cut.totalEntries)}</strong></div>
                        <div className="cash-cut-total-row"><span>Total salidas</span><strong>{formatCurrency(cut.totalExits)}</strong></div>
                        <div className="cash-cut-final-row"><span>Monto final en caja</span><strong>{formatCurrency(cut.finalAmount)}</strong></div>
                      </div>

                      <p className="cash-cut-description">{cut.description || "Sin descripción"}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {cashCutModalOpen && (
          <div className="modal-overlay">
            <div className="modal-box cash-cut-modal">
              <h2>Corte de caja</h2>

              {cashCutPreview ? (
                <div className="cash-cut-summary">
                  <div>
                    <span>Periodo del corte</span>
                    <strong>{cashCutPreview.startDate ? new Date(cashCutPreview.startDate).toLocaleString("es-MX") : "Desde inicio del día"}</strong>
                  </div>
                  <div><span>Caja actual</span><strong>{formatCurrency(cashCutPreview.currentAmount)}</strong></div>
                  <div><span>Ventas en efectivo</span><strong>{formatCurrency(cashCutPreview.saleCash)}</strong></div>
                  <div><span>Créditos liquidados en efectivo</span><strong>{formatCurrency(cashCutPreview.creditPaid)}</strong></div>
                  <div><span>Caja inicial</span><strong>{formatCurrency(cashCutPreview.manualAdds)}</strong></div>
                  <div><span>Retiros manuales</span><strong>{formatCurrency(cashCutPreview.manualSubtracts)}</strong></div>
                  <div><span>Ajustes manuales</span><strong>{formatCurrency(cashCutPreview.manualAdjusts)}</strong></div>
                  <div className="cash-cut-total-row"><span>Total entradas</span><strong>{formatCurrency(cashCutPreview.totalEntries)}</strong></div>
                  <div className="cash-cut-total-row"><span>Total salidas</span><strong>{formatCurrency(cashCutPreview.totalExits)}</strong></div>
                </div>
              ) : (
                <p>Cargando corte...</p>
              )}

              <div className="cash-payment-box">
                <label>Monto que quedará en caja</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="cash-input"
                  value={cashCutFinalAmount}
                  onChange={(e) => setCashCutFinalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="courtesy-reference-box">
                <label>Descripción</label>
                <input
                  type="text"
                  value={cashCutDescription}
                  onChange={(e) => setCashCutDescription(e.target.value)}
                  placeholder="Ej. Corte de cierre"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="modal-cancel-button" onClick={closeCashCutModal} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="modal-confirm-button" onClick={submitCashCut} disabled={loading}>
                  {loading ? "Procesando..." : "Realizar corte"}
                </button>
              </div>
            </div>
          </div>
        )}

        <TablesSidebar
          onAddTableCharge={onAddTableCharge}
          tableRentalProduct={tableRentalProduct}
          onNotify={showToast}
          onOpenTableNote={openTableNote}
          activeTableNoteId={tableTabExpanded ? activeTableInfo?.tableId : null}
          tableNotes={tableTabs}
        />

        <main className="pos-main">
          <div className="pos-header pos-notes-header">
            <button
              type="button"
              className="bar-notes-button"
              onClick={() => {
                setTableTabExpanded(false);
                setActiveTableTabId(null);
                setActiveTableInfo(null);
                setBarTabExpanded((prev) => !prev);
              }}
            >
              <span>Notas</span>
              <strong>{currentNoteLabel}</strong>
              <small>{barTabs.length} nota(s) abiertas</small>
            </button>

            <div className="mini-notes-strip">
              {barTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.barTabId}
                  className={`mini-command-note ${
                    Number(tab.barTabId) === Number(activeBarTabId)
                      ? "mini-command-note-active"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveTableTabId(null);
                    setActiveTableInfo(null);
                    setTableTabExpanded(false);
                    setActiveBarTabId(tab.barTabId);
                    setBarTabNameDraft(tab.customerName || "");
                    setIsEditingBarTabName(false);
                    setBarTabExpanded(true);
                  }}
                >
                  <strong>{tab.customerName || "Sin nombre"}</strong>
                  <span>{tab.items.length} producto(s)</span>
                  <b>{formatCurrency(tab.total)}</b>
                </button>
              ))}

              <button type="button" className="mini-command-add" onClick={createNewBarTab}>
                + Nota
              </button>
            </div>
          </div>

          {orderedCategoryNames.length === 0 ? (
            <p>No hay productos disponibles.</p>
          ) : (
            <div className="category-sections">
              {orderedCategoryNames.map((categoryName) => (
                <section className="product-category-section" key={categoryName}>
                  <div className="product-category-header">
                    <h2>{categoryName}</h2>
                    <span>{groupedProducts[categoryName].length} producto(s)</span>
                  </div>

                  <div className="products-grid">
                    {groupedProducts[categoryName].map((product) => (
                      <ProductCard key={product.productId} product={product} onAdd={addToCart} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>

        <aside className="cart-sidebar">
          <h2>Carrito</h2>

          <div className="cashbox-sidebar-card">
            <span>Caja actual</span>
            <strong>
              {cashBox ? formatCurrency(cashBox.currentAmount) : "Cargando..."}
            </strong>

            <div className="cashbox-actions cashbox-actions-four">
              <button type="button" onClick={() => openCashMovementModal("add")} disabled={loading}>
                Entrada
              </button>
              <button type="button" onClick={() => openCashMovementModal("subtract")} disabled={loading}>
                Retiro
              </button>
              <button type="button" onClick={openCashCutModal} disabled={loading} title="Realizar corte de caja">
                Corte
              </button>
              <button type="button" onClick={loadCashCuts} disabled={loading} title="Ver historial de cortes">
                Ver cortes
              </button>
              
            </div>
          </div>

          {cart.length === 0 ? (
            <p className="empty-cart-text">No hay productos agregados.</p>
          ) : (
            <div className="cart-items cart-items-compact">
              {cart.map((item) => {
                const quantityLabel = item.totalMinutes
                  ? `${item.totalMinutes} min`
                  : `x${Number(item.quantity || 1)}`;
                const detailParts = [];

                if (item.drinkSizeName) detailParts.push(item.drinkSizeName);
                if (item.ouncesUsed) detailParts.push(`${item.ouncesUsed} oz`);
                if (item.totalMinutes) detailParts.push("Renta de mesa");

                return (
                  <div className="cart-line-item" key={item.cartItemId}>
                    <div className="cart-line-info">
                      <strong className="cart-line-name">{item.name}</strong>
                      {detailParts.length > 0 && <small className="cart-line-extra">{detailParts.join(" · ")}</small>}
                    </div>

                    <div className="cart-line-quantity">
                      {!item.totalMinutes ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="cart-quantity-input"
                          style={{
                            width: "64px",
                            textAlign: "center",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            padding: "4px 6px",
                          }}
                          defaultValue={Number(item.quantity || 1)}
                          onFocus={(e) => e.currentTarget.select()}
                          onBlur={(e) => {
                            const value = e.currentTarget.value;

                            if (value === "") {
                              e.currentTarget.value = Number(item.quantity || 1);
                              return;
                            }

                            updateCartItemQuantity(item.cartItemId, value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateCartItemQuantity(item.cartItemId, e.currentTarget.value);
                              e.currentTarget.blur();
                            }
                          }}
                          aria-label={`Cantidad de ${item.name}`}
                        />
                      ) : (
                        <span>{quantityLabel}</span>
                      )}
                    </div>

                    <strong className="cart-line-price">{formatCurrency(item.subtotal)}</strong>
                    <button
                      type="button"
                      className="cart-line-remove"
                      onClick={() => removeFromCart(item.cartItemId)}
                      title="Eliminar producto"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="cart-total">
            <span>Total</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>

          {isPayingPendingCredit && (
            <div className="courtesy-reference-box">
              <label>Crédito seleccionado</label>
              <strong>{sourceCreditReference}</strong>
              <p>Selecciona efectivo, tarjeta o transferencia para liquidarlo.</p>
            </div>
          )}

          <div className="payment-box">
            <label>Método de pago</label>

            <div className="payment-method-buttons">
              {paymentMethods.map((method) => {
                const isSelected = Number(selectedPaymentMethodId) === Number(method.paymentMethodId);
                const methodName = (method.name || "").toLowerCase();
                const methodIsCredit = methodName === "crédito" || methodName === "credito";
                const methodIsCourtesy = methodName === "cortesía" || methodName === "cortesia";
                const methodIsHotel = methodName === "hotel";
                const methodDisabled =
                  isPayingPendingCredit &&
                  (methodIsCredit || methodIsCourtesy || methodIsHotel);

                return (
                  <button
                    type="button"
                    key={method.paymentMethodId}
                    className={`payment-method-button ${isSelected ? "payment-method-button-active" : ""}`}
                    disabled={methodDisabled}
                    onClick={() => {
                      if (methodDisabled) return;
                      setSelectedPaymentMethodId(method.paymentMethodId);
                      setCashReceived("");
                      setPaymentReference("");
                    }}
                  >
                    {renderPaymentMethodIcon(method.name)}
                    <span className="payment-method-label">{method.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isCashPayment && !isCourtesyPayment && !isCreditPayment && (
            <>
              <div className="cash-sidebar-box">
                <label>Efectivo recibido</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="cash-sidebar-input"
                  value={cashReceived}
                  placeholder="0.00"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) setCashReceived(value);
                  }}
                />

                <div className="cash-sidebar-change">
                  <span>Cambio</span>
                  <strong className={cashChange < 0 ? "cash-change-negative" : ""}>
                    {formatCurrency(cashChange > 0 ? cashChange : 0)}
                  </strong>
                </div>

                {cashReceivedNumber < cartTotal && cart.length > 0 && (
                  <p className="cash-warning">Falta {formatCurrency(cartTotal - cashReceivedNumber)}</p>
                )}
              </div>

              <div className="pos-numpad-sidebar">
                <div className="numpad-grid">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((number) => (
                    <button type="button" key={number} onClick={() => appendCashNumber(number)}>
                      {number}
                    </button>
                  ))}
                  <button type="button" onClick={deleteCashNumber}>←</button>
                  <button type="button" onClick={clearCashReceived}>C</button>
                  <button type="button" onClick={() => setCashReceived(String(Number(cartTotal).toFixed(2)))}>
                    Total
                  </button>
                </div>
              </div>
            </>
          )}

          {requiresPaymentReference && (
            <div className="courtesy-reference-box">
                <label>
                  {isCreditPayment
                    ? "Nombre o referencia del crédito"
                    : isHotelPayment
                    ? "Referencia del hotel"
                    : "Nombre o motivo de cortesía"}
                </label>              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={
                    isCreditPayment
                      ? "Ej. Juan Pérez / Mesa 3"
                      : isHotelPayment
                      ? "Ej. Hotel / pedido enviado / responsable"
                      : "Ej. Invitación de la casa / Juan Pérez"
}
              />
            </div>
          )}

          <button type="button" className="credit-pending-button" onClick={openManualCreditModal}>
              Registrar crédito en efectivo         
               </button>

          <button type="button" className="credit-pending-button" onClick={loadPendingCredits}>
            Créditos pendientes
          </button>

          <button type="button" className="checkout-button" onClick={processSale} disabled={cart.length === 0 || loading}>
            {isPayingPendingCredit ? "Pagar crédito" : "Cobrar"}
          </button>

          <button type="button" className="clear-cart-button" onClick={clearCart} disabled={cart.length === 0 || loading}>
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
}

export default PosPage;
