'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface BatchDetails {
  batchCode: string;
  name: string;
  cropType: string;
  quantity: number;
  farmerName: string;
  location: string;
  harvestDate: string;
  status: string;
  blockchainTxHash: string;
  blockchainNetwork: string;
  blockchainSyncedAt: string;
  stages: Array<{
    id: string;
    name: string;
    order: number;
    status: string;
    imageUrls: string[];
    completedAt: string;
  }>;
}

export default function VerifyBatchPage() {
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBatch() {
      try {
        const response = await fetch(`/api/verify/${batchId}`);
        if (!response.ok) throw new Error('Batch not found');
        const data = await response.json();
        setBatch(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load batch');
      } finally {
        setLoading(false);
      }
    }

    if (batchId) {
      fetchBatch();
    }
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Batch Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const explorerUrl = batch.blockchainNetwork === 'polygon-amoy'
    ? `https://amoy.polygonscan.com/tx/${batch.blockchainTxHash}`
    : `https://explorer.graintrust.io/tx/${batch.blockchainTxHash}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🌾 {batch.name}
              </h1>
              <p className="text-gray-600">Batch Code: <span className="font-mono font-bold text-green-600">{batch.batchCode}</span></p>
            </div>
            <div className="text-right">
              {batch.blockchainTxHash && (
                <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                  ✅ Blockchain Verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Batch Details */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Batch Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Crop Type</p>
              <p className="font-semibold text-gray-800">{batch.cropType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quantity</p>
              <p className="font-semibold text-gray-800">{batch.quantity} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Farmer</p>
              <p className="font-semibold text-gray-800">{batch.farmerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-semibold text-gray-800">{batch.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Harvest Date</p>
              <p className="font-semibold text-gray-800">
                {new Date(batch.harvestDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold text-gray-800">{batch.status}</p>
            </div>
          </div>
        </div>

        {/* Blockchain Verification */}
        {batch.blockchainTxHash && (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🔗 Blockchain Verification</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Network</p>
                <p className="font-semibold text-gray-800">{batch.blockchainNetwork}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transaction Hash</p>
                <p className="font-mono text-xs text-gray-800 break-all">{batch.blockchainTxHash}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Synced At</p>
                <p className="font-semibold text-gray-800">
                  {new Date(batch.blockchainSyncedAt).toLocaleString()}
                </p>
              </div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🔍 View on PolygonScan
              </a>
            </div>
          </div>
        )}

        {/* Stages */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📸 Farming Stages</h2>
          <div className="space-y-6">
            {batch.stages.sort((a, b) => a.order - b.order).map((stage, index) => (
              <div key={stage.id} className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{stage.name}</h3>
                  <span className="text-sm text-gray-500">
                    ({new Date(stage.completedAt).toLocaleDateString()})
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                  {stage.imageUrls.map((url, imgIndex) => (
                    <div key={imgIndex} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={url}
                        alt={`${stage.name} - Image ${imgIndex + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            🌾 Powered by GrainTrust - Transparent Agriculture
          </p>
          <p className="text-xs mt-1">
            Verified on Blockchain | Immutable Record
          </p>
        </div>
      </div>
    </div>
  );
}
