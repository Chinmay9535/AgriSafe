'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BatchQRCodeProps {
  batchId: string;
  batchCode?: string;
  showDownload?: boolean;
}

export default function BatchQRCode({ batchId, batchCode, showDownload = true }: BatchQRCodeProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [verifyUrl, setVerifyUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQRCode() {
      try {
        const response = await fetch(`/api/qr/${batchId}`);
        if (!response.ok) throw new Error('Failed to generate QR code');
        const data = await response.json();
        setQrCode(data.qrCode);
        setVerifyUrl(data.verifyUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load QR code');
      } finally {
        setLoading(false);
      }
    }

    if (batchId) {
      fetchQRCode();
    }
  }, [batchId]);

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${batchCode || batchId}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(verifyUrl);
    alert('Verification URL copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          📱 Scan to Verify
        </h3>
        <p className="text-sm text-gray-600">
          {batchCode && <span className="font-mono font-bold text-green-600">{batchCode}</span>}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-4 bg-white p-4 rounded-lg border-2 border-gray-200">
        <img 
          src={qrCode} 
          alt="Batch Verification QR Code" 
          className="w-64 h-64"
        />
      </div>

      {/* Verification URL */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-1">Verification URL:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={verifyUrl}
            readOnly
            className="flex-1 text-xs bg-gray-50 border border-gray-300 rounded px-3 py-2 font-mono"
          />
          <button
            onClick={copyUrl}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Actions */}
      {showDownload && (
        <div className="flex gap-2">
          <button
            onClick={downloadQR}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            <Download size={18} />
            Download QR Code
          </button>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            🔍 Preview
          </a>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          ℹ️ Anyone can scan this QR code to view batch details, images, and blockchain verification on any device.
        </p>
      </div>
    </div>
  );
}
