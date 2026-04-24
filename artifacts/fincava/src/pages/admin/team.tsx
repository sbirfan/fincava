import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X, Shield, Briefcase, MapPin, ChevronDown } from "lucide-react";

const STAFF_ROLES = ["employee", "field_officer", "admin"] as const;
type StaffRole = typeof STAFF_ROLES[number];

const roleConfig: Record<StaffRole, { label: string; icon: React.FC<any>; color: string }> = {
  employee: { label: "Employee", icon: Briefcase, color: "bg-blue-500/15 text-blue-300 border-blue-500/20" },
  field_officer: { label: "Field Officer", icon: MapPin, color: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
  admin: { label: "Admin", icon: Shield, color: "bg-purple-500/15 text-purple-300 border-purple-500/20" },
};


function RoleBadge({ role, onRemove }: { role: StaffRole; onRemove?: () => void }) {
  const cfg = roleConfig[role];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70 transition-opacity">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function AssignModal({ user, existingRoles, onClose }: {
  user: { id: number; email: string; firstName?: string; lastName?: string };
  existingRoles: string[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<StaffRole | "">("");

  const assign = useMutation({
    mutationFn: async (role: StaffRole) => {
      const res = await fetch(`/api/admin/team/${user.id}/roles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to assign role");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
      qc.invalidateQueries({ queryKey: ["admin", "team-users"] });
      onClose();
    },
  });

  const available = STAFF_ROLES.filter((r) => !existingRoles.includes(r));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-xl border border-white/10 bg-[#0d1a12] p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Assign Role</h2>
            <p className="text-white/50 text-sm mt-0.5">
              {user.firstName} {user.lastName} &middot; {user.email}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {available.length === 0 ? (
          <p className="text-white/50 text-sm text-center py-4">All roles already assigned.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Role</label>
              <div className="relative">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value as StaffRole)}
                  className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                >
                  <option value="" className="bg-[#0d1a12]">Select a role…</option>
                  {available.map((r) => (
                    <option key={r} value={r} className="bg-[#0d1a12]">{roleConfig[r].label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selected || assign.isPending}
                onClick={() => selected && assign.mutate(selected)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assign.isPending ? "Assigning…" : "Assign Role"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface UserWithRoles {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  staffRoles: string[];
}

function TeamMemberRow({ member, onRemoveRole, onAssign }: {
  member: UserWithRoles;
  onRemoveRole: (role: StaffRole) => void;
  onAssign: () => void;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0">
            {(member.firstName ?? member.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white text-sm font-medium">
              {member.firstName} {member.lastName}
            </div>
            <div className="text-white/40 text-xs">{member.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs text-white/40 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
          {member.role}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {member.staffRoles.length === 0 ? (
            <span className="text-white/30 text-xs">No roles</span>
          ) : (
            (member.staffRoles as StaffRole[]).map((r) => (
              <RoleBadge key={r} role={r} onRemove={() => onRemoveRole(r)} />
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        {member.staffRoles.length < STAFF_ROLES.length && (
          <button
            onClick={onAssign}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/20 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add role
          </button>
        )}
      </td>
    </tr>
  );
}

export default function AdminTeam() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"team" | "all">("team");
  const [assigning, setAssigning] = useState<UserWithRoles | null>(null);

  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: async () => {
      const res = await fetch("/api/admin/team", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load team (HTTP ${res.status})`);
      return res.json();
    },
  });

  const { data: allUsersResp, isLoading: loadingAll } = useQuery({
    queryKey: ["admin", "team-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/team/users?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load users (HTTP ${res.status})`);
      return res.json();
    },
    enabled: tab === "all",
  });
  const allUsers: UserWithRoles[] = allUsersResp?.data ?? [];

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: StaffRole }) => {
      const res = await fetch(`/api/admin/team/${userId}/roles/${role}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove role");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
      qc.invalidateQueries({ queryKey: ["admin", "team-users"] });
    },
  });

  const displayedTeam: UserWithRoles[] = tab === "team" ? teamMembers : allUsers;
  const isLoading = tab === "team" ? loadingTeam : loadingAll;

  return (
    <div className="space-y-6">
      {assigning && (
        <AssignModal
          user={assigning}
          existingRoles={assigning.staffRoles}
          onClose={() => setAssigning(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-white/50 text-sm mt-1">
          Manage staff roles. A team member can hold multiple roles simultaneously.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STAFF_ROLES.map((r) => {
          const cfg = roleConfig[r];
          const Icon = cfg.icon;
          const cnt = teamMembers.filter((m: UserWithRoles) => m.staffRoles.includes(r)).length;
          return (
            <div key={r} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-white/40" />
                <span className="text-xs text-white/50 font-medium">{cfg.label}s</span>
              </div>
              <p className="text-2xl font-bold text-white">{cnt}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 border-b border-white/10">
        {[
          { key: "team", label: `Active Team (${teamMembers.length})` },
          { key: "all", label: "All Users" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "team" | "all")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "text-emerald-300 border-emerald-400"
                : "text-white/50 border-transparent hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Member</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Account Type</th>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Staff Roles</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-white/40">Loading…</td>
              </tr>
            )}
            {!isLoading && displayedTeam.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-white/40">
                  {tab === "team" ? "No team members yet. Use \"All Users\" to assign roles." : "No users found."}
                </td>
              </tr>
            )}
            {displayedTeam.map((m) => (
              <TeamMemberRow
                key={m.id}
                member={m}
                onRemoveRole={(role) => removeRole.mutate({ userId: m.id, role })}
                onAssign={() => setAssigning(m)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
