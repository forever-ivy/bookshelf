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

export async function getAdminBorrowTrends(days = 7) {
  const response = await http.get<BorrowTrendsAnalytics>('/api/v1/admin/analytics/borrow-trends', { days })
  return response.data
}

export async function getAdminCollegePreferences() {
  const response = await http.get<CollegePreferencesAnalytics>('/api/v1/admin/analytics/college-preferences')
  return response.data
}

export async function getAdminTimePeaks(days = 7) {
  const response = await http.get<TimePeaksAnalytics>('/api/v1/admin/analytics/time-peaks', { days })
  return response.data
}

export async function getAdminPopularBooks(limit = 10) {
  const response = await http.get<PopularBooksAnalytics>('/api/v1/admin/analytics/popular-books', { limit })
  return response.data
}

export async function getAdminCabinetTurnover(days = 7) {
  const response = await http.get<CabinetTurnoverAnalytics>('/api/v1/admin/analytics/cabinet-turnover', { days })
  return response.data
}

export async function getAdminRobotEfficiency() {
  const response = await http.get<RobotEfficiencyAnalytics>('/api/v1/admin/analytics/robot-efficiency')
  return response.data
}

export async function getAdminRetention() {
  const response = await http.get<RetentionAnalytics>('/api/v1/admin/analytics/retention')
  return response.data
}
