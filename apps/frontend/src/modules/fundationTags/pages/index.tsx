import dayjs from "dayjs";
import { printLabelService } from "../../../shared/services/qz.service";
import isoWeek from "dayjs/plugin/isoWeek";
import { foundationMenu } from "../../../shared/constants/fundationMenu";
import { Button } from "@heroui/react";

const index = () => {
  dayjs.extend(isoWeek);
  const CYCLE_START = dayjs("2026-07-01"); // Lunes de la Semana 1
  const CYCLE_WEEKS = 3;

  const dayNames = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;

  function getProductionDay(date: Dayjs = dayjs()) {
    // Producción del día siguiente
    const productionDate = date.add(1, "day");

    const weeksPassed = productionDate.diff(CYCLE_START, "week");

    return {
      week: (weeksPassed % CYCLE_WEEKS) + 1,
      day: dayNames[productionDate.isoWeekday() - 1],
      dayNumber: productionDate.isoWeekday(),
      productionDate,
    };
  }

  const preparationDay = dayjs().format("DD/MM/YYYY");
  const expirationDay = dayjs().add(5, "day").format("DD/MM/YYYY");
  const lotBase = dayjs().format("YYYYMMDD");

  const createLabel = (product) => {
    const { name, content, lotRef, labelAmount } = product;

    return [
      `SIZE 50 mm,30 mm`,
      `GAP 2 mm,0`,
      `HOME`,
      `CLS`,
      `TEXT 2,20,"2",0,2,1,"${name}"`,
      `TEXT 2,55,"2",0,1,1,"${content}"`,
      `TEXT 25,90,"2",0,1,1,"Elab. ${preparationDay}"`,
      `TEXT 25,115,"2",0,1,1,"Venc. ${expirationDay}"`,
      `TEXT 25,145,"2",0,1,1,"Lote: ${lotBase}${lotRef}01"`,
      `TEXT 5,170,"2",0,1,1,"Fabricado por Delimuu"`,
      `TEXT 5,195,"2",0,1,1,"NIT 79.062.341-1"`,
      `PRINT ${labelAmount}`,
    ].join("\r\n");
  };
  const handlePrint = async (meals) => {
    try {
      const tspl = Object.values(meals)
        .filter(Boolean)
        .map(createLabel)
        .join("\r\n");

      await printLabelService("TSCE210", tspl);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex flex-col items-center justify-center  rounded-lg shadow-md p-8 w-full h-1/2 ">
        <div>
          {foundationMenu.map((week) => (
            <div key={week.week} className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Semana {week.week}</h2>
              <div className="grid grid-cols-7 gap-4">
                {Object.entries(week.days).map(([dayKey, day], index) => (
                  <div key={dayKey} className={`p-4 border rounded-lg `}>
                    <h3 className="text-lg font-semibold mb-2">{day.name}</h3>
                    <div>
                      {Object.entries(day.meals).map(([mealKey, product]) => (
                        <div key={mealKey} className="mb-2">
                          {product?.name || "-"}
                        </div>
                      ))}
                    </div>
                    <Button
                      className="mt-4"
                      onClick={() => handlePrint(day.meals)}
                    >
                      Imprimir etiquetas
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default index;
