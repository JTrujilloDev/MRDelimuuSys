import { Customer } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export const createCustomerService = async (customerData: Customer) => {
  if (!customerData.name) {
    throw new Error("Customer name is required");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { id: customerData.id },
  });
  if (existingCustomer) {
    throw new Error(`Customer with id "${customerData.id}" already exists`);
  }

  const newCustomer = await prisma.customer.create({
    data: {
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      type: customerData.type,
    },
  });
  return newCustomer;
};

export const getCustomerByIdService = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  return customer;
};

export const getAllCustomersService = async () => {
  const customers = await prisma.customer.findMany();
  return customers;
};

export const updateCustomerService = async (
  customerId: number,
  updateData: Partial<Customer>,
) => {
  const updatedCustomer = await prisma.customer.update({
    where: { id: customerId },
    data: updateData,
  });
  return updatedCustomer;
};

export const deleteCustomerService = async (customerId: number) => {
  const deletedCustomer = await prisma.customer.delete({
    where: { id: customerId },
  });
  return deletedCustomer;
};
