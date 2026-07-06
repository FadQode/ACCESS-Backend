import { describe, expect, test } from "bun:test";

import {
  createSnippet,
  extractKeywords,
  normalizeSearchText,
  redactSensitiveText,
} from "../src/modules/context-suggestions";

describe("context suggestions utilities", () => {
  test("normalizes text and extracts useful keywords", () => {
    expect(normalizeSearchText("Stasiun Tawang, banjir!!!")).toBe(
      "stasiun tawang banjir",
    );
    expect(
      extractKeywords(
        "Stasiun Tawang banjir dari pagi dan akses masuk susah banget.",
      ),
    ).toEqual(["stasiun", "tawang", "banjir", "pagi", "akses", "masuk", "susah"]);
  });

  test("redacts sensitive text and keeps snippets bounded", () => {
    const redacted = redactSensitiveText(
      "Hubungi @rani_putri lewat rani@mail.com atau 0812-3456-7890.",
    );

    expect(redacted).not.toContain("@rani_putri");
    expect(redacted).not.toContain("rani@mail.com");
    expect(redacted).not.toContain("0812-3456-7890");
    expect(createSnippet("Akses ".repeat(80), ["akses"], 80).length).toBeLessThanOrEqual(
      80,
    );
  });
});
