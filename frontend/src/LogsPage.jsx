import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

function LogsPage() {

    const [logs, setLogs] = useState([]);

    const [searchTerm, setSearchTerm] =
        useState("");

    const [selectedHistory, setSelectedHistory] =
        useState([]);

    const [showModal, setShowModal] =
        useState(false);

    useEffect(() => {

        fetchLogs();

    }, []);

    const fetchLogs = async () => {

        try {

            const response = await fetch(
                "http://localhost:3000/logs"
            );

            const data = await response.json();

            setLogs(data.reverse());

        } catch (error) {

            console.log(error);

        }

    };

    const filteredLogs = logs.filter((log) =>
        log.invoiceNumber
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    return (

        <div className="app">

            <div className="dashboard-container">

                <div className="navbar">

                    <div className="logo">

                        Finance AI Agent

                    </div>

                    <div className="nav-links">

                        <Link to="/">
                            Dashboard
                        </Link>

                        <Link to="/logs">
                            Audit Logs
                        </Link>

                    </div>

                </div>
                <div className="top-header">
                    <div>
                        <h1 className="main-title">
                            Audit Logs
                        </h1>
                        <p className="subtitle">
                            Track all generated and sent emails
                        </p>
                    </div>
                    <button
                        className="generate-btn"
                        onClick={fetchLogs}
                    >
                        🔄 Refresh Logs
                    </button>
                </div>
                <div className="search-container">

                    <input
                        type="text"
                        placeholder="Search by Invoice Number..."
                        value={searchTerm}
                        onChange={(e) =>
                            setSearchTerm(e.target.value)
                        }
                        className="search-input"
                    />

                </div>

                <div className="table-card">

                    <table>

                        <thead>

                            <tr>

                                <th>Client</th>

                                <th>Invoice</th>

                                <th>Total Follow-Ups</th>

                                <th>Last Stage</th>

                                <th>Last Updated</th>

                                <th>Actions</th>

                            </tr>

                        </thead>

                        <tbody>

                            {filteredLogs.map((log, index) => {

                                const lastCommunication =
                                    log.communicationHistory[
                                    log.communicationHistory.length - 1
                                    ];

                                return (

                                    <tr key={index}>

                                        <td>{log.clientName}</td>

                                        <td>{log.invoiceNumber}</td>

                                        <td>
                                            {
                                                log.communicationHistory.length
                                            }
                                        </td>

                                        <td>
                                            {lastCommunication.stage}
                                        </td>

                                        <td>
                                            {new Date(
                                                lastCommunication.timestamp
                                            ).toLocaleString()}
                                        </td>

                                        <td>

                                            <button
                                                className="view-btn"
                                                onClick={() => {

                                                    setSelectedHistory(
                                                        log.communicationHistory
                                                    );

                                                    setShowModal(true);

                                                }}
                                            >
                                                View History
                                            </button>

                                        </td>

                                    </tr>

                                );

                            })}

                        </tbody>

                    </table>

                </div>

            </div>
            {showModal && (

                <div className="modal-overlay">

                    <div className="modal">

                        <div className="modal-top">

                            <h2>
                                Communication History
                            </h2>

                            <button
                                className="close-btn"
                                onClick={() =>
                                    setShowModal(false)
                                }
                            >
                                X
                            </button>

                        </div>

                        {selectedHistory.map(
                            (history, index) => (

                                <div
                                    key={index}
                                    style={{
                                        marginBottom: "20px",
                                        padding: "15px",
                                        border:
                                            "1px solid #ddd",
                                        borderRadius: "10px"
                                    }}
                                >

                                    <p>

                                        <strong>
                                            Stage:
                                        </strong>{" "}

                                        {history.stage}

                                    </p>

                                    <p>

                                        <strong>
                                            Tone:
                                        </strong>{" "}

                                        {history.tone}

                                    </p>

                                    <p>

                                        <strong>
                                            Status:
                                        </strong>{" "}

                                        {history.status}

                                    </p>

                                    <p>

                                        <strong>
                                            Time:
                                        </strong>{" "}

                                        {new Date(
                                            history.timestamp
                                        ).toLocaleString()}

                                    </p>

                                    <hr
                                        style={{
                                            margin:
                                                "10px 0"
                                        }}
                                    />

                                    <h3
                                        style={{
                                            marginBottom: "10px",
                                            color: "#1e293b"
                                        }}
                                    >
                                        {history.subject}
                                    </h3>

                                    <pre>
                                        {history.body}
                                    </pre>

                                </div>

                            )
                        )}

                    </div>

                </div>

            )}

        </div>

    );

}

export default LogsPage;