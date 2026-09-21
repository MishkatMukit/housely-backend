export interface ICreateFlatVariantPayload {
    name: string;
    bedrooms: number;
    bathrooms: number;
    sizeSqft?: number;
    rentAmount: number;
    advanceAmount: number;
    totalUnits: number;
    flatNumberPrefix?: string; // e.g. "A" -> A-101, A-102...
}
