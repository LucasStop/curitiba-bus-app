-- Com "Automatically expose new tables" desligado, service_role tambem nao recebe grant
-- automatico. A Edge Function urbs-vehicles le last_attempt_at para o throttle; a escrita
-- continua so pelas funcoes security definer.
grant select on table public.bus_feed_status to service_role;
