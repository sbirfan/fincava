import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Pencil, X, Eye, EyeOff, Plus, Trash2, AlertTriangle, Download, Upload, CheckCircle, AlertCircle, SkipForward, FileText } from "lucide-react";

const roleBadge: Record<string, string> = {
  BUYER: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  SUPPLIER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  ADMIN: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  FIELD_OFFICER: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  EMPLOYEE: "bg-sky-500/15 text-sky-300 border-sky-500/20",
};

const VALID_ROLES = ["BUYER", "SUPPLIER", "ADMIN", "FIELD_OFFICER", "EMPLOYEE"];
const CSV_HEADERS = ["email", "password", "role", "firstName", "lastName", "phone", "country", "companyName"];
const TEMPLATE_CSV = [
  CSV_HEADERS.join(","),
  "buyer@example.com,Password123,BUYER,Maria,Garcia,+57300000001,Colombia,Finca El Sol",
  "supplier@example.com,Password123,SUPPLIER,Carlos,Lopez,+57300000002,Colombia,Cooperativa Verde",
].join("\n");

interface UserRow {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  companyName: string | null;
  companyVerified: boolean | null;
  phone?: string | null;
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  country: string;
  phone: string;
  companyName: string;
}

interface CreateForm {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  companyName: string;
}

interface ImportRow {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  companyName: string;
}

interface ImportResult {
  row: number;
  email: string;
  status: "created" | "skipped" | "error";
  message?: string;
}

function parseCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], errors: ["CSV must have a header row and at least one data row."] };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxOf = (col: string) => header.indexOf(col);
  const errors: string[] = [];

  const missingCols = ["email", "password", "role"].filter((c) => idxOf(c) === -1);
  if (missingCols.length) {
    errors.push(`Missing required columns: ${missingCols.join(", ")}`);
    return { rows: [], errors };
  }

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    const get = (col: string) => (idxOf(col) >= 0 ? cols[idxOf(col)] ?? "" : "");
    const role = get("role").toUpperCase();

    if (!get("email")) { errors.push(`Row ${i + 1}: email is required`); continue; }
    if (!get("password") || get("password").length < 8) { errors.push(`Row ${i + 1}: password must be at least 8 characters`); continue; }
    if (!VALID_ROLES.includes(role)) { errors.push(`Row ${i + 1}: invalid role "${get("role")}" — must be one of ${VALID_ROLES.join(", ")}`); continue; }

    rows.push({
      email: get("email"),
      password: get("password"),
      role,
      firstName: get("firstName"),
      lastName: get("lastName"),
      phone: get("phone"),
      country: get("country"),
      companyName: get("companyName"),
    });
  }
  return { rows, errors };
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fincava-user-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function TextField({
  label, value, onChange, type = "text", placeholder = "",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
      />
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">Role</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
      >
        {VALID_ROLES.map((r) => (
          <option key={r} value={r}>{r.replace("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}

function EditModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EditForm>({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
    role: user.role,
    country: user.country ?? "",
    phone: user.phone ?? "",
    companyName: user.companyName ?? "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          firstName: form.firstName,
          lastName: form.lastName,
          country: form.country || null,
          phone: form.phone || null,
          companyName: form.companyName || undefined,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed to save"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); onClose(); },
    onError: (e: Error) => setSaveError(e.message),
  });

  const resetPwMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed to reset password"); }
    },
    onSuccess: () => { setPwSuccess(true); setNewPassword(""); setPwError(null); },
    onError: (e: Error) => setPwError(e.message),
  });

  const set = (k: keyof EditForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Edit User #{user.id}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="First Name" value={form.firstName} onChange={set("firstName")} />
            <TextField label="Last Name" value={form.lastName} onChange={set("lastName")} />
          </div>
          <TextField label="Email" value={form.email} onChange={set("email")} type="email" />
          <RoleSelect value={form.role} onChange={set("role")} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Country" value={form.country} onChange={set("country")} />
            <TextField label="Phone" value={form.phone} onChange={set("phone")} type="tel" />
          </div>
          <TextField label="Company Name" value={form.companyName} onChange={set("companyName")} />
          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
          <button
            onClick={() => { setSaveError(null); updateMutation.mutate(); }}
            disabled={updateMutation.isPending}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wide">Reset Password</p>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPwSuccess(false); setPwError(null); }}
                placeholder="New password (min 8 characters)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwError && <p className="text-red-400 text-xs mt-1">{pwError}</p>}
            {pwSuccess && <p className="text-emerald-400 text-xs mt-1">Password updated successfully.</p>}
            <button
              onClick={() => resetPwMutation.mutate()}
              disabled={resetPwMutation.isPending || newPassword.length < 8}
              className="mt-2 w-full py-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition"
            >
              {resetPwMutation.isPending ? "Updating…" : "Set New Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateForm>({ email: "", password: "", role: "BUYER", firstName: "", lastName: "", country: "", phone: "", companyName: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role, firstName: form.firstName || undefined, lastName: form.lastName || undefined, country: form.country || null, phone: form.phone || null, companyName: form.companyName || undefined }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(typeof j.error === "string" ? j.error : "Failed to create user"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  const set = (k: keyof CreateForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Add New User</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <TextField label="Email *" value={form.email} onChange={set("email")} type="email" placeholder="user@example.com" />
          <div>
            <label className="block text-xs text-white/50 mb-1">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <RoleSelect value={form.role} onChange={set("role")} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="First Name" value={form.firstName} onChange={set("firstName")} />
            <TextField label="Last Name" value={form.lastName} onChange={set("lastName")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Country" value={form.country} onChange={set("country")} />
            <TextField label="Phone" value={form.phone} onChange={set("phone")} type="tel" />
          </div>
          <TextField label="Company Name" value={form.companyName} onChange={set("companyName")} />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={() => { setError(null); createMutation.mutate(); }}
            disabled={createMutation.isPending || !form.email || form.password.length < 8}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {createMutation.isPending ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed to delete user"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); onClose(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-6 py-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Delete User?</h2>
            <p className="text-sm text-white/50 mt-1">
              This will permanently delete{" "}
              <span className="text-white font-medium">
                {user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : user.email}
              </span>{" "}
              and all their profile data. This cannot be undone.
            </p>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition">Cancel</button>
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition">
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"pick" | "preview" | "results">("pick");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ created: number; skipped: number; errors: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows: parsed, errors } = parseCsv(text);
      setParseErrors(errors);
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/admin/users/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Import failed"); }
      const data = await res.json();
      setResults(data.results);
      setSummary(data.summary);
      setStep("results");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e: unknown) {
      setImportError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const statusIcon = (s: ImportResult["status"]) => {
    if (s === "created") return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    if (s === "skipped") return <SkipForward className="h-4 w-4 text-amber-400" />;
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">
            {step === "pick" && "Import Users from CSV"}
            {step === "preview" && `Preview — ${rows.length} row${rows.length !== 1 ? "s" : ""} ready`}
            {step === "results" && "Import Complete"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === "pick" && (
            <>
              <p className="text-sm text-white/50">
                Upload a CSV file to bulk-create users. Each row becomes one account.
                Duplicate emails are skipped automatically.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Required columns</p>
                <code className="text-xs text-emerald-300 block">email, password, role</code>
                <p className="text-xs font-medium text-white/60 uppercase tracking-wide mt-3">Optional columns</p>
                <code className="text-xs text-white/40 block">firstName, lastName, phone, country, companyName</code>
                <p className="text-xs text-white/40 mt-2">
                  Role must be one of: {VALID_ROLES.join(", ")}
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                Download template CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-white/15 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-500/5 transition cursor-pointer"
              >
                <Upload className="h-8 w-8 text-white/30" />
                <span className="text-sm text-white/50">Click to select a CSV file</span>
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              {parseErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-red-400 mb-2">Parse errors — these rows will be skipped:</p>
                  {parseErrors.map((e, i) => <p key={i} className="text-xs text-red-300">{e}</p>)}
                </div>
              )}
              {rows.length > 0 ? (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/4">
                        <th className="text-left px-3 py-2 text-white/50 font-medium">#</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Email</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Role</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium">Name</th>
                        <th className="text-left px-3 py-2 text-white/50 font-medium hidden sm:table-cell">Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-3 py-2 text-white/30 font-mono">{i + 1}</td>
                          <td className="px-3 py-2 text-white/80">{r.email}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border font-medium ${roleBadge[r.role] ?? "bg-white/10 text-white/60"}`}>
                              {r.role}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-white/60">{[r.firstName, r.lastName].filter(Boolean).join(" ") || <span className="text-white/25">—</span>}</td>
                          <td className="px-3 py-2 text-white/50 hidden sm:table-cell">{r.companyName || <span className="text-white/25">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-white/40 text-center py-6">No valid rows found in the CSV.</p>
              )}
              {importError && <p className="text-red-400 text-xs">{importError}</p>}
            </>
          )}

          {step === "results" && summary && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{summary.created}</p>
                  <p className="text-xs text-white/50 mt-1">Created</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{summary.skipped}</p>
                  <p className="text-xs text-white/50 mt-1">Skipped</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{summary.errors}</p>
                  <p className="text-xs text-white/50 mt-1">Errors</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/4">
                      <th className="text-left px-3 py-2 text-white/50 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-white/50 font-medium">Email</th>
                      <th className="text-left px-3 py-2 text-white/50 font-medium">Status</th>
                      <th className="text-left px-3 py-2 text-white/50 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.row} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 text-white/30 font-mono">{r.row}</td>
                        <td className="px-3 py-2 text-white/70">{r.email}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">{statusIcon(r.status)}<span className="text-white/60 capitalize">{r.status}</span></span>
                        </td>
                        <td className="px-3 py-2 text-white/40">{r.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-white/10 flex justify-between items-center gap-3">
          {step === "pick" && (
            <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition">Cancel</button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("pick"); setRows([]); setParseErrors([]); }} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition">Back</button>
              <button
                onClick={handleImport}
                disabled={importing || rows.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {importing ? "Importing…" : `Import ${rows.length} User${rows.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
          {step === "results" && (
            <button onClick={onClose} className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: resp, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load users (HTTP ${res.status})`);
      return res.json();
    },
  });
  const users: UserRow[] = resp?.data ?? [];
  const totalUsers: number = resp?.total ?? users.length;

  function handleExport() {
    const a = document.createElement("a");
    a.href = "/api/admin/users/export";
    a.click();
  }

  return (
    <div className="space-y-6">
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} />}
      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {deleting && <DeleteConfirm user={deleting} onClose={() => setDeleting(null)} />}
      {importing && <ImportModal onClose={() => setImporting(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/50 text-sm mt-1">
            {isLoading ? "Loading…" : `${totalUsers} registered accounts`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 hover:text-white rounded-lg text-sm font-medium transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setImporting(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 hover:text-white rounded-lg text-sm font-medium transition"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="text-left px-4 py-3 text-white/50 font-medium">ID</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Company</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden lg:table-cell">Country</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium hidden xl:table-cell">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-white/40">Loading users…</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-white/40">No users found.</td></tr>
            )}
            {users.map((u: UserRow, i: number) => (
              <tr
                key={u.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
              >
                <td className="px-4 py-3 text-white/40 font-mono text-xs">{u.id}</td>
                <td className="px-4 py-3 text-white font-medium">
                  {u.firstName || u.lastName
                    ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                    : <span className="text-white/30 italic">No name</span>}
                </td>
                <td className="px-4 py-3 text-white/60 hidden md:table-cell">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${roleBadge[u.role] ?? "bg-white/10 text-white/60"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {u.companyName ? (
                    <span className="flex items-center gap-1.5 text-white/70">
                      {u.companyName}
                      {u.companyVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
                    </span>
                  ) : <span className="text-white/30">—</span>}
                </td>
                <td className="px-4 py-3 text-white/50 hidden lg:table-cell">{u.country ?? <span className="text-white/30">—</span>}</td>
                <td className="px-4 py-3 text-white/40 text-xs hidden xl:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleting(u)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete user"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
