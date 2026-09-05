import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";

const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to the database successfully.");

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    console.log("Connected to Redis successfully.");

    await transporter.verify();
    console.log("SMTP Server is ready to take messages");

    app.listen(PORT, () => {
      console.log(`server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.log("Error starting the server : ", error);
    process.exit(1);
  }
};

main();
