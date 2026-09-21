export interface ICreatePropertyPayload {
    title: string;
    description?: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    companyName?: string;
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
