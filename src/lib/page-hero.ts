export type AdminPageHeroKey =
  | 'dashboard'
  | 'books'
  | 'inventory'
  | 'ocr'
  | 'orders'
  | 'order-detail'
  | 'robots'
  | 'alerts'
  | 'readers'
  | 'reader-detail'
  | 'recommendation'
  | 'analytics'
  | 'system'
  | 'catalog'
  | 'events'

type PageHeroConfig = {
  heroImage: string
  heroPosition?: string
}

const pageHeroMap: Record<AdminPageHeroKey, PageHeroConfig> = {
  dashboard: {
    heroImage: '/dashboard/dashboard-1.jpg',
    heroPosition: 'center 36%',
  },
  books: {
    heroImage: '/dashboard/dashboard-2.jpg',
    heroPosition: 'center 42%',
  },
  inventory: {
    heroImage: '/dashboard/dashboard-3.jpg',
    heroPosition: 'center 44%',
  },
  ocr: {
    heroImage: '/dashboard/dashboard-4.jpg',
    heroPosition: 'center 38%',
  },
  orders: {
    heroImage: '/dashboard/dashboard-5.jpg',
    heroPosition: 'center 38%',
  },
  'order-detail': {
    heroImage: '/dashboard/dashboard-6.jpg',
    heroPosition: 'center 34%',
  },
  robots: {
    heroImage: '/dashboard/dashboard-7.jpg',
    heroPosition: 'center 40%',
  },
  alerts: {
    heroImage: '/dashboard/dashboard-8.jpg',
    heroPosition: 'center 28%',
  },
  readers: {
    heroImage: '/dashboard/dashboard-9.jpg',
    heroPosition: 'center 40%',
  },
  'reader-detail': {
    heroImage: '/dashboard/dashboard-10.jpg',
    heroPosition: 'center 36%',
  },
  recommendation: {
    heroImage: '/dashboard/dashboard-11.jpg',
    heroPosition: 'center 36%',
  },
  analytics: {
    heroImage: '/dashboard/dashboard-3.jpg',
    heroPosition: 'center 30%',
  },
  system: {
    heroImage: '/dashboard/dashboard-8.jpg',
    heroPosition: 'center 34%',
  },
  catalog: {
    heroImage: '/dashboard/dashboard-2.jpg',
    heroPosition: 'center 42%',
  },
  events: {
    heroImage: '/dashboard/dashboard-7.jpg',
    heroPosition: 'center 34%',
  },
}

export function getAdminPageHero(key: AdminPageHeroKey): PageHeroConfig {
  return pageHeroMap[key]
}
