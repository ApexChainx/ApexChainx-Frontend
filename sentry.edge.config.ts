
// This file configures the initialization of Sentry for edge features of Next.js.
// The config you add here will be used whenever one of the edge features is used.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "1.0"),

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend(event) {
    // Check if the error is a hydration error
    if (event.message && event.message.includes("hydration")) {
      return null;
    }
    return event;
  },
});