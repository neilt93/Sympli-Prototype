  -- ============================================
  -- Sympli Health – Supabase schema (GDPR + RLS)
  -- Paste into Supabase SQL editor and run
  -- ============================================

  -- Extensions (usually present in Supabase)
  create extension if not exists pgcrypto with schema public;

  -- =========================
  -- TABLES (create or patch)
  -- =========================

  -- USERS (id must equal auth.users.id for clean RLS)
  create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
    email varchar(255) unique not null,
    password_hash varchar(255),
    password_salt varchar(255),
    google_id varchar(255),
    full_name varchar(255),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    last_login timestamptz,
    is_active boolean default true,
    profile jsonb default '{}'::jsonb,
    onboarding_complete boolean default false,
    email_confirmed boolean default false,
    -- GDPR
    gdpr_consent_given_at timestamptz,
    gdpr_consent_version varchar(10),
    gdpr_consent_ip_address inet,
    gdpr_consent_user_agent text,
    data_retention_until timestamptz,
    data_processing_purpose text[] default array['health_tracking','symptom_analysis'],
    data_export_requested_at timestamptz,
    data_deletion_requested_at timestamptz,
    data_deletion_completed_at timestamptz,
    data_anonymized_at timestamptz,
    -- used by anonymization flow
    is_anonymized boolean default false,
    anonymized_at timestamptz
  );

  -- =========================
  -- AUTH SYNC TRIGGERS
  -- =========================

  -- Function to handle user creation in auth.users
  create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public
  as $$
  begin
    -- Check if user already exists in public.users (shouldn't happen, but handle gracefully)
    if exists (select 1 from public.users where email = new.email) then
      -- Update existing user with auth user ID if it doesn't have one
      update public.users set
        id = new.id,
        updated_at = new.updated_at
      where email = new.email and id is null;
    else
      -- Create new user in public.users
      insert into public.users (id, email, created_at, updated_at)
      values (
        new.id,
        new.email,
        new.created_at,
        new.updated_at
      );
    end if;
    return new;
  end;
  $$;

  -- Function to handle user updates in auth.users
  create or replace function public.handle_user_update()
  returns trigger language plpgsql security definer set search_path = public
  as $$
  begin
    -- Update user in public.users if it exists
    update public.users set
      email = new.email,
      updated_at = new.updated_at
    where id = new.id;
    
    -- If no rows were updated, the user might not exist in public.users
    -- This could happen if the trigger failed during creation
    if not found then
      insert into public.users (id, email, created_at, updated_at)
      values (
        new.id,
        new.email,
        new.created_at,
        new.updated_at
      );
    end if;
    
    return new;
  end;
  $$;

  -- Function to handle user deletion in auth.users
  create or replace function public.handle_user_deletion()
  returns trigger language plpgsql security definer set search_path = public
  as $$
  begin
    -- Soft delete from public.users instead of hard delete
    update public.users set
      is_active = false,
      updated_at = now()
    where id = old.id;
    
    return old;
  end;
  $$;

  -- Create triggers for auth.users synchronization
  drop trigger if exists on_auth_user_created on auth.users;
  drop trigger if exists on_auth_user_updated on auth.users;
  drop trigger if exists on_auth_user_deleted on auth.users;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

  create trigger on_auth_user_updated
    after update on auth.users
    for each row execute function public.handle_user_update();

  create trigger on_auth_user_deleted
    after delete on auth.users
    for each row execute function public.handle_user_deletion();

  -- =========================
  -- MANUAL SYNC FUNCTION
  -- =========================

  -- Function to manually sync existing users
  create or replace function public.sync_existing_users()
  returns void language plpgsql security definer set search_path = public
  as $$
  declare
    auth_user record;
  begin
    for auth_user in select * from auth.users
    loop
      insert into public.users (id, email, created_at, updated_at)
      values (
        auth_user.id,
        auth_user.email,
        auth_user.created_at,
        auth_user.updated_at
      )
      on conflict (id) do update set
        email = excluded.email,
        updated_at = excluded.updated_at;
    end loop;
  end;
  $$;

  -- CONSENT RECORDS
  create table if not exists public.consent_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    consent_type varchar(100) not null,      -- 'gdpr','health_data','research','marketing'
    consent_version varchar(10) not null,
    consent_given boolean not null,
    consent_given_at timestamptz default now(),
    consent_withdrawn_at timestamptz,
    consent_ip_address inet,
    consent_user_agent text,
    consent_method varchar(50),              -- 'web_form','api','email'
    consent_details jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- DATA RETENTION POLICIES
  create table if not exists public.data_retention_policies (
    id uuid primary key default gen_random_uuid(),
    data_type varchar(100) not null,         -- 'symptom_logs','onboarding_data','audit_logs'
    retention_period_days integer not null,
    retention_reason text not null,
    legal_basis varchar(100) not null,       -- 'consent','legitimate_interest','legal_obligation'
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- SYMPTOM LOGS
  create table if not exists public.symptom_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    symptom_data jsonb not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- GDPR
    data_retention_until timestamptz,
    data_processing_purpose text[] default array['health_tracking'],
    is_anonymized boolean default false,
    anonymized_at timestamptz
  );

  -- ONBOARDING DATA
  create table if not exists public.onboarding_data (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    personal_information jsonb,
    user_role varchar(50),
    medical_information jsonb,
    caregiver_consent jsonb,
    required_consents jsonb,
    is_complete boolean default false,
    completed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- GDPR
    data_retention_until timestamptz,
    data_processing_purpose text[] default array['onboarding','health_tracking'],
    is_anonymized boolean default false,
    anonymized_at timestamptz
  );

  -- AUDIT LOGS
  create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    action varchar(100) not null,
    details text,
    ip_address inet,
    user_agent text,
    created_at timestamptz default now(),
    -- GDPR
    data_retention_until timestamptz,
    legal_basis varchar(100) default 'legitimate_interest',
    is_anonymized boolean default false,
    anonymized_at timestamptz
  );

  -- DATA SUBJECT REQUESTS
  create table if not exists public.data_subject_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    request_type varchar(50) not null,       -- 'access','rectification','erasure','portability','restriction'
    request_status varchar(50) default 'pending', -- 'pending','processing','completed','rejected'
    request_details jsonb,
    requested_at timestamptz default now(),
    completed_at timestamptz,
    response_data jsonb,                     -- for access/portability
    rejection_reason text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  -- ===============
  -- INDEXES
  -- ===============
  create index if not exists idx_users_email on public.users(email);
  create index if not exists idx_users_google_id on public.users(google_id);
  create index if not exists idx_users_gdpr_consent on public.users(gdpr_consent_given_at);
  create index if not exists idx_users_data_retention on public.users(data_retention_until);

  create index if not exists idx_symptom_logs_user_id on public.symptom_logs(user_id);
  create index if not exists idx_symptom_logs_created_at on public.symptom_logs(created_at desc);
  create index if not exists idx_symptom_logs_retention on public.symptom_logs(data_retention_until);

  create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
  create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

  create index if not exists idx_consent_records_user_id on public.consent_records(user_id);
  create index if not exists idx_consent_records_type on public.consent_records(consent_type);

  create index if not exists idx_data_subject_requests_user_id on public.data_subject_requests(user_id);
  create index if not exists idx_data_subject_requests_status on public.data_subject_requests(request_status);

  -- ==============================
  -- UPDATED_AT trigger + function
  -- ==============================
  create or replace function public.update_updated_at_column()
  returns trigger language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end
  $$;

  do $$
  begin
    if not exists (select 1 from pg_trigger where tgname='trg_users_updated_at') then
      create trigger trg_users_updated_at before update on public.users
        for each row execute function public.update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname='trg_symptom_logs_updated_at') then
      create trigger trg_symptom_logs_updated_at before update on public.symptom_logs
        for each row execute function public.update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname='trg_onboarding_data_updated_at') then
      create trigger trg_onboarding_data_updated_at before update on public.onboarding_data
        for each row execute function public.update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname='trg_consent_records_updated_at') then
      create trigger trg_consent_records_updated_at before update on public.consent_records
        for each row execute function public.update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname='trg_data_subject_requests_updated_at') then
      create trigger trg_data_subject_requests_updated_at before update on public.data_subject_requests
        for each row execute function public.update_updated_at_column();
    end if;
  end$$;

  -- ===========================
  -- GDPR helper functions
  -- ===========================
  create or replace function public.anonymize_user_data(user_uuid uuid)
  returns void language plpgsql as $$
  begin
    -- users
    update public.users set
      email = 'anonymized_' || id || '@deleted.com',
      full_name = 'Anonymized User',
      profile = coalesce(profile, '{}'::jsonb) || '{"anonymized": true}'::jsonb,
      is_anonymized = true,
      anonymized_at = now()
    where id = user_uuid;

    -- symptom_logs
    update public.symptom_logs set
      symptom_data = coalesce(symptom_data, '{}'::jsonb) || '{"anonymized": true}'::jsonb,
      is_anonymized = true,
      anonymized_at = now()
    where user_id = user_uuid;

    -- onboarding_data
    update public.onboarding_data set
      personal_information = coalesce(personal_information, '{}'::jsonb) || '{"anonymized": true}'::jsonb,
      medical_information  = coalesce(medical_information,  '{}'::jsonb) || '{"anonymized": true}'::jsonb,
      is_anonymized = true,
      anonymized_at = now()
    where user_id = user_uuid;

    -- audit_logs
    update public.audit_logs set
      ip_address = null,
      user_agent = 'Anonymized',
      is_anonymized = true,
      anonymized_at = now()
    where user_id = user_uuid;
  end
  $$;

  create or replace function public.cleanup_expired_data()
  returns void language plpgsql as $$
  begin
    delete from public.symptom_logs
    where data_retention_until is not null
      and data_retention_until < now();

    delete from public.onboarding_data
    where data_retention_until is not null
      and data_retention_until < now();

    delete from public.audit_logs
    where data_retention_until is not null
      and data_retention_until < now();

    update public.users set
      is_anonymized = true,
      anonymized_at = now()
    where data_deletion_requested_at is not null
      and data_deletion_requested_at < now() - interval '30 days'
      and data_deletion_completed_at is null;
  end
  $$;

  -- Optionally schedule via pg_cron (enable extension first in Supabase):
  -- select cron.schedule('cleanup-expired-data', '0 2 * * *', 'select public.cleanup_expired_data();');

  -- ===========================
  -- RLS: enable + FORCE RLS
  -- ===========================
  do $$
  declare t text;
  begin
    foreach t in array array['users','symptom_logs','onboarding_data','audit_logs','consent_records','data_retention_policies','data_subject_requests']
    loop
      execute format('alter table public.%I enable row level security;', t);
      execute format('alter table public.%I force row level security;', t);
    end loop;
  end$$;

  -- ====================================
  -- RLS POLICIES (row owner = auth.uid)
  -- ====================================

  -- USERS
  drop policy if exists "users_select_own" on public.users;
  drop policy if exists "users_insert_self" on public.users;
  drop policy if exists "users_update_own" on public.users;
  drop policy if exists "users_delete_own" on public.users;
  drop policy if exists "users_service_role" on public.users;

  create policy "users_select_own" on public.users
    for select using (id = auth.uid());

  create policy "users_insert_self" on public.users
    for insert with check (id = auth.uid());

  create policy "users_update_own" on public.users
    for update using (id = auth.uid()) with check (id = auth.uid());

  create policy "users_delete_own" on public.users
    for delete using (id = auth.uid());

  -- Service role policy to allow backend operations
  create policy "users_service_role" on public.users
    for all using (auth.role() = 'service_role');

  -- SYMPTOM_LOGS
  drop policy if exists "symptoms_select_own" on public.symptom_logs;
  drop policy if exists "symptoms_insert_own" on public.symptom_logs;
  drop policy if exists "symptoms_update_own" on public.symptom_logs;
  drop policy if exists "symptoms_delete_own" on public.symptom_logs;
  drop policy if exists "symptoms_service_role" on public.symptom_logs;

  create policy "symptoms_select_own" on public.symptom_logs
    for select using (user_id = auth.uid());

  create policy "symptoms_insert_own" on public.symptom_logs
    for insert with check (user_id = auth.uid());

  create policy "symptoms_update_own" on public.symptom_logs
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());

  create policy "symptoms_delete_own" on public.symptom_logs
    for delete using (user_id = auth.uid());

  -- Service role policy to allow backend operations
  create policy "symptoms_service_role" on public.symptom_logs
    for all using (auth.role() = 'service_role');

  -- ONBOARDING_DATA
  drop policy if exists "onboarding_select_own" on public.onboarding_data;
  drop policy if exists "onboarding_insert_own" on public.onboarding_data;
  drop policy if exists "onboarding_update_own" on public.onboarding_data;
  drop policy if exists "onboarding_delete_own" on public.onboarding_data;
  drop policy if exists "onboarding_service_role" on public.onboarding_data;

  create policy "onboarding_select_own" on public.onboarding_data
    for select using (user_id = auth.uid());

  create policy "onboarding_insert_own" on public.onboarding_data
    for insert with check (user_id = auth.uid());

  create policy "onboarding_update_own" on public.onboarding_data
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());

  create policy "onboarding_delete_own" on public.onboarding_data
    for delete using (user_id = auth.uid());

  -- Service role policy to allow backend operations
  create policy "onboarding_service_role" on public.onboarding_data
    for all using (auth.role() = 'service_role');

  -- AUDIT_LOGS (users can only see their own; keep writes server-side via service role)
  drop policy if exists "audit_select_own" on public.audit_logs;
  drop policy if exists "audit_service_role" on public.audit_logs;
  create policy "audit_select_own" on public.audit_logs
    for select using (user_id = auth.uid());

  -- Service role policy to allow backend operations
  create policy "audit_service_role" on public.audit_logs
    for all using (auth.role() = 'service_role');

  -- CONSENT_RECORDS (row owner)
  drop policy if exists "consent_select_own" on public.consent_records;
  drop policy if exists "consent_insert_own" on public.consent_records;
  drop policy if exists "consent_update_own" on public.consent_records;

  create policy "consent_select_own" on public.consent_records
    for select using (user_id = auth.uid());

  create policy "consent_insert_own" on public.consent_records
    for insert with check (user_id = auth.uid());

  create policy "consent_update_own" on public.consent_records
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());

  -- DATA_SUBJECT_REQUESTS (row owner)
  drop policy if exists "dsr_select_own" on public.data_subject_requests;
  drop policy if exists "dsr_insert_own" on public.data_subject_requests;
  drop policy if exists "dsr_update_own" on public.data_subject_requests;

  create policy "dsr_select_own" on public.data_subject_requests
    for select using (user_id = auth.uid());

  create policy "dsr_insert_own" on public.data_subject_requests
    for insert with check (user_id = auth.uid());

  create policy "dsr_update_own" on public.data_subject_requests
    for update using (user_id = auth.uid()) with check (user_id = auth.uid());

  -- DATA_RETENTION_POLICIES
  -- Typically read-only to clients; writes via service role.
  drop policy if exists "retention_select_all" on public.data_retention_policies;
  create policy "retention_select_all" on public.data_retention_policies
    for select using (true);

  -- =========================
  -- Seed default retention
  -- =========================
  insert into public.data_retention_policies (data_type, retention_period_days, retention_reason, legal_basis)
  values
  ('symptom_logs', 2555, 'Health data retention for medical purposes and legal compliance', 'legitimate_interest'),
  ('onboarding_data', 2555, 'Health data retention for medical purposes and legal compliance', 'legitimate_interest'),
  ('audit_logs', 2190, 'Legal compliance and security monitoring (6 years)', 'legal_obligation'),
  ('consent_records', 2555, 'Legal compliance for consent tracking', 'legal_obligation')
  on conflict do nothing;

  -- =========================
  -- UTILITY FUNCTIONS
  -- =========================

  -- Function to check user synchronization status
  create or replace function public.check_user_sync_status()
  returns table(
    auth_users_count bigint,
    public_users_count bigint,
    missing_in_public bigint,
    missing_in_auth bigint,
    orphaned_public bigint
  ) language plpgsql security definer set search_path = public
  as $$
  begin
    return query
    select 
      (select count(*) from auth.users) as auth_users_count,
      (select count(*) from public.users where is_active = true) as public_users_count,
      (select count(*) from auth.users a 
      where not exists (select 1 from public.users p where p.id = a.id)) as missing_in_public,
      (select count(*) from public.users p 
      where p.is_active = true and not exists (select 1 from auth.users a where a.id = p.id)) as missing_in_auth,
      (select count(*) from public.users p 
      where p.is_active = true and p.id is null) as orphaned_public;
  end;
  $$;
