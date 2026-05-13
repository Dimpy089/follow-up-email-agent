const fs = require("fs");
const path = require("path");

const logFilePath = path.join(
    __dirname,
    "../logs/emailLogs.json"
);

const saveLog = async (logData) => {

    try {

        let existingLogs = [];

        if (fs.existsSync(logFilePath)) {

            const fileData = fs.readFileSync(
                logFilePath,
                "utf-8"
            );

            existingLogs = fileData
                ? JSON.parse(fileData)
                : [];
        }

        const existingInvoice =
            existingLogs.find(
                (log) =>
                    log.invoiceNumber ===
                    logData.invoiceNumber
            );

        const communication = {

            stage: logData.stage,

            tone: logData.tone,

            subject:
                logData.generatedEmail.subject,

            body:
                logData.generatedEmail.body,

            timestamp:
                logData.timestamp,

            status:
                logData.status
        };

        if (existingInvoice) {

            existingInvoice
                .communicationHistory
                .push(communication);

        }

        else {

            existingLogs.push({

                invoiceNumber:
                    logData.invoiceNumber,

                clientName:
                    logData.clientName,

                communicationHistory: [
                    communication
                ]
            });
        }
        console.log(JSON.stringify(existingLogs, null, 2));
        fs.writeFileSync(
            logFilePath,
            JSON.stringify(
                existingLogs,
                null,
                2
            )
        );

        console.log(
            "Log saved successfully"
        );

    }

    catch (error) {

        console.log(error);

    }
};

module.exports = saveLog;