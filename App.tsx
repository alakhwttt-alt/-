import { useState } from 'react';
import { Navigation, type Page } from '@/components/Navigation';
import { ToastContainer } from '@/components/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { ReceiveShipment } from '@/pages/ReceiveShipment';
import { DeliverShipment } from '@/pages/DeliverShipment';
import { SearchPage } from '@/pages/SearchPage';
import { DriverAccounts } from '@/pages/DriverAccounts';
import { ReceiptsPage } from '@/pages/ReceiptsPage';
import { PendingShipments } from '@/pages/PendingShipments';
import { ExportPage } from '@/pages/ExportPage';
import { ShipmentDetails } from '@/components/ShipmentDetails';
import type { Shipment } from '@/types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'receive':
        return <ReceiveShipment onCreated={() => setCurrentPage('dashboard')} />;
      case 'deliver':
        return <DeliverShipment onDelivered={() => setCurrentPage('receipts')} />;
      case 'pending':
        return <PendingShipments onShipmentClick={(s) => setSelectedShipment(s)} />;
      case 'search':
        return <SearchPage onShipmentClick={(s) => setSelectedShipment(s)} />;
      case 'drivers':
        return <DriverAccounts />;
      case 'receipts':
        return <ReceiptsPage />;
      case 'export':
        return <ExportPage />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100" dir="rtl">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </div>
      </main>

      <ShipmentDetails
        shipment={selectedShipment}
        onClose={() => setSelectedShipment(null)}
      />

      <ToastContainer />
    </div>
  );
}

export default App;
