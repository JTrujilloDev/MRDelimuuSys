import { api } from "../../../shared/services/api";

export type CustomerIdentificationType = "NIT" | "CC" | "CE" | "PASSPORT" | "OTHER";
export type CustomerOrganizationType = "LEGAL_ENTITY" | "NATURAL_PERSON";

export type FiscalCustomer = {
  id?: number;
  identificationType: CustomerIdentificationType;
  identification: string;
  verificationDigit?: string;
  organizationType: CustomerOrganizationType;
  name: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  address?: string;
  countryCode: string;
  municipalityCode?: string;
  tributeCode: string;
  responsibilities: string[];
};

export const findCustomerByIdentification = async (
  identificationType: CustomerIdentificationType,
  identification: string,
) => {
  const { data } = await api.get("customers/lookup", { params: { identificationType, identification } });
  return data.data as FiscalCustomer;
};
