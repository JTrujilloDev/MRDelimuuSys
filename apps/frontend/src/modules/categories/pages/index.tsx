import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Table,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { useGetAllProductCategories } from "../hooks/useGetAllCategories";
import dayjs from "dayjs";
import { BiEdit } from "react-icons/bi";
import { RiDeleteBin3Line } from "react-icons/ri";
import { useState } from "react";
import { useCreateProductCategory } from "../hooks/useCreateProductCategory";
import { useDeleteProductCategory } from "../hooks/useDeleteProductCategory";
import { useUpdateProductCategory } from "../hooks/useUpdateProductCategory";

const Index = () => {
  const { data: productCategories } = useGetAllProductCategories();
  const { mutate: createProductCategory } = useCreateProductCategory();
  const { mutate: deleteProductCategory } = useDeleteProductCategory();
  const { mutate: updateProductCategory } = useUpdateProductCategory();

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    if (selectedCategory?.id) {
      updateProductCategory(
        {
          id: selectedCategory.id,
          name: data.name,
          description: data.description,
        },
        {
          onSuccess: () => {
            toast("Categoria actualizada exitosamente", {
              variant: "success",
            });

            setCreateCategoryModal(false);
            setSelectedCategory(null);
          },
          onError: () => {
            toast("Error al actualizar la categoria", {
              variant: "danger",
            });
          },
        },
      );
      e.currentTarget.reset();
      return;
    }
    createProductCategory(data, {
      onSuccess: () => {
        toast("Categoria creada exitosamente", {
          variant: "success",
        });
        setCreateCategoryModal(false);
      },
      onError: () => {
        toast("Error al crear la categoria", {
          variant: "danger",
        });
      },
    });
    e.currentTarget.reset();
  };

  const handleDelete = (id: string) => {
    deleteProductCategory(Number(id), {
      onSuccess: () => {
        setDeleteCategoryConfirmationModal(false);
        toast("Categoria eliminada exitosamente", {
          variant: "success",
        });
        setSelectedCategory(null);
      },
      onError: (error) => {
        toast("Error al eliminar la categoria", {
          variant: "danger",
          description: error.message,
        });
      },
    });
  };

  const [createCategoryModal, setCreateCategoryModal] = useState(false);
  const [deleteCategoryConfirmationModal, setDeleteCategoryConfirmationModal] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string; description: string; createdAt: string; updatedAt: string } | null>(null);
  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-start gap-4 p-10">
        <div className="w-full rounded-[24px] bg-pos-order-bg px-6 py-5 text-white shadow-[0_18px_40px_-30px_rgba(84,56,32,0.45)]">
          <h1 className="text-4xl font-bold text-white">Categorias de productos</h1>
          <p className="mt-1 text-sm text-white/70">Administra y organiza las categorías del catálogo.</p>
        </div>
        <div className="flex w-full justify-end">
          <Button onClick={() => setCreateCategoryModal(true)}>
            + Agregar categoría
          </Button>
        </div>
        <Table className="mt-10 w-full overflow-hidden rounded-[24px] border border-border bg-pos-surface shadow-sm">
          <Table.ScrollContainer>
            <Table.Content aria-label="Categorias de productos">
              <Table.Header>
                <Table.Column className="bg-pos-order-bg text-white" isRowHeader>ID</Table.Column>
                <Table.Column className="bg-pos-order-bg text-white">Nombre</Table.Column>
                <Table.Column className="bg-pos-order-bg text-white">Descripción</Table.Column>
                <Table.Column className="bg-pos-order-bg text-white">Fecha de creación</Table.Column>
                <Table.Column className="bg-pos-order-bg text-white">Última actualización</Table.Column>
                <Table.Column className="bg-pos-order-bg text-white">Editar</Table.Column>
                <Table.Column className="bg-pos-order-bg text-white">Eliminar</Table.Column>
              </Table.Header>
              <Table.Body>
                {productCategories?.data?.map((category : { id: number; name: string; description: string; createdAt: string; updatedAt: string }) => (
                  <Table.Row key={category.id}>
                    <Table.Cell>{category.id}</Table.Cell>
                    <Table.Cell>{category.name}</Table.Cell>
                    <Table.Cell>{category.description}</Table.Cell>
                    <Table.Cell>
                      {dayjs(category.createdAt).format("DD/MM/YYYY")}
                    </Table.Cell>
                    <Table.Cell>
                      {dayjs(category.updatedAt).format("DD/MM/YYYY")}{" "}
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        className="cursor-pointer"
                        onPress={() => {
                          setSelectedCategory(category);
                          setCreateCategoryModal(true);
                        }}
                      >
                        <BiEdit size={20} />
                      </Button>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        className="cursor-pointer"
                        onPress={() => {
                          setSelectedCategory(category);
                          setDeleteCategoryConfirmationModal(true);
                        }}
                      >
                        <RiDeleteBin3Line size={20} />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      <Modal>
        <Modal.Backdrop isOpen={createCategoryModal}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger
                onClick={() => setCreateCategoryModal(false)}
              />

              <Modal.Header>
                <Modal.Heading className="text-xl">
                  Crear categoría
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="flex flex-col gap-4 px-5 py-4 w-full">
                <Form
                  className="flex flex-col gap-4 w-full"
                  onSubmit={handleCreateSubmit}
                >
                  <TextField
                    className="w-full"
                    name="name"
                    isRequired
                    defaultValue={selectedCategory?.name}
                    validate={(value) => {
                      if (value.length < 3) {
                        return "El nombre de la categoria debe tener al menos 3 caracteres";
                      }
                    }}
                  >
                    <Label className="text-white">Nombre</Label>
                    <Input className="w-full mt-2" />
                    <FieldError />
                  </TextField>

                  <div className="flex flex-col gap-1 w-full">
                    <Label className= "text-white">Descripción</Label>
                    <TextArea
                      className="resize-none mt-2"
                      name="description"
                      defaultValue={selectedCategory?.description}
                    />
                  </div>
                  <Modal.Footer className="px-5 pb-5">
                    <Button className="w-full" type="submit">
                      Crear
                    </Button>
                  </Modal.Footer>
                </Form>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop isOpen={deleteCategoryConfirmationModal}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-100 w-full">
              <Modal.CloseTrigger
                onClick={() => setDeleteCategoryConfirmationModal(false)}
              />

              <Modal.Header>
                <Modal.Heading className="text-lg font-semibold">
                  Eliminar categoría
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="px-5 py-4 flex flex-col gap-3">
                <p className="text-sm ">
                  ¿Estás seguro que deseas eliminar{" "}
                  <span className="font-medium text-white ">
                    {selectedCategory?.name}
                  </span>
                  ?
                </p>
              </Modal.Body>

              <Modal.Footer className="px-5 pb-5 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onPress={() => {
                    setDeleteCategoryConfirmationModal(false);
                    setSelectedCategory(null);
                  }}
                >
                  Cancelar
                </Button>

                <Button onPress={() => handleDelete(selectedCategory?.id)}>
                  Eliminar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};

export default Index;
