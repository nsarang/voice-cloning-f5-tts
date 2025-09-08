import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

const RootComponent =
  process.env.NODE_ENV === "development" ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  );

ReactDOM.createRoot(document.getElementById("root")).render(RootComponent);
