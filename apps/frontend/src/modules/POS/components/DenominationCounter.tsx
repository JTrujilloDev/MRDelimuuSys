import { useMemo, type Dispatch, type SetStateAction } from "react";
import { calculateCashCount } from "../utils/cashCount.rules";
import { Input } from "@heroui/react";
import numeral from "numeral";

export const BILL_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000];
export const COIN_DENOMINATIONS = [1000, 500, 200, 100, 50];

interface Props {
  billCounts: Record<number, string>;
  setBillCounts: Dispatch<SetStateAction<Record<number, string>>>;
  showTotal?: boolean;
  compact?: boolean;
}

const DenominationCounter = ({ billCounts, setBillCounts, showTotal = true, compact = false }: Props) => {
  const counted = useMemo(() => calculateCashCount(billCounts, [...BILL_DENOMINATIONS, ...COIN_DENOMINATIONS]), [billCounts]);
  const countedCash = counted.total;

  return (
    <div>
      {!counted.valid && <p role="alert" className="mb-3 text-sm text-destructive">Ingresa cantidades enteras y no negativas de billetes y monedas.</p>}
      <div className={compact ? "grid grid-cols-2 gap-5" : undefined}>
      <div className={compact ? "space-y-1.5" : "mb-4 space-y-1.5"}>
        <p className="text-xs text-muted-foreground">Billetes</p>
        {BILL_DENOMINATIONS.map((denom) => (
          <div key={denom} className="flex items-center gap-3">
            <span className={`${compact ? "w-14" : "w-16"} text-right text-sm font-medium text-foreground`}>
              {numeral(denom).format("0,0")}
            </span>
            <span className="text-muted-foreground text-sm">×</span>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={billCounts[denom] || ""}
              onChange={(e) =>
                setBillCounts((prev) => ({
                  ...prev,
                  [denom]: e.target.value,
                }))
              }
              className={`${compact ? "w-16" : "w-20"} h-8 text-center text-sm`}
            />
            <span className={`${compact ? "w-16" : "w-20"} text-right text-sm text-muted-foreground`}>
              = ${numeral(calculateCashCount(billCounts, [denom]).total).format("0,0")}
            </span>
          </div>
        ))}
      </div>

      <div className={compact ? "space-y-1.5" : "mb-6 space-y-1.5"}>
        <p className="text-xs text-muted-foreground">Monedas</p>
        {COIN_DENOMINATIONS.map((denom) => (
          <div key={denom} className="flex items-center gap-3">
            <span className={`${compact ? "w-14" : "w-16"} text-right text-sm font-medium text-foreground`}>
              ${numeral(denom).format("0,0")}
            </span>
            <span className="text-muted-foreground text-sm">×</span>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={billCounts[denom] || ""}
              onChange={(e) =>
                setBillCounts((prev) => ({
                  ...prev,
                  [denom]: e.target.value,
                }))
              }
              className={`${compact ? "w-16" : "w-20"} h-8 text-center text-sm`}
            />
            <span className={`${compact ? "w-16" : "w-20"} text-right text-sm text-muted-foreground`}>
              = ${numeral(calculateCashCount(billCounts, [denom]).total).format("0,0")}
            </span>
          </div>
        ))}
      </div>
      </div>

      {showTotal && (
        <div className={`${compact ? "mt-4 p-3" : "mb-6 p-4"} rounded-xl bg-secondary/50 text-center`}>
          <p className="text-xs text-muted-foreground mb-1">Total contado</p>
          <p className="text-2xl font-bold text-foreground"> ${numeral(countedCash).format("0,0")}</p>
        </div>
      )}
    </div>
  );
};

export default DenominationCounter;
