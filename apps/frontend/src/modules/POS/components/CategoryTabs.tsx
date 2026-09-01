export interface POSCategory {
  id: number;
  name: string;
  posVisible: boolean;
}

interface CategoryTabsProps {
  categories: POSCategory[];
  active: POSCategory | null;
  onSelect: (category: POSCategory) => void;
}

const CategoryTabs = ({ categories, active, onSelect }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {categories.filter((category) => category.posVisible).map((category) => (
        <button
          type="button"
          key={category.id}
          onClick={() => onSelect(category)}
          className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
            active?.id === category.id
              ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
              : "bg-pos-category-inactive text-foreground/75 hover:bg-secondary"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
