import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { routeHandler } from "../src/app/middleware/notFound";
import { authRoutes } from "./app/modules/auth/auth.route";
import { userRoutes } from "./app/modules/user/user.route";
import { ownerRoutes } from "./app/modules/owner/owner.route";
import { propertyRoutes } from "./app/modules/property/property.route";
import { flatRoutes } from "./app/modules/flat/flat.route";
import { variantRoutes } from "./app/modules/variant/varient.route";

const app: Application = express();

app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/flats", flatRoutes);

app.get("/", async (req: Request, res: Response) => {
  res.json({
    message: "Server is running",
    author: "Mishkat Mahabub"
  });
});

app.use(globalErrorHandler);
app.use(routeHandler);

export default app;
