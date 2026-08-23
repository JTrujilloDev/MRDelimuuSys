import { Tabs } from "@heroui/react";
import { useSearchParams } from "react-router";
import ProductCategories from "../../categories/pages";
import Products from "../../products/pages";

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab =
    searchParams.get("tab") === "categories" ? "categories" : "products";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-5 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra los productos y las categorías del catálogo.
        </p>
      </div>

    <Tabs
      className="flex min-h-0 flex-1 flex-col"
      selectedKey={selectedTab}
      onSelectionChange={(key) => setSearchParams({ tab: String(key) })}
    >
      <Tabs.ListContainer className="w-fit rounded-md border border-border bg-card">
        <Tabs.List
          aria-label="Secciones del catálogo"
          className="grid grid-cols-2 gap-1 overflow-hidden rounded-md bg-background"
        >
          <Tabs.Tab
            id="products"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground"
          >
            Productos
            <Tabs.Indicator className="bg-primary" />
          </Tabs.Tab>
          <Tabs.Tab
            id="categories"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground"
          >
            Categorías
            <Tabs.Indicator className="bg-primary" />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
      <Tabs.Panel id="products" className="min-h-0 flex-1 pt-5"><Products embedded /></Tabs.Panel>
      <Tabs.Panel id="categories" className="min-h-0 flex-1 overflow-y-auto pt-5"><ProductCategories embedded /></Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default Catalog;
