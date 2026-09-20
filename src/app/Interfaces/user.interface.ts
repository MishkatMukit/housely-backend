
import type { Role } from "../../generated/prisma/enums";
import type { UserStatus } from "../../generated/prisma/enums";

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        name: string;
        id: string;
        role: Role;
      };
    }
  }
}

export interface IListUsersQuery {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: Role;
  search?: string;
}

export interface IListUsersResponse {
  data: {
    id: string;
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type Gender = "MALE" | "FEMALE";

export interface IUpdateProfilePayload {
  name?: string;
  address?: string;
  gender?: Gender;
  nationalIdNumber?: string
}