import { useEffect, useRef, useState } from 'react';
import { Upload, Image, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import { useAppLanguage } from '../../hooks/useAppLanguage';

export default function SlipUpload({ orderId, onVerified, onError }) {
  const { isThai } = useAppLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.match(/image\/(jpeg|jpg|png|gif|webp)/i)) {
      alert(isThai ? 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF, WEBP)' : 'Please select an image file (JPG, PNG, GIF, WEBP).');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert(isThai ? 'ไฟล์ต้องมีขนาดไม่เกิน 5MB' : 'File size must be 5MB or less.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
  };

  const handleFileSelect = (e) => {
    selectFile(e.target.files?.[0] || null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    selectFile(e.dataTransfer.files?.[0] || null);
  };

  const buildVerifyPopupMessage = (success, rawMessage = '') => {
    const message = String(rawMessage || '').toLowerCase();

    if (success) {
      return 'ยืนยันการจ่ายเงินสำเร็จ / Confirm successful payment';
    }

    const isDuplicate =
      message.includes('already been used') ||
      message.includes('duplicate') ||
      message.includes('ถูกใช้งานไปแล้ว') ||
      message.includes('ถูกใช้ไปแล้ว');

    if (isDuplicate) {
      return isThai
        ? 'สลิปนี้ถูกใช้ไปแล้ว'
        : 'This slip has already been used.';
    }

    const isInvalidSlip =
      message.includes('invalid') ||
      message.includes('cannot detect qr') ||
      message.includes('missing transaction reference') ||
      message.includes('amount mismatch') ||
      message.includes('cannot extract transfer amount') ||
      message.includes('ไม่พบ qr') ||
      message.includes('ไม่สามารถอ่านข้อมูลจากสลิป') ||
      message.includes('สลิปไม่ถูกต้อง') ||
      message.includes('จำนวนเงินไม่ตรง');

    if (isInvalidSlip) {
      return isThai ? 'สลิปไม่ถูกต้อง' : 'Invalid slip.';
    }

    return isThai ? 'ไม่สามารถยืนยันสลิปได้' : 'Unable to verify slip.';
  };

  const handleUpload = async () => {
    if (!file || !orderId) return;
    setUploading(true);
    setResult(null);

    try {
      const response = await paymentApi.verifySlip(orderId, file);
      setResult(response);
      const popupMessage = response?.success
        ? buildVerifyPopupMessage(true, response?.message)
        : (response?.message || buildVerifyPopupMessage(false, response?.message));
      window.alert(popupMessage);
      if (response?.success) onVerified?.(response);
      else onError?.({ ...(response || {}), message: popupMessage });
    } catch (error) {
      const message = error?.response?.data?.message || (isThai ? 'เกิดข้อผิดพลาดในการอัปโหลด' : 'Upload failed.');
      const popupMessage = buildVerifyPopupMessage(false, message);
      window.alert(popupMessage);
      const payload = { success: false, message: popupMessage, rawMessage: message };
      setResult(payload);
      onError?.(payload);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          position: 'relative',
          border: preview ? '1px dashed #22c55e' : '1px dashed #555',
          borderRadius: 10,
          padding: 14,
          textAlign: 'center',
          background: preview ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.22)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
        {preview ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 999, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <X size={14} />
            </button>
            <img src={preview} alt={isThai ? 'ตัวอย่างสลิป' : 'Slip preview'} style={{ maxHeight: 170, maxWidth: '100%', margin: '0 auto', borderRadius: 8 }} />
            <p style={{ color: '#66e08f', fontSize: 12, margin: '8px 0 0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} />
              {file?.name}
            </p>
          </div>
        ) : (
          <div style={{ padding: '6px 0' }}>
            <Upload size={30} style={{ margin: '0 auto', color: '#aaa', marginBottom: 6 }} />
            <p style={{ margin: 0, color: '#ddd', fontSize: 13, fontWeight: 600 }}>{isThai ? 'ลากไฟล์สลิปมาวางที่นี่' : 'Drop slip image here'}</p>
            <p style={{ margin: '4px 0 0', color: '#8a8a8a', fontSize: 12 }}>{isThai ? 'หรือคลิกเพื่อเลือกไฟล์' : 'or click to choose a file'}</p>
            <p style={{ margin: '6px 0 0', color: '#6f6f6f', fontSize: 11 }}>{isThai ? 'รองรับ JPG, PNG, GIF, WEBP (สูงสุด 5MB)' : 'Supports JPG, PNG, GIF, WEBP (max 5MB)'}</p>
          </div>
        )}
      </div>

      {file && !result?.success && (
        <button
          onClick={handleUpload}
          disabled={uploading || !orderId}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 10,
            padding: '10px 12px',
            background: uploading ? '#555' : '#f06a00',
            color: '#fff',
            cursor: uploading || !orderId ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {uploading ? <Loader2 size={18} style={{ animation: 'cps-spin 0.8s linear infinite' }} /> : <Image size={18} />}
          {uploading ? (isThai ? 'กำลังตรวจสอบ...' : 'Verifying...') : (isThai ? 'ยืนยันการชำระเงิน' : 'Verify Payment')}
        </button>
      )}

      {result && (
        <div
          style={{
            borderRadius: 10,
            border: result.success ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(234,179,8,0.5)',
            background: result.success ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
            padding: 10,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          {result.success ? <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} /> : <XCircle size={20} style={{ color: '#eab308', flexShrink: 0 }} />}
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: result.success ? '#86efac' : '#fde047', fontSize: 13 }}>
              {result.success ? (isThai ? 'ตรวจสอบสำเร็จ' : 'Verified') : (isThai ? 'ตรวจสอบไม่ผ่าน' : 'Verification failed')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d4d4d4' }}>
              {result.success ? (isThai ? 'การชำระเงินได้รับการยืนยันแล้ว' : 'Your payment is confirmed.') : result.message || (isThai ? 'ระบบไม่สามารถยืนยันสลิปนี้ได้' : 'The system could not verify this slip.')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
