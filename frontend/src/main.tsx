import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import "./index.css";
import App from "./App";
import { QueryProvider } from "./providers/QueryProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <PayPalScriptProvider
        options={{
          clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
          currency: "USD",
          intent: "capture",
        }}
      >
        <App />
      </PayPalScriptProvider>
    </QueryProvider>
  </StrictMode>
);