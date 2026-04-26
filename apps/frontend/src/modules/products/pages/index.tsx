import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Plus, Pencil, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  Switch,
  Modal,
  toast,
} from "@heroui/react";
import { useGetAllProducts } from "../hooks/useGetAllProducts";
import numeral from "numeral";
import { useGetAllProductCategories } from "../../categories/hooks/useGetAllCategories";
import { useCreateProduct } from "../hooks/userCreateProduct";
import { useUpdateProduct } from "../hooks/useUpdateProduct";

interface ProductVariant {
  id?: number;
  name: string;
  description: string;
  retailPrice: string;
  wholesalePrice: string;
  minStock: string;
  productCost: string;
  isActive: boolean;
  requiresPreparation: boolean;
}

interface Product {
  id: string;
  name: string;
  categoryId: number | null;
  description: string;
  variants: ProductVariant[];
}

interface ProductFormData {
  id?: string;
  name: string;
  categoryId: number | null;
  description: string;
  variants: ProductVariant[];
}

const emptyVariant = (): ProductVariant => ({
  name: "",
  description: "",
  retailPrice: "",
  wholesalePrice: "",
  minStock: "",
  productCost: "",
  isActive: true,
  requiresPreparation: false,
});

const Products = () => {
  const { data: products } = useGetAllProducts();
  const { data: categories } = useGetAllProductCategories();
  const { mutate: createProduct } = useCreateProduct();
  const { mutate: updateProduct } = useUpdateProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      categoryId: null,
      description: "",
      variants: [emptyVariant()],
    },
  });

  console.log(errors);

  const { fields: variants, append } = useFieldArray({
    control,
    name: "variants",
  });

  const filteredProducts = (products?.data ?? []).filter(
    (product: Product & { category: { name: string } }) => {
      const query = searchQuery.trim().toLowerCase();

      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        product.category.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.variants.some((variant: { name: string }) =>
          variant.name.toLowerCase().includes(query),
        )
      );
    },
  );

  const openNew = () => {
    setEditing(null);
    reset({
      name: "",
      categoryId: null,
      description: "",
      variants: [emptyVariant()],
    });
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    reset({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      description: product.description,
      variants: product.variants.map((v) => ({ ...v })),
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProductFormData) => {
    const parsedData = {
      id: data.id,
      name: data.name,
      categoryId: Number(data.categoryId),
      description: data.description,
      variants: data.variants.map((v) => ({
        id: v?.id,
        name: v.name,
        description: v.description,
        retailPrice: Number(v.retailPrice),
        wholesalePrice: Number(v.wholesalePrice),
        minStock: Number(v.minStock),
        productCost: Number(v.productCost),
        isActive: v.isActive,
        requiresPreparation: v.requiresPreparation,
      })),
    };

    if (data?.id) {
      updateProduct(parsedData, {
        onSuccess: () => {
          toast("Producto actualizado exitosamente", { variant: "success" });
        },
      });
    }

    createProduct(parsedData, {
      onSuccess: () => {
        toast("Producto creado exitosamente", { variant: "success" });
      },
    });

    setDialogOpen(false);
  };

  const closeDialog = () => {
    reset();
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Productos</h1>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Producto
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto, categoría o variante..."
          className="w-full pl-10"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-3 pb-2">
          {filteredProducts.map(
            (product: Product & { category: { name: string } }) => {
              const isExpanded = expandedProduct === product.id;
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <button
                      className="flex items-center gap-2 text-left flex-1"
                      onClick={() =>
                        setExpandedProduct(isExpanded ? null : product.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.category.name} · {product.variants.length}{" "}
                          {product.variants.length === 1
                            ? "variante"
                            : "variantes"}
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* <Button
                      variant="ghost"
                      size="sm"
                      // onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button> */}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {product.description}
                        </p>
                      )}
                      {product.variants.map((v: ProductVariant) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {v.name}
                            </span>
                            {!v?.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Inactivo
                              </Badge>
                            )}
                            {v?.requiresPreparation && (
                              <Badge variant="secondary" className="text-xs">
                                Preparación
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-muted-foreground">
                            <span>
                              Público: {numeral(v?.retailPrice).format("0,0")}
                            </span>
                            <span>
                              Mayorista:{" "}
                              {numeral(v?.wholesalePrice).format("0,0")}
                            </span>
                            <span>
                              Costo: {numeral(v?.productCost).format("0,0")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          )}
          {filteredProducts.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              {searchQuery.trim()
                ? "No se encontraron productos con esa búsqueda."
                : "No hay productos aún."}
            </p>
          )}
        </div>
      </div>

      {/* Product Dialog */}

      <Modal>
        <Modal.Backdrop isOpen={dialogOpen}>
          <Modal.Container>
            <Modal.Dialog className=" w-full max-w-4xl rounded-lg">
              <Modal.CloseTrigger
                onClick={closeDialog}
                className="rounded-full bg-pos-order-bg/90 p-2 text-white shadow-sm transition-all hover:bg-pos-order-bg"
              />
              <Modal.Header>
                <Modal.Heading className="text-lg font-semibold">
                  {editing ? "Editar Producto" : "Nuevo Producto"}
                </Modal.Heading>
              </Modal.Header>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col h-full"
              >
                <Modal.Body className="overflow-y-auto flex-1 min-h-0">
                  <div className="space-y-6 pr-2">
                    {/* General Product Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground">
                        Información General
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre</Label>
                          <Input
                            {...register("name", {
                              required: "El nombre es requerido",
                            })}
                            placeholder="Ej: Croissant"
                          />
                          {errors.name && (
                            <p className="text-xs text-destructive">
                              {errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Controller
                            name="categoryId"
                            control={control}
                            rules={{ required: "Selecciona una categoría" }}
                            render={({ field }) => (
                              <>
                                <Select
                                  className="w-full"
                                  placeholder="Selecciona una categoría"
                                  {...field}
                                >
                                  <Label>Categoría</Label>

                                  <Select.Trigger>
                                    <Select.Value />
                                    <Select.Indicator />
                                  </Select.Trigger>

                                  <Select.Popover>
                                    <ListBox>
                                      {categories?.data?.map(
                                        (cat: { id: string; name: string }) => (
                                          <ListBox.Item
                                            id={cat.id} // 👈 IMPORTANTE string
                                            textValue={cat.name}
                                            key={cat.id}
                                          >
                                            {cat.name}
                                          </ListBox.Item>
                                        ),
                                      )}
                                    </ListBox>
                                  </Select.Popover>
                                </Select>

                                {errors.categoryId && (
                                  <p className="text-xs text-destructive">
                                    {errors.categoryId.message}
                                  </p>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <TextArea
                          {...register("description")}
                          placeholder="Descripción del producto"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Variants Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          Variantes ({variants.length})
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append(emptyVariant())}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {variants.map((variant, idx) => (
                          <div
                            key={variant.id}
                            className="rounded-lg border border-border bg-muted/30 p-4 space-y-4"
                          >
                            {/* Variant Header */}
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-medium text-foreground">
                                Variante {idx + 1}
                              </h4>
                              {/* {variants.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7"
                                  onClick={() => remove(idx)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )} */}
                            </div>

                            {/* Basic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Nombre</Label>
                                <Input
                                  {...register(`variants.${idx}.name`, {
                                    required: "El nombre es requerido",
                                  })}
                                  placeholder="Ej: Grande"
                                />
                                {errors.variants?.[idx]?.name && (
                                  <p className="text-xs text-destructive">
                                    {errors.variants[idx]?.name?.message}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Descripción</Label>
                                <Input
                                  {...register(`variants.${idx}.description`)}
                                  placeholder="Descripción"
                                />
                              </div>
                            </div>

                            {/* Prices Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  Precio Público
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...register(`variants.${idx}.retailPrice`, {
                                    required: "El precio público es requerido",
                                  })}
                                />
                                {errors.variants?.[idx]?.retailPrice && (
                                  <p className="text-xs text-destructive">
                                    {errors.variants?.[idx]?.retailPrice
                                      ?.message || "Requerido"}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Mayorista</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="^\d+(\.\d{1,2})?$"
                                  {...register(
                                    `variants.${idx}.wholesalePrice`,
                                    {
                                      required:
                                        "El precio mayorista es requerido",
                                      pattern: {
                                        value: /^\d+(\.\d{1,2})?$/,
                                        message:
                                          "Solo números con máximo 2 decimales",
                                      },
                                    },
                                  )}
                                />
                                {errors.variants?.[idx]?.wholesalePrice && (
                                  <p className="text-xs text-destructive">
                                    {errors.variants?.[idx]?.wholesalePrice
                                      ?.message || "Requerido"}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Costo</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="^\d+(\.\d{1,2})?$"
                                  {...register(`variants.${idx}.productCost`, {
                                    required: "El costo es requerido",
                                    pattern: {
                                      value: /^\d+(\.\d{1,2})?$/,
                                      message:
                                        "Solo números con máximo 2 decimales",
                                    },
                                  })}
                                />
                                {errors.variants?.[idx]?.productCost && (
                                  <p className="text-xs text-destructive">
                                    {errors.variants?.[idx]?.productCost
                                      ?.message || "Requerido"}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Stock Mínimo</Label>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="^\d+$"
                                  {...register(`variants.${idx}.minStock`, {
                                    required: "El stock mínimo es requerido",
                                    pattern: {
                                      value: /^\d+$/,
                                      message: "Solo números enteros",
                                    },
                                  })}
                                />
                                {errors.variants?.[idx]?.minStock && (
                                  <p className="text-xs text-destructive">
                                    {errors.variants?.[idx]?.minStock
                                      ?.message || "Requerido"}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Toggles */}
                            <div className="border-t border-border pt-3 flex flex-col sm:flex-row gap-4">
                              <div className="flex items-center gap-2">
                                <Controller
                                  name={`variants.${idx}.isActive`}
                                  control={control}
                                  render={({ field }) => (
                                    <>
                                      <Switch
                                        isSelected={field.value}
                                        onChange={field.onChange}
                                        size="sm"
                                      >
                                        <Switch.Control>
                                          <Switch.Thumb />
                                        </Switch.Control>
                                        <Switch.Content>
                                          <Label>Activo</Label>
                                        </Switch.Content>
                                      </Switch>
                                    </>
                                  )}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Controller
                                  name={`variants.${idx}.requiresPreparation`}
                                  control={control}
                                  render={({ field }) => (
                                    <>
                                      <Switch
                                        isSelected={field.value}
                                        onChange={field.onChange}
                                        size="sm"
                                      >
                                        <Switch.Control>
                                          <Switch.Thumb />
                                        </Switch.Control>
                                        <Switch.Content>
                                          <Label>Requiere Preparación</Label>
                                        </Switch.Content>
                                      </Switch>
                                    </>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="gap-2">
                  <Button variant="outline" onClick={closeDialog} type="button">
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editing ? "Guardar cambios" : "Crear producto"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};

export default Products;
