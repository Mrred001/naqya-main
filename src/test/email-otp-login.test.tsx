import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailOtpSignIn } from "@/components/account/EmailOtpSignIn";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOtp: mocks.send,
      verifyOtp: mocks.verify,
    },
  },
}));
vi.mock("@/lib/auth-return", () => ({
  rememberAuthReturn: vi.fn(),
  getAuthReturn: vi.fn(() => "/saved"),
  clearAuthReturn: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ error: { message: "Invalid OTP" } });
});
afterEach(cleanup);

describe("Email OTP login", () => {
  it("sends a passwordless email and allows manual code verification", async () => {
    render(<EmailOtpSignIn />);
    fireEvent.click(screen.getByRole("button", { name: "المتابعة بالإيميل" }));
    fireEvent.change(screen.getByLabelText("إيميلك"), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "أرسل رمز الدخول" }));
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith({
        email: "student@example.com",
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      }),
    );
    expect(await screen.findByLabelText("رمز التحقق")).toBeVisible();
    expect(screen.getByText(/لو وصلك رابط دخول بدل الرمز/)).toBeVisible();

    fireEvent.change(screen.getByLabelText("رمز التحقق"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الرمز والدخول" }));
    await waitFor(() =>
      expect(mocks.verify).toHaveBeenCalledWith({
        email: "student@example.com",
        token: "123456",
        type: "email",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("الرمز غير صحيح");
  });

  it("reports delivery failures without misleading success", async () => {
    mocks.send.mockResolvedValueOnce({ error: { message: "SMTP not configured" } });
    render(<EmailOtpSignIn />);
    fireEvent.click(screen.getByRole("button", { name: "المتابعة بالإيميل" }));
    fireEvent.change(screen.getByLabelText("إيميلك"), {
      target: { value: "student@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "أرسل رمز الدخول" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ما قدرنا نرسل الرسالة");
    expect(screen.queryByLabelText("رمز التحقق")).not.toBeInTheDocument();
  });
});
