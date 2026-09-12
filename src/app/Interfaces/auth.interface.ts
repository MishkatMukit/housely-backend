import type { Role } from "../../generated/prisma/enums";

export interface IRegisterUserPayload {
    name: string;
    email: string;
    password: string;
}
export interface IVerifyUserEmailPayload {
    email: string;
    otp: string;
}
export interface ILoginUserPayload {
    email: string;
    password: string;
}
export interface IRequestUser {
    userId: string;
    email: string;
    name: string;
    role: Role;
}