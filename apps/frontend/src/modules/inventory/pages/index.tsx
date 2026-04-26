import { Button, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, toast } from "@heroui/react";
import { Filter, PackageMinus, PackagePlus } from "lucide-react";
import { useState } from "react";


type TransactionType = "production" | "waste";

interface InventoryTransaction {
  id: string;
  type: TransactionType;
  productName: string;
  variantName: string;
  quantity: number;
  reason: string;
  notes: string;
  createdAt: Date;
}

const MOCK_PRODUCTS = [
  { product: "Butter Croissant", variant: "Plain" },
  { product: "Butter Croissant", variant: "Almond" },
  { product: "Butter Croissant", variant: "Chocolate Filled" },
  { product: "Chocolate Cake", variant: "Slice" },
  { product: "Chocolate Cake", variant: "Whole Cake" },
  { product: "Artisan Baguette", variant: "Regular" },
  { product: "Artisan Baguette", variant: "Large" },
  { product: "Café Latte", variant: "Small (8oz)" },
  { product: "Café Latte", variant: "Medium (12oz)" },
  { product: "Café Latte", variant: "Large (16oz)" },
  { product: "Macarons", variant: "Box of 6" },
  { product: "Macarons", variant: "Box of 12" },
  { product: "Cinnamon Roll", variant: "Single" },
  { product: "Cinnamon Roll", variant: "Pack of 4" },
];

const WASTE_REASONS = [
  "Producto vencido",
  "Producto dañado",
  "Error de preparación",
  "Devolución de cliente",
  "Control de calidad",
  "Otro",
];

const Inventory = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>("production");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");

  // Form
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const openDialog = (type: TransactionType) => {
    setTxType(type);
    setSelectedProduct("");
    setQuantity(0);
    setReason("");
    setNotes("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedProduct) {
      toast("Selecciona un producto y variante", { variant: "danger" });
    }
    if (quantity <= 0) {
      toast("La cantidad debe ser mayor a 0", { variant: "danger" });
      return;
    }
    if (txType === "waste" && !reason) {
      toast("Selecciona un motivo de merma", { variant: "danger" });
      return;
    }

    const item = MOCK_PRODUCTS.find(
      (p) => `${p.product} - ${p.variant}` === selectedProduct
    );
    if (!item) return;

    const tx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      type: txType,
      productName: item.product,
      variantName: item.variant,
      quantity,
      reason: txType === "production" ? "Producción" : reason,
      notes: notes.trim(),
      createdAt: new Date(),
    };

    setTransactions((prev) => [tx, ...prev]);
    toast.success(
      txType === "production"
        ? `+${quantity} ${item.variant} agregados al inventario`
        : `${quantity} ${item.variant} registrados como merma`
    );
    setDialogOpen(false);
  };

  const filtered =
    filterType === "all"
      ? transactions
      : transactions.filter((t) => t.type === filterType);

  const totalProduction = transactions
    .filter((t) => t.type === "production")
    .reduce((s, t) => s + t.quantity, 0);

  const totalWaste = transactions
    .filter((t) => t.type === "waste")
    .reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
        <div className="flex gap-2">
          <Button onClick={() => openDialog("production")} size="sm">
            <PackagePlus className="h-4 w-4 mr-1" /> Agregar Producción
          </Button>
          <Button
            onClick={() => openDialog("waste")}
            size="sm"
            variant="danger"
          >
            <PackageMinus className="h-4 w-4 mr-1" /> Registrar Merma
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Transacciones</p>
          <p className="text-2xl font-bold text-foreground">
            {transactions.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Producción Total
          </p>
          <p className="text-2xl font-bold text-green-600">+{totalProduction}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Merma Total</p>
          <p className="text-2xl font-bold text-destructive">-{totalWaste}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={filterType === "all" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
        >
          Todas
        </Button>
        <Button
          variant={filterType === "production" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilterType("production")}
        >
          Producción
        </Button>
        <Button
          variant={filterType === "waste" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilterType("waste")}
        >
          Mermas
        </Button>
      </div>

      {/* Transaction table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">


<Table aria-label="Tabla de transacciones">
  <TableHeader>
    <TableColumn>TIPO</TableColumn>
    <TableColumn>PRODUCTO</TableColumn>
    <TableColumn>VARIANTE</TableColumn>
    <TableColumn className="text-right">CANTIDAD</TableColumn>
    <TableColumn>MOTIVO</TableColumn>
    <TableColumn>NOTAS</TableColumn>
    <TableColumn>FECHA</TableColumn>
  </TableHeader>

  <TableBody
    // emptyContent="No hay transacciones registradas"
    items={filtered}
  >
    {(tx) => (
      <TableRow key={tx.id}>
        <TableCell>
          <Chip
            size="sm"
            // color={tx.type === "production" ? " success" : " destructive"}
            // variant="flat"
            className="text-xs"
          >
            {tx.type === "production" ? "Producción" : "Merma"}
          </Chip>
        </TableCell>

        <TableCell className="font-medium text-foreground">
          {tx.productName}
        </TableCell>

        <TableCell className="text-muted-foreground">
          {tx.variantName}
        </TableCell>

        <TableCell
          className={`text-right font-semibold ${
            tx.type === "production"
              ? "text-green-600"
              : "text-danger"
          }`}
        >
          {tx.type === "production" ? "+" : "-"}
          {tx.quantity}
        </TableCell>

        <TableCell className="text-muted-foreground">
          {tx.reason}
        </TableCell>

        <TableCell className="text-muted-foreground max-w-[150px] truncate">
          {tx.notes || "—"}
        </TableCell>

        <TableCell className="text-muted-foreground text-xs">
          {tx.createdAt.toLocaleString()}
        </TableCell>
      </TableRow>
    )}
  </TableBody>
</Table>;
      </div>

      {/* Dialog */}
      {/* <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {txType === "production"
                ? "Agregar Producción"
                : "Registrar Merma"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Producto / Variante</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PRODUCTS.map((p) => {
                    const val = `${p.product} - ${p.variant}`;
                    return (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity || ""}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            {txType === "waste" && (
              <div className="space-y-2">
                <Label>Motivo de Merma</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WASTE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              variant={txType === "waste" ? "destructive" : "default"}
            >
              {txType === "production" ? "Agregar" : "Registrar Merma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
};

export default Inventory;