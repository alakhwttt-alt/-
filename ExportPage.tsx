import { useState, useMemo } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Users,
  Truck,
  Building2,
  Calendar,
  Printer,
  Inbox,
  Receipt,
  Contact,
} from 'lucide-react';
import { useShipments, useDeliveryReceipts } from '@/hooks/useData';
import type { Shipment, DeliveryReceipt } from '@/types';
import { getTodayDate } from '@/lib/utils';
import {
  exportShipmentsCSV,
  exportReceiptsCSV,
  exportReceiversVCard,
  exportDriversVCard,
  exportSourcesVCard,
  printShipmentsPDF,
  printReceiptsPDF,
} from '@/lib/exportUtils';
import { showToast } from '@/components/Toast';
import { LoadingSpinner, EmptyState } from '@/components/Loading';

type ExportTab = 'shipments' | 'receipts' | 'contacts';

export function ExportPage() {
  const { shipments, loading: shipLoading } = useShipments();
  const { receipts, loading: receiptLoading } = useDeliveryReceipts();
  const [activeTab, setActiveTab] = useState<ExportTab>('shipments');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateRange = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    if (dateFrom) {
      start = new Date(dateFrom + 'T00:00:00');
    }
    if (dateTo) {
      end = new Date(dateTo + 'T23:59:59.999');
    }
    return { start, end };
  }, [dateFrom, dateTo]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const created = new Date(s.created_at);
      if (dateRange.start && created < dateRange.start) return false;
      if (dateRange.end && created > dateRange.end) return false;
      return true;
    });
  }, [shipments, dateRange]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const delivered = new Date(r.delivered_at);
      if (dateRange.start && delivered < dateRange.start) return false;
      if (dateRange.end && delivered > dateRange.end) return false;
      return true;
    });
  }, [receipts, dateRange]);

  const shipmentMap = useMemo(() => {
    const map = new Map<string, Shipment>();
    for (const s of shipments) map.set(s.id, s);
    return map;
  }, [shipments]);

  const dateLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'كل الفترات';
    if (dateFrom && dateTo) return `من ${dateFrom} إلى ${dateTo}`;
    if (dateFrom) return `من ${dateFrom}`;
    if (dateTo) return `حتى ${dateTo}`;
    return 'كل الفترات';
  }, [dateFrom, dateTo]);

  const receiverContacts = useMemo(() => {
    const seen = new Set<string>();
    return filteredShipments.filter((s) => {
      if (!s.receiver_name && !s.receiver_phone) return false;
      const key = (s.receiver_name || '') + '|' + (s.receiver_phone || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredShipments]);

  const driverContacts = useMemo(() => {
    const seen = new Set<string>();
    return filteredShipments.filter((s) => {
      if (!s.driver_name && !s.driver_phone) return false;
      const key = (s.driver_name || '') + '|' + (s.driver_phone || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredShipments]);

  const sourceContacts = useMemo(() => {
    const seen = new Set<string>();
    return filteredShipments.filter((s) => {
      if (!s.source_name && !s.source_phone) return false;
      const key = (s.source_name || '') + '|' + (s.source_phone || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredShipments]);

  const handleExportShipmentsCSV = () => {
    if (filteredShipments.length === 0) {
      showToast('warning', 'لا توجد شحنات في هذا النطاق');
      return;
    }
    exportShipmentsCSV(filteredShipments, receipts);
    showToast('success', `تم تصدير ${filteredShipments.length} شحنة`);
  };

  const handleExportReceiptsCSV = () => {
    if (filteredReceipts.length === 0) {
      showToast('warning', 'لا توجد إيصالات في هذا النطاق');
      return;
    }
    exportReceiptsCSV(filteredReceipts, shipmentMap);
    showToast('success', `تم تصدير ${filteredReceipts.length} إيصال`);
  };

  const handlePrintShipments = () => {
    if (filteredShipments.length === 0) {
      showToast('warning', 'لا توجد شحنات في هذا النطاق');
      return;
    }
    printShipmentsPDF(filteredShipments, receipts, dateLabel);
  };

  const handlePrintReceipts = () => {
    if (filteredReceipts.length === 0) {
      showToast('warning', 'لا توجد إيصالات في هذا النطاق');
      return;
    }
    printReceiptsPDF(filteredReceipts, shipmentMap, dateLabel);
  };

  const handleExportReceivers = () => {
    const ok = exportReceiversVCard(filteredShipments);
    if (ok) {
      showToast('success', 'تم تصدير أرقام المستلمين');
    } else {
      showToast('warning', 'لا توجد أرقام مستلمين');
    }
  };

  const handleExportDrivers = () => {
    const ok = exportDriversVCard(filteredShipments);
    if (ok) {
      showToast('success', 'تم تصدير أرقام السائقين');
    } else {
      showToast('warning', 'لا توجد أرقام سائقين');
    }
  };

  const handleExportSources = () => {
    const ok = exportSourcesVCard(filteredShipments);
    if (ok) {
      showToast('success', 'تم تصدير أرقام مكاتب المصدر');
    } else {
      showToast('warning', 'لا توجد أرقام مكاتب مصدر');
    }
  };

  if (shipLoading || receiptLoading) {
    return <LoadingSpinner text="جاري تحميل البيانات..." />;
  }

  const tabs: { id: ExportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'shipments', label: 'تصدير الشحنات', icon: <Inbox className="w-5 h-5" /> },
    { id: 'receipts', label: 'تصدير الإيصالات', icon: <Receipt className="w-5 h-5" /> },
    { id: 'contacts', label: 'تصدير جهات الاتصال', icon: <Contact className="w-5 h-5" /> },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">تصدير البيانات</h1>
        <p className="text-sm text-slate-500">تصدير الشحنات والإيصالات وجهات الاتصال مع فلترة بالتاريخ</p>
      </div>

      {/* Date Range Filter */}
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold text-slate-800">نطاق التاريخ</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="input-label">من تاريخ</label>
            <input
              type="date"
              className="input-field"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || getTodayDate()}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="input-label">إلى تاريخ</label>
            <input
              type="date"
              className="input-field"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              max={getTodayDate()}
            />
          </div>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="btn-secondary whitespace-nowrap"
          >
            الكل
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-semibold">
          النطاق الحالي: {dateLabel}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          <div className="card bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-slate-500" />
                <span className="font-bold text-slate-700">الشحنات في النطاق</span>
              </div>
              <span className="text-2xl font-bold text-teal-600">{filteredShipments.length}</span>
            </div>
          </div>

          {filteredShipments.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-8 h-8 text-slate-300" />}
              title="لا توجد شحنات"
              description="غيّر نطاق التاريخ أو أضف شحنات جديدة"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ExportButton
                icon={<FileSpreadsheet className="w-7 h-7" />}
                title="تصدير Excel (CSV)"
                description="ملف جدول بجميع بيانات الشحنات والإيصالات"
                onClick={handleExportShipmentsCSV}
                color="emerald"
              />
              <ExportButton
                icon={<Printer className="w-7 h-7" />}
                title="طباعة / حفظ PDF"
                description="تقرير منسق قابل للطباعة أو حفظ كـ PDF"
                onClick={handlePrintShipments}
                color="blue"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="card bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-500" />
                <span className="font-bold text-slate-700">الإيصالات في النطاق</span>
              </div>
              <span className="text-2xl font-bold text-teal-600">{filteredReceipts.length}</span>
            </div>
          </div>

          {filteredReceipts.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-slate-300" />}
              title="لا توجد إيصالات"
              description="غيّر نطاق التاريخ أو سلّم شحنات جديدة"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ExportButton
                icon={<FileSpreadsheet className="w-7 h-7" />}
                title="تصدير Excel (CSV)"
                description="ملف جدول بجميع بيانات إيصالات التسليم"
                onClick={handleExportReceiptsCSV}
                color="emerald"
              />
              <ExportButton
                icon={<Printer className="w-7 h-7" />}
                title="طباعة / حفظ PDF"
                description="تقرير منسق قابل للطباعة أو حفظ كـ PDF"
                onClick={handlePrintReceipts}
                color="blue"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
            <ContactCountCard
              icon={<Users className="w-5 h-5" />}
              label="المستلمون"
              count={receiverContacts.length}
              color="blue"
            />
            <ContactCountCard
              icon={<Truck className="w-5 h-5" />}
              label="السائقون"
              count={driverContacts.length}
              color="amber"
            />
            <ContactCountCard
              icon={<Building2 className="w-5 h-5" />}
              label="مكاتب المصدر"
              count={sourceContacts.length}
              color="teal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ExportButton
              icon={<Users className="w-7 h-7" />}
              title="تصدير المستلمين"
              description={`حفظ ${receiverContacts.length} رقم في جهات اتصال الهاتف`}
              onClick={handleExportReceivers}
              color="blue"
              disabled={receiverContacts.length === 0}
            />
            <ExportButton
              icon={<Truck className="w-7 h-7" />}
              title="تصدير السائقين"
              description={`حفظ ${driverContacts.length} رقم في جهات اتصال الهاتف`}
              onClick={handleExportDrivers}
              color="amber"
              disabled={driverContacts.length === 0}
            />
            <ExportButton
              icon={<Building2 className="w-7 h-7" />}
              title="تصدير مكاتب المصدر"
              description={`حفظ ${sourceContacts.length} رقم في جهات اتصال الهاتف`}
              onClick={handleExportSources}
              color="teal"
              disabled={sourceContacts.length === 0}
            />
          </div>

          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-800 mb-1">كيفية الاستخدام</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  سيتم تنزيل ملف جهات اتصال (vCard). افتح الملف من هاتفك ليتم استيراد جميع الأرقام تلقائياً إلى دليل الهاتف.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportButton({
  icon,
  title,
  description,
  onClick,
  color,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: 'emerald' | 'blue' | 'amber' | 'teal';
  disabled?: boolean;
}) {
  const colors = {
    emerald: 'hover:border-emerald-300 hover:shadow-md group-hover/emerald:bg-emerald-50',
    blue: 'hover:border-blue-300 hover:shadow-md',
    amber: 'hover:border-amber-300 hover:shadow-md',
    teal: 'hover:border-teal-300 hover:shadow-md',
  };
  const iconColors = {
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`card flex items-center gap-4 text-right transition-all ${colors[color]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${iconColors[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-bold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

function ContactCountCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'blue' | 'amber' | 'teal';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}
