import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import TerminosPage from "./components/TerminosPage.jsx";
import PrivacidadPage from "./components/PrivacidadPage.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);