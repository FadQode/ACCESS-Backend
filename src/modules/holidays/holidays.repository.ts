import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import type { Database, DatabaseExecutor } from "../../db";
import { holidays, type Holiday, type NewHoliday } from "../../db/schema";
import type {
  CreateHolidayInput,
  HolidayFilters,
  UpdateHolidayInput,
} from "./holidays.types";

export interface HolidaysRepository {
  findHolidays(filters?: HolidayFilters): Promise<Holiday[]>;
  findHolidaysInRange(start: string, end: string): Promise<Holiday[]>;
  findHolidayById(id: string): Promise<Holiday | null>;
  findHolidayByDateAndSource(
    date: string,
    source: Holiday["source"],
  ): Promise<Holiday | null>;
  createHoliday(input: CreateHolidayInput): Promise<Holiday>;
  updateHoliday(id: string, patch: UpdateHolidayInput): Promise<Holiday | null>;
  deleteHoliday(id: string): Promise<boolean>;
  upsertHolidays(
    rows: NewHoliday[],
    executor?: DatabaseExecutor,
  ): Promise<Holiday[]>;
}

export const createHolidaysRepository = (
  db: Database,
): HolidaysRepository => ({
  async findHolidays(filters = {}) {
    const conditions = [];
    if (filters.year) conditions.push(gte(holidays.date, `${filters.year}-01-01`), lte(holidays.date, `${filters.year}-12-31`));
    if (filters.category) conditions.push(eq(holidays.category, filters.category));
    if (filters.source) conditions.push(eq(holidays.source, filters.source));

    return db
      .select()
      .from(holidays)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(holidays.date));
  },

  async findHolidaysInRange(start, end) {
    return db
      .select()
      .from(holidays)
      .where(and(gte(holidays.date, start), lte(holidays.date, end)))
      .orderBy(asc(holidays.date));
  },

  async findHolidayById(id) {
    const [holiday] = await db
      .select()
      .from(holidays)
      .where(eq(holidays.id, id))
      .limit(1);
    return holiday ?? null;
  },

  async findHolidayByDateAndSource(date, source) {
    const [holiday] = await db
      .select()
      .from(holidays)
      .where(and(eq(holidays.date, date), eq(holidays.source, source)))
      .limit(1);
    return holiday ?? null;
  },

  async createHoliday(input) {
    const [holiday] = await db.insert(holidays).values(input).returning();
    if (!holiday) throw new Error("Holiday insert returned no row");
    return holiday;
  },

  async updateHoliday(id, patch) {
    const [holiday] = await db
      .update(holidays)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(holidays.id, id))
      .returning();
    return holiday ?? null;
  },

  async deleteHoliday(id) {
    const [holiday] = await db
      .delete(holidays)
      .where(eq(holidays.id, id))
      .returning({ id: holidays.id });
    return Boolean(holiday);
  },

  async upsertHolidays(rows, executor = db) {
    if (rows.length === 0) return [];
    return executor
      .insert(holidays)
      .values(rows)
      .onConflictDoUpdate({
        target: [holidays.date, holidays.source],
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          isJointLeave: sql`excluded.is_joint_leave`,
          sourceReference: sql`excluded.source_reference`,
          updatedAt: new Date(),
        },
      })
      .returning();
  },
});
