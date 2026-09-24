import { z } from "zod";

const userIdParamSchema = z.object({
	id: z.uuid("Invalid user id"),
});

export const adminValidation = {
	userIdParamSchema,
};
