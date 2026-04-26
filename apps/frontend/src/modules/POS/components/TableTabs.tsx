import { Plus, X } from "lucide-react";

interface Table {
  id: string;
  label: string;
  items: { id: string }[];
}

interface TableTabsProps {
  tables: Table[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

const TableTabs = ({ tables, activeId, onSelect, onAdd, onRemove }: TableTabsProps) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {tables.map((table) => {
        const isActive = table.id === activeId;
        const hasItems = table.items.length > 0;
        return (
          <button
            key={table.id}
            onClick={() => onSelect(table.id)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-pos-order-bg text-white hover:bg-pos-order-bg/90"
            }`}
          >
            <span>{table.label}</span>
            {hasItems && (
              <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-white/15 text-white"
              }`}>
                {table.items.length}
              </span>
            )}
            {tables.length > 1 && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(table.id);
                }}
                className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                  isActive
                    ? "hover:bg-primary-foreground/20 text-primary-foreground/60"
                    : "hover:bg-muted text-muted-foreground/50"
                }`}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onAdd}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default TableTabs;
