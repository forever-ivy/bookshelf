import { http } from '@/lib/http'
import type {
  BorrowTrendsAnalytics,
  CabinetTurnoverAnalytics,
  CollegePreferencesAnalytics,
  PopularBooksAnalytics,
  RetentionAnalytics,
  RobotEfficiencyAnalytics,
  TimePeaksAnalytics,
} from '@/types/domain'

type AnalyticsWindowParams = {
  days?: number
  anchorDate?: string
}

function buildAnalyticsParams(params: AnalyticsWindowParams = {}) {
  const requestParams: Record<string, string | number> = {}

  if (params.days !== undefined) {
    requestParams.days = params.days
  }
  if (params.anchorDate) {
    requestParams.anchor_date = params.anchorDate
  }

  return requestParams
}

export async function getAdminBorrowTrends(days = 7, anchorDate?: string) {
  const response = await http.get<BorrowTrendsAnalytics>(
    '/api/v1/admin/analytics/borrow-trends',
    buildAnalyticsParams({ days, anchorDate }),
  )
  return response.data
}

export async function getAdminCollegePreferences(days = 7, anchorDate?: string) {
  const response = await http.get<CollegePreferencesAnalytics>(
    '/api/v1/admin/analytics/college-preferences',
    buildAnalyticsParams({ days, anchorDate }),
  )
  return response.data
}

export async function getAdminTimePeaks(days = 7, anchorDate?: string) {
  const response = await http.get<TimePeaksAnalytics>(
    '/api/v1/admin/analytics/time-peaks',
    buildAnalyticsParams({ days, anchorDate }),
  )
  return response.data
}

export async function getAdminPopularBooks(limit = 10, days = 7, anchorDate?: string) {
  const response = await http.get<PopularBooksAnalytics>(
    '/api/v1/admin/analytics/popular-books',
    {
      limit,
      ...buildAnalyticsParams({ days, anchorDate }),
    },
  )
  return response.data
}

export async function getAdminCabinetTurnover(days = 7, anchorDate?: string) {
  const response = await http.get<CabinetTurnoverAnalytics>(
    '/api/v1/admin/analytics/cabinet-turnover',
    buildAnalyticsParams({ days, anchorDate }),
  )
  return response.data
}

export async function getAdminRobotEfficiency(anchorDate?: string) {
  const response = await http.get<RobotEfficiencyAnalytics>(
    '/api/v1/admin/analytics/robot-efficiency',
    buildAnalyticsParams({ anchorDate }),
  )
  return response.data
}

export async function getAdminRetention(anchorDate?: string) {
  const response = await http.get<RetentionAnalytics>(
    '/api/v1/admin/analytics/retention',
    buildAnalyticsParams({ anchorDate }),
  )
  return response.data
}
