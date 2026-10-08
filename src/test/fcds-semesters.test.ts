import { describe, expect, it } from "vitest";
import { defaultFcdsSpecialization, normalizeFcdsSpecialization, fcdsSemesterForTemporaryCode, fcdsYearForSemester } from "@/lib/fcds";

describe("FCDS semester to year mapping", () => {
  it("maps every semester pair to the matching year", () => {
    expect([1, 2].map(fcdsYearForSemester)).toEqual(["السنة الأولى", "السنة الأولى"]);
    expect([3, 4].map(fcdsYearForSemester)).toEqual(["السنة الثانية", "السنة الثانية"]);
    expect([5, 6].map(fcdsYearForSemester)).toEqual(["السنة الثالثة", "السنة الثالثة"]);
    expect([7, 8].map(fcdsYearForSemester)).toEqual(["السنة الرابعة", "السنة الرابعة"]);
  });

  it("rejects semester values outside the curriculum", () => {
    expect(fcdsYearForSemester(0)).toBeNull();
    expect(fcdsYearForSemester(9)).toBeNull();
    expect(fcdsYearForSemester(1.5)).toBeNull();
  });

  it("assigns all 36 temporary course numbers to the semesters in the study plan", () => {
    const semesters = Array.from({ length: 36 }, (_, index) =>
      fcdsSemesterForTemporaryCode(String(index + 1)),
    );

    expect(semesters).toEqual([
      ...Array(6).fill(1),
      ...Array(6).fill(2),
      ...Array(5).fill(3),
      ...Array(5).fill(4),
      ...Array(3).fill(5),
      ...Array(3).fill(6),
      ...Array(4).fill(7),
      ...Array(4).fill(8),
    ]);
  });

  it("does not assign semesters to non-temporary course codes", () => {
    expect(fcdsSemesterForTemporaryCode("CS101")).toBeNull();
    expect(fcdsSemesterForTemporaryCode("0")).toBeNull();
    expect(fcdsSemesterForTemporaryCode("37")).toBeNull();
  });
});

// Older course rows predate the specialization field.
it("keeps existing courses in the default specialization and preserves assigned tracks", () => {
  expect(normalizeFcdsSpecialization(undefined)).toBe(defaultFcdsSpecialization);
  expect(normalizeFcdsSpecialization(null)).toBe(defaultFcdsSpecialization);
  expect(normalizeFcdsSpecialization("ai")).toBe("ai");
  expect(normalizeFcdsSpecialization("cyber-security")).toBe("cyber-security");
  expect(normalizeFcdsSpecialization("healthcare")).toBe("healthcare");
});
