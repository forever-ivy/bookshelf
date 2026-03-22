import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { DashboardPage } from '@/pages/dashboard-page'
import { EventsPage } from '@/pages/events-page'
import { InventoryPage } from '@/pages/inventory-page'
import { LoginPage } from '@/pages/login-page'
import { OcrPage } from '@/pages/ocr-page'
import { OrderDetailPage } from '@/pages/order-detail-page'
import { OrdersPage } from '@/pages/orders-page'
import { ReadersPage } from '@/pages/readers-page'
import { ReaderDetailPage } from '@/pages/reader-detail-page'
import { RobotsPage } from '@/pages/robots-page'
import { CatalogPage } from '@/pages/catalog-page'
import { AppLayout } from '@/routes/app-layout'
import { ProtectedRoute } from '@/routes/protected-route'

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/ocr" element={<OcrPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/robots" element={<RobotsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/readers" element={<ReadersPage />} />
          <Route path="/readers/:readerId" element={<ReaderDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
