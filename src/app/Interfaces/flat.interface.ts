export interface ICreateFlatVariantPayload {
    name: string;
    bedrooms: number;
    bathrooms: number;
    sizeSqft?: number | undefined;
    rentAmount: number;
    advanceAmount: number;
    totalUnits: number;
    flatNumberPrefix?: string | undefined; // e.g. "A" -> A-101, A-102...
}

export interface IAddFlatsPayload {
    count: number;
    flatNumberPrefix?: string | undefined;
}

export interface IListAllFlatsQuery {
    page?: number;
    limit?: number;
    status?: string;
    city?: string;
    district?: string;
    minBedrooms?: number;
    maxRent?: number;
}

export interface IUpdateFlatVariantPayload {
    name?: string;
    bedrooms?: number;
    bathrooms?: number;
    sizeSqft?: number;
    rentAmount?: number;
    advanceAmount?: number;
}

export interface IUpdateFlatPayload {
    flatNumber?: string;
    status?: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
    rentOverride?: number | null;
    advanceOverride?: number | null;
}
