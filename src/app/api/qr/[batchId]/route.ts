import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const batchId = params.batchId;
    
    // Generate verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3005';
    const verifyUrl = `${baseUrl}/verify/${batchId}`;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return NextResponse.json({
      qrCode: qrDataUrl,
      verifyUrl,
      batchId,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
