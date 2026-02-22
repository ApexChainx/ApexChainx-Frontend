"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define the shape of your SLA config. Adjust properties to match your API.
export interface SlaConfigItem {
    severity: string;
    target_mttr: number; // e.g., in minutes
    reward: number;
    penalty: number;
}

export default function SlaConfigPage() {
    const [configs, setConfigs] = useState<SlaConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [editingConfig, setEditingConfig] = useState<SlaConfigItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({ target_mttr: 0, reward: 0, penalty: 0 });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const response = await fetch("/config"); // Adjust to your actual API route if needed (e.g., /api/config)
            if (!response.ok) throw new Error("Failed to load SLA configurations");
            
            const data = await response.json();
            // Assuming data is an array of config objects
            setConfigs(data);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (config: SlaConfigItem) => {
        setEditingConfig(config);
        setFormData({
            target_mttr: config.target_mttr,
            reward: config.reward,
            penalty: config.penalty
        });
        setSaveError(null);
    };

    const handleCancel = () => {
        setEditingConfig(null);
        setSaveError(null);
    };

    const handleSave = async () => {
        if (!editingConfig) return;

        // Basic validation
        if (formData.target_mttr < 0 || formData.reward < 0 || formData.penalty < 0) {
            setSaveError("Values cannot be negative.");
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            // Merge the updated data with the existing config severity
            const payload = { ...editingConfig, ...formData };

            const response = await fetch("/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to save configuration");

            // Update local state to reflect the persisted changes
            setConfigs(configs.map(c => c.severity === editingConfig.severity ? payload : c));
            setEditingConfig(null); // Close modal
        } catch (err: any) {
            setSaveError(err.message || "Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 animate-pulse text-muted-foreground">Loading configurations...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto py-8 max-w-5xl px-4">
            <h1 className="text-3xl font-bold tracking-tight mb-6">SLA Configuration Management</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Severity Service Level Agreements</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="p-3 font-medium border-b">Severity</th>
                                    <th className="p-3 font-medium border-b">Target MTTR (mins)</th>
                                    <th className="p-3 font-medium border-b">Reward ($)</th>
                                    <th className="p-3 font-medium border-b">Penalty ($)</th>
                                    <th className="p-3 font-medium border-b text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {configs.map((config) => (
                                    <tr key={config.severity} className="border-b hover:bg-muted/30 transition-colors">
                                        <td className="p-3 capitalize">
                                            <Badge variant={config.severity === "high" || config.severity === "critical" ? "destructive" : "default"}>
                                                {config.severity}
                                            </Badge>
                                        </td>
                                        <td className="p-3">{config.target_mttr}</td>
                                        <td className="p-3 text-green-600 font-medium">+{config.reward}</td>
                                        <td className="p-3 text-red-600 font-medium">-{config.penalty}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleEditClick(config)}
                                                className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {configs.length === 0 && (
                            <div className="text-center p-6 text-muted-foreground italic">No configurations found.</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal Overlay */}
            {editingConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 border">
                        <h2 className="text-xl font-bold mb-4 capitalize">Edit {editingConfig.severity} SLA</h2>
                        
                        {saveError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                                {saveError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Target MTTR (minutes)</label>
                                <input 
                                    type="number" 
                                    value={formData.target_mttr}
                                    onChange={(e) => setFormData({...formData, target_mttr: Number(e.target.value)})}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reward Amount ($)</label>
                                <input 
                                    type="number" 
                                    value={formData.reward}
                                    onChange={(e) => setFormData({...formData, reward: Number(e.target.value)})}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Penalty Amount ($)</label>
                                <input 
                                    type="number" 
                                    value={formData.penalty}
                                    onChange={(e) => setFormData({...formData, penalty: Number(e.target.value)})}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button 
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}