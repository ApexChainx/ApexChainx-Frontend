"use client";
/** ApexChain Network Operations Intelligence Platform */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";

import { registerQueryClient } from "@/lib/session-snapshot";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
    const [client] = useState(() => new QueryClient());

    // Register client for session snapshot clearing
    useEffect(() => {
      registerQueryClient(client);
    }, [client]);

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
