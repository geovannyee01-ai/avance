-- ============================================================================
-- AVANCE — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Design notes:
--   - Passwords are never stored or returned in plain text (pgcrypto + bcrypt).
--   - Row Level Security is enabled on every table with NO policies for the
--     anon/authenticated roles, so the REST API cannot read/write any table
--     directly (not even with the anon key). ALL access goes through the
--     RPC functions below, which run as SECURITY DEFINER and enforce their
--     own authorization using a lightweight session-token scheme (this app
--     logs in with per-role username/password against these tables, not
--     Supabase Auth).
--   - This keeps cédulas, salaries, password hashes and proof-of-transfer
--     images from being directly queryable over the public API.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  cedula text not null,
  username text not null unique,
  password_hash text not null,
  monthly_salary numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists employees_company_id_idx on employees(company_id);
create index if not exists employees_cedula_idx on employees(company_id, cedula);

create table if not exists advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  amount numeric(12,2) not null,
  fee numeric(12,2) not null,
  cuotas int not null,
  cuotas_pagadas int not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'transferido', 'recuperado')),
  cuenta_banco text,
  comprobante_url text,
  requested_at timestamptz not null default now()
);
create index if not exists advances_employee_id_idx on advances(employee_id);

create table if not exists payroll_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  nombre text,
  apellidos text,
  cedula text,
  departamento text,
  cargo text,
  salario_neto numeric(12,2) default 0,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists payroll_records_company_id_idx on payroll_records(company_id);
create index if not exists payroll_records_cedula_idx on payroll_records(company_id, cedula);

create table if not exists payroll_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  file_name text,
  row_count int not null default 0,
  nuevos int not null default 0,
  actualizados int not null default 0,
  omitidos int not null default 0,
  cuentas_creadas int not null default 0,
  imported_at timestamptz not null default now()
);
create index if not exists payroll_imports_company_id_idx on payroll_imports(company_id);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  empresa text,
  email text,
  telefono text,
  tamano text,
  mensaje text,
  created_at timestamptz not null default now()
);

-- Lightweight session tokens (replaces Supabase Auth — logins are by
-- username/password against the tables above, not email/magic-link).
create table if not exists sessions (
  token uuid primary key default gen_random_uuid(),
  role text not null check (role in ('company', 'employee')),
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — deny-all by default, access only via RPC below.
-- ---------------------------------------------------------------------------
alter table companies enable row level security;
alter table employees enable row level security;
alter table advances enable row level security;
alter table payroll_records enable row level security;
alter table payroll_imports enable row level security;
alter table leads enable row level security;
alter table sessions enable row level security;
-- (No policies are created, so anon/authenticated get zero direct access.)

-- ---------------------------------------------------------------------------
-- SEED DATA — matches the previous window.storage demo default (RENT SRL).
-- Change the password right after your first login if this is a real deploy.
-- ---------------------------------------------------------------------------
insert into companies (id, name, username, password_hash)
values ('11111111-1111-1111-1111-111111111111', 'RENT SRL', 'rentSRL', crypt('1234', gen_salt('bf')))
on conflict (username) do nothing;

-- ---------------------------------------------------------------------------
-- INTERNAL HELPER — validates a session token, returns the subject id.
-- ---------------------------------------------------------------------------
create or replace function _session_subject(p_token uuid, p_role text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_subject uuid;
begin
  delete from sessions where expires_at < now();
  select subject_id into v_subject from sessions
  where token = p_token and role = p_role and expires_at > now();
  return v_subject;
end;
$$;

-- Builds the full company dashboard payload — shared by every company RPC
-- that mutates data, so the client always gets a fresh, consistent snapshot.
create or replace function _company_dashboard(p_company uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_employees jsonb; v_advances jsonb; v_records jsonb; v_imports jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(e) - 'password_hash' order by e.name), '[]'::jsonb)
    into v_employees from employees e where e.company_id = p_company;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.requested_at desc), '[]'::jsonb)
    into v_advances from advances a join employees e on e.id = a.employee_id where e.company_id = p_company;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.updated_at desc), '[]'::jsonb)
    into v_records from payroll_records r where r.company_id = p_company;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.imported_at desc), '[]'::jsonb)
    into v_imports from payroll_imports i where i.company_id = p_company;

  return jsonb_build_object('employees', v_employees, 'advances', v_advances, 'payrollRecords', v_records, 'payrollImports', v_imports);
end;
$$;

-- ---------------------------------------------------------------------------
-- AUTH
-- ---------------------------------------------------------------------------
create or replace function login_company(p_username text, p_password text)
returns table (token uuid, id uuid, name text, username text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_row companies%rowtype;
begin
  select * into v_row from companies c where c.username = trim(p_username);
  if v_row.id is null or v_row.password_hash <> crypt(p_password, v_row.password_hash) then
    return;
  end if;
  return query
    insert into sessions (role, subject_id) values ('company', v_row.id)
    returning sessions.token, v_row.id, v_row.name, v_row.username;
end;
$$;

create or replace function login_employee(p_username text, p_password text)
returns table (token uuid, id uuid, company_id uuid, name text, username text, monthly_salary numeric)
language plpgsql security definer set search_path = public, extensions as $$
declare v_row employees%rowtype;
begin
  select * into v_row from employees e where e.username = trim(p_username);
  if v_row.id is null or v_row.password_hash <> crypt(p_password, v_row.password_hash) then
    return;
  end if;
  return query
    insert into sessions (role, subject_id) values ('employee', v_row.id)
    returning sessions.token, v_row.id, v_row.company_id, v_row.name, v_row.username, v_row.monthly_salary;
end;
$$;

-- Not currently reachable from the UI (single-company tool today), kept so
-- a future multi-company mode doesn't need a schema change.
create or replace function register_company(p_name text, p_username text, p_password text)
returns table (token uuid, id uuid, name text, username text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if p_name is null or trim(p_name) = '' or p_username is null or trim(p_username) = '' or p_password is null or p_password = '' then
    raise exception 'missing_fields';
  end if;
  if exists (select 1 from companies c where c.username = trim(p_username)) then
    raise exception 'username_taken';
  end if;
  insert into companies (name, username, password_hash)
  values (trim(p_name), trim(p_username), crypt(p_password, gen_salt('bf')))
  returning companies.id into v_id;
  return query
    insert into sessions (role, subject_id) values ('company', v_id)
    returning sessions.token, v_id, trim(p_name), trim(p_username);
end;
$$;

create or replace function logout(p_token uuid)
returns void
language sql security definer set search_path = public, extensions as $$
  delete from sessions where token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- EMPLOYEE
-- ---------------------------------------------------------------------------
create or replace function get_employee_advances(p_token uuid)
returns setof advances
language plpgsql security definer set search_path = public, extensions as $$
declare v_emp uuid;
begin
  v_emp := _session_subject(p_token, 'employee');
  if v_emp is null then raise exception 'invalid_session'; end if;
  return query select * from advances where employee_id = v_emp order by requested_at desc;
end;
$$;

create or replace function request_advance(p_token uuid, p_amount numeric, p_fee numeric, p_cuotas int, p_cuenta_banco text)
returns setof advances
language plpgsql security definer set search_path = public, extensions as $$
declare v_emp uuid;
begin
  v_emp := _session_subject(p_token, 'employee');
  if v_emp is null then raise exception 'invalid_session'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  insert into advances (employee_id, amount, fee, cuotas, status, cuenta_banco)
  values (v_emp, p_amount, p_fee, p_cuotas, 'pendiente', p_cuenta_banco);
  return query select * from advances where employee_id = v_emp order by requested_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- COMPANY — dashboard + employee management
-- ---------------------------------------------------------------------------
create or replace function get_company_dashboard(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  return _company_dashboard(v_company);
end;
$$;

create or replace function add_employee(p_token uuid, p_name text, p_cedula text, p_salary numeric)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  if p_name is null or trim(p_name) = '' or p_cedula is null or trim(p_cedula) = '' then
    raise exception 'missing_fields';
  end if;
  if exists (select 1 from employees e where e.username = trim(p_cedula)) then
    raise exception 'cedula_taken';
  end if;
  insert into employees (company_id, name, cedula, username, password_hash, monthly_salary)
  values (v_company, trim(p_name), trim(p_cedula), trim(p_cedula), crypt('1234', gen_salt('bf')), coalesce(p_salary, 0));
  return _company_dashboard(v_company);
end;
$$;

-- ---------------------------------------------------------------------------
-- COMPANY — advance lifecycle (pendiente → transferido → recuperado)
-- ---------------------------------------------------------------------------
create or replace function mark_advance_transferred(p_token uuid, p_advance_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  update advances a set status = 'transferido'
  from employees e where a.id = p_advance_id and a.employee_id = e.id and e.company_id = v_company;
  return _company_dashboard(v_company);
end;
$$;

create or replace function mark_advance_recovered(p_token uuid, p_advance_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  update advances a set status = 'recuperado'
  from employees e where a.id = p_advance_id and a.employee_id = e.id and e.company_id = v_company;
  return _company_dashboard(v_company);
end;
$$;

create or replace function mark_cuota_pagada(p_token uuid, p_advance_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid; v_cuotas_pagadas int; v_cuotas int;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;

  select a.cuotas_pagadas + 1, a.cuotas into v_cuotas_pagadas, v_cuotas
    from advances a join employees e on e.id = a.employee_id
    where a.id = p_advance_id and e.company_id = v_company;
  if v_cuotas is null then raise exception 'not_found'; end if;

  update advances set
    cuotas_pagadas = v_cuotas_pagadas,
    status = case when v_cuotas_pagadas >= v_cuotas then 'recuperado' else 'transferido' end
  where id = p_advance_id;

  return _company_dashboard(v_company);
end;
$$;

create or replace function set_advance_comprobante(p_token uuid, p_advance_id uuid, p_comprobante_url text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  update advances a set comprobante_url = p_comprobante_url
  from employees e where a.id = p_advance_id and a.employee_id = e.id and e.company_id = v_company;
  return _company_dashboard(v_company);
end;
$$;

-- ---------------------------------------------------------------------------
-- COMPANY — nómina (payroll import / accounts / reset)
-- p_rows is a JSON array of already-mapped rows:
--   { nombre, apellidos, cedula, departamento, cargo, salarioNeto, estado, extra }
-- (column-alias resolution, header-row detection, etc. all stay client-side —
-- this function only does the upsert, exactly like the old importPayrollRows.)
-- ---------------------------------------------------------------------------
create or replace function import_payroll(p_token uuid, p_file_name text, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_company uuid; v_row jsonb; v_cedula text; v_nombre text;
  v_record_id uuid; v_emp_id uuid; v_full_name text; v_salario numeric; v_monthly numeric;
  v_nuevos int := 0; v_actualizados int := 0; v_omitidos int := 0; v_cuentas int := 0;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_cedula := nullif(trim(v_row->>'cedula'), '');
    v_nombre := nullif(trim(v_row->>'nombre'), '');

    if v_cedula is null and v_nombre is null then
      v_omitidos := v_omitidos + 1;
      continue;
    end if;

    v_salario := coalesce((v_row->>'salarioNeto')::numeric, 0);

    if v_cedula is not null then
      select id into v_record_id from payroll_records where company_id = v_company and cedula = v_cedula;
    else
      v_record_id := null;
    end if;

    if v_record_id is not null then
      update payroll_records set
        nombre = v_row->>'nombre', apellidos = v_row->>'apellidos', departamento = v_row->>'departamento',
        cargo = v_row->>'cargo', salario_neto = v_salario,
        estado = coalesce(nullif(v_row->>'estado', ''), 'activo'),
        extra = coalesce(v_row->'extra', '{}'::jsonb), updated_at = now()
      where id = v_record_id;
      v_actualizados := v_actualizados + 1;
    else
      insert into payroll_records (company_id, nombre, apellidos, cedula, departamento, cargo, salario_neto, estado, extra)
      values (v_company, v_row->>'nombre', v_row->>'apellidos', v_cedula, v_row->>'departamento', v_row->>'cargo',
              v_salario, coalesce(nullif(v_row->>'estado', ''), 'activo'), coalesce(v_row->'extra', '{}'::jsonb));
      v_nuevos := v_nuevos + 1;
    end if;

    if v_cedula is not null then
      v_full_name := trim(coalesce(v_row->>'nombre', '') || ' ' || coalesce(v_row->>'apellidos', ''));
      v_monthly := v_salario * 2;
      select id into v_emp_id from employees where company_id = v_company and cedula = v_cedula;
      if v_emp_id is not null then
        update employees set
          name = case when v_full_name <> '' then v_full_name else name end,
          monthly_salary = case when v_monthly > 0 then v_monthly else monthly_salary end
        where id = v_emp_id;
      else
        begin
          insert into employees (company_id, name, cedula, username, password_hash, monthly_salary)
          values (v_company, coalesce(nullif(v_full_name, ''), v_cedula), v_cedula, v_cedula, crypt('1234', gen_salt('bf')), v_monthly);
          v_cuentas := v_cuentas + 1;
        exception when unique_violation then
          null; -- username (cédula) already used by an employee in another company — skip account creation
        end;
      end if;
    end if;
  end loop;

  insert into payroll_imports (company_id, file_name, row_count, nuevos, actualizados, omitidos, cuentas_creadas)
  values (v_company, p_file_name, jsonb_array_length(p_rows), v_nuevos, v_actualizados, v_omitidos, v_cuentas);

  return _company_dashboard(v_company) || jsonb_build_object(
    'summary', jsonb_build_object('nuevos', v_nuevos, 'actualizados', v_actualizados, 'omitidos', v_omitidos, 'cuentasCreadas', v_cuentas)
  );
end;
$$;

create or replace function create_accounts_for_payroll(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_company uuid; v_rec record; v_emp_id uuid; v_full_name text; v_monthly numeric;
  v_creadas int := 0; v_actualizadas int := 0; v_sin_cedula int := 0;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;

  for v_rec in select * from payroll_records where company_id = v_company
  loop
    if v_rec.cedula is null or trim(v_rec.cedula) = '' then
      v_sin_cedula := v_sin_cedula + 1;
      continue;
    end if;
    v_full_name := trim(coalesce(v_rec.nombre, '') || ' ' || coalesce(v_rec.apellidos, ''));
    v_monthly := coalesce(v_rec.salario_neto, 0) * 2;
    select id into v_emp_id from employees where company_id = v_company and cedula = v_rec.cedula;
    if v_emp_id is not null then
      update employees set
        name = case when v_full_name <> '' then v_full_name else name end,
        monthly_salary = case when v_monthly > 0 then v_monthly else monthly_salary end
      where id = v_emp_id;
      v_actualizadas := v_actualizadas + 1;
    else
      begin
        insert into employees (company_id, name, cedula, username, password_hash, monthly_salary)
        values (v_company, coalesce(nullif(v_full_name, ''), v_rec.cedula), v_rec.cedula, v_rec.cedula, crypt('1234', gen_salt('bf')), v_monthly);
        v_creadas := v_creadas + 1;
      exception when unique_violation then
        null;
      end;
    end if;
  end loop;

  return _company_dashboard(v_company) || jsonb_build_object(
    'summary', jsonb_build_object('creadas', v_creadas, 'actualizadas', v_actualizadas, 'sinCedula', v_sin_cedula)
  );
end;
$$;

create or replace function delete_payroll_record(p_token uuid, p_record_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid; v_cedula text;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;

  select cedula into v_cedula from payroll_records where id = p_record_id and company_id = v_company;
  delete from payroll_records where id = p_record_id and company_id = v_company;
  if v_cedula is not null then
    delete from employees where company_id = v_company and cedula = v_cedula;
  end if;
  return _company_dashboard(v_company);
end;
$$;

create or replace function delete_payroll_import(p_token uuid, p_import_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  delete from payroll_imports where id = p_import_id and company_id = v_company;
  return _company_dashboard(v_company);
end;
$$;

create or replace function reset_company_payroll(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_company uuid;
begin
  v_company := _session_subject(p_token, 'company');
  if v_company is null then raise exception 'invalid_session'; end if;
  delete from payroll_records where company_id = v_company;
  delete from payroll_imports where company_id = v_company;
  delete from employees where company_id = v_company; -- cascades their advances
  return _company_dashboard(v_company);
end;
$$;

-- ---------------------------------------------------------------------------
-- PUBLIC (no auth) — marketing site "solicitar propuesta" form
-- ---------------------------------------------------------------------------
create or replace function save_lead(p_nombre text, p_empresa text, p_email text, p_telefono text, p_tamano text, p_mensaje text)
returns void
language sql security definer set search_path = public, extensions as $$
  insert into leads (nombre, empresa, email, telefono, tamano, mensaje)
  values (p_nombre, p_empresa, p_email, p_telefono, p_tamano, p_mensaje);
$$;

-- ---------------------------------------------------------------------------
-- GRANTS — anon only gets EXECUTE on the RPCs above, nothing on the tables.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant execute on function
  login_company(text, text), login_employee(text, text), register_company(text, text, text), logout(uuid),
  get_employee_advances(uuid), request_advance(uuid, numeric, numeric, int, text),
  get_company_dashboard(uuid), add_employee(uuid, text, text, numeric),
  mark_advance_transferred(uuid, uuid), mark_advance_recovered(uuid, uuid), mark_cuota_pagada(uuid, uuid),
  set_advance_comprobante(uuid, uuid, text),
  import_payroll(uuid, text, jsonb), create_accounts_for_payroll(uuid),
  delete_payroll_record(uuid, uuid), delete_payroll_import(uuid, uuid), reset_company_payroll(uuid),
  save_lead(text, text, text, text, text, text)
to anon, authenticated;
