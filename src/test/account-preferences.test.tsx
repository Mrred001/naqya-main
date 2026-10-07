import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/site/PreferencesProvider";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ThemeToggle } from "@/components/site/ThemeToggle";

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  user: { id: "user-1", user_metadata: {} },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { updateUser: mocks.updateUser } },
}));
vi.mock("@/components/account/AccountProvider", () => ({
  useAccount: () => ({ user: mocks.user }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  vi.clearAllMocks();
});

it("saves language and theme in the signed-in Supabase account metadata", async () => {
  mocks.updateUser.mockResolvedValue({ error: null });
  render(
    <PreferencesProvider>
      <LanguageToggle />
      <ThemeToggle />
    </PreferencesProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));
  fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

  await waitFor(() => {
    expect(mocks.updateUser).toHaveBeenLastCalledWith({
      data: { naqya_language: "en", naqya_theme: "light" },
    });
  });
  expect(localStorage.getItem("naqya-language")).toBe("en");
  expect(localStorage.getItem("naqya-theme")).toBe("light");
});
