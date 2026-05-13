const cron = require("node-cron");
const readCSV=require("./csvServices");
const {calculateEscalationLevel,getFollowUpStage} = require("./escalationEngine");
const generateEmail = require("./aiServices");
const saveLog = require("./logService");

const startScheduler=()=>{
    cron.schedule("0 10 * * *",async()=>{
        console.log("Scheduler triggered at 10:00 AM");
        try{
            const invoices=await readCSV();
            for(const invoice of invoices){
                const daysOverdue=calculateEscalationLevel(invoice.dueDate);
                const followUp=getFollowUpStage(daysOverdue);
                if(daysOverdue<=0){
                    console.log(`✅ ${invoice.invoiceNumber} — not overdue, skipping`);
                    continue;
                }
                if(followUp.stage==="ESCALATED"){
                    console.log(`🚨 ${invoice.invoiceNumber} — ESCALATED, flagging for legal`);
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
                const updatedInvoice={
                    ...invoice,
                    daysOverdue,
                    stage: followUp.stage,
                    tone: followUp.tone
                };
                const email = await generateEmail(updatedInvoice);
                await saveLog({
                    invoiceNumber: updatedInvoice.invoiceNumber,
                    clientName: updatedInvoice.clientName,
                    tone: updatedInvoice.tone,
                    stage: updatedInvoice.stage,
                    generatedEmail: email,
                    timestamp: new Date(),
                    status: "AUTO-SENT"
                });
                console.log(`✅ ${invoice.invoiceNumber} — email generated and logged`);
            }
            console.log("✅ Scheduler run complete");
        }catch(error){
            console.error("Error in scheduler:",error.message);
        }
    },{
        timezone:"Asia/Kolkata"
    })
};

module.exports={startScheduler};