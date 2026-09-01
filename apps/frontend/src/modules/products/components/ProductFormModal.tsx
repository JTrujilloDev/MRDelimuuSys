import { useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleDollarSign,
  Layers3,
  PackagePlus,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  toast,
} from "@heroui/react";
import { productTypes } from "../../../shared/constants/productTypes";
import { productUnits } from "../../../shared/constants/productUnits";
import { useCreateProduct } from "../hooks/userCreateProduct";
import { useUpdateProduct } from "../hooks/useUpdateProduct";

export interface RecipeItemRecord {
  id?: number;
  ingredientVariantId: number | null;
  quantity: number | string;
}

export interface ProductVariantRecord {
  id?: number;
  name: string;
  retailPrice: number | string;
  wholesalePrice: number | string | null;
  minStock: number | string;
  productCost: number | string;
  isActive: boolean;
  requirePreparation: boolean;
  unit?: string | null;
  recipeItems?: RecipeItemRecord[] | null;
}

export interface ProductRecord {
  id: number;
  name: string;
  categoryId: number | null;
  category?: { name: string } | null;
  description?: string | null;
  productType: string;
  variants: ProductVariantRecord[];
}

interface CategoryRecord {
  id: number;
  name: string;
  posVisible: boolean;
}

interface ProductFormModalProps {
  isOpen: boolean;
  product: ProductRecord | null;
  products: ProductRecord[];
  categories: CategoryRecord[];
  onClose: () => void;
}

interface ProductFormVariant {
  id?: number;
  name: string;
  retailPrice: string;
  wholesalePrice: string;
  minStock: string;
  productCost: string;
  isActive: boolean;
  requirePreparation: boolean;
  unit: string;
  recipeItems: RecipeItemRecord[];
}

export interface ProductFormValues {
  id?: number;
  name: string;
  categoryId: number | null;
  productType: string;
  description: string;
  variants: ProductFormVariant[];
}

interface IngredientOption {
  id: number;
  label: string;
}

const materialProductTypes = new Set(["INGREDIENT", "PREPARED_BASE"]);

const productTypeHelp: Record<string, string> = {
  INGREDIENT: "Materia prima que se compra y controla por peso, volumen o unidad.",
  PREPARED_BASE: "Preparación interna que se utiliza como ingrediente de otras recetas.",
  FINISHED_PRODUCT: "Producto listo para vender cuyo inventario se controla directamente.",
  RECIPE_PRODUCT: "Producto preparado al venderse; consume los ingredientes de su receta.",
  THIRD_PARTY_PRODUCT: "Producto comprado a un proveedor y vendido sin transformación.",
};

const emptyVariant = (productType = ""): ProductFormVariant => ({
  name: "",
  retailPrice: materialProductTypes.has(productType) ? "0" : "",
  wholesalePrice: materialProductTypes.has(productType) ? "0" : "",
  minStock: "0",
  productCost: materialProductTypes.has(productType) ? "0" : "",
  isActive: true,
  requirePreparation: productType === "RECIPE_PRODUCT",
  unit: materialProductTypes.has(productType) ? "GRAM" : "UNIT",
  recipeItems: [],
});

const emptyForm = (): ProductFormValues => ({
  name: "",
  categoryId: null,
  productType: "",
  description: "",
  variants: [emptyVariant()],
});

const toFormValues = (product: ProductRecord): ProductFormValues => ({
  id: product.id,
  name: product.name,
  categoryId: product.categoryId,
  productType: product.productType,
  description: product.description ?? "",
  variants: product.variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    retailPrice: String(variant.retailPrice ?? 0),
    wholesalePrice: String(variant.wholesalePrice ?? 0),
    minStock: String(variant.minStock ?? 0),
    productCost: String(variant.productCost ?? 0),
    isActive: variant.isActive ?? true,
    requirePreparation: variant.requirePreparation ?? false,
    unit: variant.unit ?? "UNIT",
    recipeItems: (variant.recipeItems ?? []).map((item) => ({
      id: item.id,
      ingredientVariantId: item.ingredientVariantId,
      quantity: item.quantity,
    })),
  })),
});

const fieldClassName =
  "w-full border border-border bg-background/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

const selectTriggerClassName =
  "h-10 w-full rounded-lg border border-border bg-background/40 px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

const errorMessage = (error?: { message?: string }) =>
  error?.message ? (
    <p className="flex items-center gap-1 text-xs text-danger">
      <AlertCircle className="h-3 w-3" />
      {error.message}
    </p>
  ) : null;

export function ProductFormModal({
  isOpen,
  product,
  products,
  categories,
  onClose,
}: ProductFormModalProps) {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();

  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    defaultValues: product ? toFormValues(product) : emptyForm(),
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants,
  } = useFieldArray({ control, name: "variants", keyName: "formKey" });

  const selectedProductType =
    useWatch({ control, name: "productType" }) ?? "";
  const watchedVariants =
    useWatch({ control, name: "variants" }) ?? [];
  const isMaterial = materialProductTypes.has(selectedProductType);
  const isRecipeProduct = selectedProductType === "RECIPE_PRODUCT";
  const isPending = isCreating || isUpdating;

  const visibleCategories = useMemo(() => {
    if (!selectedProductType) return [];
    const requiresPosCategory = !materialProductTypes.has(selectedProductType);
    return categories.filter(
      (category) => category.posVisible === requiresPosCategory,
    );
  }, [categories, selectedProductType]);

  const ingredientOptions = useMemo<IngredientOption[]>(
    () =>
      products
        .filter((candidate) => materialProductTypes.has(candidate.productType))
        .flatMap((candidate) =>
          candidate.variants
            .filter((variant) => variant.isActive && variant.id != null)
            .map((variant) => ({
              id: variant.id as number,
              label: `${candidate.name} · ${variant.name} · ${
                productUnits.find((unit) => unit.value === variant.unit)?.label ??
                variant.unit ??
                "Unidad"
              }`,
            })),
        ),
    [products],
  );

  const changeProductType = (nextType: string) => {
    setValue("productType", nextType, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("categoryId", null, { shouldDirty: true });

    const nextVariants = getValues("variants").map((variant) => ({
      ...variant,
      retailPrice: materialProductTypes.has(nextType)
        ? "0"
        : variant.retailPrice,
      wholesalePrice: materialProductTypes.has(nextType)
        ? "0"
        : variant.wholesalePrice,
      productCost: materialProductTypes.has(nextType)
        ? "0"
        : variant.productCost,
      minStock: nextType === "RECIPE_PRODUCT" ? "0" : variant.minStock,
      unit: materialProductTypes.has(nextType)
        ? variant.unit === "UNIT"
          ? "GRAM"
          : variant.unit
        : "UNIT",
      requirePreparation:
        nextType === "RECIPE_PRODUCT"
          ? true
          : variant.requirePreparation,
      recipeItems:
        nextType === "RECIPE_PRODUCT" ? variant.recipeItems : [],
    }));

    replaceVariants(nextVariants);
  };

  const addVariant = () => {
    appendVariant(emptyVariant(selectedProductType));
    setActiveVariantIndex(variantFields.length);
  };

  const deleteNewVariant = (index: number) => {
    removeVariant(index);
    setActiveVariantIndex(Math.max(index - 1, 0));
  };

  const validateRecipes = (values: ProductFormValues) => {
    if (values.productType !== "RECIPE_PRODUCT") return true;

    clearErrors("variants");
    let firstInvalidVariant = -1;

    values.variants.forEach((variant, index) => {
      const recipeItems = variant.recipeItems ?? [];
      const ingredientIds = recipeItems
        .map((item) => Number(item.ingredientVariantId))
        .filter(Boolean);
      const hasDuplicateIngredients =
        new Set(ingredientIds).size !== ingredientIds.length;

      if (recipeItems.length === 0) {
        setError(`variants.${index}.recipeItems`, {
          type: "manual",
          message: "Agrega al menos un ingrediente a esta receta.",
        });
        if (firstInvalidVariant < 0) firstInvalidVariant = index;
      } else if (hasDuplicateIngredients) {
        setError(`variants.${index}.recipeItems`, {
          type: "manual",
          message: "No repitas ingredientes dentro de la misma receta.",
        });
        if (firstInvalidVariant < 0) firstInvalidVariant = index;
      }
    });

    if (firstInvalidVariant >= 0) {
      setActiveVariantIndex(firstInvalidVariant);
      return false;
    }

    return true;
  };

  const submitForm = (values: ProductFormValues) => {
    if (!validateRecipes(values)) return;

    const payload = {
      id: values.id,
      name: values.name.trim(),
      categoryId: Number(values.categoryId),
      productType: values.productType,
      description: values.description.trim(),
      variants: values.variants.map((variant) => ({
        id: variant.id,
        name: variant.name.trim(),
        retailPrice: Number(variant.retailPrice),
        wholesalePrice: Number(variant.wholesalePrice || 0),
        minStock: values.productType === "RECIPE_PRODUCT" ? 0 : Number(variant.minStock),
        productCost: Number(variant.productCost),
        isActive: variant.isActive,
        requirePreparation: variant.requirePreparation,
        unit: variant.unit,
        recipeItems:
          values.productType === "RECIPE_PRODUCT"
            ? variant.recipeItems.map((item) => ({
                ingredientVariantId: Number(item.ingredientVariantId),
                quantity: Number(item.quantity),
              }))
            : [],
      })),
    };

    const options = {
      onSuccess: () => {
        toast(product ? "Producto actualizado" : "Producto creado", {
          variant: "success" as const,
        });
        onClose();
      },
      onError: () => {
        toast("No fue posible guardar el producto", {
          variant: "danger" as const,
        });
      },
    };

    if (product) updateProduct(payload, options);
    else createProduct(payload, options);
  };

  const activeVariant = variantFields[activeVariantIndex];
  const activeVariantErrors = errors.variants?.[activeVariantIndex];

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="h-[calc(100dvh-2rem)] w-full max-w-6xl rounded-xl sm:h-[calc(100dvh-5rem)]">
            <Modal.CloseTrigger
              aria-label="Cerrar formulario"
              onClick={onClose}
              className="rounded-full bg-pos-order-bg/90 p-2 text-white shadow-sm hover:bg-pos-order-bg"
            />

            <Modal.Header className="border-b border-border pb-4 pr-12">
              <div>
                <Modal.Heading className="text-xl font-semibold">
                  {product ? "Editar producto" : "Crear producto"}
                </Modal.Heading>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configura la información comercial y cada presentación del producto.
                </p>
              </div>
            </Modal.Header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={handleSubmit(submitForm)}
            >
              <Modal.Body className="min-h-0 flex-1 overflow-y-auto py-5">
                <div className="space-y-5">
                  <section className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Layers3 className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Información general
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Define cómo se clasifica y dónde aparece el producto.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <FormField label="Nombre" error={errors.name}>
                        <Input
                          autoFocus
                          className={fieldClassName}
                          placeholder="Ej. Cuajada con dulce"
                          {...register("name", {
                            required: "Escribe el nombre del producto.",
                            minLength: {
                              value: 2,
                              message: "Usa al menos 2 caracteres.",
                            },
                          })}
                        />
                      </FormField>

                      <FormField
                        label="Tipo de producto"
                        error={errors.productType}
                      >
                        <Controller
                          control={control}
                          name="productType"
                          rules={{ required: "Selecciona un tipo de producto." }}
                          render={({ field }) => (
                            <Select
                              aria-label="Tipo de producto"
                              className="w-full"
                              placeholder="Seleccionar tipo"
                              selectedKey={field.value || null}
                              onSelectionChange={(key) =>
                                changeProductType(String(key))
                              }
                            >
                              <Select.Trigger className={selectTriggerClassName}>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  {productTypes.map((type) => (
                                    <ListBox.Item
                                      id={type.value}
                                      key={type.value}
                                      textValue={type.label}
                                    >
                                      <div className="flex items-center gap-2">
                                        <type.icon className="h-4 w-4" />
                                        {type.label}
                                      </div>
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          )}
                        />
                      </FormField>

                      <FormField label="Categoría" error={errors.categoryId}>
                        <Controller
                          control={control}
                          name="categoryId"
                          rules={{ required: "Selecciona una categoría." }}
                          render={({ field }) => (
                            <Select
                              aria-label="Categoría"
                              className="w-full"
                              isDisabled={!selectedProductType}
                              placeholder={
                                selectedProductType
                                  ? "Seleccionar categoría"
                                  : "Primero selecciona el tipo"
                              }
                              selectedKey={
                                field.value == null ? null : String(field.value)
                              }
                              onSelectionChange={(key) =>
                                field.onChange(key == null ? null : Number(key))
                              }
                            >
                              <Select.Trigger className={selectTriggerClassName}>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  {visibleCategories.map((category) => (
                                    <ListBox.Item
                                      id={String(category.id)}
                                      key={category.id}
                                      textValue={category.name}
                                    >
                                      {category.name}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          )}
                        />
                      </FormField>

                      <FormField label="Descripción" error={errors.description}>
                        <Input
                          className={fieldClassName}
                          placeholder="Descripción breve (opcional)"
                          {...register("description")}
                        />
                      </FormField>
                    </div>

                    {selectedProductType && (
                      <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground">
                        {productTypeHelp[selectedProductType]}
                      </p>
                    )}
                  </section>

                  <section className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <PackagePlus className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Variantes
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Edita una variante a la vez para mantener el formulario ordenado.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariant}
                        isDisabled={!selectedProductType}
                      >
                        <Plus className="h-4 w-4" /> Nueva variante
                      </Button>
                    </div>

                    <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
                      <nav
                        aria-label="Variantes del producto"
                        className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
                      >
                        {variantFields.map((variant, index) => {
                          const variantName = watchedVariants[index]?.name?.trim();
                          const hasErrors = Boolean(errors.variants?.[index]);
                          const isActive = index === activeVariantIndex;

                          return (
                            <button
                              type="button"
                              key={variant.formKey}
                              onClick={() => setActiveVariantIndex(index)}
                              className={`flex min-w-48 items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors lg:min-w-0 ${
                                isActive
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background/30 hover:bg-muted/60"
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  hasErrors
                                    ? "bg-danger/15 text-danger"
                                    : isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {hasErrors ? "!" : index + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {variantName || `Variante ${index + 1}`}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {watchedVariants[index]?.isActive
                                    ? "Disponible"
                                    : "Inactiva"}
                                </span>
                              </span>
                              {isActive && (
                                <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </nav>

                      {activeVariant && (
                        <VariantEditor
                          key={activeVariant.formKey}
                          index={activeVariantIndex}
                          persisted={activeVariant.id != null}
                          canRemove={variantFields.length > 1}
                          isMaterial={isMaterial}
                          isRecipeProduct={isRecipeProduct}
                          ingredientOptions={ingredientOptions}
                          control={control}
                          register={register}
                          errors={activeVariantErrors}
                          onRemove={() => deleteNewVariant(activeVariantIndex)}
                        />
                      )}
                    </div>
                  </section>
                </div>
              </Modal.Body>

              <Modal.Footer className="border-t border-border pt-4">
                <div className="mr-auto hidden text-xs text-muted-foreground sm:block">
                  {isDirty ? "Hay cambios sin guardar" : "Sin cambios pendientes"}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  isDisabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" isDisabled={isPending}>
                  {isPending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

interface FormFieldProps {
  label: string;
  error?: { message?: string };
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {errorMessage(error)}
    </div>
  );
}

interface VariantEditorProps {
  index: number;
  persisted: boolean;
  canRemove: boolean;
  isMaterial: boolean;
  isRecipeProduct: boolean;
  ingredientOptions: IngredientOption[];
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors?: FieldErrors<ProductFormVariant>;
  onRemove: () => void;
}

function VariantEditor({
  index,
  persisted,
  canRemove,
  isMaterial,
  isRecipeProduct,
  ingredientOptions,
  control,
  register,
  errors,
  onRemove,
}: VariantEditorProps) {
  return (
    <div className="min-w-0 space-y-5 rounded-xl border border-border bg-background/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-foreground">
            Configuración de la variante {index + 1}
          </h4>
          <p className="text-xs text-muted-foreground">
            Define precios, inventario y preparación.
          </p>
        </div>
        {!persisted && canRemove && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            aria-label="Eliminar variante nueva"
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre de la variante" error={errors?.name}>
          <Input
            className={fieldClassName}
            placeholder="Ej. Melao, grande o unidad"
            {...register(`variants.${index}.name`, {
              required: "Escribe el nombre de la variante.",
            })}
          />
        </FormField>

        {isMaterial && (
          <FormField label="Unidad de inventario" error={errors?.unit}>
            <Controller
              control={control}
              name={`variants.${index}.unit`}
              rules={{ required: "Selecciona una unidad." }}
              render={({ field }) => (
                <Select
                  aria-label="Unidad de inventario"
                  className="w-full"
                  placeholder="Seleccionar unidad"
                  selectedKey={field.value || null}
                  onSelectionChange={(key) => field.onChange(String(key))}
                >
                  <Select.Trigger className={selectTriggerClassName}>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {productUnits.map((unit) => (
                        <ListBox.Item
                          id={unit.value}
                          key={unit.value}
                          textValue={unit.label}
                        >
                          {unit.label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}
            />
          </FormField>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-primary" />
          <h5 className="text-sm font-semibold text-foreground">
            Valores e inventario
          </h5>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <NumericField
            label="Precio público"
            name={`variants.${index}.retailPrice`}
            register={register}
            error={errors?.retailPrice}
            disabled={isMaterial}
          />
          <NumericField
            label="Precio mayorista"
            name={`variants.${index}.wholesalePrice`}
            register={register}
            error={errors?.wholesalePrice}
            disabled={isMaterial}
          />
          <NumericField
            label="Costo"
            name={`variants.${index}.productCost`}
            register={register}
            error={errors?.productCost}
            disabled={isMaterial}
          />
          {!isRecipeProduct && (
            <NumericField
              label="Stock mínimo"
              name={`variants.${index}.minStock`}
              register={register}
              error={errors?.minStock}
              integer
            />
          )}
        </div>
        {isMaterial && (
          <p className="mt-2 text-xs text-muted-foreground">
            Los ingredientes y bases no se venden directamente; sus valores comerciales se guardan en cero.
          </p>
        )}
        {isRecipeProduct && (
          <p className="mt-2 text-xs text-muted-foreground">
            La disponibilidad se calcula en el POS con el inventario de los ingredientes de la receta; esta variante no maneja stock mínimo propio.
          </p>
        )}
      </div>

      {isRecipeProduct && (
        <RecipeEditor
          variantIndex={index}
          control={control}
          register={register}
          ingredientOptions={ingredientOptions}
          error={errors?.recipeItems as { message?: string } | undefined}
        />
      )}

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <SwitchField
          control={control}
          name={`variants.${index}.isActive`}
          label="Variante disponible"
          description="Puede utilizarse en ventas y movimientos de inventario."
        />
        <SwitchField
          control={control}
          name={`variants.${index}.requirePreparation`}
          label="Requiere comanda"
          description="Se enviará al flujo de preparación al registrarse una venta."
        />
      </div>

      {persisted && (
        <p className="text-xs text-muted-foreground">
          Las variantes existentes se conservan para no afectar movimientos históricos. Si ya no se usa, desactívala.
        </p>
      )}
    </div>
  );
}

interface NumericFieldProps {
  label: string;
  name:
    | `variants.${number}.retailPrice`
    | `variants.${number}.wholesalePrice`
    | `variants.${number}.productCost`
    | `variants.${number}.minStock`;
  register: UseFormRegister<ProductFormValues>;
  error?: { message?: string };
  disabled?: boolean;
  integer?: boolean;
}

function NumericField({
  label,
  name,
  register,
  error,
  disabled = false,
  integer = false,
}: NumericFieldProps) {
  return (
    <FormField label={label} error={error}>
      <Input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min="0"
        step={integer ? "1" : "0.01"}
        disabled={disabled}
        className={fieldClassName}
        {...register(name, {
          required: "Este valor es requerido.",
          min: { value: 0, message: "El valor no puede ser negativo." },
          validate: integer
            ? (value) =>
                Number.isInteger(Number(value)) || "Usa un número entero."
            : undefined,
        })}
      />
    </FormField>
  );
}

interface RecipeEditorProps {
  variantIndex: number;
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  ingredientOptions: IngredientOption[];
  error?: { message?: string };
}

function RecipeEditor({
  variantIndex,
  control,
  register,
  ingredientOptions,
  error,
}: RecipeEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.recipeItems`,
    keyName: "formKey",
  });

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <div>
            <h5 className="text-sm font-semibold text-foreground">Receta</h5>
            <p className="text-xs text-muted-foreground">
              Cantidad consumida por una unidad vendida.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            append({ ingredientVariantId: null, quantity: "" })
          }
        >
          <Plus className="h-4 w-4" /> Ingrediente
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          La receta todavía no tiene ingredientes.
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((item, recipeIndex) => (
            <div
              key={item.formKey}
              className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-start"
            >
              <Controller
                control={control}
                name={`variants.${variantIndex}.recipeItems.${recipeIndex}.ingredientVariantId`}
                rules={{ required: "Selecciona un ingrediente." }}
                render={({ field, fieldState }) => (
                  <div className="space-y-1">
                    <Select
                      aria-label="Ingrediente"
                      className="w-full"
                      placeholder="Seleccionar ingrediente"
                      selectedKey={
                        field.value == null ? null : String(field.value)
                      }
                      onSelectionChange={(key) =>
                        field.onChange(key == null ? null : Number(key))
                      }
                    >
                      <Select.Trigger className={selectTriggerClassName}>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {ingredientOptions.map((option) => (
                            <ListBox.Item
                              id={String(option.id)}
                              key={option.id}
                              textValue={option.label}
                            >
                              {option.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {errorMessage(fieldState.error)}
                  </div>
                )}
              />

              <div className="space-y-1">
                <Input
                  aria-label="Cantidad del ingrediente"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="Cantidad"
                  className={fieldClassName}
                  {...register(
                    `variants.${variantIndex}.recipeItems.${recipeIndex}.quantity`,
                    {
                      required: "Indica la cantidad.",
                      min: {
                        value: 0.01,
                        message: "Debe ser mayor que cero.",
                      },
                    },
                  )}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                aria-label="Quitar ingrediente"
                onClick={() => remove(recipeIndex)}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {errorMessage(error)}
    </div>
  );
}

interface SwitchFieldProps {
  control: Control<ProductFormValues>;
  name:
    | `variants.${number}.isActive`
    | `variants.${number}.requirePreparation`;
  label: string;
  description: string;
}

function SwitchField({
  control,
  name,
  label,
  description,
}: SwitchFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch
          name={field.name}
          inputRef={field.ref}
          isSelected={Boolean(field.value)}
          onBlur={field.onBlur}
          onChange={field.onChange}
          className="w-full items-start rounded-lg bg-muted/30 p-3"
        >
          <Switch.Control className="mt-0.5">
            <Switch.Thumb>
              {field.value && <Check className="h-3 w-3" />}
            </Switch.Thumb>
          </Switch.Control>
          <Switch.Content>
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {description}
            </span>
          </Switch.Content>
        </Switch>
      )}
    />
  );
}
