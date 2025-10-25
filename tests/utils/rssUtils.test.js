const {
  generateRSSFeed,
  getMonthFilter,
  filterItemsByMonth,
} = require("../../api/_rssUtils");

describe("RSS Utils", () => {
  describe("generateRSSFeed", () => {
    it("should generate a valid RSS feed", () => {
      const items = [
        {
          title: "Gold Rates - 2024-01-01",
          description: "Gold rates for January 1st",
          date: "2024-01-01",
        },
      ];

      const rss = generateRSSFeed(
        "Test RSS Feed",
        "Test Description",
        items,
        "https://example.com",
        "/test"
      );

      expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain("<title>Test RSS Feed</title>");
      expect(rss).toContain("<description>Test Description</description>");
      expect(rss).toContain("<link>https://example.com</link>");
      expect(rss).toContain("Gold Rates - 2024-01-01");
    });

    it("should handle empty items array", () => {
      const rss = generateRSSFeed(
        "Empty Feed",
        "No items",
        [],
        "https://example.com",
        "/empty"
      );

      expect(rss).toContain("<title>Empty Feed</title>");
      expect(rss).toContain("</channel>");
    });
  });

  describe("getMonthFilter", () => {
    it("should parse valid month parameter", () => {
      const mockReq = {
        url: "/test?m=2024-01",
        headers: { host: "example.com" },
      };

      const filter = getMonthFilter(mockReq);
      expect(filter).toEqual({
        year: 2024,
        month: 1,
        monthString: "2024-01",
      });
    });

    it("should return null for invalid month format", () => {
      const mockReq = {
        url: "/test?m=invalid",
        headers: { host: "example.com" },
      };

      const filter = getMonthFilter(mockReq);
      expect(filter).toBeNull();
    });

    it("should return null when no month parameter", () => {
      const mockReq = {
        url: "/test",
        headers: { host: "example.com" },
      };

      const filter = getMonthFilter(mockReq);
      expect(filter).toBeNull();
    });

    it("should validate month range", () => {
      const mockReq = {
        url: "/test?m=2024-13",
        headers: { host: "example.com" },
      };

      const filter = getMonthFilter(mockReq);
      expect(filter).toBeNull();
    });
  });

  describe("filterItemsByMonth", () => {
    const items = [
      { date: "2024-01-15", title: "Jan Item" },
      { date: "2024-02-10", title: "Feb Item" },
      { date: "2024-01-20", title: "Another Jan Item" },
    ];

    it("should filter items by month", () => {
      const filter = { year: 2024, month: 1, monthString: "2024-01" };
      const filtered = filterItemsByMonth(items, filter);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].title).toBe("Jan Item");
      expect(filtered[1].title).toBe("Another Jan Item");
    });

    it("should return all items when no filter", () => {
      const filtered = filterItemsByMonth(items, null);
      expect(filtered).toHaveLength(3);
    });

    it("should handle items without date", () => {
      const itemsWithoutDate = [
        { title: "No Date Item" },
        { date: "2024-01-15", title: "With Date" },
      ];

      const filter = { year: 2024, month: 1, monthString: "2024-01" };
      const filtered = filterItemsByMonth(itemsWithoutDate, filter);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("With Date");
    });
  });
});
