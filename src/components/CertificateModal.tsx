'use client';

import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

interface CertificateModalProps {
  batch: {
    id: string;
    batchCode: string;
    name: string;
    cropType: string;
    quantity: number;
    farmerName: string;
    location: string;
    harvestDate: string;
    qrCode?: string;
    verifyUrl?: string;
    blockchainTxHash?: string;
    blockchainNetwork?: string;
    blockchainSyncedAt?: string;
  };
  onClose: () => void;
}

export default function CertificateModal({ batch, onClose }: CertificateModalProps) {
  const downloadCertificate = async () => {
    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(245, 250, 245);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative border
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(2);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');
      
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

      // Header
      doc.setFillColor(34, 139, 34);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text('GRAINTRUST', pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Blockchain-Verified Agricultural Transparency', pageWidth / 2, 32, { align: 'center' });

      // Certificate Title
      doc.setTextColor(34, 139, 34);
      doc.setFontSize(40);
      doc.setFont('times', 'bold');
      doc.text('CERTIFICATE', pageWidth / 2, 58, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setFont('times', 'italic');
      doc.text('of Blockchain Verification', pageWidth / 2, 68, { align: 'center' });

      // Decorative line
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(1);
      doc.line(40, 73, pageWidth - 40, 73);

      // Main Content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('This is to certify that the agricultural batch', pageWidth / 2, 85, { align: 'center' });

      // Batch Code - Highlighted
      doc.setFontSize(24);
      doc.setFont('times', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text(batch.batchCode, pageWidth / 2, 97, { align: 'center' });

      const codeWidth = doc.getTextWidth(batch.batchCode);
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.5);
      doc.line((pageWidth - codeWidth) / 2, 100, (pageWidth + codeWidth) / 2, 100);

      // Description
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('produced by', pageWidth / 2, 110, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setFont('times', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text(batch.farmerName, pageWidth / 2, 120, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('has been successfully verified and permanently recorded', pageWidth / 2, 130, { align: 'center' });
      doc.text('on the blockchain network, ensuring complete transparency', pageWidth / 2, 138, { align: 'center' });
      doc.text('and traceability throughout the supply chain.', pageWidth / 2, 146, { align: 'center' });

      // Batch Details Box
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.5);
      doc.setFillColor(248, 255, 248);
      doc.roundedRect(25, 155, pageWidth - 50, 55, 3, 3, 'FD');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      let yPos = 165;
      const leftX = 35;
      const rightX = 90;

      doc.setTextColor(34, 139, 34);
      doc.text('Crop Type:', leftX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(batch.cropType, rightX, yPos);

      yPos += 9;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text('Batch Name:', leftX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(batch.name, rightX, yPos);

      yPos += 9;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text('Quantity:', leftX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`${batch.quantity} kg`, rightX, yPos);

      yPos += 9;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text('Location:', leftX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const locationText = batch.location.length > 35 ? batch.location.substring(0, 35) + '...' : batch.location;
      doc.text(locationText, rightX, yPos);

      yPos += 9;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text('Harvest Date:', leftX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(new Date(batch.harvestDate).toLocaleDateString(), rightX, yPos);

      // Add QR Code if available
      if (batch.qrCode) {
        try {
          const qrSize = 40;
          const qrX = pageWidth - 60;
          const qrY = 160;
          
          doc.addImage(batch.qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
          
          doc.setDrawColor(34, 139, 34);
          doc.setLineWidth(0.5);
          doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 'S');
          
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 139, 34);
          doc.text('Scan to Verify', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });
        } catch (qrError) {
          console.error('Error adding QR code:', qrError);
        }
      }

      // Blockchain Verification Box
      if (batch.blockchainTxHash) {
        doc.setDrawColor(138, 43, 226);
        doc.setFillColor(243, 232, 255);
        doc.roundedRect(25, 220, pageWidth - 50, 38, 3, 3, 'FD');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(138, 43, 226);
        doc.text('⛓ BLOCKCHAIN VERIFICATION', 35, 230);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Network:', 35, 240);
        doc.setFont('helvetica', 'normal');
        doc.text(batch.blockchainNetwork || 'Polygon Amoy', 58, 240);

        doc.setFont('helvetica', 'bold');
        doc.text('Tx Hash:', 35, 248);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const txHash = batch.blockchainTxHash.substring(0, 40) + '...';
        doc.text(txHash, 54, 248);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Synced:', 35, 254);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(batch.blockchainSyncedAt || Date.now()).toLocaleDateString(), 54, 254);
      }

      // Footer
      const footerY = pageHeight - 42;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Date of Issuance:', 30, footerY);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString(), 30, footerY + 6);

      // Signature lines
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(30, footerY + 16, 85, footerY + 16);
      doc.line(pageWidth - 85, footerY + 16, pageWidth - 30, footerY + 16);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Authorized Signature', 57.5, footerY + 21, { align: 'center' });
      doc.text('GrainTrust Official', 57.5, footerY + 26, { align: 'center' });
      
      doc.text('Farmer Signature', pageWidth - 57.5, footerY + 21, { align: 'center' });
      doc.text(batch.farmerName, pageWidth - 57.5, footerY + 26, { align: 'center' });

      // Bottom footer
      doc.setFillColor(34, 139, 34);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text('GrainTrust - Blockchain-Powered Agricultural Transparency', pageWidth / 2, pageHeight - 6, { align: 'center' });
      doc.text(`Certificate ID: ${batch.batchCode}-${Date.now()} | Issued: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 3, { align: 'center' });

      // Save the PDF
      const fileName = `GrainTrust_Certificate_${batch.batchCode}_${batch.name.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    }
  };

  const explorerUrl = batch.blockchainNetwork === 'polygon-amoy'
    ? `https://amoy.polygonscan.com/tx/${batch.blockchainTxHash}`
    : `https://explorer.graintrust.io/tx/${batch.blockchainTxHash}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">🎓 Blockchain Verification Certificate</h2>
            <p className="text-green-100">Batch: {batch.batchCode}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="p-8">
          {/* Certificate Header */}
          <div className="text-center mb-8 border-b-4 border-green-600 pb-6">
            <div className="text-6xl mb-4">🌾</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">GrainTrust</h1>
            <p className="text-xl text-gray-600">Blockchain-Verified Agricultural Certificate</p>
            <p className="text-sm text-gray-500 mt-2">
              Issued on: {new Date(batch.blockchainSyncedAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          {/* Batch Details */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Batch Code</p>
              <p className="text-lg font-bold text-gray-800">{batch.batchCode}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Crop</p>
              <p className="text-lg font-bold text-gray-800">{batch.cropType}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Farmer</p>
              <p className="text-lg font-bold text-gray-800">{batch.farmerName}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Location</p>
              <p className="text-lg font-bold text-gray-800">{batch.location}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Harvest Date</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(batch.harvestDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Quantity</p>
              <p className="text-lg font-bold text-gray-800">{batch.quantity} kg</p>
            </div>
          </div>

          {/* Blockchain Section */}
          {batch.blockchainTxHash && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl mb-8 border-2 border-purple-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                🔗 Blockchain Verification
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Network</p>
                  <p className="font-semibold text-gray-800">{batch.blockchainNetwork}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transaction Hash</p>
                  <p className="font-mono text-xs text-gray-800 break-all">{batch.blockchainTxHash}</p>
                </div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  View on PolygonScan
                </a>
              </div>
            </div>
          )}

          {/* QR Code Section */}
          {batch.qrCode && (
            <div className="text-center bg-white p-6 rounded-xl border-2 border-green-200 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📱 Scan to Verify</h3>
              <div className="flex justify-center mb-4">
                <img 
                  src={batch.qrCode} 
                  alt="Verification QR Code" 
                  className="w-64 h-64 border-4 border-gray-200 rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code to view complete batch details and verification
              </p>
              {batch.verifyUrl && (
                <p className="text-xs text-gray-500 font-mono break-all">{batch.verifyUrl}</p>
              )}
            </div>
          )}

          {/* Certification Statement */}
          <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-600 rounded-r-lg">
            <p className="text-gray-700 leading-relaxed">
              <strong>This certifies that</strong> the agricultural batch <strong>{batch.batchCode}</strong> has been 
              successfully tracked through all farming stages, verified by authorized personnel, and permanently 
              recorded on the blockchain. The data integrity is cryptographically secured and publicly verifiable.
            </p>
          </div>

          {/* Signature Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 mb-2">Digitally Verified by</p>
            <p className="text-2xl font-bold text-green-600 mb-1">GrainTrust</p>
            <p className="text-sm text-gray-500">Blockchain-Powered Agricultural Transparency Platform</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 p-6 flex gap-4 border-t">
          <Button
            onClick={downloadCertificate}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Print Certificate
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="px-8 py-3 rounded-xl"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
