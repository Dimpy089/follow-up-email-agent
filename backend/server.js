const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const readCSV = require("./services/csvServices");
const { calculateEscalationLevel } = require("./services/escalationEngine");
const { getFollowUpStage } = require("./services/escalationEngine");
const generateEmail = require("./services/aiServices");
const saveLog = require("./services/logService");
const fs = require("fs");
const {startScheduler} =require("./services/schedular");
const { runInvoiceAgent } = require("./agent/invoiceAgent"); 

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
app.use(cors({
  origin: "https://follow-up-email-agent.vercel.app/"
}));

app.get("/", (req, res) => {
    res.send("Follow-up API is running");
});

app.get("/invoices", async (req, res) => {
    try {
        const invoices = await readCSV();
        const updatedInvoices = invoices.map((invoice) => {
            const escalationlevel = calculateEscalationLevel(invoice.dueDate);

            const followUp = getFollowUpStage(escalationlevel);

            return {
                ...invoice, escalationlevel, stage: followUp.stage,
                tone: followUp.tone
            };
        });
        res.json(updatedInvoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/generate-email", async (req, res) => {
    try {
        const invoices = await readCSV();
        const results = [];
        for (const invoice of invoices) {
    try {
        const daysOverdue = calculateEscalationLevel(invoice.dueDate);
        const followUp = getFollowUpStage(daysOverdue);

        if (daysOverdue <= 0) {
            continue;
        }

        if (followUp.stage === "ESCALATED") {
            await saveLog({
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                tone: "Legal review",
                stage: "ESCALATED",
                generatedEmail: {
                    subject: "Flagged for legal review",
                    body: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. Assigned to finance manager for manual review. No automated email sent.`
                },
                timestamp: new Date(),
                status: "FLAGGED"
            });

            continue;
        }

        const updatedInvoice = {
            ...invoice,
            daysOverdue,
            stage: followUp.stage,
            tone: followUp.tone
        };

        const email = await generateEmail(updatedInvoice);

        console.log(email);

        await saveLog({
            invoiceNumber: updatedInvoice.invoiceNumber,
            clientName: updatedInvoice.clientName,
            tone: updatedInvoice.tone,
            stage: updatedInvoice.stage,
            generatedEmail: email,
            timestamp: new Date(),
            status: "DRAFT"
        });

        results.push({
            invoice: updatedInvoice,
            generatedEmail: email
        });

    } catch (err) {
        console.error(
            `Failed processing invoice ${invoice.invoiceNumber}:`,
            err.message
        );

        await saveLog({
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.clientName,
            tone: "ERROR",
            stage: "FAILED",
            generatedEmail: null,
            timestamp: new Date(),
            status: "FAILED",
            error: err.message
        });
    }
}
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get("/logs", async (req, res) => {

    try {

        const data = fs.readFileSync(

            "./logs/emailLogs.json",

            "utf-8"

        );



        const logs = JSON.parse(data);



        res.json(logs);

    } catch (error) {

        res.status(500).json({

            error: error.message,

        });

    }

});

app.post("/send-email", async (req, res) => {
    try {
        const emailData = req.body;
        console.log("Dry run email sent to:", emailData.email);
        await saveLog({
            invoiceNumber: emailData.invoiceNumber,
            clientName: emailData.clientName,
            tone: emailData.tone,
            stage: emailData.stage,
            generatedEmail: emailData.generatedEmail,
            timestamp: new Date(),
            status: "SENT"
        });
        res.json({ message: "Email sent successfully (dry run)" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/agent-generate", async (req, res) => {
    try {
        const result = await runInvoiceAgent();
        res.json({
            message: "Agent completed successfully",
            output: result.output
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

