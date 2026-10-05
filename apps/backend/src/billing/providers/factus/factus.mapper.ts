import type {
  BillingDocumentSnapshot,
  BillingIdentificationType,
  BillingPaymentMethod,
  BillingTax,
  BillingUnit,
} from "../../domain/billing-provider";
import { computeCashRoundingAmount, normalizeMoney, validateBillingSnapshot } from "../../domain/billing.rules";

type FactusMapperConfiguration = {
  numberingRangeId?: number;
  sendEmail?: boolean;
  identificationDocumentCodes?: Partial<Record<BillingIdentificationType, string>>;
  paymentMethodCodes: Partial<Record<BillingPaymentMethod, string>>;
  unitMeasureCodes?: Partial<Record<BillingUnit, string>>;
  standardCode?: string;
};

type FactusTax = { code: string; rate: string; is_excluded?: boolean };

export type FactusInvoicePayload = {
  reference_code: string;
  document: "01";
  operation_type: "10";
  numbering_range_id?: number;
  send_email: boolean;
  observation?: string;
  payment_details: Array<{
    payment_form: "1" | "2";
    payment_method_code: string;
    reference_code?: string;
    amount: string;
    due_date?: string;
  }>;
  cash_rounding_amount: string;
  customer: {
    identification_document_code: string;
    identification: string;
    dv?: string;
    legal_organization_code: "1" | "2";
    tribute_code: string;
    responsibilities: string[];
    company?: string;
    names?: string;
    trade_name?: string;
    address?: string;
    email?: string;
    phone?: string;
    country_code?: string;
    municipality_code?: string;
  };
  items: Array<{
    code_reference: string;
    name: string;
    quantity: string;
    discount_amount?: string;
    price: string;
    unit_measure_code: string;
    standard_code: string;
    note?: string;
    taxes: FactusTax[];
  }>;
};

const defaultIdentificationCodes: Partial<Record<BillingIdentificationType, string>> = {
  NIT: "31",
  CC: "13",
};
const defaultUnitCodes: Partial<Record<BillingUnit, string>> = { UNIT: "94", PIECE: "94" };

const requireMappedCode = <T extends string>(mapping: Partial<Record<T, string>>, key: T, label: string) => {
  const code = mapping[key];
  if (!code) throw new Error(`Factus ${label} code is not configured for ${key}`);
  return code;
};

const mapTax = (tax: BillingTax): FactusTax => {
  const code = tax.kind === "VAT" ? "01" : tax.kind === "CONSUMPTION" ? "04" : tax.providerCode;
  if (!code) throw new Error("Factus tax code is required for OTHER taxes");
  return {
    code,
    rate: normalizeMoney(tax.rate),
    ...(tax.isExcluded === undefined ? {} : { is_excluded: tax.isExcluded }),
  };
};

export const buildFactusInvoicePayload = (
  snapshot: BillingDocumentSnapshot,
  configuration: FactusMapperConfiguration,
): FactusInvoicePayload => {
  validateBillingSnapshot(snapshot);
  const identificationCodes = { ...defaultIdentificationCodes, ...configuration.identificationDocumentCodes };
  const unitCodes = { ...defaultUnitCodes, ...configuration.unitMeasureCodes };
  const organizationCode = snapshot.customer.organizationType === "LEGAL_ENTITY" ? "1" : "2";

  return {
    reference_code: snapshot.referenceCode,
    document: "01",
    operation_type: "10",
    ...(configuration.numberingRangeId === undefined ? {} : { numbering_range_id: configuration.numberingRangeId }),
    send_email: configuration.sendEmail ?? false,
    ...(snapshot.observation ? { observation: snapshot.observation.slice(0, 250) } : {}),
    payment_details: snapshot.payments.map((payment) => ({
      payment_form: payment.term === "CREDIT" ? "2" : "1",
      payment_method_code: requireMappedCode(configuration.paymentMethodCodes, payment.method, "payment method"),
      ...(payment.reference ? { reference_code: payment.reference } : {}),
      amount: normalizeMoney(payment.amount),
      ...(payment.term === "CREDIT" ? { due_date: payment.dueDate } : {}),
    })),
    cash_rounding_amount: computeCashRoundingAmount(snapshot.total, snapshot.payments),
    customer: {
      identification_document_code: snapshot.customer.providerIdentificationCode ??
        requireMappedCode(identificationCodes, snapshot.customer.identificationType, "identification document"),
      identification: snapshot.customer.identification.replace(/[^0-9A-Za-z]/g, ""),
      ...(snapshot.customer.verificationDigit ? { dv: snapshot.customer.verificationDigit } : {}),
      legal_organization_code: organizationCode,
      tribute_code: snapshot.customer.tributeCode ?? "ZZ",
      responsibilities: snapshot.customer.responsibilities ?? ["R-99-PN"],
      ...(organizationCode === "1" ? { company: snapshot.customer.legalName } : { names: snapshot.customer.legalName }),
      ...(snapshot.customer.tradeName ? { trade_name: snapshot.customer.tradeName } : {}),
      ...(snapshot.customer.address ? { address: snapshot.customer.address } : {}),
      ...(snapshot.customer.email ? { email: snapshot.customer.email } : {}),
      ...(snapshot.customer.phone ? { phone: snapshot.customer.phone } : {}),
      ...(snapshot.customer.countryCode ? { country_code: snapshot.customer.countryCode } : {}),
      ...(snapshot.customer.municipalityCode ? { municipality_code: snapshot.customer.municipalityCode } : {}),
    },
    items: snapshot.lines.map((line) => ({
      code_reference: line.reference,
      name: line.name,
      quantity: normalizeMoney(line.quantity),
      ...(normalizeMoney(line.discountAmount) === "0.00"
        ? {}
        : { discount_amount: normalizeMoney(line.discountAmount) }),
      price: normalizeMoney(line.unitPriceBeforeTax),
      unit_measure_code: requireMappedCode(unitCodes, line.unit, "unit measure"),
      standard_code: configuration.standardCode ?? "999",
      ...(line.note ? { note: line.note } : {}),
      taxes: line.taxes.map(mapTax),
    })),
  };
};
