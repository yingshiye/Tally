-- Library block type presets live in code, so hiding one needs a per-user
-- tombstone row. Reuse user_field_options with a new field name.
alter table user_field_options
  drop constraint user_field_options_field_check;

alter table user_field_options
  add constraint user_field_options_field_check
  check (field in ('role', 'location', 'block_type'));
