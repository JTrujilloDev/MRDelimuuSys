export const CUSTOMER_IDENTIFICATION_TYPES = ["NIT", "CC", "CE", "PASSPORT", "OTHER"] as const;
export const CUSTOMER_ORGANIZATION_TYPES = ["LEGAL_ENTITY", "NATURAL_PERSON"] as const;

export type CustomerIdentificationType = typeof CUSTOMER_IDENTIFICATION_TYPES[number];
export type CustomerOrganizationType = typeof CUSTOMER_ORGANIZATION_TYPES[number];

export type CustomerFiscalInput = {
  identificationType?: unknown;
  identification?: unknown;
  verificationDigit?: unknown;
  organizationType?: unknown;
  name?: unknown;
  tradeName?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  countryCode?: unknown;
  municipalityCode?: unknown;
  tributeCode?: unknown;
  responsibilities?: unknown;
};

const optionalText = (value: unknown, label: string, maximum: number) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} no es válido`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximum) throw new Error(`${label} supera ${maximum} caracteres`);
  return normalized;
};

export const normalizeCustomerIdentification = (value: unknown) => {
  if (typeof value !== "string") throw new Error("Ingresa la identificación del cliente");
  const normalized = value.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (normalized.length < 3 || normalized.length > 30) {
    throw new Error("La identificación debe tener entre 3 y 30 caracteres");
  }
  return normalized;
};

export const validateCustomerFiscalInput = (value: CustomerFiscalInput) => {
  if (!CUSTOMER_IDENTIFICATION_TYPES.includes(value.identificationType as CustomerIdentificationType)) {
    throw new Error("Selecciona un tipo de identificación válido");
  }
  const identificationType = value.identificationType as CustomerIdentificationType;
  const identification = normalizeCustomerIdentification(value.identification);
  const organizationType = value.organizationType == null || value.organizationType === ""
    ? (identificationType === "NIT" ? "LEGAL_ENTITY" : "NATURAL_PERSON")
    : value.organizationType;
  if (!CUSTOMER_ORGANIZATION_TYPES.includes(organizationType as CustomerOrganizationType)) {
    throw new Error("Selecciona el tipo de persona del cliente");
  }
  const name = optionalText(value.name, "El nombre o razón social", 160);
  if (!name || name.length < 2) throw new Error("Ingresa el nombre o razón social del cliente");
  const email = optionalText(value.email, "El correo", 160)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El correo del cliente no es válido");
  const verificationDigit = optionalText(value.verificationDigit, "El dígito de verificación", 1);
  if (verificationDigit && !/^\d$/.test(verificationDigit)) throw new Error("El dígito de verificación no es válido");
  const countryCode = (optionalText(value.countryCode, "El código de país", 2) ?? "CO").toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("El código de país no es válido");
  const municipalityCode = optionalText(value.municipalityCode, "El código de municipio", 5);
  if (municipalityCode && !/^\d{5}$/.test(municipalityCode)) throw new Error("El municipio debe usar el código DANE de 5 dígitos");
  const responsibilities = Array.isArray(value.responsibilities)
    ? [...new Set(value.responsibilities.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean))]
    : ["R-99-PN"];

  return {
    identificationType,
    identification,
    verificationDigit,
    organizationType: organizationType as CustomerOrganizationType,
    name,
    tradeName: optionalText(value.tradeName, "El nombre comercial", 160),
    phone: optionalText(value.phone, "El teléfono", 40),
    email,
    address: optionalText(value.address, "La dirección", 200),
    countryCode,
    municipalityCode,
    tributeCode: (optionalText(value.tributeCode, "El tributo", 10) ?? "ZZ").toUpperCase(),
    responsibilities: responsibilities.length ? responsibilities : ["R-99-PN"],
  };
};
