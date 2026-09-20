import type { OwnerStatus } from "../../generated/prisma/enums";

export interface IViewOwnerApplicationsQuery {
    page?: number;
    limit?: number;
    status?: OwnerStatus;
    search?: string;
}