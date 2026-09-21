export interface ICreatePropertyPayload {
    title: string;
    description?: string | undefined;
    address: string;
    city: string;
    district: string;
    postalCode?: string | undefined;
    companyName?: string | undefined;
    totalRooms: number;
}

export interface IListPropertiesQuery {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    district?: string;
    ownerId?: string;
}
