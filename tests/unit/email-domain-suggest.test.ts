import { describe, it, expect } from "vitest";
import { suggestEmailCorrection } from "@/lib/email-domain-suggest";

describe("suggestEmailCorrection", () => {
  it("suggests a correction for common domain typos", () => {
    expect(suggestEmailCorrection("alex@gmial.com")).toBe("alex@gmail.com");
    expect(suggestEmailCorrection("alex@gmai.com")).toBe("alex@gmail.com");
    expect(suggestEmailCorrection("alex@gmail.con")).toBe("alex@gmail.com");
    expect(suggestEmailCorrection("alex@hotmial.com")).toBe("alex@hotmail.com");
    expect(suggestEmailCorrection("alex@yaho.com")).toBe("alex@yahoo.com");
    expect(suggestEmailCorrection("alex@outlok.com")).toBe("alex@outlook.com");
  });

  it("preserves the local part (and its casing)", () => {
    expect(suggestEmailCorrection("Alex.Smith@gmial.com")).toBe(
      "Alex.Smith@gmail.com",
    );
  });

  it("returns null for an already-valid known domain", () => {
    expect(suggestEmailCorrection("alex@gmail.com")).toBeNull();
    expect(suggestEmailCorrection("alex@icloud.com")).toBeNull();
    // recognized provider — must not be flagged as a typo of gmail.com
    expect(suggestEmailCorrection("alex@email.com")).toBeNull();
  });

  it("returns null for clearly-different / custom domains", () => {
    expect(suggestEmailCorrection("alex@mycompany.com")).toBeNull();
    expect(suggestEmailCorrection("alex@university.edu")).toBeNull();
  });

  it("returns null for empty or incomplete input", () => {
    expect(suggestEmailCorrection("")).toBeNull();
    expect(suggestEmailCorrection("alex")).toBeNull();
    expect(suggestEmailCorrection("alex@")).toBeNull();
    expect(suggestEmailCorrection("@gmail.com")).toBeNull();
    expect(suggestEmailCorrection("alex@gmail")).toBeNull(); // no TLD/dot
  });
});
