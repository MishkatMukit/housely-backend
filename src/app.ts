import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { routeHandler } from "../src/app/middleware/notFound";
import { authRoutes } from "./app/modules/auth/auth.route";

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

app.get("/", async (req: Request, res: Response) => {
  res.json({
    message: "Server is running",
    author : "Mishakt Mahabub"
  });
});

app.use(globalErrorHandler);
app.use(routeHandler);

export default app;
