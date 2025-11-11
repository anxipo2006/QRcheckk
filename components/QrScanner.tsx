

import React, { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure: (error: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('Initializing scanner...');

  useEffect(() => {
    const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const qrboxSize = Math.floor(minEdge * 0.7);
      return {
        width: qrboxSize,
        height: qrboxSize,
      };
    };

    const qrScanner = new Html5Qrcode('qr-reader');
    setScanner(qrScanner);
    
    const startScanner = async () => {
      try {
        setScanStatus('Requesting camera permissions...');
        // FIX: Object literal may only specify known properties, and 'supportedScanTypes' does not exist in type 'Html5QrcodeCameraScanConfig'.
        await qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: qrboxFunction,
          },
          onScanSuccess,
          (errorMessage) => {
            // onScanFailure is called for non-critical errors
          }
        );
        setScanStatus('Ready to scan. Please align the QR code within the box.');
      } catch (err: any) {
        let errorMsg = err.toString();
        if (errorMsg.includes('NotAllowedError')) {
           errorMsg = 'Camera permission denied. Please enable camera access in your browser settings to scan the QR code.';
        } else if (errorMsg.includes('NotFoundError')) {
            errorMsg = 'No camera found. Please ensure a camera is connected and enabled.';
        } else {
            errorMsg = 'Failed to start camera. Please check permissions and refresh the page.';
        }
        setScanStatus(errorMsg);
        onScanFailure(errorMsg);
      }
    };
    
    startScanner();

    return () => {
      // FIX: Property 'STOPPED' does not exist on type 'typeof Html5QrcodeScannerState'.
      if (qrScanner && qrScanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
        qrScanner.stop().catch(err => {
          console.error("Failed to stop the scanner:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-neutral-800 rounded-lg shadow-xl">
      <div id="qr-reader" className="w-full rounded-md overflow-hidden border-4 border-neutral-700"></div>
      <p className="text-center text-sm text-neutral-200 mt-4 h-10">{scanStatus}</p>
    </div>
  );
};

export default QrScanner;