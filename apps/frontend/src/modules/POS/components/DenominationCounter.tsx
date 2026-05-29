import React, {  useMemo, type Dispatch, type SetStateAction } from "react";
import { Input } from "@heroui/react";
import numeral from "numeral";

export const BILL_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000];
export const COIN_DENOMINATIONS = [1000, 500, 200, 100, 50];

interface Props {
  billCounts: Record<number, string>;
  setBillCounts: Dispatch<SetStateAction<Record<number, string>>>;
  showTotal?: boolean;
}

const DenominationCounter = ({ billCounts, setBillCounts, showTotal = true }: Props) => {
  const countedCash = useMemo(() => {
    return [...BILL_DENOMINATIONS, ...COIN_DENOMINATIONS].reduce((sum, denom) => {
      const count = parseInt(billCounts[denom] || "0") || 0;
      return sum + denom * count;
    }, 0);
  }, [billCounts]);

  return (
    <div>
      <div className="space-y-1.5 mb-4">
        <p className="text-xs text-muted-foreground">Billetes</p>
        {BILL_DENOMINATIONS.map((denom) => (
          <div key={denom} className="flex items-center gap-3">
            <span className="w-16 text-sm font-medium text-foreground text-right">
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
              className="w-20 text-center h-8 text-sm"
            />
            <span className="text-sm text-muted-foreground w-20 text-right">
              = ${numeral((parseInt(billCounts[denom] || "0") || 0) * denom).format("0,0")}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 mb-6">
        <p className="text-xs text-muted-foreground">Monedas</p>
        {COIN_DENOMINATIONS.map((denom) => (
          <div key={denom} className="flex items-center gap-3">
            <span className="w-16 text-sm font-medium text-foreground text-right">
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
              className="w-20 text-center h-8 text-sm"
            />
            <span className="text-sm text-muted-foreground w-20 text-right">
              = ${numeral((parseInt(billCounts[denom] || "0") || 0) * denom).format("0,0")}
            </span>
          </div>
        ))}
      </div>

      {showTotal && (
        <div className="rounded-xl bg-secondary/50 p-4 text-center mb-6">
          <p className="text-xs text-muted-foreground mb-1">Total contado</p>
          <p className="text-2xl font-bold text-foreground"> ${numeral(countedCash).format("0,0")}</p>
        </div>
      )}
    </div>
  );
};

export default DenominationCounter;
