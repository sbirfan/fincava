import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Pencil, X, Eye, EyeOff, Plus, Trash2, AlertTriangle } from "lucide-react";

const roleBadge: Record<string, string> = {
  BUYER: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  SUPPLIER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  ADMIN: "bg-purple-500/15 text-purple-300 border-purple-500/20",
};

function authHeader() {
  const token = localStorage.getItem("fincava_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

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

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
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
        <option value="BUYER">BUYER</option>
        <option value="SUPPLIER">SUPPLIER</option>
        <option value="ADMIN">ADMIN</option>
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
        headers: authHeader(),
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
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to save");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e: any) => setSaveError(e.message),
  });

  const resetPwMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to reset password");
      }
    },
    onSuccess: () => {
      setPwSuccess(true);
      setNewPassword("");
      setPwError(null);
    },
    onError: (e: any) => setPwError(e.message),
  });

  const set = (k: keyof EditForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Edit User #{user.id}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
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
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
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
  const [form, setForm] = useState<CreateForm>({
    email: "",
    password: "",
    role: "BUYER",
    firstName: "",
    lastName: "",
    country: "",
    phone: "",
    companyName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          country: form.country || null,
          phone: form.phone || null,
          companyName: form.companyName || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(typeof j.error === "string" ? j.error : "Failed to create user");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const set = (k: keyof CreateForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Add New User</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
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
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
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
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to delete user");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
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
                {user.firstName || user.lastName
                  ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                  : user.email}
              </span>{" "}
              and all their profile data. This cannot be undone.
            </p>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  const { data: resp, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { headers: authHeader() });
      return res.json();
    },
  });
  const users: UserRow[] = resp?.data ?? [];
  const totalUsers: number = resp?.total ?? users.length;

  return (
    <div className="space-y-6">
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} />}
      {creating && <CreateModal onClose={() => setCreating(false)} />}
      {deleting && <DeleteConfirm user={deleting} onClose={() => setDeleting(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/50 text-sm mt-1">
            {isLoading ? "Loading…" : `${totalUsers} registered accounts`}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
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
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">Loading users…</td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">No users found.</td>
              </tr>
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
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-white/50 hidden lg:table-cell">
                  {u.country ?? <span className="text-white/30">—</span>}
                </td>
                <td className="px-4 py-3 text-white/40 text-xs hidden xl:table-cell">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
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
