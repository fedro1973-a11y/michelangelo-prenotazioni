import React from "react";
import ReactDOM from "react-dom/client";
const isCRM = window.location.pathname.startsWith("/crm");

const app = isCRM ? import("./crm/crm.jsx") : import("./App.jsx");

app.then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});