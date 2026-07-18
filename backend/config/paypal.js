import { Client, Environment } from "@paypal/paypal-server-sdk";

const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
    },

    timeout: 0,

    environment:
        process.env.PAYPAL_MODE === "live"
            ? Environment.Production
            : Environment.Sandbox,

    logging: {
        logLevel: "INFO",
        logRequest: {
            logBody: true,
        },
        logResponse: {
            logHeaders: true,
        },
    },
});

export default client;