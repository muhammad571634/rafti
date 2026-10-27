-- Indexes for the foreign keys the database advisors found uncovered (unindexed_foreign_keys).
--
-- Without them, deleting an account scans every message and, once per deleted ledger row, every
-- minute pack; deleting a character (user-made ones will be deletable) scans every relationship,
-- conversation and the whole ledger. The ledger is the biggest table and most of its rows name no
-- character, so its index skips those.

create index messages_user_idx on public.messages (user_id);
create index minute_packs_user_idx on public.minute_packs (user_id);
create index minute_packs_ledger_idx on public.minute_packs (ledger_id);
create index conversations_character_idx on public.conversations (character_id);
create index relationships_character_idx on public.relationships (character_id);
create index shell_ledger_character_idx on public.shell_ledger (character_id) where character_id is not null;
