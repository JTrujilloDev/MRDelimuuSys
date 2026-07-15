import { Button, Card } from "@heroui/react";

const index = () => {
  const comanda = {
    accountName: "Mesa 3",
    products: [
      {
        name: "Cuajada + dulce - Papayuela - Arequipe",
        quantity: 2,
        note: "Para llevar",
      },
      {
        name: "Cuajada + dulce - Mora",
        quantity: 1,
        note: "Para llevar",
      },
    ],
    status: "Pendiente",
  };

  const pedidos = [comanda, comanda, comanda];

  const inveroryStatus = [
    {name: "Fresas con crema", quantity: 10},
    {name: "Arroz con leche", quantity: 5},
  ]
  return (
    <div className="p-6 w-full h-full">
      <h1 className="text-3xl font-bold">Cocina</h1>
      <div className="flex flex-row w-full gap-4 mt-4 h-9/10 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 w-4/5">
          {pedidos.map((pedido, index) => (
            <Card
              key={pedido.id ?? index}
              className="rounded-2xl shadow-md border"
            >
              {/* Header */}
              <Card.Header className="border-b pb-2">
                <Card.Title className="text-xl font-bold">
                  {pedido.accountName}
                </Card.Title>
                <Card.Description className="text-sm text-gray-500">
                  Pedido #{index + 1}
                </Card.Description>
              </Card.Header>

              {/* Content */}
              <Card.Content className="space-y-3 mt-3">
                {pedido.products.map((product, i) => (
                  <div
                    key={i}
                    className="flex flex-col border-b pb-2 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-xl font-medium">{product.name}</p>
                      <span className="text-lg font-bold bg-green-500 px-2 py-1 rounded">
                        {product.quantity}
                      </span>
                    </div>

                    {product.note && (
                      <p className="text-lg  mt-1 p-2 rounded italic">
                        ⚠️ {product.note}
                      </p>
                    )}
                  </div>
                ))}
              </Card.Content>

              {/* Footer */}
              <Card.Footer className="mt-4">
                <Button className="w-full">Marcar en preparación</Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
        <div className="flex flex-col items-center  w-1/5 h-full ">
        <h1 className="text-3xl font-bold  ">En vitrina</h1>
        {inveroryStatus.map((product, i) => (
          <div
            key={i}
            className="flex flex-col border-b pb-2 last:border-b-0 w-full p-4"
          >
            <div className="flex justify-between items-center">
              <p className="text-xl font-medium">{product.name}</p>
              <span className="text-lg font-bold  px-2 py-1 rounded">
                {product.quantity} - Unidades
              </span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default index;
