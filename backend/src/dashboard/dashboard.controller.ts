/**
 * dashboard.controller.ts
 *
 * Exposes read-only aggregate endpoints for the Overview dashboard.
 *
 * NOTE: These endpoints are intentionally unauthenticated for now so the
 * portal Overview can render without a login round-trip. Wrap with
 * JwtAuthGuard once the auth flow is wired end-to-end.
 */

import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService, OverviewResponse } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/overview?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   *
   * Defaults to June 2026 (the seeded demo window) when no range is supplied.
   */
  @Get('overview')
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<OverviewResponse> {
    const start = startDate ? new Date(startDate) : new Date('2026-06-01');
    const end = endDate ? new Date(endDate) : new Date('2026-06-30');
    return this.dashboardService.getOverview(start, end);
  }
}
