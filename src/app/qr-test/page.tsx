'use client';

import BatchQRCode from '@/components/BatchQRCode';

export default function QRTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Batch QR Code</h1>
        <BatchQRCode 
          batchId="7e9be97e-1d64-45b6-86ca-51f8a52f9a26"
          batchCode="FB001"
          showDownload={true}
        />
      </div>
    </div>
  );
}
