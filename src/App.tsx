import { Suspense, lazy } from 'react'
import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/routes/app-layout'
import { PermissionRoute } from '@/routes/permission-route'
import { ProtectedRoute } from '@/routes/protected-route'

const AlertsPage = lazy(async () => import('@/pages/alerts-page').then((module) => ({ default: module.AlertsPage })))
const AnalyticsPage = lazy(async () => import('@/pages/analytics-page').then((module) => ({ default: module.AnalyticsPage })))
const BooksPage = lazy(async () => import('@/pages/books-page').then((module) => ({ default: module.BooksPage })))
const CatalogPage = lazy(async () => import('@/pages/catalog-page').then((module) => ({ default: module.CatalogPage })))
const DashboardPage = lazy(async () => import('@/pages/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const EventsPage = lazy(async () => import('@/pages/events-page').then((module) => ({ default: module.EventsPage })))
const InventoryPage = lazy(async () => import('@/pages/inventory-page').then((module) => ({ default: module.InventoryPage })))
const LoginPage = lazy(async () => import('@/pages/login-page').then((module) => ({ default: module.LoginPage })))
const OcrPage = lazy(async () => import('@/pages/ocr-page').then((module) => ({ default: module.OcrPage })))
const OrderDetailPage = lazy(async () => import('@/pages/order-detail-page').then((module) => ({ default: module.OrderDetailPage })))
const OrdersPage = lazy(async () => import('@/pages/orders-page').then((module) => ({ default: module.OrdersPage })))
const ReaderDetailPage = lazy(async () => import('@/pages/reader-detail-page').then((module) => ({ default: module.ReaderDetailPage })))
const ReadersPage = lazy(async () => import('@/pages/readers-page').then((module) => ({ default: module.ReadersPage })))
const RecommendationPage = lazy(
  async () => import('@/pages/recommendation-page').then((module) => ({ default: module.RecommendationPage })),
)
const RobotsPage = lazy(async () => import('@/pages/robots-page').then((module) => ({ default: module.RobotsPage })))
const SystemPage = lazy(async () => import('@/pages/system-page').then((module) => ({ default: module.SystemPage })))

function RouteFallback() {
  return null
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}

function withPermission(permissionCode: string | string[], element: ReactElement) {
  return <PermissionRoute permissionCode={permissionCode}>{element}</PermissionRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={withPermission('dashboard.view', <DashboardPage />)} />
            <Route path="/books" element={withPermission('books.manage', <BooksPage />)} />
            <Route path="/catalog" element={<Navigate to="/books" replace />} />
            <Route path="/analytics" element={withPermission('analytics.view', <AnalyticsPage />)} />
            <Route path="/inventory" element={withPermission('inventory.manage', <InventoryPage />)} />
            <Route path="/ocr" element={withPermission('inventory.manage', <OcrPage />)} />
            <Route path="/orders" element={withPermission('orders.manage', <OrdersPage />)} />
            <Route path="/orders/:orderId" element={withPermission('orders.manage', <OrderDetailPage />)} />
            <Route path="/robots" element={withPermission('robots.manage', <RobotsPage />)} />
            <Route path="/alerts" element={withPermission(['alerts.manage', 'system.audit.view'], <AlertsPage />)} />
            <Route path="/events" element={<Navigate to="/alerts" replace />} />
            <Route path="/readers" element={withPermission('readers.manage', <ReadersPage />)} />
            <Route path="/readers/:readerId" element={withPermission('readers.manage', <ReaderDetailPage />)} />
            <Route path="/recommendation" element={withPermission('recommendation.manage', <RecommendationPage />)} />
            <Route path="/system" element={withPermission(['system.settings.manage', 'system.roles.manage'], <SystemPage />)} />
            <Route path="/legacy/catalog" element={withPermission('books.manage', <CatalogPage />)} />
            <Route path="/legacy/events" element={withPermission('alerts.manage', <EventsPage />)} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
