import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  toast,
} from "@heroui/react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  inventoryTransactionsByProductType,
} from "../../../shared/constants/inventoryTransactionsByProductType";
import { useGetProductsByCategory } from "../../products/hooks/useGetProductsByCategory";
import { useCreatePOSInventoryTransaction } from "../hooks/useCreatePOSInventoryTransaction";

interface TransactionFormProps {
  dialogOpen: boolean;
  categories: any;
  setDialogOpen: (open: boolean) => void;
}



interface TransactionFormData {
  productVariantId: number | null;
  productType: string;
  categoryId: number | null;
  productId: number | null;
  type: string;
  quantity: string;
  observation: string;
}

const TransactionForm = ({
  dialogOpen,
  categories,
  setDialogOpen,
}: TransactionFormProps) => {
  const { control, handleSubmit, reset, setValue } =
    useForm<TransactionFormData>({
      defaultValues: {
        categoryId: null,
        productId: null,
        productVariantId: null,
        productType: "",
        type: "",
        quantity: "",
        observation: "",
      },
    });

  const selectedCategory = useWatch({
    control,
    name: "categoryId",
  });
  const { data: products } = useGetProductsByCategory(selectedCategory);
  const { mutate: createTransaction } = useCreatePOSInventoryTransaction();

  const selectedProduct = useWatch({
    control,
    name: "productId",
  });

  const availableVariants =
    products?.data?.find((p) => p.id === selectedProduct)?.variants ?? [];

  const productType =
    products?.data?.find((p) => p.id === selectedProduct)?.productType ?? "";
  const productVariantId = useWatch({
    control,
    name: "productVariantId",
  });
  const productVariantIsNew = availableVariants.find(
    (p) => p.id === productVariantId,
  )?.isNew;

  const availableTransactions = productVariantIsNew
    ? inventoryTransactionsByProductType.NEW_VARIANT
    : inventoryTransactionsByProductType[
        productType as keyof typeof inventoryTransactionsByProductType
      ];

  const onSubmit = (
    data: TransactionFormData & {
      categoryId: number | null;
      productId: number | null;
    },
  ) => {
    createTransaction(
      {
        productVariantId: data.productVariantId,
        type: data.type,
        quantity: Number(data.quantity) ,
        observation: data.observation,
      },
      {
        onSuccess: () => {
          reset();
          setDialogOpen(false);

          toast("Movimiento registrado exitosamente", {
            variant: "success",
          });
        },
        onError: (error) => {
          toast(
            error instanceof Error
              ? error.message
              : "Error al registrar el movimiento",
            {
              variant: "danger",
            },
          );
        },
      },
    );
  };
  return (
    <Modal>
      <Modal.Backdrop isOpen={dialogOpen}>
        <Modal.Container size="lg">
          <Modal.Dialog className="rounded-xl">
            <Modal.Header>
              <h2 className="text-lg font-bold">Registrar movimiento</h2>
              <p className="text-sm text-muted-foreground">
                Formulario de registro de movimiento
              </p>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-4">
              <div className="flex gap-4 flex-col mb-4">
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ""}
                      placeholder="Seleccione una categoría"
                      onChange={(value) => {
                        field.onChange(Number(value));

                        setValue("productId", null);
                        setValue("productVariantId", null);
                      }}
                    >
                      <Label>Categoria</Label>

                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>

                      <Select.Popover className="rounded-md">
                        <ListBox>
                          {categories?.data?.map((cat) => (
                            <ListBox.Item
                              key={cat.id}
                              id={cat.id.toString()}
                              textValue={cat.name}
                            >
                              {cat.name}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name="productId"
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ""}
                      placeholder="Seleccione un producto"
                      onChange={(value) => {
                        field.onChange(Number(value));

                        setValue("productVariantId", null);
                      }}
                    >
                      <Label>Producto</Label>

                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>

                      <Select.Popover className="rounded-md">
                        <ListBox>
                          {products?.data
                            ?.filter(
                              (prod) => prod.productType !== "RECIPE_PRODUCT",
                            )
                            .map((prod) => (
                              <ListBox.Item
                                key={prod.id}
                                id={prod.id.toString()}
                                textValue={prod.name}
                              >
                                {prod.name}
                              </ListBox.Item>
                            ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name="productVariantId"
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ""}
                      placeholder="Seleccione una variante"
                      onChange={(value) => field.onChange(Number(value))}
                    >
                      <Label>Variante</Label>

                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>

                      <Select.Popover className="rounded-md">
                        <ListBox>
                          {availableVariants.map((variant) => (
                            <ListBox.Item
                              key={variant.id}
                              id={variant.id.toString()}
                              textValue={variant.name}
                            >
                              {variant.name}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                />
              </div>

              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    placeholder="Seleccione el tipo de transacción"
                    onChange={(value) => field.onChange(value)}
                  >
                    <Label>Tipo de transacción</Label>

                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>

                    <Select.Popover className="rounded-md">
                      <ListBox>
                        {availableTransactions?.length &&
                          availableTransactions.map((type) => (
                            <ListBox.Item
                              key={type.value}
                              id={type.value}
                              textValue={type.label}
                            >
                              <Chip className={type.className}>
                                {type.label}
                              </Chip>
                            </ListBox.Item>
                          ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <Label>Cantidad</Label>
                    <Input
                      placeholder="Cantidad"
                      value={field.value?.toString() ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (value === "") {
                          field.onChange(0);
                          return;
                        }

                        if (!isNaN(Number(value))) {
                          field.onChange(Number(value));
                        }
                      }}
                    />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="observation"
                render={({ field }) => (
                  <TextArea {...field} rows={3} placeholder="Observaciones" />
                )}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  reset();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit(onSubmit)}>Registrar</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default TransactionForm;
