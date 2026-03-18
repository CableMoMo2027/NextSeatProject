import { useState } from 'react';
import { CheckCircle, Copy, CreditCard, Loader2, QrCode } from 'lucide-react';
import SlipUpload from './SlipUpload';
import ttbLogo from '../../assets/logo/ttb.jpg';

const bankTransferInfo = {
  bankName: 'ธนาคารทหารไทยธนชาต (TTB)',
  accountName: 'นาย สุคีรินทร์ คีรินทร์นนท์',
  accountNumberRaw: '1002917308',
  accountNumberDisplay: '100-2-91730-8',
};

const card = {
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 14,
  background: 'rgba(0,0,0,0.30)',
  padding: '16px 18px',
};

export default function CheckoutPaymentSection({
  paymentTab,
  onPaymentTabChange,
  qrCode,
  loadingQR,
  total,
  orderId,
  paymentVerified,
  onGenerateQR,
  onPaymentVerified,
}) {
  const [copied, setCopied] = useState(false);

  const handleGenerateQR = async () => {
    try {
      await onGenerateQR();
    } catch (error) {
      console.error('Failed to generate QR:', error);
      alert(error?.message || 'Unable to prepare payment.');
    }
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(bankTransferInfo.accountNumberRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabActive = {
    background: '#f06a00',
    color: '#fff',
    border: '1px solid #f06a00',
    borderRadius: 10,
    padding: '9px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'filter 0.15s',
  };
  const tabInactive = {
    background: 'rgba(255,255,255,0.04)',
    color: '#aaa',
    border: '1px solid #333',
    borderRadius: 10,
    padding: '9px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'border-color 0.15s, color 0.15s',
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1.2 }}>เลือกวิธีชำระเงิน</p>

      {/* ── Tab row ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => onPaymentTabChange('qr')} style={paymentTab === 'qr' ? tabActive : tabInactive}>
          <QrCode size={15} />
          QR Code (PromptPay)
        </button>
        <button onClick={() => onPaymentTabChange('bank')} style={paymentTab === 'bank' ? tabActive : tabInactive}>
          <CreditCard size={15} />
          โอนธนาคาร
        </button>
      </div>

      {/* ── QR tab ── */}
      {paymentTab === 'qr' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <QrCode size={22} style={{ color: '#f06a00', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff' }}>ชำระผ่าน PromptPay QR Code</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888' }}>สแกน QR Code ด้วยแอพธนาคารของคุณเพื่อชำระเงิน</p>
            </div>
          </div>

          {!qrCode ? (
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <p style={{ margin: '0 0 12px', color: '#888', fontSize: 13 }}>กดปุ่มสร้าง QR Code สำหรับชำระเงิน</p>
              <button
                onClick={handleGenerateQR}
                disabled={loadingQR}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: loadingQR ? '#555' : '#f06a00',
                  border: 'none', color: '#fff', borderRadius: 10,
                  padding: '10px 22px', cursor: loadingQR ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: 14,
                }}
              >
                {loadingQR
                  ? <Loader2 size={16} style={{ animation: 'cps-spin 0.8s linear infinite' }} />
                  : <QrCode size={16} />}
                {loadingQR ? 'กำลังสร้าง...' : 'สร้าง QR Code'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: 16, borderRadius: 14, display: 'inline-block' }}>
                <img src={qrCode.qrCodeDataURL} alt="PromptPay QR" style={{ width: 180, height: 180, display: 'block', imageRendering: 'pixelated' }} />
              </div>
              <p style={{ margin: '10px 0 0', color: '#fff', fontWeight: 800, fontSize: 20 }}>฿{total.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Bank transfer tab ── */}
      {paymentTab === 'bank' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <img src={ttbLogo} alt="TTB" style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 4, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff' }}>{bankTransferInfo.bankName}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#888' }}>โอนเงินเข้าบัญชีธนาคารโดยตรง</p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 10 }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 11, color: '#666' }}>ชื่อบัญชี</p>
              <p style={{ margin: 0, fontWeight: 600, color: '#ddd', fontSize: 14 }}>{bankTransferInfo.accountName}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 11, color: '#666' }}>เลขบัญชี</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
                  {bankTransferInfo.accountNumberDisplay}
                </p>
                <button
                  onClick={copyAccountNumber}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: copied ? 'rgba(34,197,94,0.18)' : 'rgba(240,106,0,0.18)',
                    border: copied ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(240,106,0,0.5)',
                    color: copied ? '#86efac' : '#ffb870',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  <Copy size={13} />
                  {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                </button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#666' }}>ยอดที่ต้องโอน</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 24, color: '#fff' }}>฿{total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Slip upload ── */}
      <div style={card}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#ddd', fontSize: 14 }}>อัพโหลดสลิปการชำระเงิน</p>
        {orderId ? (
          <SlipUpload
            orderId={orderId}
            onVerified={onPaymentVerified}
            onError={(err) => console.error(err)}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: '#888', background: 'rgba(0,0,0,0.25)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px' }}>
            กำลังสร้างคำสั่งซื้อ กรุณารอสักครู่...
          </p>
        )}
      </div>

      {/* ── Verified banner ── */}
      {paymentVerified && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.38)', borderRadius: 10, padding: '12px 14px' }}>
          <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: '#86efac', fontSize: 14 }}>ยืนยันการชำระเงินเรียบร้อย!</span>
        </div>
      )}

      <style>{`@keyframes cps-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
