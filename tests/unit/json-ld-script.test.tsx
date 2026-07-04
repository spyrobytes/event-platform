import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLdScript, toJsonLdString } from "@/components/seo/JsonLdScript";

describe("toJsonLdString", () => {
  it("escapes < so user content cannot close the script tag", () => {
    const out = toJsonLdString({
      name: 'Party</script><script>alert("xss")</script>',
    });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
  });

  it("round-trips through JSON.parse unchanged", () => {
    const value = {
      name: "A & B <3 </script>",
      nested: ["<", ">", "'\""],
      count: 2,
    };
    expect(JSON.parse(toJsonLdString(value))).toEqual(value);
  });
});

describe("JsonLdScript", () => {
  it("renders an application/ld+json script with escaped content", () => {
    const { container } = render(
      <JsonLdScript data={{ "@type": "Thing", name: "</script>" }} />
    );
    const script = container.querySelector("script[type='application/ld+json']");
    expect(script).not.toBeNull();
    expect(script?.innerHTML).not.toContain("</script>");
    expect(JSON.parse(script?.textContent ?? "")).toEqual({
      "@type": "Thing",
      name: "</script>",
    });
  });
});
