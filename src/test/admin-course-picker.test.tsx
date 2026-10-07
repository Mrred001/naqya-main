import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { CoursePicker } from "@/routes/admin";

afterEach(cleanup);
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollIntoView = () => undefined;
});

const courses = [
  {
    id: "course-13",
    name: "Probability and Statistics II",
    slug: "probability-statistics-ii",
    code: "STAT 13",
    year: "السنة الثانية",
    semester: 3,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "course-14",
    name: "Data Structures",
    slug: "data-structures",
    code: "CS 14",
    year: "السنة الثانية",
    semester: 4,
    created_at: "2026-01-01T00:00:00Z",
  },
];

it("searches courses by code and selects the matching semester entry", async () => {
  const onChange = vi.fn();
  const view = render(<CoursePicker courses={courses} value="" disabled={false} onChange={onChange} />);

  fireEvent.click(screen.getByRole("combobox", { name: "Choose a course" }));
  fireEvent.change(screen.getByPlaceholderText("Search by course name, code, or semester…"), {
    target: { value: "STAT 13" },
  });

  const option = await screen.findByRole("option", {
    name: /Probability and Statistics II · STAT 13 · Semester 3/,
  });
  fireEvent.click(option);

  await waitFor(() => expect(onChange).toHaveBeenCalledWith("probability-statistics-ii"));
  view.rerender(<CoursePicker courses={courses} value="probability-statistics-ii" disabled={false} onChange={onChange} />);
  expect(screen.getByRole("combobox")).toHaveTextContent("STAT 13 · Semester 3");
});
