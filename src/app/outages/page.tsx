'use client'

import { useEffect, useState } from "react";
import { listOutages } from "@/services/outages";
import { Outage } from "@/types/outages";

export default function OutagesPage() {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    listOutages()
      .then((data) => {
        if (!mounted) return;
        setOutages(data);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load outages");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading outages…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "red" }}>
        Error loading outages: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Outages</h1>

      {outages.length === 0 ? (
        <p>No outages found.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 16,
          }}
        >
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Site</th>
              <th style={th}>Severity</th>
              <th style={th}>Status</th>
              <th style={th}>Detected At</th>
            </tr>
          </thead>
          <tbody>
            {outages.map((o) => (
              <tr key={o.id}>
                <td style={td}>{o.id}</td>
                <td style={td}>{o.site_name}</td>
                <td style={td}>{o.severity}</td>
                <td style={td}>{o.status}</td>
                <td style={td}>
                  {new Date(o.detected_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  padding: "8px",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px",
};
