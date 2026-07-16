/**
 * rule-engine.service.ts
 *
 * Metadata-driven rule resolution engine.
 * Fetches business rules from the database (RuleCategory → RuleDefinition →
 * RuleVersion → RuleValue) with department-level overrides and a 5-minute
 * in-memory TTL cache.
 *
 * NO business rules are hard-coded here – all thresholds, rates, and
 * conditions live exclusively in the database.
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface IRuleEngineService {
  getRuleValue(
    category: string,
    key: string,
    date: Date,
    departmentId?: number,
  ): Promise<string>;

  getRuleValueAsNumber(
    category: string,
    key: string,
    date: Date,
    departmentId?: number,
  ): Promise<number>;

  getRuleValueAsTime(
    category: string,
    key: string,
    date: Date,
    departmentId?: number,
  ): Promise<{ hours: number; minutes: number }>;
}

// ---------------------------------------------------------------------------
// Cache entry
// ---------------------------------------------------------------------------

interface CacheEntry {
  value: string;
  expiresAt: number; // Unix ms
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

@Injectable()
export class RuleEngineService implements IRuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  /** TTL for cached rule values (milliseconds). */
  private readonly CACHE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

  /** In-memory cache: composite key → cached string value. */
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns the raw string value for a rule identified by (category, key).
   *
   * Department override strategy:
   *   1. Look up key `dept_<departmentId>_<key>` first.
   *   2. Fall back to the base key if no department-specific value exists.
   */
  async getRuleValue(
    category: string,
    key: string,
    date: Date,
    departmentId?: number,
  ): Promise<string> {
    // Try department-scoped key first
    if (departmentId !== undefined) {
      const deptKey = `dept_${departmentId}_${key}`;
      const deptValue = await this.resolveValue(category, deptKey, date, false);
      if (deptValue !== null) {
        return deptValue;
      }
    }

    // Fall back to base key (throws if not found)
    const baseValue = await this.resolveValue(category, key, date, true);
    return baseValue!;
  }

  /** Parses the rule value as a floating-point number. */
  async getRuleValueAsNumber(
    category: string,
    key: string,
    date: Date,
    departmentId?: number,
  ): Promise<number> {
    const raw = await this.getRuleValue(category, key, date, departmentId);
    const parsed = parseFloat(raw);

    if (Number.isNaN(parsed)) {
      throw new Error(
        `Rule [${category}/${key}] value "${raw}" is not a valid number.`,
      );
    }

    return parsed;
  }

  /**
   * Parses the rule value as an HH:mm time string.
   * Returns { hours: number, minutes: number }.
   */
  async getRuleValueAsTime(
    category: string,
    key: string,
    date: Date,
    departmentId?: number,
  ): Promise<{ hours: number; minutes: number }> {
    const raw = await this.getRuleValue(category, key, date, departmentId);
    const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());

    if (!match) {
      throw new Error(
        `Rule [${category}/${key}] value "${raw}" is not a valid HH:mm time string.`,
      );
    }

    return {
      hours: parseInt(match[1], 10),
      minutes: parseInt(match[2], 10),
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Core resolution logic.
   *
   * SQL equivalent:
   *   SELECT rv.value
   *   FROM   RuleCategory rc
   *   JOIN   RuleDefinition rd ON rd.categoryId = rc.id AND rd.code = <key>
   *   JOIN   RuleVersion    rv ON rv.definitionId = rd.id
   *                           AND rv.effectiveFrom <= <date>
   *                           AND (rv.effectiveTo IS NULL OR rv.effectiveTo > <date>)
   *                           AND rv.isActive = true
   *   WHERE  rc.name = <category>
   *   ORDER  BY rv.effectiveFrom DESC
   *   LIMIT  1
   */
  private async resolveValue(
    category: string,
    key: string,
    date: Date,
    throwIfMissing: boolean,
  ): Promise<string | null> {
    const cacheKey = this.buildCacheKey(category, key, date);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`Cache HIT  [${category}/${key}]`);
      return cached.value;
    }

    this.logger.debug(`Cache MISS [${category}/${key}] – querying DB`);

    // ------------------------------------------------------------------
    // Database query via Prisma
    // ------------------------------------------------------------------
    const ruleVersion = await this.prisma.ruleVersion.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: date } }],
        definition: {
          code: key,
          category: { name: category },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
      select: { value: true },
    });

    if (!ruleVersion) {
      if (throwIfMissing) {
        throw new NotFoundException(
          `Rule not found: category="${category}", key="${key}", date=${date.toISOString()}`,
        );
      }
      return null;
    }

    // RuleVersion.value is Json; we normalise to string
    const stringValue = this.extractStringFromJson(ruleVersion.value);

    // Store in cache
    this.cache.set(cacheKey, {
      value: stringValue,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return stringValue;
  }

  /**
   * Builds a deterministic cache key from (category, key, date).
   * Date is normalised to YYYY-MM-DD so rules effective on the same day share
   * a single cache entry regardless of the time component.
   */
  private buildCacheKey(category: string, key: string, date: Date): string {
    const datePart = date.toISOString().slice(0, 10); // YYYY-MM-DD
    return `${category}::${key}::${datePart}`;
  }

  /**
   * Extracts a string from a Prisma Json field.
   *
   * The Json column may store:
   *   - A plain string:  "25"
   *   - An object with a "value" property: { "value": "25", "unit": "THB" }
   *
   * We coerce whatever we get to a plain string.
   */
  private extractStringFromJson(raw: unknown): string {
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number' || typeof raw === 'boolean') {
      return String(raw);
    }
    if (raw !== null && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if ('value' in obj) return String(obj['value']);
    }
    return String(raw);
  }

  // -------------------------------------------------------------------------
  // Cache management (useful for tests / forced refresh)
  // -------------------------------------------------------------------------

  /** Evicts all entries from the in-memory cache. */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Rule engine cache cleared.');
  }

  /** Evicts a specific (category, key) pair from the cache. */
  evictCacheEntry(category: string, key: string): void {
    for (const cacheKey of this.cache.keys()) {
      if (cacheKey.startsWith(`${category}::${key}::`)) {
        this.cache.delete(cacheKey);
      }
    }
  }
}
