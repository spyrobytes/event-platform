import { describe, it, expect, vi, beforeEach } from "vitest";

const resolveMxMock = vi.fn();
const resolve4Mock = vi.fn();
const promisesMock = {
  resolveMx: (...args: unknown[]) => resolveMxMock(...args),
  resolve4: (...args: unknown[]) => resolve4Mock(...args),
};
vi.mock("node:dns", () => ({
  default: { promises: promisesMock },
  promises: promisesMock,
}));

const { domainCanReceiveMail } = await import("@/lib/email-mx");

function dnsError(code: string): NodeJS.ErrnoException {
  const e = new Error(code) as NodeJS.ErrnoException;
  e.code = code;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("domainCanReceiveMail", () => {
  it("returns true when the domain has MX records (no A fallback needed)", async () => {
    resolveMxMock.mockResolvedValue([{ exchange: "mx.gmail.com", priority: 10 }]);
    expect(await domainCanReceiveMail("alex@gmail.com")).toBe(true);
    expect(resolve4Mock).not.toHaveBeenCalled();
  });

  it("returns false when the domain has neither MX nor A (ENOTFOUND on both)", async () => {
    resolveMxMock.mockRejectedValue(dnsError("ENOTFOUND"));
    resolve4Mock.mockRejectedValue(dnsError("ENOTFOUND"));
    expect(await domainCanReceiveMail("alex@gmial.invalidtld")).toBe(false);
  });

  it("falls back to an A record when there's no MX (ENODATA) but an A exists", async () => {
    resolveMxMock.mockRejectedValue(dnsError("ENODATA"));
    resolve4Mock.mockResolvedValue(["1.2.3.4"]);
    expect(await domainCanReceiveMail("alex@a-only.test")).toBe(true);
  });

  it("FAILS OPEN on an ambiguous DNS error (SERVFAIL/timeout), never blocking", async () => {
    resolveMxMock.mockRejectedValue(dnsError("ESERVFAIL"));
    expect(await domainCanReceiveMail("alex@flaky.test")).toBe(true);
    expect(resolve4Mock).not.toHaveBeenCalled();
  });

  it("returns true (no judgment) when there's no domain to check", async () => {
    expect(await domainCanReceiveMail("not-an-email")).toBe(true);
    expect(resolveMxMock).not.toHaveBeenCalled();
  });
});
