import { useState, useCallback, useMemo } from "react";
import { Search, ArrowLeft } from "lucide-react";

import type { ProductWithVariants, Variant } from "../components/VariantModal";
import type { ExpenseFull } from "../components/ExpensesView";
import ShiftGate, { ShiftBanner } from "../components/ShiftGate";
import CloseShiftView from "../components/CloseShiftView";
import ExpensesView from "../components/ExpensesView";
import TableGrid from "../components/TableGrid";
import CheckoutView from "../components/CheckoutView";
import CategoryTabs from "../components/CategoryTabs";
import ProductCard from "../components/ProductCards";
import OrderPanel from "../components/OrderPanel";
import VariantModal from "../components/VariantModal";

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
import { useCloseAccount } from "../hooks/accounts/useCloseAccount";
import { printTest } from "../../../shared/services/qz.service";

const Index = () => {
  const { mutate: openCashRegister } = useOpenCashRegister();
  const { mutate: createAccount } = useCreateAccount();
  const { mutate: addAccountItem } = useAddAccountItem();
  const { mutate: deleteAccountItem } = useDeleteAccountItem();
  const { mutate: adjustAccountItemQuantity } = useAdjustAccountItemQuantity();
  const { mutate: deleteAccount } = useDeleteAccount();
  const { mutate: closeAccount } = useCloseAccount();
  const { data: categories } = useGetAllProductCategories();
  const { data: openCashRegisterData } = useGetOpenCashRegister(1);
  const { data: accounts } = useGetAllAccounts(1);
  const [activeCategory, setActiveCategory] = useState(
    categories?.data.length ? categories.data[0].name : null,
  );

  const { data: products } = useGetProductsByCategory(activeCategory?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithVariants | null>(null);
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [shiftExpenses, setShiftExpenses] = useState<ExpenseFull[]>([]);

  const handleOpenShift = useCallback((initialAmount: number) => {
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
  }, [ openCashRegister ]);

  const handleCloseShift = useCallback(() => {
    setActiveTableId(null);
    setShowCloseShift(false);
  }, []);

  const activeTable = activeTableId
    ? accounts.data?.find((acc: { id: number }) => acc.id === activeTableId)
    : null;

 const orderItems = useMemo(
  () => activeTable?.accountItems ?? [],
  [activeTable?.accountItems]
);

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
    });
  };

  const handleProductClick = useCallback(
    (product: ProductWithVariants) => {
      if (!activeTableId) return;
      if (product.variants && product.variants.length === 1) {
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
              toast("Producto agregado a la cuenta", { variant: "success" });
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
    [activeTableId, addAccountItem],
  );

  const handleSelectVariant = useCallback(
    (product: ProductWithVariants, variant: Variant) => {
      if (!activeTableId) return;

      addAccountItem(
        {
          accountId: activeTableId,
          productVariantId: variant.id,
          productName: product.name + " - " + variant.name,
          quantity: 1,
          price: variant.retailPrice,
          subtotal: variant.retailPrice,
        },
        {
          onSuccess: () => {
            toast("Producto agregado a la cuenta", { variant: "success" });
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
    [activeTableId, addAccountItem],
  );

  const updateQuantity = useCallback(
    (id: number, delta: number) => {
      if (!activeTableId) return;
      adjustAccountItemQuantity({ accountItemId: id, delta });
    },
    [activeTableId, adjustAccountItemQuantity],
  );

  const removeItem = (id: number) => {
    if (!activeTableId) return;
    deleteAccountItem(id);
  };

  const handleCharge = useCallback(() => {
    if (!activeTable || orderItems.length === 0) return;
    setShowCheckout(true);
  }, [activeTable, orderItems]);

  const handleConfirmPayment = ({
    accountId,
    paymentMethod,
    cashRegisterId,
  }: {
    accountId: number;
    paymentMethod: string;
    cashRegisterId: number;
  }) => {
    closeAccount(
      {
        accountId: accountId,
        paymentMethod,
        cashRegisterId: cashRegisterId,
      },
      {
        onSuccess: () => {
          toast("Cuenta cerrada exitosamente", { variant: "success" });
          setShowCheckout(false);
          setActiveTableId(null);
        },
        onError: (data) => {
          toast("Error al cerrar la cuenta", {
            variant: "danger",
            description: data.message,
          });
        },
      },
    );
  };

  const handleAddExpense = useCallback(
    (description: string, amount: number, observations: string) => {
      setShiftExpenses((prev) => [
        ...prev,
        {
          id: `exp-${Date.now()}`,
          description,
          amount,
          observations,
          timestamp: new Date(),
        },
      ]);
    },
    [],
  );

  const handleRemoveExpense = useCallback((id: string) => {
    setShiftExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

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
        expenses={shiftExpenses}
        onConfirmClose={handleCloseShift}
        onBack={() => setShowCloseShift(false)}
      />
    );
  }

  // ── Expenses view ──
  if (showExpenses) {
    return (
      <ExpensesView
        expenses={shiftExpenses}
        onAddExpense={handleAddExpense}
        onRemoveExpense={handleRemoveExpense}
        onBack={() => setShowExpenses(false)}
      />
    );
  }

  // ── Tables view ──
  if (!activeTableId) {
    return (
      <div className="flex h-full flex-col">
        <ShiftBanner
          shift={openCashRegisterData?.data}
          onClose={() => setShowCloseShift(true)}
          onExpenses={() => setShowExpenses(true)}
        />
        <div className="flex-1 min-h-0">
          <TableGrid
            accounts={accounts?.data || []}
            onSelect={setActiveTableId}
            onAdd={addAccount}
            onRemove={removeTable}
            onRename={() => {}}
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
        onBack={() => setShowCheckout(false)}
        accountInfo={{
          accountId: activeTable.id,
          cashRegisterId: openCashRegisterData.data.id,
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
            onSelect={setActiveCategory}
          />
        </div>

        {/* Product grid */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4 pb-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products?.data?.map((product:  ProductWithVariants) => (
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
                onAdd={() => handleProductClick(product)}
              />
            ))}
            
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
          />
        </div>
      </div>

      {/* Variant selection modal */}
      <VariantModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSelectVariant={handleSelectVariant}
      />
    </div>
  );
};

export default Index;
