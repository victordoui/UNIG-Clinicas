-- The public wrapper runs as the caller and therefore needs permission to
-- invoke this single implementation in the non-exposed private schema.
-- The function validates the clinic QR, open session, capacity, consent,
-- input data, duplicate active tickets, and a per-contact rate limit.
grant execute on function private.join_queue_as_guest(
  uuid, text, text, date, text, boolean, text
) to anon, authenticated;
