import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Search, ArrowLeft } from "lucide-react";

import type { ProductWithVariants, Variant } from "../components/VariantModal";
import ShiftGate, { ShiftBanner } from "../components/ShiftGate";
import CloseShiftView from "../components/CloseShiftView";
import ExpensesView from "../components/ExpensesView";
import TableGrid from "../components/TableGrid";
import CheckoutView, {
  type CloseAccountParams,
} from "../components/CheckoutView";
import CategoryTabs, { type POSCategory } from "../components/CategoryTabs";
import ProductCard from "../components/ProductCards";
import OrderPanel from "../components/OrderPanel";
import VariantModal from "../components/VariantModal";
import { getRecipeAvailability } from "../utils/recipeAvailability";

import temporalImg from "../../../../public/DeliLogo.png";
import { useGetAllProductCategories } from "../../categories/hooks/useGetAllCategories";
import { useGetProductsByCategory } from "../../products/hooks/useGetProductsByCategory";
import { useOpenCashRegister } from "../hooks/cashRegister/useOpenCashRegister";
import { useGetOpenCashRegister } from "../hooks/cashRegister/useGetOpenCashRegister";
import { toast } from "@heroui/react";
import { useGetAllAccounts } from "../hooks/accounts/useGetAllAccounts";
import { useCreateAccount } from "../hooks/accounts/useCreateAccount";
import { useAddAccountItem } from "../hooks/accounts/useAddAccountItem";
import useDeleteAccountItem from "../hooks/accounts/useDeleteAccountItem";
import { useAdjustAccountItemQuantity } from "../hooks/accounts/useAdjustAccountItemQuantity";
import { useDeleteAccount } from "../hooks/accounts/useDeleteAccount";
import { useUpdateAccount } from "../hooks/accounts/useUpdateAccount";
import { useCloseAccount } from "../hooks/accounts/useCloseAccount";
import { printTicketService } from "../../../shared/services/qz.service";
import SalesHistory from "../components/SalesHistory";
import { useSocket } from "../../../shared/socket/useSocket";
import { createKitchenTicket, createKitchenTicketAdjustment, useKitchenTickets } from "../../../shared/kitchen/kitchenTickets.store";

interface RecentProductShortcut {
  productName: string;
  categoryId: number;
  categoryName: string;
}

const readSessionValue = <T,>(key: string, fallback: T): T => {
  try {
    const storedValue = sessionStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : fallback;
  } catch {
    return fallback;
  }
};

const Index = () => {
  const queryClient = useQueryClient();
  const { mutate: openCashRegister } = useOpenCashRegister();
  const { mutate: createAccount } = useCreateAccount();
  const {
    mutate: addAccountItem,
    isPending: isAddingAccountItem,
    variables: pendingAccountItem,
  } = useAddAccountItem();
  const { mutate: deleteAccountItem } = useDeleteAccountItem();
  const { mutate: adjustAccountItemQuantity } = useAdjustAccountItemQuantity();
  const { mutate: deleteAccount } = useDeleteAccount();
  const { mutate: updateAccount } = useUpdateAccount();
  const { mutate: closeAccount, isPending: isClosingAccount } = useCloseAccount();
  const closingAccountRef = useRef(false);
  const { data: categories } = useGetAllProductCategories();
  const { data: openCashRegisterData } = useGetOpenCashRegister(1);
  const { data: accounts } = useGetAllAccounts(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    () => readSessionValue<number | null>("pos:selected-category", null),
  );
  const visibleCategories = useMemo<POSCategory[]>(
    () =>
      ((categories?.data ?? []) as POSCategory[]).filter(
        (category) => category.posVisible,
      ),
    [categories?.data],
  );
  const activeCategory =
    visibleCategories.find((category) => category.id === selectedCategoryId) ??
    visibleCategories[0] ??
    null;

  const { data: products } = useGetProductsByCategory(activeCategory?.id);
  const [searchQuery, setSearchQuery] = useState(() =>
    readSessionValue("pos:search", ""),
  );
  const [recentProducts, setRecentProducts] = useState<RecentProductShortcut[]>(
    () => readSessionValue("pos:recent-products", []),
  );
  const [recentlyAddedVariantId, setRecentlyAddedVariantId] = useState<
    number | null
  >(null);
  const addedFeedbackTimerRef = useRef<number | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithVariants | null>(null);
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [kitchenInstructionsByAccount, setKitchenInstructionsByAccount] = useState<Record<number, string>>({});

  useEffect(() => {
    if (visibleCategories.length === 0) return;
    sessionStorage.setItem(
      "pos:selected-category",
      JSON.stringify(activeCategory?.id ?? null),
    );
  }, [activeCategory?.id, visibleCategories.length]);

  useEffect(() => {
    sessionStorage.setItem("pos:search", JSON.stringify(searchQuery));
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem(
      "pos:recent-products",
      JSON.stringify(recentProducts),
    );
  }, [recentProducts]);

  useEffect(
    () => () => {
      if (addedFeedbackTimerRef.current != null) {
        window.clearTimeout(addedFeedbackTimerRef.current);
      }
    },
    [],
  );

  const filteredProducts = useMemo(() => {
    const availableProducts = (products?.data ?? []) as ProductWithVariants[];
    const normalizedSearch = searchQuery
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");

    const matchingProducts = normalizedSearch
      ? availableProducts.filter((product) => {
          const searchableText = [
            product.name,
            ...(product.variants ?? []).map((variant) => variant.name),
          ]
            .join(" ")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("es");

          return searchableText.includes(normalizedSearch);
        })
      : availableProducts;

    return [...matchingProducts].sort((first, second) =>
      first.name.localeCompare(second.name, "es", { sensitivity: "base" }),
    );
  }, [products?.data, searchQuery]);

  const socket = useSocket();
  const kitchenTickets = useKitchenTickets();
  const sentToKitchenForActiveAccount = useMemo(
    () => kitchenTickets
      .filter((ticket) => ticket.accountId === activeTableId)
      .flatMap((ticket) => ticket.items)
      .reduce<Record<number, number>>((sent, item) => {
        const itemKey = item.accountItemId;
        sent[itemKey] = (sent[itemKey] ?? 0) + item.quantity;
        return sent;
      }, {}),
    [activeTableId, kitchenTickets],
  );

  const kitchenAdjustmentsForActiveAccount = useMemo(
    () => kitchenTickets
      .filter((ticket) => ticket.accountId === activeTableId)
      .flatMap((ticket) => ticket.adjustments),
    [activeTableId, kitchenTickets],
  );

  const effectiveSentToKitchenForActiveAccount = useMemo(() => {
    const effective = { ...sentToKitchenForActiveAccount };
    kitchenAdjustmentsForActiveAccount.forEach((adjustment) => {
      effective[adjustment.accountItemId] =
        (effective[adjustment.accountItemId] ?? 0) + adjustment.quantityDelta;
    });
    return effective;
  }, [kitchenAdjustmentsForActiveAccount, sentToKitchenForActiveAccount]);

  const handleOpenShift = useCallback(
    (initialAmount: number) => {
      openCashRegister(
        { userId: 1, terminalId: 1, openingAmount: initialAmount },
        {
          onSuccess: () => {
            toast("Turno abierto exitosamente", { variant: "success" });
          },
          onError: (data) => {
            toast("Error al abrir el turno", {
              variant: "danger",
              description: data.message,
            });
          },
        },
      );
    },
    [openCashRegister],
  );

  const handleCloseShift = useCallback(() => {
    setActiveTableId(null);
    setShowCloseShift(false);
  }, []);

  const activeTable = activeTableId
    ? accounts.data?.find((acc: { id: number }) => acc.id === activeTableId)
    : null;
  const kitchenInstructions = activeTableId ? kitchenInstructionsByAccount[activeTableId] ?? "" : "";

  const orderItems = useMemo(
    () => (activeTable?.accountItems ?? []).filter(
      (item: { quantity: number }) => item.quantity > 0,
    ),
    [activeTable?.accountItems],
  );

  const reservedQuantitiesByVariant = useMemo(
    () =>
      orderItems.reduce<Record<number, number>>(
        (
          reserved,
          item: { productVariantId: number; quantity: number },
        ) => {
          reserved[item.productVariantId] =
            (reserved[item.productVariantId] ?? 0) + item.quantity;
          return reserved;
        },
        {},
      ),
    [orderItems],
  );

  const canAddVariant = useCallback(
    (product: ProductWithVariants, variant: Variant, quantity = 1) => {
      if (product.productType !== "RECIPE_PRODUCT") return true;

      const availability = getRecipeAvailability(variant);
      if (!availability.hasValidRecipe) {
        toast("Producto no disponible", {
          variant: "danger",
          description: "La variante no tiene una receta válida configurada.",
        });
        return false;
      }

      const remainingUnits =
        availability.availableUnits -
        (reservedQuantitiesByVariant[variant.id] ?? 0);
      if (remainingUnits < quantity) {
        toast("Producto sin disponibilidad", {
          variant: "warning",
          description: `Solo hay disponibilidad para ${Math.max(0, remainingUnits)} unidad(es) de ${product.name} - ${variant.name}.`,
        });
        return false;
      }

      return true;
    },
    [reservedQuantitiesByVariant],
  );

  const recordSuccessfulAddition = useCallback(
    (product: ProductWithVariants, variant: Variant) => {
      setRecentlyAddedVariantId(variant.id);
      if (addedFeedbackTimerRef.current != null) {
        window.clearTimeout(addedFeedbackTimerRef.current);
      }
      addedFeedbackTimerRef.current = window.setTimeout(
        () => setRecentlyAddedVariantId(null),
        1200,
      );

      if (activeCategory) {
        setRecentProducts((current) => [
          {
            productName: product.name,
            categoryId: activeCategory.id,
            categoryName: activeCategory.name,
          },
          ...current.filter(
            (recent) => recent.productName !== product.name,
          ),
        ].slice(0, 5));
      }
    },
    [activeCategory],
  );

  useEffect(() => {
    const syncClientDisplay = () => {
      if (activeTable) {
        socket.emit("show-account", {
          accountId: activeTable.id,
          terminalId: activeTable.terminalId ?? 1,
        });
      } else if (!activeTableId) {
        socket.emit("clear-view", { terminalId: 1 });
      }
    };

    syncClientDisplay();
    socket.on("connect", syncClientDisplay);
    return () => { socket.off("connect", syncClientDisplay); };
  }, [activeTable, activeTableId, socket]);

  useEffect(() => {
    const refreshProductStock = () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    };

    socket.on("inventory:updated", refreshProductStock);
    return () => {
      socket.off("inventory:updated", refreshProductStock);
    };
  }, [queryClient, socket]);

  const addAccount = (name: string) => {
    createAccount(
      {
        name: name,
        userId: 1,
        terminalId: 1,
      },
      {
        onSuccess: () => {
          toast("Cuenta creada exitosamente", { variant: "success" });
        },
        onError: (data) => {
          toast("Error al crear la cuenta", {
            variant: "danger",
            description: data.message,
          });
        },
      },
    );
  };
  const removeTable = (id: number) => {
    deleteAccount(id, {
      onSuccess: () => {
        toast("Cuenta eliminada exitosamente", { variant: "success" });
      },
      onError: (error) => {
        const requestError = error as { response?: { data?: { message?: string } }; message?: string };
        toast("No se pudo eliminar la cuenta", {
          variant: "danger",
          description: requestError.response?.data?.message ?? requestError.message,
        });
      },
    });
  };
  const renameTable = (id: number, name: string) => {
    updateAccount(
      { accountId: id, name },
      {
        onSuccess: () => {
          toast("Cuenta renombrada", { variant: "success" });
        },
        onError: (error) => {
          const requestError = error as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          toast("No se pudo renombrar la cuenta", {
            variant: "danger",
            description:
              requestError.response?.data?.message ?? requestError.message,
          });
        },
      },
    );
  };

  const handleProductClick = useCallback(
    (product: ProductWithVariants) => {
      if (!activeTableId) return;
      if (product.variants && product.variants.length === 1) {
        if (!canAddVariant(product, product.variants[0])) return;
        addAccountItem(
          {
            accountId: activeTableId,
            productVariantId: product.variants[0].id,
            productName: product.name + " - " + product.variants[0].name,
            quantity: 1,
            price: product.variants[0].retailPrice,
            subtotal: product.variants[0].retailPrice,
          },
          {
            onSuccess: () => {
              recordSuccessfulAddition(product, product.variants![0]);
            },
            onError: (data) => {
              toast("Error al agregar el producto", {
                variant: "danger",
                description: data.message,
              });
            },
          },
        );
      } else {
        setSelectedProduct(product);
      }
    },
    [activeTableId, addAccountItem, canAddVariant, recordSuccessfulAddition],
  );

  const handleSelectVariant = useCallback(
    (product: ProductWithVariants, variant: Variant, quantity: number) => {
      if (!activeTableId) return;
      if (!canAddVariant(product, variant, quantity)) return;

      addAccountItem(
        {
          accountId: activeTableId,
          productVariantId: variant.id,
          productName: product.name + " - " + variant.name,
          quantity,
          price: variant.retailPrice,
          subtotal: variant.retailPrice * quantity,
        },
        {
          onSuccess: () => {
            recordSuccessfulAddition(product, variant);
            setSelectedProduct(null);
          },
          onError: (data) => {
            toast("Error al agregar el producto", {
              variant: "danger",
              description: data.message,
            });
          },
        },
      );
    },
    [activeTableId, addAccountItem, canAddVariant, recordSuccessfulAddition],
  );

  const updateQuantity = useCallback(
    (id: number, delta: number) => {
      if (!activeTableId) return;
      const item = orderItems.find((orderItem: { id: number }) => orderItem.id === id);
      if (!item) return;

      const sentQuantity = effectiveSentToKitchenForActiveAccount[item.id] ?? 0;
      const newQuantity = item.quantity + delta;

      if (delta < 0 && newQuantity < sentQuantity) {
        void createKitchenTicketAdjustment({
          accountId: activeTableId,
          accountItemId: item.id,
          newQuantity,
        }).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["accounts"] });
          toast("Cambio enviado a cocina", {
            variant: "warning",
            description: `Se solicitó cancelar ${sentQuantity - newQuantity} unidad(es) de ${item.productName}.`,
          });
        }).catch((error) => {
          toast("No se pudo comunicar el cambio", {
            variant: "danger",
            description: error?.response?.data?.message ?? error.message,
          });
        });
        return;
      }

      adjustAccountItemQuantity(
        { accountItemId: id, delta },
        {
          onError: (error) => {
            const requestError = error as {
              response?: { data?: { message?: string } };
              message?: string;
            };
            toast("No se pudo cambiar la cantidad", {
              variant: "danger",
              description:
                requestError.response?.data?.message ?? requestError.message,
            });
          },
        },
      );
    },
    [activeTableId, adjustAccountItemQuantity, effectiveSentToKitchenForActiveAccount, orderItems, queryClient],
  );

  const removeItem = (id: number) => {
    if (!activeTableId) return;
    const item = orderItems.find((orderItem: { id: number }) => orderItem.id === id);
    if (!item) return;

    const sentQuantity = effectiveSentToKitchenForActiveAccount[item.id] ?? 0;
    if (sentQuantity > 0) {
      void createKitchenTicketAdjustment({
        accountId: activeTableId,
        accountItemId: item.id,
        newQuantity: 0,
      }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["accounts"] });
        toast("Cancelación enviada a cocina", {
          variant: "warning",
          description: `Se solicitó cancelar ${item.productName}.`,
        });
      }).catch((error) => {
        toast("No se pudo comunicar la cancelación", {
          variant: "danger",
          description: error?.response?.data?.message ?? error.message,
        });
      });
      return;
    }
    deleteAccountItem(id);
  };

  const handleCharge = useCallback(() => {
    if (!activeTable || orderItems.length === 0) return;
    setShowCheckout(true);
  }, [activeTable, orderItems]);

  const handleSendToKitchen = useCallback(() => {
    if (!activeTableId) return;

    const preparationItems = orderItems.filter(
      (item: { productVariant?: { requirePreparation: boolean } }) =>
        item.productVariant?.requirePreparation !== false,
    );
    const currentSent = effectiveSentToKitchenForActiveAccount;
    const pendingUnits = preparationItems.reduce(
      (total: number, item: { id: number; productVariantId?: number; quantity: number; productVariant?: { id: number } }) => {
        const itemKey = item.id;
        return total + Math.max(0, item.quantity - (currentSent[itemKey] ?? 0));
      },
      0,
    );

    if (pendingUnits === 0) return;

    const kitchenTicketPayload = {
      accountId: activeTableId,
      accountName: activeTable?.name ?? activeTable?.label ?? `Cuenta ${activeTableId}`,
      status: "PENDING" as const,
      createdAt: new Date().toISOString(),
      instructions: kitchenInstructions.trim() || undefined,
      items: preparationItems
        .map(
          (item: {
            id: number;
            productVariantId?: number;
            productName: string;
            quantity: number;
            productVariant?: { id: number; requirePreparation: boolean };
          }) => ({
            accountItemId: item.id,
            productVariantId: item.productVariant?.id ?? item.productVariantId,
            productName: item.productName,
            quantity: Math.max(
              0,
              item.quantity - (currentSent[item.id] ?? 0),
            ),
          }),
        )
        .filter((item: { quantity: number }) => item.quantity > 0),
    };

    void createKitchenTicket({
      accountId: kitchenTicketPayload.accountId,
      accountName: kitchenTicketPayload.accountName,
      instructions: kitchenTicketPayload.instructions,
      items: kitchenTicketPayload.items,
    }).then(() => {
      setKitchenInstructionsByAccount((current) => ({ ...current, [activeTableId]: "" }));
      toast(`${pendingUnits} producto${pendingUnits === 1 ? "" : "s"} enviado${pendingUnits === 1 ? "" : "s"} a cocina`, {
        variant: "success",
        description: "El ticket fue registrado en el backend.",
      });
    }).catch((error) => {
      toast("No se pudo enviar el pedido a cocina", {
        variant: "danger",
        description: error?.response?.data?.message ?? error.message,
      });
    });

  }, [activeTable, activeTableId, effectiveSentToKitchenForActiveAccount, kitchenInstructions, orderItems]);

  const handleConfirmPayment = ({
    accountId,
    paymentMethod,
    cashRegisterId,
    order,
    printTicket,
  }: CloseAccountParams) => {
    if (closingAccountRef.current) return;
    closingAccountRef.current = true;

    closeAccount(
      {
        accountId: accountId,
        paymentMethod,
        cashRegisterId: cashRegisterId,
      },
      {
        onSuccess: async () => {
          closingAccountRef.current = false;
          toast("Cuenta cerrada exitosamente", { variant: "success" });
          setShowCheckout(false);
          setActiveTableId(null);

          const hardwareErrors: string[] = [];
          if (printTicket) {
            try {
              await printTicketService("XP-58", order);
            } catch {
              hardwareErrors.push("imprimir el recibo");
            }
          }

          if (paymentMethod === "CASH") {
            try {
              await printTicketService("XP-58", {
                type: "raw",
                format: "command",
                flavor: "plain",
                data: "\x1B\x70\x00\x19\xFA",
              });
            } catch {
              hardwareErrors.push("abrir el cajón");
            }
          }

          if (hardwareErrors.length > 0) {
            toast("Venta registrada con una novedad", {
              variant: "warning",
              description: `No fue posible ${hardwareErrors.join(" ni ")}.`,
            });
          }
        },

        onError: (error) => {
          closingAccountRef.current = false;
          const message = axios.isAxiosError(error)
            ? error.response?.data?.message ?? error.message
            : error instanceof Error
              ? error.message
              : "No fue posible cerrar la cuenta";
          const isStockError = message.startsWith("Stock insuficiente:");

          toast(isStockError ? "Stock insuficiente" : "Error al cerrar la cuenta", {
            variant: "danger",
            description: message,
          });
        },
      },
    );
  };

  // ── Shift gate ──
  if (!openCashRegisterData?.data) {
    return (
      <ShiftGate
        activeShift={openCashRegisterData?.data}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
      >
        {null}
      </ShiftGate>
    );
  }

  // ── Close shift view ──
  if (showCloseShift) {
    return (
      <CloseShiftView
        shift={openCashRegisterData?.data}
        cashRegisterId={openCashRegisterData?.data?.id}
        onConfirmClose={handleCloseShift}
        onBack={() => setShowCloseShift(false)}
      />
    );
  }

  // ── Expenses view ──
  if (showExpenses) {
    return (
      <ExpensesView
        cashRegisterId={openCashRegisterData.data.id}
        onBack={() => setShowExpenses(false)}
      />
    );
  }

  // ── Sales history view ──
  if (showSalesHistory) {
    return (
      <SalesHistory
        onBack={() => setShowSalesHistory(false)}
        sales={openCashRegisterData?.data?.accounts || []}
      />
    );
  }
  // ── Tables view ──
  if (!activeTableId) {
    return (
      <div className="flex h-full flex-col">
        <ShiftBanner
          shift={openCashRegisterData?.data}
          onSalesHistory={() => setShowSalesHistory(true)}
          onClose={() => setShowCloseShift(true)}
          onExpenses={() => setShowExpenses(true)}
        />
        <div className="flex-1 min-h-0">
          <TableGrid
            accounts={accounts?.data || []}
            onSelect={setActiveTableId}
            onAdd={addAccount}
            onRemove={removeTable}
            onRename={renameTable}
            kitchenTickets={kitchenTickets}
          />
        </div>
      </div>
    );
  }

  // ── Checkout view ──
  if (showCheckout && activeTable) {
    return (
      <CheckoutView
        items={orderItems}
        tableLabel={activeTable.label}
        onConfirm={handleConfirmPayment}
        onBack={() => {
          setShowCheckout(false);
        }}
        isProcessing={isClosingAccount}
        accountInfo={{
          accountId: activeTable.id,
          cashRegisterId: openCashRegisterData.data.id,
          terminalId: activeTable.terminalId ?? 1,
        }}
      />
    );
  }

  // ── POS view ──
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background xl:flex-row">
      {/* Left — Products */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
        {/* Top bar */}
        <div className="mb-4 flex flex-col gap-4 rounded-[28px] border border-border/80 bg-pos-surface/95 p-4 shadow-[0_18px_40px_-32px_rgba(98,68,38,0.45)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTableId(null)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-pos-surface-soft text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                {activeTable?.name}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Gestión rápida de pedidos y cobro
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar en el menú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-border/70 bg-background/80 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-4 rounded-[22px] bg-pos-surface/80 p-2 shadow-sm">
          <CategoryTabs
            categories={categories.data}
            active={activeCategory}
            onSelect={(category) => {
              setSelectedCategoryId(category.id);
              setSearchQuery("");
            }}
          />
        </div>

        {recentProducts.length > 0 && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            <span className="shrink-0 text-xs font-black uppercase tracking-wider text-muted-foreground">
              Recientes
            </span>
            {recentProducts.map((recent) => (
              <button
                type="button"
                key={`${recent.categoryId}-${recent.productName}`}
                onClick={() => {
                  setSelectedCategoryId(recent.categoryId);
                  setSearchQuery(recent.productName);
                }}
                className="shrink-0 rounded-full border border-border bg-pos-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                title={`Buscar en ${recent.categoryName}`}
              >
                {recent.productName}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 pb-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                price={
                  product?.variants?.length === 1
                    ? product?.variants[0]?.retailPrice
                    : null
                }
                image={temporalImg}
                variantsInfo={product.variants}
                productType={product.productType}
                reservedQuantities={reservedQuantitiesByVariant}
                isAdding={
                  isAddingAccountItem &&
                  (product.variants ?? []).some(
                    (variant) =>
                      variant.id === pendingAccountItem?.productVariantId,
                  )
                }
                wasJustAdded={(product.variants ?? []).some(
                  (variant) => variant.id === recentlyAddedVariantId,
                )}
                onAdd={() => handleProductClick(product)}
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-pos-surface/50 px-6 py-10 text-center">
                <p className="font-semibold text-foreground">
                  No encontramos productos
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prueba con otro nombre o selecciona otra categoría.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right — Order panel */}
      <div className="w-full h-full shrink-0 border-t border-border/70 bg-background/70 p-4 xl:w-120 xl:border-l xl:border-t-0 xl:p-5">
        <div className="flex-1 h-full">
          <OrderPanel
            items={orderItems}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onCharge={handleCharge}
            tableLabel={activeTable?.label}
            sentToKitchen={effectiveSentToKitchenForActiveAccount}
            onSendToKitchen={handleSendToKitchen}
            kitchenInstructions={kitchenInstructions}
            onKitchenInstructionsChange={(instructions) => {
              if (!activeTableId) return;
              setKitchenInstructionsByAccount((current) => ({ ...current, [activeTableId]: instructions }));
            }}
            kitchenTickets={kitchenTickets.filter(
              (ticket) => ticket.accountId === activeTableId && ticket.status !== "DELIVERED",
            )}
          />
        </div>
      </div>

      {/* Variant selection modal */}
      <VariantModal
        product={selectedProduct}
        open={!!selectedProduct}
        reservedQuantities={reservedQuantitiesByVariant}
        pendingVariantId={
          isAddingAccountItem
            ? pendingAccountItem?.productVariantId
            : undefined
        }
        recentlyAddedVariantId={recentlyAddedVariantId ?? undefined}
        onClose={() => setSelectedProduct(null)}
        onSelectVariant={handleSelectVariant}
      />
    </div>
  );
};

export default Index;
