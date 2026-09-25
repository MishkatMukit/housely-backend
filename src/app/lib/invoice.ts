import httpStatus from "http-status";
import PDFDocument from "pdfkit";
import { PaymentType } from "../../generated/prisma/enums";
import config from "../config";
import { AppError } from "../utils/appError";
import { transporter } from "./nodemailer";
import { prisma } from "./prisma";

const formatDate = (date: Date | null | undefined) =>
	date ? date.toLocaleDateString("en-GB") : "—";

const formatBdt = (amount: unknown) =>
	`BDT ${Number(amount).toLocaleString("en-BD", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

const paymentLabel = (type: PaymentType) =>
	type === PaymentType.ADVANCE ? "Advance / Security Deposit" : "Monthly Rent";

const INVOICE_INCLUDE = {
	lease: {
		include: {
			tenant: { include: { user: { omit: { password: true } } } },
			owner: { include: { user: { omit: { password: true } } } },
			flat: { include: { variant: true, property: true } },
		},
	},
} as const;

type InvoicePayment = NonNullable<
	Awaited<ReturnType<typeof fetchInvoicePayment>>
>;

const fetchInvoicePayment = async (paymentId: string) =>
	prisma.payment.findUnique({
		where: { id: paymentId },
		include: INVOICE_INCLUDE,
	});

const generateInvoicePdf = async (paymentId: string): Promise<Buffer> => {
	const payment = await fetchInvoicePayment(paymentId);
	if (!payment) throw new AppError("Payment not found", httpStatus.NOT_FOUND);

	const tenant = payment.lease.tenant;
	const owner = payment.lease.owner;
	const flat = payment.lease.flat;
	const property = flat.property;

	const doc = new PDFDocument({ margin: 50 });
	const chunks: Buffer[] = [];
	const pdfReady = new Promise<Buffer>((resolve) => {
		doc.on("end", () => resolve(Buffer.concat(chunks)));
	});
	doc.on("data", (chunk: Buffer) => chunks.push(chunk));

	doc.fillColor("#0f766e").rect(0, 0, 612, 70).fill();
	doc.fillColor("#ffffff").fontSize(20).text("Housely", 50, 18);
	doc.fontSize(11).text("Rent Payment Invoice", 50, 44);

	doc.fillColor("#111827").fontSize(15).text("Invoice", { align: "center" });
	doc.moveDown(1.5);

	doc.fontSize(10).fillColor("#374151");
	doc.text(`Invoice No: ${payment.id.slice(0, 8).toUpperCase()}`);
	doc.text(`bKash Trx ID: ${payment.bkashTransactionId || "—"}`);
	doc.text(`Paid At: ${formatDate(payment.paidAt)}`);
	doc.moveDown(1.5);

	doc.fontSize(12).fillColor("#0f766e").text("Billed To", { underline: true });
	doc.fontSize(10).fillColor("#374151").text(tenant.name);
	doc.fillColor("#6b7280").text(tenant.email || tenant.user?.email || "");
	doc.moveDown(1.2);

	doc.fontSize(12).fillColor("#0f766e").text("Issued By", { underline: true });
	doc
		.fontSize(10)
		.fillColor("#374151")
		.text(owner.user?.name || "Housely");
	doc.moveDown(1.5);

	doc
		.fontSize(12)
		.fillColor("#0f766e")
		.text("Lease Details", { underline: true });
	doc
		.fontSize(10)
		.fillColor("#374151")
		.text(`${flat.variant.name} — Flat ${flat.flatNumber}`)
		.text(property.title)
		.text(
			[property.address, property.city, property.district]
				.filter(Boolean)
				.join(", "),
		);
	doc.moveDown(1.5);

	doc
		.fontSize(12)
		.fillColor("#0f766e")
		.text("Payment Details", { underline: true });
	doc
		.fontSize(10)
		.fillColor("#374151")
		.text(`Payment Type: ${paymentLabel(payment.type)}`)
		.text(
			`Rent Period: ${formatDate(payment.periodStart)} — ${formatDate(payment.periodEnd)}`,
		)
		.text(`Payment Method: ${payment.paymentMethod || "bKash"}`)
		.text(`Amount: ${formatBdt(payment.amount)}`);
	doc.moveDown(2);

	doc.strokeColor("#0f766e").moveTo(50, doc.y).lineTo(562, doc.y).stroke();
	doc.moveDown(0.5);
	doc
		.fontSize(13)
		.fillColor("#0f766e")
		.text(`Total Paid: ${formatBdt(payment.amount)}`, { align: "right" });
	doc.moveDown(1.5);
	doc
		.fontSize(8)
		.fillColor("#9ca3af")
		.text(
			"Thank you for paying with Housely. This is a system-generated invoice and requires no signature.",
			{ align: "center" },
		);

	doc.end();
	return pdfReady;
};

const sendRentInvoiceMail = async (paymentId: string) => {
	try {
		const payment = await fetchInvoicePayment(paymentId);
		if (!payment) {
			console.warn(`[invoice] payment not found: ${paymentId}`);
			return;
		}

		const tenant = payment.lease.tenant;
		const recipient = tenant.email || tenant.user?.email;
		if (!recipient) {
			console.warn(`[invoice] no email for tenant ${tenant.id}`);
			return;
		}

		const pdf = await generateInvoicePdf(paymentId);
		const invoiceNo = payment.id.slice(0, 8).toUpperCase();

		await transporter.sendMail({
			from: config.email_sender,
			to: recipient,
			subject: `Housely — Rent Invoice ${invoiceNo}`,
			text: `Dear ${tenant.name},\n\nThank you for your payment of ${formatBdt(payment.amount)}. Your invoice is attached.\n\n— Housely`,
			attachments: [
				{ filename: `housely-invoice-${invoiceNo}.pdf`, content: pdf },
			],
		});

		console.log(`[invoice] sent rent invoice ${invoiceNo} to ${recipient}`);
	} catch (error) {
		console.error("[invoice] failed to send rent invoice:", error);
	}
};

export const invoiceService = {
	generateInvoicePdf,
	sendRentInvoiceMail,
};

export type { InvoicePayment };
