import { supabase, supabaseConfigured } from "./supabaseClient";

/* ---------------------------------------------------------------------
   Session storage — a lightweight opaque token (returned by login_company /
   login_employee) stands in for a real auth session, since this app
   authenticates with per-role username/password against our own tables
   rather than Supabase Auth. Persisted so a page refresh doesn't log the
   user out.
------------------------------------------------------------------- */
const SESSION_KEY = "avance_session_v1";

export function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function persistSession(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    /* ignore */
  }
}

/* ---------------------------------------------------------------------
   Row → camelCase mappers (Postgres returns snake_case columns)
------------------------------------------------------------------- */
const num = (v) => (v === null || v === undefined ? 0 : Number(v));
const ts = (v) => (v ? new Date(v).getTime() : null);

function mapCompany(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, username: row.username };
}
function mapEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    cedula: row.cedula,
    username: row.username,
    monthlySalary: num(row.monthly_salary),
  };
}
function mapAdvance(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    amount: num(row.amount),
    fee: num(row.fee),
    cuotas: row.cuotas,
    cuotasPagadas: row.cuotas_pagadas || 0,
    status: row.status,
    cuentaBanco: row.cuenta_banco || "",
    comprobante: row.comprobante_url || null,
    requestedAt: ts(row.requested_at),
  };
}
function mapPayrollRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    nombre: row.nombre || "",
    apellidos: row.apellidos || "",
    cedula: row.cedula || "",
    departamento: row.departamento || "",
    cargo: row.cargo || "",
    salarioNeto: num(row.salario_neto),
    estado: row.estado || "activo",
    extra: row.extra || {},
    updatedAt: ts(row.updated_at),
  };
}
function mapPayrollImport(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    fileName: row.file_name,
    importedAt: ts(row.imported_at),
    rowCount: row.row_count,
    nuevos: row.nuevos,
    actualizados: row.actualizados,
    omitidos: row.omitidos,
    cuentasCreadas: row.cuentas_creadas,
  };
}

function mapDashboard(data) {
  return {
    employees: (data.employees || []).map(mapEmployee),
    advances: (data.advances || []).map(mapAdvance),
    payrollRecords: (data.payrollRecords || []).map(mapPayrollRecord),
    payrollImports: (data.payrollImports || []).map(mapPayrollImport),
  };
}

function requireClient() {
  if (!supabaseConfigured || !supabase) {
    throw new Error(
      "Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env y reinicia el servidor."
    );
  }
  return supabase;
}

async function rpc(fn, args) {
  const client = requireClient();
  const { data, error } = await client.rpc(fn, args);
  if (error) throw error;
  return data;
}

/* ---------------------------------------------------------------------
   Auth
------------------------------------------------------------------- */
export async function loginCompany(username, password) {
  const rows = await rpc("login_company", { p_username: username, p_password: password });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;
  return { token: row.token, type: "company", data: { id: row.id, name: row.name, username: row.username } };
}

export async function loginEmployee(username, password) {
  const rows = await rpc("login_employee", { p_username: username, p_password: password });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;
  return {
    token: row.token,
    type: "employee",
    data: {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      username: row.username,
      monthlySalary: num(row.monthly_salary),
    },
  };
}

export async function registerCompany(name, username, password) {
  const rows = await rpc("register_company", { p_name: name, p_username: username, p_password: password });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) return null;
  return { token: row.token, type: "company", data: { id: row.id, name: row.name, username: row.username } };
}

export async function logout(token) {
  try {
    await rpc("logout", { p_token: token });
  } catch (e) {
    /* session already gone — fine */
  }
}

/* ---------------------------------------------------------------------
   Employee
------------------------------------------------------------------- */
export async function getEmployeeAdvances(token) {
  const rows = await rpc("get_employee_advances", { p_token: token });
  return (rows || []).map(mapAdvance);
}

export async function requestAdvance(token, amount, fee, cuotas, cuentaBanco) {
  const rows = await rpc("request_advance", {
    p_token: token, p_amount: amount, p_fee: fee, p_cuotas: cuotas, p_cuenta_banco: cuentaBanco || null,
  });
  return (rows || []).map(mapAdvance);
}

/* ---------------------------------------------------------------------
   Company
------------------------------------------------------------------- */
export async function getCompanyDashboard(token) {
  const data = await rpc("get_company_dashboard", { p_token: token });
  return mapDashboard(data);
}

export async function addEmployee(token, name, cedula, salary) {
  const data = await rpc("add_employee", { p_token: token, p_name: name, p_cedula: cedula, p_salary: salary });
  return mapDashboard(data);
}

export async function markAdvanceTransferred(token, advanceId) {
  const data = await rpc("mark_advance_transferred", { p_token: token, p_advance_id: advanceId });
  return mapDashboard(data);
}

export async function markAdvanceRecovered(token, advanceId) {
  const data = await rpc("mark_advance_recovered", { p_token: token, p_advance_id: advanceId });
  return mapDashboard(data);
}

export async function markCuotaPagada(token, advanceId) {
  const data = await rpc("mark_cuota_pagada", { p_token: token, p_advance_id: advanceId });
  return mapDashboard(data);
}

export async function setAdvanceComprobante(token, advanceId, dataUrl) {
  const data = await rpc("set_advance_comprobante", { p_token: token, p_advance_id: advanceId, p_comprobante_url: dataUrl });
  return mapDashboard(data);
}

export async function importPayroll(token, fileName, rows) {
  const data = await rpc("import_payroll", { p_token: token, p_file_name: fileName, p_rows: rows });
  const { summary, ...dashboardRaw } = data;
  return { dashboard: mapDashboard(dashboardRaw), summary };
}

export async function createAccountsForPayroll(token) {
  const data = await rpc("create_accounts_for_payroll", { p_token: token });
  const { summary, ...dashboardRaw } = data;
  return { dashboard: mapDashboard(dashboardRaw), summary };
}

export async function deletePayrollRecord(token, recordId) {
  const data = await rpc("delete_payroll_record", { p_token: token, p_record_id: recordId });
  return mapDashboard(data);
}

export async function deletePayrollImport(token, importId) {
  const data = await rpc("delete_payroll_import", { p_token: token, p_import_id: importId });
  return mapDashboard(data);
}

export async function resetCompanyPayroll(token) {
  const data = await rpc("reset_company_payroll", { p_token: token });
  return mapDashboard(data);
}

/* ---------------------------------------------------------------------
   Public — marketing site lead form
------------------------------------------------------------------- */
export async function saveLead(form) {
  await rpc("save_lead", {
    p_nombre: form.nombre || null,
    p_empresa: form.empresa || null,
    p_email: form.email || null,
    p_telefono: form.telefono || null,
    p_tamano: form.tamano || null,
    p_mensaje: form.mensaje || null,
  });
}
