import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";

enum UserRole {
  ADMIN = "ADMIN",
  KITCHEN = "KITCHEN",
  BAKERY = "BAKERY",
  WAITER = "WAITER",
  CASHIER = "CASHIER",
}

interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const createUserService = async (userData: CreateUserDTO) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const existingUser = await prisma.user.findFirst({
    where: { email: userData.email },
  });

  if (existingUser) {
    throw new Error(`User with email "${userData.email}" already exists`);
  }

  const newUser = await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
    },
  });
  return newUser;
};

export const getAllUsersService = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  return users;
};

export const deleteUserService = async (id: number) => {
  const deletedUser = await prisma.user.delete({
    where: { id },
  });
  return deletedUser;
};

export const updateUserService = async (
  id: number,
  data: Partial<CreateUserDTO>,
) => {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
        id: true,
        name: true,
        email: true,
        role: true
    }
  });
  return updatedUser;
};
