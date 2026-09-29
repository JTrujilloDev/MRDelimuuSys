import { KitchenMode, Role } from "../../generated/prisma/enums";

export type AuthenticatedRequestContext = {
  sessionId: string;
  userId: number;
  isGlobalAdmin: boolean;
  activeStoreId: number | null;
  activeTerminalId: number | null;
  storeRole: Role | null;
};

export type AuthStoreOption = {
  id: number;
  code: string;
  name: string;
  kitchenMode: KitchenMode;
  role: Role;
  terminals: { id: number; code: string; name: string }[];
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestContext;
    }
  }
}

