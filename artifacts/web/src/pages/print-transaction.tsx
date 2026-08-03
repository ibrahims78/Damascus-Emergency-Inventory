import { useRoute, useLocation } from 'wouter';
import { useGetTransactionPrint } from '@workspace/api-client-react';
import { Printer, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

export function PrintTransactionPage() {
  const [, params] = useRoute('/print/:id');
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, isError } = useGetTransactionPrint(id);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          <span>جاري تحميل السند...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-gray-100">
        <p className="text-red-600 text-lg font-medium">لم يتم العثور على السند</p>
        <Button onClick={() => setLocation('/transactions')} variant="outline">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة لسجل العمليات
        </Button>
      </div>
    );
  }

  const { transaction: tx, organizationName, printedAt } = data;
  const isIn = tx.type === 'in';
  const isOut = tx.type === 'out';
  const isInit = tx.type === 'init';

  const typeLabel = isIn
    ? 'سند إدخال'
    : isOut
      ? 'سند إخراج'
      : 'رصيد افتتاحي';

  const typeColor = isIn ? '#16a34a' : isOut ? '#dc2626' : '#6b7280';
  const itemName = tx.itemType === 'equipment' ? tx.equipmentName : tx.itemName;
  const itemUnit = tx.itemUnit;

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }} className="min-h-screen bg-gray-100 print:bg-white">
      {/* Print Controls — hidden when printing */}
      <div className="print-hidden bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/transactions')}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">سند رقم: {tx.documentNumber}</span>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة السند
          </Button>
        </div>
      </div>

      {/* A4 Page Container */}
      <div
        className="mx-auto my-8 bg-white shadow-lg print:shadow-none print:my-0"
        style={{ width: '210mm', minHeight: '297mm' }}
      >
        <div style={{ padding: '15mm' }}>

          {/* ===== HEADER ===== */}
          <div
            style={{
              borderBottom: '2.5px solid #1e3a5f',
              paddingBottom: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Right: Organization info */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '1px' }}>
                  الجمهورية العربية السورية
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>
                  وزارة الصحة — مديرية الإحالة والإسعاف والطوارئ
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e3a5f' }}>
                  {organizationName}
                </div>
              </div>

              {/* Left: Document type badge */}
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: typeColor,
                    border: `2px solid ${typeColor}`,
                    borderRadius: '8px',
                    padding: '6px 20px',
                    display: 'inline-block',
                  }}
                >
                  {typeLabel}
                </div>
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  رقم السند:{' '}
                  <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    {tx.documentNumber}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ===== INFO GRID ===== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <InfoRow label="التاريخ والوقت" value={formatDateTime(tx.createdAt)} />
              <InfoRow label="أمين المستودع" value={tx.createdByName || '—'} />
              {!isInit && !isOut && tx.notes && (
                <InfoRow label="ملاحظات" value={tx.notes} />
              )}
            </div>

            {/* Right column (for out transactions) */}
            {isOut && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <InfoRow label="الجهة المستلمة" value={tx.recipientName || '—'} bold />
                {tx.recipientPerson && (
                  <InfoRow label="اسم المستلم" value={tx.recipientPerson} />
                )}
                {tx.exitReason && (
                  <InfoRow label="سبب الإخراج" value={tx.exitReason} />
                )}
                {tx.notes && <InfoRow label="ملاحظات" value={tx.notes} />}
              </div>
            )}
          </div>

          {/* ===== ITEMS TABLE ===== */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              marginBottom: '32px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={thStyle('center', '32px')}>#</th>
                <th style={thStyle('right')}>اسم الصنف</th>
                <th style={thStyle('center', '72px')}>النوع</th>
                {tx.quantity != null && (
                  <>
                    <th style={thStyle('center', '60px')}>الوحدة</th>
                    <th style={thStyle('center', '72px')}>الكمية</th>
                  </>
                )}
                <th style={thStyle('right')}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {/* Main row */}
              <tr>
                <td style={tdStyle('center')}>1</td>
                <td style={{ ...tdStyle('right'), fontWeight: 600 }}>{itemName || '—'}</td>
                <td style={{ ...tdStyle('center'), fontSize: '11px', color: '#6b7280' }}>
                  {tx.itemType === 'equipment' ? 'تجهيز' : 'مادة'}
                </td>
                {tx.quantity != null && (
                  <>
                    <td style={tdStyle('center')}>{itemUnit || '—'}</td>
                    <td
                      style={{
                        ...tdStyle('center'),
                        fontSize: '18px',
                        fontWeight: 700,
                        color: typeColor,
                      }}
                    >
                      {tx.quantity}
                    </td>
                  </>
                )}
                <td style={{ ...tdStyle('right'), color: '#6b7280', fontSize: '12px' }}>
                  {tx.notes || ''}
                </td>
              </tr>

              {/* Extra blank rows for manual additions */}
              {[2, 3, 4].map((n) => (
                <tr key={n}>
                  <td style={{ ...tdStyle('center'), color: '#d1d5db' }}>{n}</td>
                  <td style={tdStyle('right')}>&nbsp;</td>
                  <td style={tdStyle('center')}>&nbsp;</td>
                  {tx.quantity != null && (
                    <>
                      <td style={tdStyle('center')}>&nbsp;</td>
                      <td style={tdStyle('center')}>&nbsp;</td>
                    </>
                  )}
                  <td style={tdStyle('right')}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ===== SIGNATURES ===== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isOut ? '1fr 1fr 1fr' : '1fr 1fr',
              gap: '24px',
              marginTop: '40px',
            }}
          >
            {/* Warehouse keeper */}
            <SignatureBox
              title="أمين المستودع"
              name={tx.createdByName || undefined}
            />

            {isOut && (
              /* Responsible supervisor */
              <SignatureBox title="المسؤول المرسل" />
            )}

            {/* Recipient / Supplier */}
            <SignatureBox
              title={isOut ? 'المستلم' : isIn ? 'المورد' : 'المسؤول'}
              name={isOut && tx.recipientPerson ? tx.recipientPerson : undefined}
            />
          </div>

          {/* ===== FOOTER ===== */}
          <div
            style={{
              marginTop: '48px',
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#9ca3af',
            }}
          >
            <span>طُبع في: {formatDateTime(printedAt)}</span>
            <span>
              {organizationName} — {typeLabel} رقم {tx.documentNumber}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

function InfoRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
      <span style={{ color: '#6b7280', minWidth: '110px', flexShrink: 0 }}>
        {label}:
      </span>
      <span style={{ fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function SignatureBox({ title, name }: { title: string; name?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* Blank space for handwritten signature */}
      <div style={{ height: '50px' }} />
      <div
        style={{
          borderTop: '1.5px solid #374151',
          paddingTop: '8px',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '13px' }}>{title}</div>
        {name && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            {name}
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
          التوقيع والختم
        </div>
      </div>
    </div>
  );
}

/* ─── Style Helpers ─── */

function thStyle(align: 'right' | 'center' | 'left', width?: string): React.CSSProperties {
  return {
    border: '1px solid #9ca3af',
    padding: '7px 8px',
    textAlign: align,
    fontWeight: 700,
    width,
    backgroundColor: '#f3f4f6',
  };
}

function tdStyle(align: 'right' | 'center' | 'left'): React.CSSProperties {
  return {
    border: '1px solid #d1d5db',
    padding: '8px',
    textAlign: align,
    verticalAlign: 'middle',
  };
}
