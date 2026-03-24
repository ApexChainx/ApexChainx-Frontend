import { Suspense } from "react";

import { OutagesPageClient } from "./components/outages-page-client";


export default function OutagesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading outages...</div>}>
      <OutagesPageClient />
    </Suspense>
  );
}
