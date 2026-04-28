"use client";

import { useMemo, useState } from "react";

type Outage = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

type Props = {
  data: Outage[];
};

export default function OutagesPageClient({ data }: Props) {
  // -----------------------------
  // State
  // -----------------------------
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // -----------------------------
  // Derived Data (Search + Sort)
  // -----------------------------
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search
    if (search) {
      result = result.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "date") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
    }

    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [data, search, sortBy]);

  // -----------------------------
  // Handlers
  // -----------------------------
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  }

  function handleDelete() {
    console.log("Delete outages:", selectedIds);
  }

  function handleExport() {
    console.log("Export outages:", filteredData);
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search outages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-2 w-full sm:max-w-sm"
        />

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "date" | "title")
            }
            className="border rounded-md px-3 py-2"
          >
            <option value="date">Newest</option>
            <option value="title">Title</option>
          </select>

          <button
            onClick={handleExport}
            className="px-4 py-2 border rounded-md"
          >
            Export
          </button>

          <button
            onClick={handleDelete}
            disabled={!selectedIds.length}
            className="px-4 py-2 bg-red-500 text-white rounded-md disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredData.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>

            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}