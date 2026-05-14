import { useEffect, useState } from "react";
import "./App.css";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

function App() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [generatedEmails, setGeneratedEmails] = useState({});
  const [selectedEmail, setSelectedEmail] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showEscalatedOnly, setShowEscalatedOnly] = useState(false); // ← NEW
  const [agentLoading, setAgentLoading] = useState(false);
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("http://localhost:3000/invoices");
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.log(error);
    }
  };
  const handleRunAgent = async () => {
    try {
        setAgentLoading(true);
        const response = await fetch("http://localhost:3000/agent-generate",{
          headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
        });
        const data = await response.json();
        alert(data.output);
        fetchInvoices();
    } catch (error) {
        console.log(error);
    } finally {
        setAgentLoading(false);
    }
};
  const handleGenerateEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/generate-email",{
        headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
      });
      const data = await response.json();
      const emailMap = {};
      data.forEach((item) => {
        emailMap[item.invoice.invoiceNumber] = item.generatedEmail;
      });
      setGeneratedEmails(emailMap);
      alert("Emails Generated Successfully");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmail = (invoiceNumber) => {
    const email = generatedEmails[invoiceNumber];
    if (!email) {
      alert("Generate email first");
      return;
    }
    setSelectedEmail(email);
    setShowModal(true);
  };

  const handleSendEmail = async (invoice) => {
    try {
      const email = generatedEmails[invoice.invoiceNumber];
      if (!email) {
        alert("Generate email first");
        return;
      }
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          email: invoice.email,
          tone: invoice.tone,
          stage: invoice.stage,
          generatedEmail: email,
        }),
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.log(error);
    }
  };

  const getStageClass = (stage) => {
    switch (stage) {
      case "Stage 1": return "stage1";
      case "Stage 2": return "stage2";
      case "Stage 3": return "stage3";
      default: return "stage4";
    }
  };

  const stageData = [
    { name: "Stage 1", value: invoices.filter((i) => i.stage === "Stage 1").length },
    { name: "Stage 2", value: invoices.filter((i) => i.stage === "Stage 2").length },
    { name: "Stage 3", value: invoices.filter((i) => i.stage === "Stage 3").length },
    { name: "Stage 4", value: invoices.filter((i) => i.stage === "Stage 4").length },
  ];

  const displayedInvoices = showEscalatedOnly
    ? invoices.filter((i) => i.stage === "ESCALATED")
    : invoices;

  return (
    <div className="app">
      <div className="dashboard-container">

        <div className="navbar">
          <div className="logo">Finance AI Agent</div>
          <div className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/logs">Audit Logs</Link>
          </div>
        </div>

        <div className="top-header">
          <div>
            <h1 className="main-title">Finance Follow-Up Dashboard</h1>
            <p className="subtitle">AI Powered Credit Follow-Up Automation</p>
          </div>
          <button
            className="generate-btn"
            onClick={handleGenerateEmail}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Generating..." : "Generate All Emails"}
          </button>
          <button
    className="generate-btn"
    onClick={handleRunAgent}
    disabled={agentLoading}
    style={{ 
        opacity: agentLoading ? 0.6 : 1,
        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        marginLeft: "12px"
    }}
>
    {agentLoading ? "Agent Running..." : "🤖 Run AI Agent"}
</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Invoices</h3>
            <p>{invoices.length}</p>
          </div>

          <div className="stat-card">
            <h3>Pending Amount</h3>
            <p>₹{invoices.reduce((total, item) => total + Number(item.amount), 0)}</p>
          </div>

          <div className="stat-card">
            <h3>Generated Emails</h3>
            <p>{Object.keys(generatedEmails).length}</p>
          </div>

          <div
            className="stat-card"
            onClick={() => setShowEscalatedOnly((prev) => !prev)}
            style={{
              cursor: "pointer",
              border: showEscalatedOnly ? "2px solid #dc2626" : "2px solid transparent",
              transition: "border 0.2s ease",
            }}
            title={showEscalatedOnly ? "Click to show all invoices" : "Click to filter escalated cases"}
          >
            <h3>
              Escalated Cases{" "}
              <span style={{ fontSize: "11px", color: showEscalatedOnly ? "#dc2626" : "#94a3b8" }}>
                {showEscalatedOnly ? "● Filtered" : "● Click to filter"}
              </span>
            </h3>
            <p>{invoices.filter((i) => i.stage === "ESCALATED").length}</p>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h2>Stage Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={stageData} dataKey="value" outerRadius={100} label>
                  <Cell fill="#22c55e" />
                  <Cell fill="#eab308" />
                  <Cell fill="#f97316" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h2>Overdue Amounts</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={invoices}>
                <XAxis dataKey="clientName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <h2>
                {showEscalatedOnly ? "⚠ Escalated Cases" : "Pending Invoices"}
              </h2>
              <p>
                {showEscalatedOnly
                  ? `Showing ${displayedInvoices.length} escalated invoice(s) — click the stat card again to reset`
                  : "Track overdue invoices and automate reminders"}
              </p>
            </div>

            {showEscalatedOnly && (
              <button
                onClick={() => setShowEscalatedOnly(false)}
                style={{
                  padding: "6px 14px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "1px solid #fca5a5",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                ✕ Clear Filter
              </button>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Overdue</th>
                <th>Stage</th>
                <th>Tone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                    No escalated cases found.
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((invoice, index) => (
                  <tr key={index}>
                    <td className="client-name">{invoice.clientName}</td>
                    <td>{invoice.invoiceNumber}</td>
                    <td className="amount">₹{invoice.amount}</td>
                    <td className="overdue">{invoice.escalationlevel} Days</td>
                    <td>
                      <span className={`stage-badge ${getStageClass(invoice.stage)}`}>
                        {invoice.stage}
                      </span>
                    </td>
                    <td>{invoice.tone}</td>
                    <td className="actions">
                      <button
                        className="view-btn"
                        onClick={() => handleViewEmail(invoice.invoiceNumber)}
                      >
                        View Email
                      </button>

                      {invoice.stage === "ESCALATED" ? (
                        <span style={{ color: "#dc2626", fontWeight: "bold", fontSize: "13px" }}>
                          ⚠ Legal Review
                        </span>
                      ) : (
                        <button className="send-btn" onClick={() => handleSendEmail(invoice)}>
                          Send Email
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedEmail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-top">
              <h2>Email Preview</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>X</button>
            </div>
            <h3 style={{ marginBottom: "10px", color: "#1e293b" }}>{selectedEmail.subject}</h3>
            <pre style={{ whiteSpace: "pre-wrap" }}>{selectedEmail.body}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;