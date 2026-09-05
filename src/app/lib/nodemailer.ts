import config from "../config";

import nodeMailer from "nodemailer";

export const transporter = nodeMailer.createTransport({
  service: "gmail",
    auth: {
        user: config.smtp_user,
        pass: config.smtp_password
    }
});

