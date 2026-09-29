-- Application checks provide friendly errors; these indexes close the concurrency gap
-- when two requests try to open a shift at the same time.
CREATE UNIQUE INDEX "CashRegister_one_open_per_terminal_key"
ON "CashRegister"("terminalId")
WHERE "status" = 'OPEN';

CREATE UNIQUE INDEX "CashRegister_one_open_per_user_key"
ON "CashRegister"("userId")
WHERE "status" = 'OPEN';

