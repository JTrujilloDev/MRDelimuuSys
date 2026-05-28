-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "cashRegisterId" INTEGER;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
