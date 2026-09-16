export interface IApplyOwnerPayload {
    user: {
        name: string;
        email: string;
    };
    owner: {
        contactNumber?: string;
        companyName?: string;
    };
}