-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_relatedAccountId_fkey" FOREIGN KEY ("relatedAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
