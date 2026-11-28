do $$
begin
  if not exists (select 1 from cron.job where jobname='zore-build-monitor') then
    perform cron.schedule(
      'zore-build-monitor',
      '* * * * *',
      $job$
        select net.http_post(
          url := 'https://qbeeohgmqoublysswagq.supabase.co/functions/v1/office-build-monitor',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'x-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='office_worker_secret')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 120000
        );
      $job$
    );
  end if;
end $$;