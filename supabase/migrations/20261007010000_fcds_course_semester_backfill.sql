-- Fill semester and year for the 36 temporary course codes in the 2019
-- Computing and Data Sciences required study plan. The temporary numbers are
-- assigned in the same order as the plan; elective placeholders and summer
-- training are not part of these 36 courses.
begin;

with normalized_courses as (
  select
    id,
    case
      when trim(code::text) ~ '^[0-9]{1,2}$' then trim(code::text)::integer
    end as temporary_code,
    semester
  from public.fcds_courses
),
numbered_courses as (
  select
    id,
    case
      when temporary_code between 1 and 6 then 1
      when temporary_code between 7 and 12 then 2
      when temporary_code between 13 and 17 then 3
      when temporary_code between 18 and 22 then 4
      when temporary_code between 23 and 25 then 5
      when temporary_code between 26 and 28 then 6
      when temporary_code between 29 and 32 then 7
      when temporary_code between 33 and 36 then 8
    end as semester
  from normalized_courses
  where temporary_code between 1 and 36
    and semester is null
)
update public.fcds_courses as courses
set
  semester = numbered_courses.semester,
  year = case
    when numbered_courses.semester in (1, 2) then 'السنة الأولى'
    when numbered_courses.semester in (3, 4) then 'السنة الثانية'
    when numbered_courses.semester in (5, 6) then 'السنة الثالثة'
    else 'السنة الرابعة'
  end
from numbered_courses
where courses.id = numbered_courses.id;

commit;
