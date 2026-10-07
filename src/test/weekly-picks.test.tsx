import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentItem } from "@/lib/content";
import { WeeklyPicks } from "@/components/site/WeeklyPicks";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { PreferencesProvider } from "@/components/site/PreferencesProvider";
import { LanguageToggle } from "@/components/site/LanguageToggle";

vi.mock("@/components/site/ContentCard", () => ({
  ContentCard: ({ item }: { item: ContentItem }) => (
    <span data-testid="selected-card">{item.title}</span>
  ),
}));
const items = [
  { id: "a", title: "الاختيار الأول", recommendation: "توصية أولى" },
  { id: "b", title: "الاختيار الثاني", recommendation: "توصية ثانية" },
] as ContentItem[];
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
describe("Weekly selections", () => {
  it("switches card and recommendation together and wraps in both directions", () => {
    render(<WeeklyPicks items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "الاختيار التالي" }));
    expect(screen.getByTestId("selected-card")).toHaveTextContent("الاختيار الثاني");
    expect(screen.getByText("توصية ثانية")).toBeVisible();
    expect(screen.queryByText("توصية أولى")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "الاختيار التالي" }));
    expect(screen.getByText("توصية أولى")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "الاختيار السابق" }));
    expect(screen.getByText("توصية ثانية")).toBeVisible();
  });
  it("lets readers select an item directly and survives a content refresh", () => {
    const view = render(<WeeklyPicks items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "الاختيار الثاني" }));
    expect(screen.getByRole("button", { name: "الاختيار الثاني" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    view.rerender(<WeeklyPicks items={[items[0]!]} />);
    expect(screen.getByText("توصية أولى")).toBeVisible();
    expect(screen.getByRole("button", { name: "الاختيار التالي" })).toBeDisabled();
  });
  it("handles no featured items", () => {
    const { container } = render(<WeeklyPicks items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
it("persists the chosen theme and restores the control after remounting", () => {
  document.documentElement.classList.add("dark");
  const view = render(<PreferencesProvider><ThemeToggle /></PreferencesProvider>);
  fireEvent.click(screen.getByRole("button", { name: "تفعيل الوضع الفاتح" }));
  expect(document.documentElement).not.toHaveClass("dark");
  expect(localStorage.getItem("naqya-theme")).toBe("light");
  view.unmount();
  render(<PreferencesProvider><ThemeToggle /></PreferencesProvider>);
  expect(screen.getByRole("button", { name: "تفعيل الوضع الداكن" })).toBeVisible();
});

it("persists language and updates document direction", () => {
  render(<PreferencesProvider><LanguageToggle /></PreferencesProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));
  expect(localStorage.getItem("naqya-language")).toBe("en");
  expect(document.documentElement).toHaveAttribute("lang", "en");
  expect(document.documentElement).toHaveAttribute("dir", "ltr");
});
