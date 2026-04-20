import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Pencil, X, Eye, EyeOff } from "lucide-react";

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

interface EditModalProps {
  user: UserRow;
  onClose: () => void;
}

function EditModal({ user, onClose }: EditModalProps) {
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

  const field = (label: string, key: keyof EditForm, type = "text") => (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
      />
    </div>
  );

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
            {field("First Name", "firstName")}
            {field("Last Name", "lastName")}
          </div>
          {field("Email", "email", "email")}
          <div>
            <label className="block text-xs text-white/50 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              <option value="BUYER">BUYER</option>
              <option value="SUPPLIER">SUPPLIER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Country", "country")}
            {field("Phone", "phone", "tel")}
          </div>
          {field("Company Name", "companyName")}

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
                placeholder="New password (min 6 characters)"
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
              disabled={resetPwMutation.isPending || newPassword.length < 6}
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

export default function AdminUsers() {
  const [editing, setEditing] = useState<UserRow | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { headers: authHeader() });
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/50 text-sm mt-1">
            {isLoading ? "Loading…" : `${users.length} registered accounts`}
          </p>
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
                  <button
                    onClick={() => setEditing(u)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
