import { useEffect, useState } from "react";
import api from "../services/api";
import ProductCard from "../components/ProductCard";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [inventoryBaseProducts, setInventoryBaseProducts] = useState([]);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showBottleForm, setShowBottleForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [selectedBottleImageFile, setSelectedBottleImageFile] = useState(null);
  const [bottleImagePreview, setBottleImagePreview] = useState("");

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
    imageUrl: "",
    inventorySourceProductId: "",
    inventoryMultiplier: "1",
    bottleVolumeMl: "",
    servingVolumeMl: "",
    productType: "BOTTLED_DRINK",
  });

  const [drinkSizes, setDrinkSizes] = useState([]);
const [drinkSizeForm, setDrinkSizeForm] = useState({
  sizeName: "",
  ouncesUsed: "",
  price: "",
  imageFile: null,
  imagePreview: "",
  imageUrl: "",
});

  const [bottleForm, setBottleForm] = useState({
    name: "",
    description: "",
    bottleCategoryId: "",
    initialBottleStock: "",
    bottleVolumeMl: "1000",
    imageUrl: "",
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadInventoryBaseProducts();
  }, []);

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

  const normalizeText = (value) => {
    return (value || "").toString().toLowerCase().trim();
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    const baseUrl = api.defaults.baseURL.replace("/api", "");
    return `${baseUrl}${imageUrl}`;
  };

  const isBottleCategoryName = (name) => {
    return normalizeText(name) === "botellas";
  };

  const isBottleProduct = (product) => {
    const productType = product.productType ?? product.ProductType ?? "";
    const name = product.name ?? product.Name ?? "";

    return (
      productType === "BOTTLE" ||
      normalizeText(name).startsWith("botella")
    );
  };

  const productCategoriesList = categoriesList.filter(
    (category) => !isBottleCategoryName(category.name)
  );

  const bottleCategoryOptions = categoriesList.filter((category) =>
    isBottleCategoryName(category.name)
  );

  const finalBottleCategoryOptions =
    bottleCategoryOptions.length > 0 ? bottleCategoryOptions : categoriesList;

  const isBeerCategory = (categoryId) => {
    const selectedCategory = categoriesList.find(
      (category) => Number(category.categoryId) === Number(categoryId)
    );

    if (!selectedCategory) return false;

    return normalizeText(selectedCategory.name) === "cervezas";
  };

  const isLiquorProductType = (productType) => {
    return productType === "SHOT" || productType === "LIQUOR_DRINK";
  };

  const isBeerSelectionProductType = (productType) => {
    return productType === "PREPARED_DRINK" || productType === "BEER_BUCKET";
  };

  // Productos que manejan tamaños en el formulario y en POS.
  // PREPARED_DRINK usa tamaños, pero descuenta cerveza; no usa botella ni onzas.
  const isDrinkSizeProductType = (productType) => {
    return (
      productType === "PREPARED_DRINK" ||
      productType === "LIQUOR_DRINK" ||
      productType === "SHOT"
    );
  };

  const isLiquorDrinkSizeProductType = (productType) => {
    return productType === "LIQUOR_DRINK" || productType === "SHOT";
  };

  const isBeerPreparedSizeProductType = (productType) => {
    return productType === "PREPARED_DRINK";
  };

  const hasOwnInventoryFields = (productType) => {
    return productType === "BOTTLED_DRINK" || productType === "PACK";
  };

  const isCigaretteUnit = (productType) => {
    return productType === "CIGARETTE_UNIT";
  };

  const getMinimumDrinkSizePrice = () => {
    if (drinkSizes.length === 0) return 0;
    return Math.min(...drinkSizes.map((size) => Number(size.price || 0)));
  };

  const getBottleInventoryOptions = () => {
    return inventoryBaseProducts.filter((product) => {
      return Number(product.bottleVolumeMl || 0) > 0;
    });
  };

  const loadProducts = async () => {
    try {
      const response = await api.get("/Products/Admin");

      const normalizedProducts = response.data.map((p) => ({
        productId: p.productId ?? p.ProductId,
        name: p.name ?? p.Name,
        description: p.description ?? p.Description,
        category: p.category ?? p.Category,
        categoryId: p.categoryId ?? p.CategoryId ?? "",
        price: p.price ?? p.Price,
        stock: p.stock ?? p.Stock ?? 0,
        baseStock: p.baseStock ?? p.BaseStock ?? null,
        minStock: p.minStock ?? p.MinStock ?? 0,
        trackInventory: p.trackInventory ?? p.TrackInventory ?? false,
        requiresBeerSelection:
          p.requiresBeerSelection ?? p.RequiresBeerSelection ?? false,
        isBeer: p.isBeer ?? p.IsBeer ?? false,
        inventoryStatus: p.inventoryStatus ?? p.InventoryStatus ?? "NO_TRACK",
        imageUrl: getImageUrl(p.imageUrl ?? p.ImageUrl ?? ""),
        productType: p.productType ?? p.ProductType ?? "BOTTLED_DRINK",
        inventorySourceProductId:
          p.inventorySourceProductId ?? p.InventorySourceProductId ?? "",
        inventoryMultiplier: p.inventoryMultiplier ?? p.InventoryMultiplier ?? 1,
        bottleVolumeMl: p.bottleVolumeMl ?? p.BottleVolumeMl ?? "",
        servingVolumeMl: p.servingVolumeMl ?? p.ServingVolumeMl ?? "",
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

      const firstProductCategory = normalizedCategories.find(
        (category) => !isBottleCategoryName(category.name)
      );

      if (firstProductCategory) {
        setNewProduct((prev) => ({
          ...prev,
          categoryId: prev.categoryId || firstProductCategory.categoryId,
        }));
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      showToast("No se pudieron cargar las categorías.", "error");
    }
  };

  const loadInventoryBaseProducts = async () => {
    try {
      const response = await api.get("/Products/Inventory");

      const baseProducts = response.data
        .filter((p) => {
          const productType = p.productType ?? p.ProductType;
          return productType === "INVENTORY_BASE";
        })
        .map((p) => ({
          productId: p.productId ?? p.ProductId,
          name: p.name ?? p.Name,
          stock: p.stock ?? p.Stock ?? 0,
          baseStock: p.baseStock ?? p.BaseStock ?? null,
          category: p.category ?? p.Category,
          bottleVolumeMl: p.bottleVolumeMl ?? p.BottleVolumeMl ?? null,
          imageUrl: getImageUrl(p.imageUrl ?? p.ImageUrl ?? ""),
        }));

      setInventoryBaseProducts(baseProducts);
    } catch (error) {
      console.error("Error al cargar productos base:", error);
      showToast("No se pudieron cargar los productos base.", "error");
    }
  };

  const loadProductDrinkSizes = async (productId) => {
    try {
      const response = await api.get(`/Products/${productId}/DrinkSizes`);

      const normalizedSizes = response.data.map((size) => ({
        productDrinkSizeId:
          size.productDrinkSizeId ?? size.ProductDrinkSizeId ?? null,
        productId: size.productId ?? size.ProductId ?? productId,
        sizeName: size.sizeName ?? size.SizeName ?? "",
        ouncesUsed: size.ouncesUsed ?? size.OuncesUsed ?? "",
        price: size.price ?? size.Price ?? "",
        inventorySourceProductId:
          size.inventorySourceProductId ??
          size.InventorySourceProductId ??
          "",
        imageUrl: size.imageUrl ?? size.ImageUrl ?? "",
        imagePreview: getImageUrl(size.imageUrl ?? size.ImageUrl ?? ""),
        imageFile: null,
      }));

      setDrinkSizes(normalizedSizes);
    } catch (error) {
      console.error("Error al cargar tamaños de bebida:", error);
      setDrinkSizes([]);
    }
  };

  const resetDrinkSizeForm = () => {
  setDrinkSizeForm({
    sizeName: "",
    ouncesUsed: "",
    price: "",
    imageFile: null,
    imagePreview: "",
    imageUrl: "",
  });
};

  const resetProductForm = () => {
    const firstProductCategory = categoriesList.find(
      (category) => !isBottleCategoryName(category.name)
    );

    setNewProduct({
      name: "",
      description: "",
      categoryId: firstProductCategory ? firstProductCategory.categoryId : "",
      price: "",
      stock: "",
      minStock: "10",
      trackInventory: true,
      requiresBeerSelection: false,
      imageUrl: "",
      inventorySourceProductId: "",
      inventoryMultiplier: "1",
      bottleVolumeMl: "",
      servingVolumeMl: "",
      productType: "BOTTLED_DRINK",
    });

    setDrinkSizes([]);
    resetDrinkSizeForm();
    setEditingProductId(null);
    setSelectedImageFile(null);
    setImagePreview("");
  };

  const resetBottleForm = () => {
    setBottleForm({
      name: "",
      description: "",
      bottleCategoryId: "",
      initialBottleStock: "",
      bottleVolumeMl: "1000",
      imageUrl: "",
    });

    setSelectedBottleImageFile(null);
    setBottleImagePreview("");
    setEditingProductId(null);
  };

  const handleNewProductChange = (e) => {
    const { name, value, type, checked } = e.target;

    setNewProduct((prev) => {
      const nextValue = type === "checkbox" ? checked : value;

      const updated = {
        ...prev,
        [name]: nextValue,
      };

      if (name === "productType") {
        if (!isDrinkSizeProductType(value)) {
          setDrinkSizes([]);
          resetDrinkSizeForm();
        }

        if (value === "BOTTLED_DRINK" || value === "PACK") {
          updated.trackInventory = true;
          updated.requiresBeerSelection = false;
          updated.inventorySourceProductId = "";
          updated.inventoryMultiplier = "1";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
          updated.minStock = updated.minStock || "10";
        }

        if (value === "PREPARED_DRINK") {
          updated.trackInventory = false;
          updated.requiresBeerSelection = true;
          updated.stock = "";
          updated.minStock = "0";
          updated.inventorySourceProductId = "";
          updated.inventoryMultiplier = "1";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
        }

        if (value === "BEER_BUCKET") {
          updated.trackInventory = false;
          updated.requiresBeerSelection = true;
          updated.stock = "";
          updated.minStock = "0";
          updated.inventorySourceProductId = "";
          updated.inventoryMultiplier = "10";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
        }

        if (value === "LIQUOR_DRINK" || value === "SHOT") {
          updated.trackInventory = false;
          updated.requiresBeerSelection = false;
          updated.price = "";
          updated.stock = "";
          updated.minStock = "0";
          updated.inventorySourceProductId = "";
          updated.inventoryMultiplier = "1";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
        }

        if (value === "CIGARETTE_UNIT") {
          updated.trackInventory = true;
          updated.requiresBeerSelection = false;
          updated.stock = "0";
          updated.minStock = "0";
          updated.inventoryMultiplier = "0.05";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
        }

        if (value === "SERVICE") {
          updated.trackInventory = false;
          updated.requiresBeerSelection = false;
          updated.stock = "";
          updated.minStock = "0";
          updated.inventorySourceProductId = "";
          updated.inventoryMultiplier = "1";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
        }
      }

      if (name === "categoryId") {
        const selectedCategory = categoriesList.find(
          (category) => Number(category.categoryId) === Number(value)
        );

        if (normalizeText(selectedCategory?.name) === "cervezas") {
          updated.trackInventory = true;
          updated.requiresBeerSelection = false;
          updated.productType = "BOTTLED_DRINK";
          updated.inventorySourceProductId = "";
          updated.inventoryMultiplier = "1";
          updated.bottleVolumeMl = "";
          updated.servingVolumeMl = "";
          setDrinkSizes([]);
          resetDrinkSizeForm();
        }
      }

      return updated;
    });
  };

  const handleDrinkSizeFormChange = (field, value) => {
    setDrinkSizeForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDrinkSizeImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setDrinkSizeForm((prev) => ({
        ...prev,
        imageFile: null,
        imagePreview: "",
        imageUrl: "",
      }));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Formato no permitido. Usa JPG, PNG o WEBP.", "warning");
      e.target.value = "";
      return;
    }

    setDrinkSizeForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      imageUrl: "",
    }));
  };

  const handleDrinkSizeItemImageChange = (indexToUpdate, file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Formato no permitido. Usa JPG, PNG o WEBP.", "warning");
      return;
    }

    setDrinkSizes((prev) =>
      prev.map((size, index) =>
        index === indexToUpdate
          ? {
              ...size,
              imageFile: file,
              imagePreview: URL.createObjectURL(file),
              imageUrl: "",
            }
          : size
      )
    );
  };

  const addDrinkSize = () => {
  const sizeName = drinkSizeForm.sizeName.trim();
  const price = Number(drinkSizeForm.price || 0);
  const isLiquorSize = isLiquorDrinkSizeProductType(newProduct.productType);
  const ouncesUsed = isLiquorSize ? Number(drinkSizeForm.ouncesUsed || 0) : 0;

  if (!sizeName) {
    showToast("Ingresa el nombre del tamaño.", "warning");
    return;
  }

  if (isLiquorSize && ouncesUsed <= 0) {
    showToast("Las onzas usadas deben ser mayores a cero.", "warning");
    return;
  }

  if (price <= 0) {
    showToast("El precio debe ser mayor a cero.", "warning");
    return;
  }

  const duplicatedSize = drinkSizes.some(
    (size) => normalizeText(size.sizeName) === normalizeText(sizeName)
  );

  if (duplicatedSize) {
    showToast("Ya existe un tamaño con ese nombre.", "warning");
    return;
  }

  setDrinkSizes((prev) => [
    ...prev,
    {
      sizeName,
      ouncesUsed,
      price,
      inventorySourceProductId: null,
      imageFile: drinkSizeForm.imageFile,
      imagePreview: drinkSizeForm.imagePreview,
      imageUrl: drinkSizeForm.imageUrl,
    },
  ]);

  resetDrinkSizeForm();
};


  const updateDrinkSize = (indexToUpdate, field, value) => {
  setDrinkSizes((prev) =>
    prev.map((size, index) => {
      if (index !== indexToUpdate) return size;

      if (field === "sizeName") {
        return {
          ...size,
          [field]: value,
        };
      }

      return {
        ...size,
        [field]: Number(value || 0),
      };
    })
  );
};

  const removeDrinkSize = (indexToRemove) => {
    setDrinkSizes((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleBottleFormChange = (e) => {
    const { name, value } = e.target;

    setBottleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBottleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setSelectedBottleImageFile(null);
      setBottleImagePreview("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Formato no permitido. Usa JPG, PNG o WEBP.", "warning");
      e.target.value = "";
      setSelectedBottleImageFile(null);
      setBottleImagePreview("");
      return;
    }

    setSelectedBottleImageFile(file);
    setBottleImagePreview(URL.createObjectURL(file));
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

  const uploadImageFile = async (file) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/Images/UploadProductImage", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.imageUrl ?? response.data.ImageUrl;
  };

  const uploadProductImage = async () => {
    if (!selectedImageFile) {
      return newProduct.imageUrl || null;
    }

    return await uploadImageFile(selectedImageFile);
  };

  const uploadBottleImage = async () => {
    if (!selectedBottleImageFile) {
      return bottleForm.imageUrl || null;
    }

    return await uploadImageFile(selectedBottleImageFile);
  };

  const uploadDrinkSizeImages = async () => {
    const uploadedSizes = [];

    for (const size of drinkSizes) {
      let imageUrl = size.imageUrl || "";

      if (size.imageFile) {
        imageUrl = await uploadImageFile(size.imageFile);
      }

      uploadedSizes.push({
        ...size,
        imageUrl,
      });
    }

    return uploadedSizes;
  };

  const prepareBottleForm = () => {
    const bottleCategory = categoriesList.find((category) =>
      isBottleCategoryName(category.name)
    );

    resetBottleForm();

    setBottleForm((prev) => ({
      ...prev,
      bottleCategoryId: bottleCategory?.categoryId || "",
      bottleVolumeMl: prev.bottleVolumeMl || "1000",
    }));

    setShowProductForm(false);
    setShowBottleForm(true);
  };

  const validateBottleForm = () => {
    if (!bottleForm.name.trim()) {
      showToast("El nombre de la botella es obligatorio.", "warning");
      return false;
    }

    if (!bottleForm.bottleCategoryId) {
      showToast("Selecciona la categoría de botella.", "warning");
      return false;
    }

    if (Number(bottleForm.initialBottleStock) < 0) {
      showToast(
        "La cantidad inicial de botellas no puede ser negativa.",
        "warning"
      );
      return false;
    }

    if (Number(bottleForm.bottleVolumeMl) <= 0) {
      showToast(
        "El tamaño de la botella en mililitros debe ser mayor a cero.",
        "warning"
      );
      return false;
    }

    return true;
  };
const validateDrinkSizes = () => {
  if (!isDrinkSizeProductType(newProduct.productType)) {
    return true;
  }

  if (drinkSizes.length === 0) {
    showToast("Agrega al menos un tamaño para la bebida.", "warning");
    return false;
  }

  const isLiquorSize = isLiquorDrinkSizeProductType(newProduct.productType);

  const invalidSize = drinkSizes.find((size) => {
    const missingBasicData =
      !String(size.sizeName || "").trim() || Number(size.price || 0) <= 0;

    if (missingBasicData) return true;

    if (isLiquorSize) {
      return Number(size.ouncesUsed || 0) <= 0;
    }

    return false;
  });

  if (invalidSize) {
    showToast(
      isLiquorSize
        ? "Los tamaños con licor deben tener nombre, onzas usadas y precio."
        : "Los tamaños con cerveza deben tener nombre y precio.",
      "warning"
    );
    return false;
  }

  const duplicatedNames = drinkSizes.some((size, index) =>
    drinkSizes.some(
      (otherSize, otherIndex) =>
        index !== otherIndex &&
        normalizeText(size.sizeName) === normalizeText(otherSize.sizeName)
    )
  );

  if (duplicatedNames) {
    showToast("No debe haber tamaños con el mismo nombre.", "warning");
    return false;
  }

  return true;
};
  



  const buildProductData = async () => {
    const uploadedImageUrl = await uploadProductImage();

    const isLiquorType = isLiquorProductType(newProduct.productType);
    const isBeerSelectionType = isBeerSelectionProductType(
      newProduct.productType
    );
    const isBeerBucket = newProduct.productType === "BEER_BUCKET";
    const hasOwnInventory = hasOwnInventoryFields(newProduct.productType);
    const cigaretteUnit = isCigaretteUnit(newProduct.productType);
    const hasDrinkSizes = isDrinkSizeProductType(newProduct.productType);

    return {
      name: newProduct.name.trim(),
      description: newProduct.description,
      categoryId: Number(newProduct.categoryId),

      price: hasDrinkSizes
        ? Number(getMinimumDrinkSizePrice() || 0)
        : Number(newProduct.price || 0),

      stock:
        hasOwnInventory && newProduct.trackInventory
          ? Number(newProduct.stock || 0)
          : 0,

      minStock:
        hasOwnInventory && newProduct.trackInventory
          ? Number(newProduct.minStock || 0)
          : 0,

      trackInventory: cigaretteUnit
        ? true
        : isLiquorType
        ? false
        : isBeerSelectionType
        ? false
        : hasOwnInventory
        ? Boolean(newProduct.trackInventory)
        : false,

      requiresBeerSelection: isBeerSelectionType,

      isBeer: isBeerCategory(newProduct.categoryId),

      inventorySourceProductId: cigaretteUnit
        ? Number(newProduct.inventorySourceProductId)
        : hasOwnInventory && newProduct.inventorySourceProductId
        ? Number(newProduct.inventorySourceProductId)
        : null,

      inventoryMultiplier: isBeerBucket
        ? 10
        : cigaretteUnit
        ? Number(newProduct.inventoryMultiplier || 0.05)
        : hasOwnInventory
        ? Number(newProduct.inventoryMultiplier || 1)
        : 1,

      bottleVolumeMl: null,
      servingVolumeMl: null,
      imageUrl: uploadedImageUrl,
      productType: newProduct.productType,
    };
  };

const saveDrinkSizesForProduct = async (productId) => {
  if (!isDrinkSizeProductType(newProduct.productType)) {
    return;
  }

  const uploadedSizes = await uploadDrinkSizeImages();
  const isLiquorSize = isLiquorDrinkSizeProductType(newProduct.productType);

  const sizesPayload = uploadedSizes.map((size) => ({
    sizeName: String(size.sizeName || "").trim(),
    ouncesUsed: isLiquorSize ? Number(size.ouncesUsed || 0) : 0,
    price: Number(size.price || 0),
    imageUrl: size.imageUrl || null,
    inventorySourceProductId: null,
  }));

  await api.post(`/Products/${productId}/DrinkSizes`, sizesPayload);
};
const validateProductForm = () => {
  if (!newProduct.name.trim()) {
    showToast("El nombre del producto es obligatorio.", "warning");
    return false;
  }

  if (!newProduct.categoryId) {
    showToast("Selecciona una categoría válida.", "warning");
    return false;
  }

  const selectedCategory = categoriesList.find(
    (category) => Number(category.categoryId) === Number(newProduct.categoryId)
  );

  if (isBottleCategoryName(selectedCategory?.name)) {
    showToast(
      "La categoría Botellas solo debe usarse desde el botón Agregar botella.",
      "warning"
    );
    return false;
  }

  if (!isDrinkSizeProductType(newProduct.productType)) {
    if (Number(newProduct.price || 0) <= 0) {
      showToast("El precio debe ser mayor a cero.", "warning");
      return false;
    }
  }

  if (!validateDrinkSizes()) {
    return false;
  }

  if (isCigaretteUnit(newProduct.productType)) {
    if (!newProduct.inventorySourceProductId) {
      showToast("Selecciona el inventario base de cajetillas.", "warning");
      return false;
    }

    if (Number(newProduct.inventoryMultiplier || 0) <= 0) {
      showToast("El descuento por cigarro debe ser mayor a cero.", "warning");
      return false;
    }
  }

  if (
    hasOwnInventoryFields(newProduct.productType) &&
    Number(newProduct.inventoryMultiplier || 1) <= 0
  ) {
    showToast(
      "El multiplicador de inventario debe ser mayor a cero.",
      "warning"
    );
    return false;
  }

  return true;
};
  const saveProduct = async () => {
    if (!validateProductForm()) return;

    try {
      const productData = await buildProductData();
      const response = await api.post("/Products", productData);

      const createdProductId =
        response.data.productId ?? response.data.ProductId;

      if (createdProductId) {
        await saveDrinkSizesForProduct(createdProductId);
      }

      showToast("Producto agregado correctamente.", "success");

      resetProductForm();
      setShowProductForm(false);
      await loadProducts();
      await loadInventoryBaseProducts();
    } catch (error) {
      console.error("Error al agregar producto:", error);
      showToast(
        normalizeApiError(error, "No se pudo agregar el producto."),
        "error"
      );
    }
  };

  const updateProduct = async () => {
    if (!editingProductId) {
      showToast("No hay producto seleccionado para actualizar.", "warning");
      return;
    }

    if (!validateProductForm()) return;

    try {
      const productData = await buildProductData();

      await api.put(`/Products/${editingProductId}`, productData);
      await saveDrinkSizesForProduct(editingProductId);

      showToast("Producto actualizado correctamente.", "success");

      resetProductForm();
      setShowProductForm(false);
      await loadProducts();
      await loadInventoryBaseProducts();
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      showToast(
        normalizeApiError(error, "No se pudo actualizar el producto."),
        "error"
      );
    }
  };

  const saveBottle = async (e) => {
    e.preventDefault();

    if (!validateBottleForm()) return;

    try {
      const uploadedImageUrl = await uploadBottleImage();

      if (editingProductId) {
        const updatePayload = {
          name: bottleForm.name.trim(),
          description: bottleForm.description || "",
          categoryId: Number(bottleForm.bottleCategoryId),
          price: 0,
          productType: "BOTTLE",
          trackInventory: true,
          stock: Number(bottleForm.initialBottleStock || 0),
          minStock: 0,
          bottleVolumeMl: Number(bottleForm.bottleVolumeMl || 0),
          servingVolumeMl: null,
          inventorySourceProductId: null,
          inventoryMultiplier: 1,
          requiresBeerSelection: false,
          isBeer: false,
          imageUrl: uploadedImageUrl || bottleForm.imageUrl || "",
        };

       await api.put(`/Products/${editingProductId}`, updatePayload);
        showToast("Botella actualizada correctamente.", "success");
      } else {
        const createPayload = {
          name: bottleForm.name.trim(),
          description: bottleForm.description || "",
          bottleCategoryId: Number(bottleForm.bottleCategoryId),
          initialBottleStock: Number(bottleForm.initialBottleStock || 0),
          bottleVolumeMl: Number(bottleForm.bottleVolumeMl || 0),
          imageUrl: uploadedImageUrl || "",
        };

        await api.post("/Products/Bottle", createPayload);
        showToast("Botella e inventario base creados correctamente.", "success");
      }

      resetBottleForm();
      setShowBottleForm(false);
      await loadProducts();
      await loadInventoryBaseProducts();
    } catch (error) {
      console.error(
        editingProductId
          ? "Error al actualizar botella:"
          : "Error al crear botella:",
        error
      );
      console.log("Respuesta backend:", error.response?.data);

      showToast(
        normalizeApiError(
          error,
          editingProductId
            ? "No se pudo actualizar la botella."
            : "No se pudo crear la botella."
        ),
        "error"
      );
    }
  };

  const startEditBottle = (product) => {
    const category = categoriesList.find(
      (c) =>
        Number(c.categoryId) === Number(product.categoryId) ||
        normalizeText(c.name) === normalizeText(product.category)
    );

    setEditingProductId(product.productId);

    setBottleForm({
      name: product.name || "",
      description: product.description || "",
      bottleCategoryId: category ? category.categoryId : "",
      initialBottleStock: product.stock ?? 0,
      bottleVolumeMl: product.bottleVolumeMl ?? "1000",
      imageUrl: product.imageUrl || "",
    });

    setSelectedBottleImageFile(null);
    setBottleImagePreview(product.imageUrl || "");

    setShowProductForm(false);
    setShowBottleForm(true);
  };

  const startEditProduct = async (product) => {
    if (isBottleProduct(product)) {
      startEditBottle(product);
      return;
    }

    const category = categoriesList.find((c) => c.name === product.category);

    setEditingProductId(product.productId);

    setNewProduct({
      name: product.name || "",
      description: product.description || "",
      categoryId: category ? category.categoryId : "",
      price: isDrinkSizeProductType(product.productType) ? "" : product.price ?? "",
      stock: product.stock ?? "",
      minStock: product.minStock ?? "10",
      trackInventory: product.trackInventory ?? true,
      requiresBeerSelection: product.requiresBeerSelection ?? false,
      imageUrl: product.imageUrl || "",
      inventorySourceProductId: product.inventorySourceProductId ?? "",
      inventoryMultiplier: product.inventoryMultiplier ?? "1",
      bottleVolumeMl: product.bottleVolumeMl ?? "",
      servingVolumeMl: product.servingVolumeMl ?? "",
      productType: product.productType || "BOTTLED_DRINK",
    });

    setSelectedImageFile(null);
    setImagePreview(product.imageUrl || "");

    if (isDrinkSizeProductType(product.productType)) {
      await loadProductDrinkSizes(product.productId);
    } else {
      setDrinkSizes([]);
    }

    setShowBottleForm(false);
    setShowProductForm(true);
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
      title: "Eliminar producto",
      message: `¿Deseas eliminar el producto "${product.name}"? Esta acción lo ocultará del sistema.`,
      onConfirm: async () => {
        try {
          await api.delete(`/Products/${product.productId}`);

          showToast("Producto eliminado correctamente.", "success");
          await loadProducts();
          await loadInventoryBaseProducts();
        } catch (error) {
          console.error("Error al eliminar producto:", error);
          showToast(
            normalizeApiError(error, "No se pudo eliminar el producto."),
            "error"
          );
        }
      },
    });
  };

  const categoryPriority = [
    "Cervezas",
    "Bebidas preparadas",
    "Shots",
    "Bebidas embotelladas",
    "Snacks",
    "Cigarros",
    "Botellas",
    "Otros",
    "Sin categoría",
  ];

  const groupedProducts = products.reduce((groups, product) => {
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
              <button
                className="modal-cancel-button"
                onClick={closeConfirmModal}
              >
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
        <h1>Productos</h1>

        <div className="header-actions">
          <button
            type="button"
            className="add-product-button"
            onClick={() => {
              setShowBottleForm(false);
              setShowProductForm((prev) => !prev);

              if (!showProductForm) {
                resetProductForm();
              }
            }}
          >
            {showProductForm ? "Ocultar formulario" : "Agregar producto"}
          </button>

          <button
            type="button"
            className="add-product-button"
            onClick={prepareBottleForm}
          >
            Agregar botella
          </button>
        </div>
      </div>

      {showBottleForm && (
        <form className="product-form" onSubmit={saveBottle}>
          <h2>{editingProductId ? "Editar botella" : "Agregar botella"}</h2>

          <div className="form-grid">
            <div>
              <label>Nombre de la botella</label>
              <input
                type="text"
                name="name"
                value={bottleForm.name}
                onChange={handleBottleFormChange}
                placeholder="Ej. Oso Negro"
              />
            </div>

            <div>
              <label>Categoría de botella</label>
              <select
                name="bottleCategoryId"
                value={bottleForm.bottleCategoryId}
                onChange={handleBottleFormChange}
              >
                <option value="">Selecciona una categoría</option>

                {finalBottleCategoryOptions.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Cantidad inicial de botellas</label>
              <input
                type="number"
                name="initialBottleStock"
                min="0"
                step="0.01"
                value={bottleForm.initialBottleStock}
                onChange={handleBottleFormChange}
                placeholder="Ej. 2"
              />
            </div>

            <div>
              <label>Tamaño de botella en ml</label>
              <input
                type="number"
                name="bottleVolumeMl"
                min="1"
                step="1"
                value={bottleForm.bottleVolumeMl}
                onChange={handleBottleFormChange}
                placeholder="Ej. 1000"
              />
            </div>

            <div>
              <label>Imagen</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleBottleImageChange}
              />
            </div>

            <div className="full-field">
              <label>Descripción</label>
              <textarea
                name="description"
                value={bottleForm.description}
                onChange={handleBottleFormChange}
                placeholder="Descripción opcional"
              />
            </div>

            {(bottleImagePreview || bottleForm.imageUrl) && (
              <div className="full-field">
                <label>Vista previa</label>
                <div className="image-preview-box">
                  <img
                    src={bottleImagePreview || bottleForm.imageUrl}
                    alt="Vista previa"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="save-product-button">
              {editingProductId ? "Actualizar botella" : "Guardar botella"}
            </button>

            <button
              type="button"
              className="cancel-product-button"
              onClick={() => {
                resetBottleForm();
                setShowBottleForm(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

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
              />
            </div>

            {!isDrinkSizeProductType(newProduct.productType) && (
              <div>
                <label>Precio</label>
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={newProduct.price}
                  onChange={handleNewProductChange}
                />
              </div>
            )}

            {isDrinkSizeProductType(newProduct.productType) && (
              <div className="bottle-calculation-box">
                <strong>Precio por tamaño</strong>
                <p>
                  El precio principal se tomará automáticamente del tamaño más
                  barato registrado.
                </p>
              </div>
            )}

            <div>
              <label>Categoría</label>
              <select
                name="categoryId"
                value={newProduct.categoryId}
                onChange={handleNewProductChange}
              >
                <option value="">Selecciona una categoría</option>

                {productCategoriesList.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Tipo de producto</label>
              <select
                name="productType"
                value={newProduct.productType}
                onChange={handleNewProductChange}
              >
                <option value="BOTTLED_DRINK">Bebida embotellada</option>
                <option value="PREPARED_DRINK">
                  Bebida preparada con cerveza
                </option>
                <option value="LIQUOR_DRINK">
                  Bebida preparada con licor
                </option>
                <option value="SHOT">Shot genérico</option>
                <option value="BEER_BUCKET">Cubeta de cerveza</option>
                <option value="PACK">Paquete / cajetilla</option>
                <option value="CIGARETTE_UNIT">Cigarro suelto</option>
                <option value="SERVICE">Servicio</option>
              </select>
            </div>

            {isBeerPreparedSizeProductType(newProduct.productType) && (
              <div className="full-field bottle-calculation-box">
                <strong>Bebida preparada con cerveza</strong>
                <p>
                  Este producto maneja tamaños con precio e imagen. En el POS
                  se selecciona el tamaño y después la cerveza con la que se
                  prepara. Siempre se descuenta 1 unidad de cerveza.
                </p>
              </div>
            )}

            {newProduct.productType === "BEER_BUCKET" && (
              <div className="full-field bottle-calculation-box">
                <strong>Cubeta de cerveza</strong>
                <p>
                  En el POS se selecciona la cerveza y se descuentan 10 unidades.
                  Si el precio es $350, se mostrarán cervezas de $35; si es $400,
                  se mostrarán cervezas de $40.
                </p>
              </div>
            )}

            {isDrinkSizeProductType(newProduct.productType) && (
  <div className="full-field drink-sizes-section">
    <div className="drink-sizes-header">
      <h3>
        {isLiquorDrinkSizeProductType(newProduct.productType)
          ? "Tamaños de bebida con licor"
          : "Tamaños de bebida preparada"}
      </h3>

      <p>
        {isLiquorDrinkSizeProductType(newProduct.productType)
          ? "Agrega los tamaños que se venderán en POS. Cada tamaño tendrá nombre, onzas usadas, precio e imagen. La botella se seleccionará al momento de vender."
          : "Agrega los tamaños que se venderán en POS. Cada tamaño tendrá nombre, precio e imagen. La cerveza se seleccionará al momento de vender."}
      </p>
    </div>

    <div className="drink-size-form drink-size-form-extended">
      <input
        type="text"
        placeholder="Nombre del tamaño"
        value={drinkSizeForm.sizeName}
        onChange={(e) =>
          handleDrinkSizeFormChange("sizeName", e.target.value)
        }
      />

      {isLiquorDrinkSizeProductType(newProduct.productType) && (
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Onzas usadas"
          value={drinkSizeForm.ouncesUsed}
          onChange={(e) =>
            handleDrinkSizeFormChange("ouncesUsed", e.target.value)
          }
        />
      )}

      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Precio"
        value={drinkSizeForm.price}
        onChange={(e) =>
          handleDrinkSizeFormChange("price", e.target.value)
        }
      />

      <input
        type="file"
        accept="image/*"
        onChange={handleDrinkSizeImageChange}
      />

      <button
        type="button"
        className="add-drink-size-button"
        onClick={addDrinkSize}
      >
        Agregar tamaño
      </button>
    </div>

    {drinkSizeForm.imagePreview && (
      <div className="drink-size-preview">
        <img
          src={drinkSizeForm.imagePreview}
          alt="Vista previa del tamaño"
        />
      </div>
    )}

    {drinkSizes.length === 0 ? (
      <p className="empty-drink-sizes">
        No se han agregado tamaños para esta bebida.
      </p>
    ) : (
      <div className="drink-sizes-list">
        {drinkSizes.map((size, index) => (
          <div
            className="drink-size-item drink-size-item-extended"
            key={`${size.sizeName}-${index}`}
          >
            <input
              type="text"
              value={size.sizeName}
              onChange={(e) =>
                updateDrinkSize(index, "sizeName", e.target.value)
              }
            />

            {isLiquorDrinkSizeProductType(newProduct.productType) && (
              <input
                type="number"
                min="0"
                step="0.01"
                value={size.ouncesUsed}
                onChange={(e) =>
                  updateDrinkSize(index, "ouncesUsed", e.target.value)
                }
              />
            )}

            <input
              type="number"
              min="0"
              step="0.01"
              value={size.price}
              onChange={(e) =>
                updateDrinkSize(index, "price", e.target.value)
              }
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleDrinkSizeItemImageChange(index, e.target.files[0])
              }
            />

            {(size.imagePreview || size.imageUrl) && (
              <img
                className="drink-size-thumbnail"
                src={size.imagePreview || getImageUrl(size.imageUrl)}
                alt={size.sizeName}
              />
            )}

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
)}

            {newProduct.productType === "CIGARETTE_UNIT" && (
              <>
                <div>
                  <label>Inventario base de cajetillas</label>

                  <select
                    name="inventorySourceProductId"
                    value={newProduct.inventorySourceProductId}
                    onChange={handleNewProductChange}
                  >
                    <option value="">Selecciona inventario base</option>

                    {inventoryBaseProducts
                      .filter((product) => {
                        const name = normalizeText(product.name);
                        return !product.bottleVolumeMl && name.includes("cigarro");
                      })
                      .map((product) => (
                        <option
                          key={product.productId}
                          value={product.productId}
                        >
                          {product.name} — Stock: {product.stock}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label>Descuento por cigarro</label>

                  <input
                    type="number"
                    name="inventoryMultiplier"
                    min="0.0001"
                    step="0.0001"
                    value={newProduct.inventoryMultiplier}
                    onChange={handleNewProductChange}
                    placeholder="Ej. 0.05"
                  />
                </div>

                <div className="full-field bottle-calculation-box">
                  <strong>Cigarro suelto</strong>
                  <p>
                    Si una cajetilla tiene 20 cigarros, cada cigarro debe
                    descontar 0.05 cajetilla.
                  </p>
                </div>
              </>
            )}

            {hasOwnInventoryFields(newProduct.productType) && (
              <>
                <div>
                  <label>Stock</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    step="0.01"
                    value={newProduct.stock}
                    onChange={handleNewProductChange}
                    disabled={!newProduct.trackInventory}
                  />
                </div>

                <div>
                  <label>Stock mínimo</label>
                  <input
                    type="number"
                    name="minStock"
                    min="0"
                    step="0.01"
                    value={newProduct.minStock}
                    onChange={handleNewProductChange}
                    disabled={!newProduct.trackInventory}
                  />
                </div>

                <div>
                  <label>Inventario base</label>

                  <select
                    name="inventorySourceProductId"
                    value={newProduct.inventorySourceProductId}
                    onChange={handleNewProductChange}
                  >
                    <option value="">Usar inventario propio</option>

                    {inventoryBaseProducts
                      .filter((product) => !product.bottleVolumeMl)
                      .map((product) => (
                        <option
                          key={product.productId}
                          value={product.productId}
                        >
                          {product.name} — Stock: {product.stock}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label>Multiplicador de inventario</label>
                  <input
                    type="number"
                    name="inventoryMultiplier"
                    min="0.0001"
                    step="0.0001"
                    value={newProduct.inventoryMultiplier}
                    onChange={handleNewProductChange}
                    placeholder="Ej. 1, 20"
                  />
                </div>

                <div className="checkbox-field">
                  <label>
                    <input
                      type="checkbox"
                      name="trackInventory"
                      checked={newProduct.trackInventory}
                      onChange={handleNewProductChange}
                    />
                    Controlar inventario
                  </label>
                </div>
              </>
            )}

            <div>
              <label>Imagen principal</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            <div className="full-field">
              <label>Descripción</label>
              <textarea
                name="description"
                value={newProduct.description}
                onChange={handleNewProductChange}
              />
            </div>

            {(imagePreview || newProduct.imageUrl) && (
              <div className="full-field">
                <label>Vista previa</label>

                <div className="image-preview-box">
                  <img
                    src={imagePreview || newProduct.imageUrl}
                    alt="Vista previa"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="save-product-button"
              onClick={editingProductId ? updateProduct : saveProduct}
            >
              {editingProductId ? "Actualizar producto" : "Guardar producto"}
            </button>

            <button
              type="button"
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

      {products.length === 0 ? (
        <p>No hay productos registrados.</p>
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
                  <ProductCard
                    key={product.productId}
                    product={product}
                    onAdd={() => {}}
                    onEdit={isBottleProduct(product) ? startEditBottle : startEditProduct}
                    onDelete={deleteProduct}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;
