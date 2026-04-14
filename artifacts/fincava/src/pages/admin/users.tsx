import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

const roleBadge: Record<string, string> = {
  BUYER: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  SUPPLIER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  ADMIN: "bg-purple-500/15 text-purple-300 border-purple-500/20",
};

export default function AdminUsers() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const token = localStorage.getItem("fincava_token");
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
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
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Loading users…
                </td>
              </tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u: any, i: number) => (
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
                      {u.companyVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      )}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
