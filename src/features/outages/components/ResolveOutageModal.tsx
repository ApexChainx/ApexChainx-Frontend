import React, { useState } from 'react';

interface ResolveModalProps {
  outageId: string;
  calculatedMttr: number; // Passed in or calculated here so preview and resolve use the exact same value
  isOpen: boolean;
  onClose: () => void;
  onConfirmResolve: (outageId: string, mttr: number) => Promise<void>;
}

export const ResolveOutageModal: React.FC<ResolveModalProps> = ({
  outageId,
  calculatedMttr,
  isOpen,
  onClose,
  onConfirmResolve
}) => {
  const [previewData, setPreviewData] = useState<SlaPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const handlePreviewSLA = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/sla/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outageId, mttr: calculatedMttr }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch SLA preview');
      
      const data: SlaPreviewResponse = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error("SLA Preview Error:", error);
      // Handle toast/error notification here
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleResolve = async () => {
    setIsResolving(true);
    // Passing the same MTTR ensures "Result matches final resolution"
    await onConfirmResolve(outageId, calculatedMttr); 
    setIsResolving(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Resolve Outage</h2>
        <p>Are you sure you want to resolve this outage?</p>

        {/* SLA Preview Card */}
        {previewData && (
          <div className="sla-preview-card p-4 border rounded bg-gray-50 my-4">
            <h3 className="font-bold mb-2">SLA Outcome Preview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="block text-sm text-gray-500">Rating</span>
                <span className="font-semibold">{previewData.rating}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-500">Reward</span>
                <span className="font-semibold text-green-600">+{previewData.reward}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-500">Penalty</span>
                <span className="font-semibold text-red-600">-{previewData.penalty}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-actions flex justify-end gap-2 mt-4">
          <button onClick={onClose} disabled={isResolving}>
            Cancel
          </button>
          
          {!previewData && (
            <button 
              onClick={handlePreviewSLA} 
              disabled={isLoadingPreview || isResolving}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {isLoadingPreview ? 'Loading...' : 'Preview SLA'}
            </button>
          )}

          <button 
            onClick={handleResolve} 
            disabled={isResolving}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isResolving ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
};