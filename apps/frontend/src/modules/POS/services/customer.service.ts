import { api } from "../../../shared/services/api";

export type CustomerIdentificationType = "NIT" | "CC" | "CE" | "PASSPORT" | "OTHER";
export type CustomerOrganizationType = "LEGAL_ENTITY" | "NATURAL_PERSON";

export type FiscalCustomer = {
  id?: number;
  identificationType: CustomerIdentificationType;
  identification: string;
  verificationDigit?: string | null;
  organizationType: CustomerOrganizationType;
  name: string;
  tradeName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  countryCode: string;
  municipalityCode?: string | null;
  tributeCode: string;
  responsibilities: string[];
  createdAt?: string;
  updatedAt?: string;
};

export const findCustomerByIdentification = async (
  identificationType: CustomerIdentificationType,
  identification: string,
) => {
  const { data } = await api.get("customers/lookup", { params: { identificationType, identification } });
  return data.data as FiscalCustomer;
};

export type CustomerDirectory = {
  customers: FiscalCustomer[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const getCustomers = async (search = "", page = 1) => {
  const { data } = await api.get("customers", {
    params: { ...(search.trim() ? { search: search.trim() } : {}), page },
  });
  return data.data as CustomerDirectory;
};

export const saveCustomer = async (customer: FiscalCustomer) => {
  const { data } = await api.post("customers", customer);
  return data.data as FiscalCustomer;
};

export const updateCustomer = async (id: number, customer: FiscalCustomer) => {
  const { data } = await api.put(`customers/${id}`, customer);
  return data.data as FiscalCustomer;
};
