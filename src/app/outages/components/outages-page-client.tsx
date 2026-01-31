"use client";


import { useOutages } from "@/features/outages/hooks/useOutages";
import { useOutagesTableState } from "@/hooks/useOutagesTableState";

export function OutagesPageClient() {
    const { state, actions } = useOutagesTableState();
    const { data, isLoading, isError } = useOutages(state);


    if (isLoading) {
        return <div>Loading outages...</div>;
    }

    if (isError) {
        return <div>Error loading outages</div>;
    }

    return (
        <div>
            {/* Outages table goes here */}
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
