import app from "./app";
import config from "./app/config";
import { startLeaseCron } from "./app/jobs/leaseCron";
import { startPaymentCron } from "./app/jobs/paymentCron";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";

const PORT = config.port;

const main = async () => {
	try {
		await prisma.$connect();

		if (!redisClient.isOpen) {
			await redisClient.connect();
		}

		await transporter.verify();

		app.listen(PORT);

		startLeaseCron();
		startPaymentCron();
	} catch (error) {
		console.error("Error starting the server : ", error);
		process.exit(1);
	}
};

main();
