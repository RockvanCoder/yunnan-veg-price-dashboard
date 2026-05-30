import { describe, expect, it } from "vitest";
import {
  createEmptyBucket,
  getBucketKey,
  toDailyPoints,
  upsertHistoryRecord,
} from "../netlify/functions/history-store";

describe("history-store", () => {
  const base = createEmptyBucket({
    marketId: "m1",
    marketName: "测试市场",
    provinceCode: "530000",
    varietyId: "v1",
    varietyName: "西红柿",
    category: "瓜果类",
    unit: "元/公斤",
  });

  describe("upsertHistoryRecord", () => {
    it("应该为空的 bucket 追加当日记录", () => {
      const updated = upsertHistoryRecord(base, {
        date: "2026-05-29",
        price: 5.2,
        capturedAt: "2026-05-29 12:00:00",
      });
      expect(updated.records).toHaveLength(1);
      expect(updated.records[0].date).toBe("2026-05-29");
      expect(updated.records[0].price).toBe(5.2);
    });

    it("同一日期应覆盖旧记录而不是追加", () => {
      const updated = upsertHistoryRecord(base, {
        date: "2026-05-29",
        price: 5.0,
        capturedAt: "2026-05-29 10:00:00",
      });
      const overwritten = upsertHistoryRecord(updated, {
        date: "2026-05-29",
        price: 5.5,
        capturedAt: "2026-05-29 14:00:00",
      });
      expect(overwritten.records).toHaveLength(1);
      expect(overwritten.records[0].price).toBe(5.5);
    });

    it("多天记录应按日期排序", () => {
      let bucket = upsertHistoryRecord(base, {
        date: "2026-05-29",
        price: 5.2,
        capturedAt: "2026-05-29 12:00",
      });
      bucket = upsertHistoryRecord(bucket, {
        date: "2026-05-27",
        price: 4.9,
        capturedAt: "2026-05-27 12:00",
      });
      bucket = upsertHistoryRecord(bucket, {
        date: "2026-05-28",
        price: 5.0,
        capturedAt: "2026-05-28 12:00",
      });
      expect(bucket.records).toHaveLength(3);
      expect(bucket.records[0].date).toBe("2026-05-27");
      expect(bucket.records[1].date).toBe("2026-05-28");
      expect(bucket.records[2].date).toBe("2026-05-29");
    });

    it("不应改变原 bucket（immutable）", () => {
      const updated = upsertHistoryRecord(base, {
        date: "2026-05-29",
        price: 5.2,
        capturedAt: "2026-05-29 12:00:00",
      });
      expect(base.records).toHaveLength(0);
      expect(updated).not.toBe(base);
    });
  });

  describe("toDailyPoints", () => {
    it("应将历史记录转为前端 PricePoint 格式", () => {
      let bucket = upsertHistoryRecord(base, {
        date: "2026-05-28",
        price: 5.0,
        capturedAt: "2026-05-28 12:00",
      });
      bucket = upsertHistoryRecord(bucket, {
        date: "2026-05-29",
        price: 5.2,
        capturedAt: "2026-05-29 12:00",
      });
      const points = toDailyPoints(bucket, 7);
      expect(points).toHaveLength(2);
      expect(points[0].date).toBe("05-28");
      expect(points[0].price).toBe(5);
      // 第一天 growthRate 为 0
      expect(points[0].growthRate).toBe(0);
      // 第二天：(5.2 - 5.0) / 5.0 * 100 = 4.0
      expect(points[1].growthRate).toBe(4.0);
    });

    it("应限制返回天数为 days 参数", () => {
      // add 10 days
      let bucket = base;
      for (let i = 19; i <= 29; i++) {
        bucket = upsertHistoryRecord(bucket, {
          date: `2026-05-${i}`,
          price: 5.0 + (i - 19) * 0.1,
          capturedAt: `2026-05-${i} 12:00`,
        });
      }
      const points = toDailyPoints(bucket, 3);
      expect(points).toHaveLength(3);
    });
  });

  describe("getBucketKey", () => {
    it("应拼接 marketId 和 varietyId", () => {
      expect(getBucketKey("m1", "v1")).toBe("m1:v1");
    });
  });
});
