import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { routeHandler } from "../src/app/middleware/notFound";
import { authRoutes } from "./app/modules/auth/auth.route";
import { userRoutes } from "./app/modules/user/user.route";
import { ownerRoutes } from "./app/modules/owner/owner.route";

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
app.use("/api/owners", ownerRoutes);

app.get("/", async (req: Request, res: Response) => {
  res.json({
    message: "Server is running",
    author: "Mishkat Mahabub"
  });
});

app.use(globalErrorHandler);
app.use(routeHandler);

export default app;
