import { createHash } from "node:crypto";
import { BillingAttemptOutcome, ElectronicDocumentStatus, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { BillingDocumentSnapshot, BillingPaymentMethod } from "../billing/domain/billing-provider";
import { FactusClient } from "../billing/providers/factus/factus.client";
import { loadFactusCredentials } from "../billing/providers/factus/factus.configuration";
import { FactusBillingProvider } from "../billing/providers/factus/factus.provider";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const money = (value: number) => (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);

const paymentMethods: Record<string, BillingPaymentMethod> = {
  CASH: "CASH",
  CARD: "CARD",
  QR: "QR",
  CREDIT: "OTHER",
};

const finalConsumer = (configuration: JsonRecord) => {
  const configured = isRecord(configuration.finalConsumer) ? configuration.finalConsumer : {};
  return {
    identificationType: String(configured.identificationType ?? "CC") as "CC",
    identification: String(configured.identification ?? "222222222222"),
    organizationType: String(configured.organizationType ?? "NATURAL_PERSON") as "NATURAL_PERSON",
    legalName: String(configured.legalName ?? "Consumidor final"),
    tributeCode: String(configured.tributeCode ?? "ZZ"),
    responsibilities: Array.isArray(configured.responsibilities)
      ? configured.responsibilities.filter((item): item is string => typeof item === "string")
      : ["R-99-PN"],
    countryCode: String(configured.countryCode ?? "CO"),
  };
};

const customerFromSnapshot = (value: Prisma.JsonValue | null, configuration: JsonRecord) => {
  if (!isRecord(value) || !value.identification || !value.name) return finalConsumer(configuration);
  return {
    identificationType: String(value.identificationType ?? "CC") as "CC",
    identification: String(value.identification),
    ...(value.verificationDigit ? { verificationDigit: String(value.verificationDigit) } : {}),
    organizationType: String(value.organizationType ?? "NATURAL_PERSON") as "NATURAL_PERSON",
    legalName: String(value.name),
    ...(value.tradeName ? { tradeName: String(value.tradeName) } : {}),
    ...(value.address ? { address: String(value.address) } : {}),
    ...(value.email ? { email: String(value.email) } : {}),
    ...(value.phone ? { phone: String(value.phone) } : {}),
    countryCode: String(value.countryCode ?? "CO"),
    ...(value.municipalityCode ? { municipalityCode: String(value.municipalityCode) } : {}),
    tributeCode: String(value.tributeCode ?? "ZZ"),
    responsibilities: Array.isArray(value.responsibilities)
      ? value.responsibilities.filter((item): item is string => typeof item === "string")
      : ["R-99-PN"],
  };
};

const documentInclude = {
  issuer: true,
  store: true,
  providerConfiguration: true,
  numberingRange: true,
  account: { select: { id: true, name: true, paymentMethod: true, customerSnapshot: true } },
  attempts: { orderBy: { attemptNumber: "desc" as const }, take: 10 },
  job: true,
} satisfies Prisma.ElectronicDocumentInclude;

export const createElectronicDocumentForAccountService = async (accountId: number) => {
  const existing = await prisma.electronicDocument.findUnique({
    where: { operationKey: `SALE:${accountId}` },
    include: documentInclude,
  });
  if (existing) return existing;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      terminal: {
        include: {
          store: {
            include: {
              fiscalIssuer: {
                include: {
                  providerConfigurations: {
                    where: { isActive: true },
                    orderBy: { version: "desc" },
                    include: { numberingRanges: { where: { isActive: true }, orderBy: { updatedAt: "desc" } } },
                  },
                },
              },
            },
          },
        },
      },
      accountItems: { include: { productVariant: { include: { product: true } } } },
    },
  });
  if (!account || account.status !== "CLOSED" || !account.paymentMethod || !account.closedAt) return null;

  const store = account.terminal.store;
  const issuer = store.fiscalIssuer;
  const providerConfiguration = issuer?.providerConfigurations[0];
  if (!issuer?.isActive || !providerConfiguration) return null;
  const numberingRange = providerConfiguration.numberingRanges[0] ?? null;
  const configuration = isRecord(providerConfiguration.configuration) ? providerConfiguration.configuration : {};
  const taxRate = Number(configuration.consumptionTaxRate ?? 8);
  if (!Number.isFinite(taxRate) || taxRate < 0) throw new Error("La tarifa fiscal configurada no es válida");
  const taxFactor = 1 + (taxRate / 100);
  const grossSubtotal = account.accountItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalCents = Math.round((grossSubtotal / taxFactor) * 100);
  const discountBeforeTaxCents = Math.round((account.discount / taxFactor) * 100);
  const totalCents = Math.round(account.total * 100);
  const taxTotalCents = totalCents - subtotalCents + discountBeforeTaxCents;
  const paymentTerm = account.paymentMethod === "CREDIT" ? "CREDIT" : "IMMEDIATE";
  const creditDays = Math.max(1, Number(configuration.creditDays ?? 30));
  const dueDate = new Date(account.closedAt);
  dueDate.setUTCDate(dueDate.getUTCDate() + creditDays);

  const snapshot: BillingDocumentSnapshot = {
    referenceCode: `${issuer.code}-POS-${account.id}`,
    kind: "SALE_INVOICE",
    currency: "COP",
    issuedAt: account.closedAt.toISOString(),
    customer: customerFromSnapshot(account.customerSnapshot, configuration),
    lines: account.accountItems.map((item) => ({
      reference: `VAR-${item.productVariantId}`,
      name: item.productName || `${item.productVariant.product.name} · ${item.productVariant.name}`,
      quantity: String(item.quantity),
      unit: item.productVariant.unit,
      unitPriceBeforeTax: money(item.price / taxFactor),
      discountAmount: money(grossSubtotal > 0
        ? (account.discount * (item.price * item.quantity / grossSubtotal)) / taxFactor
        : 0),
      taxes: [{ kind: "CONSUMPTION", rate: money(taxRate) }],
    })),
    payments: [{
      term: paymentTerm,
      method: paymentMethods[account.paymentMethod] ?? "OTHER",
      amount: money(account.total),
      ...(paymentTerm === "CREDIT" ? { dueDate: dueDate.toISOString().slice(0, 10) } : {}),
    }],
    subtotal: money(subtotalCents / 100),
    discountTotal: money(discountBeforeTaxCents / 100),
    taxTotal: money(taxTotalCents / 100),
    total: money(account.total),
    observation: account.discountObservation ?? undefined,
  };

  return prisma.electronicDocument.create({
    data: {
      operationKey: `SALE:${account.id}`,
      referenceCode: snapshot.referenceCode,
      documentType: "SALE_INVOICE",
      issuerId: issuer.id,
      storeId: store.id,
      accountId: account.id,
      providerConfigurationId: providerConfiguration.id,
      numberingRangeId: numberingRange?.id,
      subtotal: snapshot.subtotal,
      discountTotal: snapshot.discountTotal,
      taxTotal: snapshot.taxTotal,
      total: snapshot.total,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
    include: documentInclude,
  });
};

const providerFor = (document: Awaited<ReturnType<typeof getElectronicDocument>>) => {
  if (!document) throw new Error("Documento electrónico no encontrado");
  if (document.providerConfiguration.provider.toUpperCase() !== "FACTUS") {
    throw new Error(`Proveedor no soportado: ${document.providerConfiguration.provider}`);
  }
  const providerConfiguration = document.providerConfiguration;
  const configuration = isRecord(providerConfiguration.configuration) ? providerConfiguration.configuration : {};
  const remoteRangeId = document.numberingRange?.remoteId;
  const numberingRangeId = remoteRangeId && /^\d+$/.test(remoteRangeId) ? Number(remoteRangeId) : undefined;
  const customPayments = isRecord(configuration.paymentMethodCodes) ? configuration.paymentMethodCodes : {};
  const paymentMethodCodes = {
    CASH: "10",
    CARD: "48",
    BANK_TRANSFER: "47",
    QR: "47",
    OTHER: "1",
    ...Object.fromEntries(Object.entries(customPayments).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
  };
  const credentials = loadFactusCredentials(providerConfiguration.credentialReference);
  return new FactusBillingProvider(new FactusClient({
    environment: providerConfiguration.environment,
    credentials,
  }), {
    numberingRangeId,
    sendEmail: configuration.sendEmail === true,
    paymentMethodCodes,
  });
};

const getElectronicDocument = (documentId: string) => prisma.electronicDocument.findUnique({
  where: { id: documentId },
  include: documentInclude,
});

export const sendElectronicDocumentService = async (documentId: string) => {
  const document = await getElectronicDocument(documentId);
  if (!document) throw new Error("Documento electrónico no encontrado");
  if (document.status === "ACCEPTED" || document.status === "CANCELLED") return document;
  if (document.status === "SENDING") throw new Error("El documento ya se está enviando");

  const claimed = await prisma.electronicDocument.updateMany({
    where: {
      id: documentId,
      status: { in: ["PENDING", "PROCESSING", "REJECTED", "REQUIRES_RECONCILIATION"] },
    },
    data: { status: "SENDING", lastErrorCode: null, lastErrorMessage: null },
  });
  if (claimed.count === 0) throw new Error("El documento no está disponible para envío");

  const attemptNumber = (await prisma.billingAttempt.aggregate({
    where: { documentId },
    _max: { attemptNumber: true },
  }))._max.attemptNumber ?? 0;
  const snapshot = document.snapshot as unknown as BillingDocumentSnapshot;
  const fingerprint = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  try {
    const result = await providerFor(document).issue(snapshot);
    const status: ElectronicDocumentStatus = {
      ACCEPTED: "ACCEPTED",
      PROCESSING: "PROCESSING",
      REJECTED: "REJECTED",
      UNKNOWN: "REQUIRES_RECONCILIATION",
    }[result.outcome] as ElectronicDocumentStatus;
    const outcome: BillingAttemptOutcome = result.outcome;
    await prisma.$transaction([
      prisma.billingAttempt.create({
        data: {
          documentId,
          attemptNumber: attemptNumber + 1,
          action: attemptNumber === 0 ? "ISSUE" : "RETRY",
          outcome,
          requestFingerprint: fingerprint,
          providerCode: result.code,
          providerMessage: result.message,
          diagnostics: result.diagnostics as Prisma.InputJsonValue | undefined,
          finishedAt: new Date(),
        },
      }),
      prisma.electronicDocument.update({
        where: { id: documentId },
        data: {
          status,
          providerDocumentId: result.providerDocumentId,
          providerNumber: result.documentNumber,
          fiscalIdentifier: result.fiscalIdentifier,
          providerStatus: result.providerStatus,
          lastErrorCode: result.outcome === "ACCEPTED" ? null : result.code,
          lastErrorMessage: result.outcome === "ACCEPTED" ? null : result.message,
          acceptedAt: result.acceptedAt ? new Date(result.acceptedAt) : status === "ACCEPTED" ? new Date() : null,
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al enviar la factura";
    await prisma.$transaction([
      prisma.billingAttempt.create({
        data: {
          documentId,
          attemptNumber: attemptNumber + 1,
          action: attemptNumber === 0 ? "ISSUE" : "RETRY",
          outcome: "UNKNOWN",
          requestFingerprint: fingerprint,
          providerMessage: message,
          finishedAt: new Date(),
        },
      }),
      prisma.electronicDocument.update({
        where: { id: documentId },
        data: { status: "REQUIRES_RECONCILIATION", lastErrorMessage: message },
      }),
    ]);
    throw error;
  }

  return getElectronicDocument(documentId);
};

export const getElectronicDocumentsService = async (filters: {
  status?: string;
  search?: string;
  storeId?: number;
}) => {
  const validStatuses = Object.values(ElectronicDocumentStatus);
  const status = validStatuses.includes(filters.status as ElectronicDocumentStatus)
    ? filters.status as ElectronicDocumentStatus
    : undefined;
  const search = filters.search?.trim().slice(0, 80);
  const [documents, stores] = await Promise.all([
    prisma.electronicDocument.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
        ...(search ? {
          OR: [
            { referenceCode: { contains: search, mode: "insensitive" as const } },
            { providerNumber: { contains: search, mode: "insensitive" as const } },
            { account: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: documentInclude,
    }),
    prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, fiscalIssuer: { select: { id: true, legalName: true, isActive: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return { documents, stores };
};
