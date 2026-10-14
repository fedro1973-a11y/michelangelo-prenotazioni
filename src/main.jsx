import React from "react";
import ReactDOM from "react-dom/client";
const isCRM = window.location.pathname.startsWith("/crm");

if (isCRM) {
  import("./crm/crm.css");
} else {
  import("./index.css");
}

const app = isCRM ? import("./crm/crm.jsx") : import("./App.jsx");

app.then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});