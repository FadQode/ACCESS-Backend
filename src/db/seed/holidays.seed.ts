import { sql } from "drizzle-orm";

import type { Database } from "../index";
import { holidays, type NewHoliday } from "../schema";

// Realistic SKB-style holiday data for development/demo.
// 2026 covers a full year; 2027 covers Lebaran/Imlek/Nataru examples
// used by the implementation plan and tests.
export const holidaySeedData = [
  // 2026
  {
    id: "00000000-0000-4000-800a-000000000001",
    name: "Tahun Baru Masehi 2026",
    date: "2026-01-01",
    category: "nataru",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000002",
    name: "Tahun Baru Imlek 2577 Kongzili",
    date: "2026-02-17",
    category: "imlek",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000003",
    name: "Hari Suci Nyepi",
    date: "2026-03-19",
    category: "regular_holiday",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000004",
    name: "Idul Fitri 1447 H",
    date: "2026-03-20",
    category: "lebaran",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000005",
    name: "Idul Fitri 1447 H Hari Kedua",
    date: "2026-03-21",
    category: "lebaran",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000006",
    name: "Cuti Bersama Idul Fitri 1447 H",
    date: "2026-03-23",
    category: "lebaran",
    isJointLeave: true,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000007",
    name: "Wafat Isa Almasih",
    date: "2026-04-03",
    category: "regular_holiday",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000008",
    name: "Hari Buruh Internasional",
    date: "2026-05-01",
    category: "regular_holiday",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000009",
    name: "Hari Lahir Pancasila",
    date: "2026-06-01",
    category: "regular_holiday",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000010",
    name: "Idul Adha 1447 H",
    date: "2026-05-27",
    category: "regular_holiday",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000011",
    name: "Maulid Nabi Muhammad Saw",
    date: "2026-08-26",
    category: "regular_holiday",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000012",
    name: "Hari Raya Natal",
    date: "2026-12-25",
    category: "nataru",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  {
    id: "00000000-0000-4000-800a-000000000013",
    name: "Cuti Bersama Natal",
    date: "2026-12-24",
    category: "nataru",
    isJointLeave: true,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2025",
  },
  // 2027 (dates per implementation plan examples)
  {
    id: "00000000-0000-4000-800a-000000000101",
    name: "Tahun Baru Masehi 2027",
    date: "2027-01-01",
    category: "nataru",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2026",
  },
  {
    id: "00000000-0000-4000-800a-000000000102",
    name: "Tahun Baru Imlek 2578 Kongzili",
    date: "2027-02-06",
    category: "imlek",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2026",
  },
  {
    id: "00000000-0000-4000-800a-000000000103",
    name: "Lebaran",
    date: "2027-03-14",
    category: "lebaran",
    isJointLeave: false,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2026",
  },
  {
    id: "00000000-0000-4000-800a-000000000104",
    name: "Cuti Bersama Lebaran",
    date: "2027-03-15",
    category: "lebaran",
    isJointLeave: true,
    source: "skb_3_menteri",
    sourceReference: "SKB 3 Menteri 2026",
  },
] satisfies NewHoliday[];

export const seedHolidays = async (db: Database): Promise<number> => {
  const seeded = await db
    .insert(holidays)
    .values(holidaySeedData)
    .onConflictDoUpdate({
      target: holidays.id,
      set: {
        name: sql`excluded.name`,
        date: sql`excluded.date`,
        category: sql`excluded.category`,
        isJointLeave: sql`excluded.is_joint_leave`,
        source: sql`excluded.source`,
        sourceReference: sql`excluded.source_reference`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: holidays.id });

  return seeded.length;
};
