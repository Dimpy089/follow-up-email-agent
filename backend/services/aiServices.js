const OpenAI = require("openai");

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY
});

const generateEmail = async (invoice) => {

    const prompt = `
Generate a finance follow-up email in STRICT JSON format.

Client Name: ${invoice.clientName}
Invoice Number: ${invoice.invoiceNumber}
Amount Due: ₹${invoice.amount}
Due Date: ${invoice.dueDate}
Days Overdue: ${invoice.daysOverdue}
Stage: ${invoice.stage}
Tone: ${invoice.tone}

Rules:
- Return ONLY valid JSON
- Do not add markdown
- Do not add explanation
- Include subject
- Include body
- Include tone
- Include stage

Expected JSON format:

{
  "subject": "string",
  "body": "string",
  "tone": "string",
  "stage": "string"
}
`;

    const response = await client.chat.completions.create({
        model: "openrouter/free",
        messages: [
            {
                role: "system",
                content: `
You are a professional finance collections assistant.
You write concise, professional payment follow-up emails.
You never generate fake invoice data.
You always return STRICT valid JSON only.
`
            },
            {
                role: "user",
                content: prompt
            }
        ]
    });

    const content =
        response.choices[0].message.content;

    try {

        const parsedContent =
            JSON.parse(content);

        return parsedContent;

    } catch (error) {

        console.log(
            "JSON Parsing Error:",
            error
        );

        return {
            subject: "Parsing Error",
            body: content,
            tone: invoice.tone,
            stage: invoice.stage
        };
    }
};

module.exports = generateEmail;