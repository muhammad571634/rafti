-- 0z136: setting up an alarm or a plan with a friend costs shells (src/economy/setup-cost.ts), booked
-- under its own reason 'setup' so History names it. Only the allowed reasons change.
alter table public.shell_ledger drop constraint if exists shell_ledger_reason_check;
alter table public.shell_ledger add constraint shell_ledger_reason_check check (reason in (
  'welcome', 'daily', 'expired', 'ad', 'spin', 'purchase', 'chat', 'voice', 'photo', 'note', 'board',
  'invite', 'share', 'date', 'photoBooth', 'voiceClone', 'portrait', 'stream', 'trial', 'membership',
  'call', 'topUp', 'plan', 'radio', 'quest', 'other', 'setup'
));
