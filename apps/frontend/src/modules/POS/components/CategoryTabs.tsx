interface CategoryTabsProps {
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

const CategoryTabs = ({ categories, active, onSelect }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {categories.filter((cat) => cat?.posVisible).map((cat ) => (
        <button
          key={cat.name}
          onClick={() => onSelect(cat)}
          className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
            active?.name === cat?.name
              ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
              : "bg-pos-category-inactive text-foreground/75 hover:bg-secondary"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
