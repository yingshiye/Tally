-- Library blocks get a free-text type label ("Work experience", "Project",
-- "Clinical rotation", …). The layout (entry/education/skills) still decides
-- structure; the label is what users group and filter by. Additive and
-- nullable so code deployed before this migration keeps working.

alter table resume_library_blocks
  add column type_label text
  check (type_label is null or char_length(btrim(type_label)) between 1 and 40);

-- Backfill: every existing block gets a label derived from its layout.
-- Users re-categorize individual blocks (e.g. Project, Leadership) afterwards.
update resume_library_blocks
set type_label = case layout_kind
  when 'entry' then 'Work experience'
  when 'education' then 'Education'
  when 'skills' then 'Skills'
end
where type_label is null;
