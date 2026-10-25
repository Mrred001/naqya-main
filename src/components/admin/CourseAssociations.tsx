import { useId, useState } from "react";
import { type CourseAssociation, type DarbCourse } from "@/lib/darb-resources";
const field =
  "w-full min-h-10 rounded-xl border border-amber-200/15 bg-[#19160f] px-3 py-2 text-sm text-amber-50 outline-none focus:ring-2 focus:ring-amber-300/40";
export function CourseAssociations({
  courses,
  value,
  onChange,
  defaultRole = "primary",
  disabled = false,
}: {
  courses: DarbCourse[];
  value: CourseAssociation[];
  onChange: (links: CourseAssociation[]) => void;
  defaultRole?: CourseAssociation["role"];
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const help = useId();
  const visible = courses.filter((c) =>
    `${c.name} ${c.code} ${c.year}`.toLowerCase().includes(search.toLowerCase()),
  );
  const years = [...new Set(visible.map((c) => c.year))];
  const change = (slug: string, patch: Partial<CourseAssociation>) =>
    onChange(value.map((link) => (link.course_slug === slug ? { ...link, ...patch } : link)));
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-2xl border border-amber-100/15 p-4 md:col-span-2"
      aria-describedby={help}
    >
      <legend className="px-2 text-sm font-semibold">
        Linked courses · {value.length} selected
      </legend>
      <p id={help} className="text-xs leading-relaxed text-amber-100/50">
        One source, multiple courses. A supporting explanation does not count as curriculum
        coverage. Select all includes existing courses only.
      </p>
      <input
        type="search"
        aria-label="Search linked courses"
        placeholder="Search by course name or code…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={field}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            onChange(
              courses.map(
                (c) =>
                  value.find((v) => v.course_slug === c.slug) ?? {
                    course_slug: c.slug,
                    role: defaultRole,
                    note: null,
                  },
              ),
            )
          }
          className="min-h-10 rounded-lg border border-amber-200/20 px-3 py-2 text-xs text-amber-200"
        >
          Select all current courses
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="min-h-10 px-3 py-2 text-xs text-amber-100/60"
        >
          Clear selection
        </button>
      </div>
      <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
        {years.map((year) => (
          <div key={year}>
            <p dir="auto" className="mb-2 text-xs text-amber-200/70">
              {year}
            </p>
            <div className="space-y-2">
              {visible
                .filter((c) => c.year === year)
                .map((course) => {
                  const selected = value.find((v) => v.course_slug === course.slug);
                  return (
                    <div key={course.slug} className="rounded-xl border border-amber-100/10 p-3">
                      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={(e) =>
                            onChange(
                              e.target.checked
                                ? [
                                    ...value,
                                    { course_slug: course.slug, role: defaultRole, note: null },
                                  ]
                                : value.filter((v) => v.course_slug !== course.slug),
                            )
                          }
                          className="h-4 w-4 accent-amber-300"
                        />
                        <span className="min-w-0 break-words">
                          {course.name}
                          <span className="ml-2 text-xs text-amber-100/40">{course.code}</span>
                        </span>
                      </label>
                      {selected && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <label className="space-y-1 text-xs text-amber-100/60">
                            <span>Role in {course.name}</span>
                            <select
                              aria-label={`Role for ${course.name}`}
                              value={selected.role}
                              onChange={(e) =>
                                change(course.slug, {
                                  role: e.target.value as CourseAssociation["role"],
                                })
                              }
                              className={field}
                            >
                              <option value="primary">Course source</option>
                              <option value="support">Supporting explanation</option>
                            </select>
                          </label>
                          <label className="space-y-1 text-xs text-amber-100/60">
                            <span>Course note (optional)</span>
                            <textarea
                              aria-label={`Note for ${course.name}`}
                              rows={2}
                              maxLength={1500}
                              value={selected.note ?? ""}
                              onChange={(e) =>
                                change(course.slug, { note: e.target.value || null })
                              }
                              className={field}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
        {!visible.length && <p className="text-sm text-amber-100/45">No matching courses.</p>}
      </div>
    </fieldset>
  );
}
