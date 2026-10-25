import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommunityRequestButton } from "@/components/fcds/CommunityRequestButton";
import { recommendationCourses, submitCommunity, communityVisitor } from "@/lib/community";
import type { DarbCourse, DarbResource } from "@/lib/darb-resources";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), courses: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/components/site/PreferencesProvider", () => ({
  useSitePreferences: () => ({ language: "en" }),
}));
vi.mock("@/lib/darb-resources", async (original) => ({
  ...(await original<typeof import("@/lib/darb-resources")>()),
  darbCoursesQuery: { queryKey: ["test-courses"], queryFn: async () => mocks.courses },
}));
const courses = [
  { id: "a", slug: "a", name: "Algebra", code: "1", year: "Year 1", semester: 1, created_at: "" },
  { id: "b", slug: "b", name: "Numerical", code: "2", year: "Year 2", semester: 3, created_at: "" },
] satisfies DarbCourse[];
const source = {
  id: "source-id",
  title: "Matrices",
  course_links: [{ course_slug: "a", role: "primary", note: null }],
} as DarbResource;
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.rpc.mockResolvedValue({ data: 1, error: null });
  mocks.courses = courses;
});
function mount(
  kind: "message" | "calculator_request" | "calculator_suggestion" | "course_recommendation",
) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CommunityRequestButton kind={kind} resource={source} />
    </QueryClientProvider>,
  );
}
describe("community requests", () => {
  it("excludes every existing primary/support course from recommendations", () => {
    expect(recommendationCourses(courses, source).map((c) => c.slug)).toEqual(["b"]);
    expect(
      recommendationCourses(courses, {
        ...source,
        course_links: [{ course_slug: "b", role: "support", note: null }],
      }).map((c) => c.slug),
    ).toEqual(["a"]);
  });
  it("reuses one visitor key and sends no caller-controlled status or owner", async () => {
    const visitor = communityVisitor();
    await submitCommunity("calculator_request", { title: "Matrix square" });
    expect(mocks.rpc).toHaveBeenCalledWith("submit_community_request", {
      p_kind: "calculator_request",
      p_payload: { title: "Matrix square" },
      p_courses: [],
      p_visitor: visitor,
    });
    expect(communityVisitor()).toBe(visitor);
  });
  it.each(["calculator_request", "calculator_suggestion"] as const)(
    "uses the distinctive gold styling for %s",
    (kind) => {
      mount(kind);
      expect(
        screen.getByRole("button", {
          name: kind === "calculator_request" ? "Request a tutorial" : "Suggest a tutorial",
        }),
      ).toHaveClass("from-amber-300", "text-[#211604]");
    },
  );
  it("submits a source recommendation only for selected unlinked courses", async () => {
    mount("course_recommendation");
    fireEvent.click(screen.getByRole("button", { name: "Recommend for another course" }));
    await screen.findByText("Numerical");
    expect(screen.queryByLabelText(/Algebra/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Numerical/ }));
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Helpful matrices" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Received. Thank you for contributing!");
    expect(mocks.rpc.mock.calls[0]?.[1]).toMatchObject({
      p_kind: "course_recommendation",
      p_courses: ["b"],
      p_payload: { resource_id: "source-id", details: "Helpful matrices" },
    });
  });
  it("explains a duplicate request without reporting another submission", async () => {
    mocks.rpc.mockResolvedValue({ data: 0, error: null });
    mount("course_recommendation");
    fireEvent.click(screen.getByRole("button", { name: "Recommend for another course" }));
    await screen.findByText("Numerical");
    fireEvent.click(screen.getByRole("checkbox", { name: /Numerical/ }));
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Test reason" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText(/no duplicate was created/);
  });
  it("preserves the form and reports failure when submission fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "network error" } });
    mount("course_recommendation");
    fireEvent.click(screen.getByRole("button", { name: "Recommend for another course" }));
    await screen.findByText("Numerical");
    fireEvent.click(screen.getByRole("checkbox", { name: /Numerical/ }));
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Test reason" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Could not send your request"),
    );
    expect(screen.getByLabelText("Reason (optional)")).toHaveValue("Test reason");
  });
  it("requests a tutorial without requiring a video URL or assuming audio classification", async () => {
    mount("calculator_request");
    fireEvent.click(screen.getByRole("button", { name: "Request a tutorial" }));
    fireEvent.change(screen.getByLabelText("Tutorial title or operation"), {
      target: { value: "Matrix square" },
    });
    fireEvent.change(screen.getByLabelText("Calculator model"), { target: { value: "fx-991EX" } });
    fireEvent.change(screen.getByLabelText("Operation", { exact: true }), {
      target: { value: "matrices" },
    });
    expect(screen.queryByLabelText("YouTube video or playlist URL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Received. Thank you for contributing!");
    expect(mocks.rpc.mock.calls[0]?.[1].p_payload).toEqual({
      title: "Matrix square",
      calculator_topic: "matrices",
      calculator_model: "fx-991EX",
      details: "",
    });
  });
});
