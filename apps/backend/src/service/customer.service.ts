import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
  type CustomerFiscalInput,
  type CustomerIdentificationType,
  normalizeCustomerIdentification,
  validateCustomerFiscalInput,
} from "./customer.rules";

export const customerSnapshot = (customer: {
  id: number;
  identificationType: string | null;
  identification: string | null;
  verificationDigit: string | null;
  organizationType: string | null;
  name: string;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  countryCode: string | null;
  municipalityCode: string | null;
  tributeCode: string | null;
  responsibilities: string[];
}) => ({ ...customer });

export const upsertCustomerTx = async (
  tx: Prisma.TransactionClient,
  input: CustomerFiscalInput,
) => {
  const data = validateCustomerFiscalInput(input);
  return tx.customer.upsert({
    where: {
      identificationType_identification: {
        identificationType: data.identificationType,
        identification: data.identification,
      },
    },
    create: { ...data, isActive: true },
    update: { ...data, isActive: true },
  });
};

export const createOrUpdateCustomerService = (input: CustomerFiscalInput) =>
  prisma.$transaction(tx => upsertCustomerTx(tx, input));

export const findCustomerByIdentificationService = (
  identificationType: CustomerIdentificationType,
  identificationValue: unknown,
) => prisma.customer.findUnique({
  where: {
    identificationType_identification: {
      identificationType,
      identification: normalizeCustomerIdentification(identificationValue),
    },
  },
});

export const getAllCustomersService = (searchValue: unknown) => {
  const search = typeof searchValue === "string" ? searchValue.trim().slice(0, 80) : "";
  return prisma.customer.findMany({
    where: {
      isActive: true,
      ...(search ? {
        OR: [
          { identification: { contains: search.replace(/[^0-9A-Za-z]/g, ""), mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
};

export const updateCustomerService = async (customerId: number, input: CustomerFiscalInput) => {
  if (!Number.isInteger(customerId) || customerId <= 0) throw new Error("Cliente no válido");
  const data = validateCustomerFiscalInput(input);
  return prisma.customer.update({ where: { id: customerId }, data: { ...data, isActive: true } });
};

export const deactivateCustomerService = async (customerId: number) => {
  if (!Number.isInteger(customerId) || customerId <= 0) throw new Error("Cliente no válido");
  return prisma.customer.update({ where: { id: customerId }, data: { isActive: false } });
};
