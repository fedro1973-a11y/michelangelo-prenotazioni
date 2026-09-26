import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CRM from "./crm/CRM.jsx";
import "./index.css";

const isCRM = window.location.pathname.startsWith("/crm");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isCRM ? <CRM /> : <App />}
  </React.StrictMode>
);