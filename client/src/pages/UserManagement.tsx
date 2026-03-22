import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Users, UserPlus, Pencil, KeyRound, ShieldAlert, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";
import { ROLE_HIERARCHY } from "@shared/schema";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/15 text-red-400 border-red-500/30",
  admin: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  analyst: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  api_client: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  viewer: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="outline" className={`lowercase text-xs ${ROLE_COLORS[role] ?? ROLE_COLORS.viewer}`}>
      {role.replace("_", " ")}
    </Badge>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs lowercase">
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-500"}`} />
      {active ? "active" : "inactive"}
    </span>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);

  // Form state for add
  const [addForm, setAddForm] = useState({ username: "", displayName: "", role: "viewer", password: "" });
  // Form state for edit
  const [editForm, setEditForm] = useState({ displayName: "", role: "", active: true });
  // Form state for reset password
  const [resetPassword, setResetPassword] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof addForm) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAddOpen(false);
      setAddForm({ username: "", displayName: "", role: "viewer", password: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; displayName: string; role: string; active: boolean }) =>
      apiRequest("PUT", `/api/users/${data.id}`, { displayName: data.displayName, role: data.role, active: data.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
    },
  });

  const resetMutation = useMutation({
    mutationFn: (data: { id: number; password: string }) =>
      apiRequest("POST", `/api/users/${data.id}/reset-password`, { password: data.password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setResetUser(null);
      setResetPassword("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ displayName: u.displayName, role: u.role, active: u.active });
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.active).length;
  const roleCounts = ROLE_HIERARCHY.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="user management" icon={Users} breadcrumb="system — access control" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground lowercase">total users</div>
            <div className="text-xl font-semibold">{isLoading ? <Skeleton className="h-6 w-10" /> : totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground lowercase">active</div>
            <div className="text-xl font-semibold text-emerald-500">{isLoading ? <Skeleton className="h-6 w-10" /> : activeUsers}</div>
          </CardContent>
        </Card>
        {ROLE_HIERARCHY.map((r) => (
          <Card key={r}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground lowercase">{r.replace("_", " ")}</div>
              <div className="text-xl font-semibold">{isLoading ? <Skeleton className="h-6 w-10" /> : roleCounts[r]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission notice */}
      {!isSuperAdmin && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm lowercase">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          only super admins can manage users
        </div>
      )}

      {/* Add button */}
      {isSuperAdmin && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => setAddOpen(true)} className="lowercase">
            <UserPlus className="h-4 w-4 mr-1.5" />
            add user
          </Button>
        </div>
      )}

      {/* User table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground lowercase">
                  <th className="text-left p-3 font-medium">username</th>
                  <th className="text-left p-3 font-medium">display name</th>
                  <th className="text-left p-3 font-medium">role</th>
                  <th className="text-left p-3 font-medium">status</th>
                  <th className="text-left p-3 font-medium">last login</th>
                  <th className="text-left p-3 font-medium">created</th>
                  {isSuperAdmin && <th className="text-left p-3 font-medium">actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: isSuperAdmin ? 7 : 6 }).map((_, j) => (
                          <td key={j} className="p-3"><Skeleton className="h-4 w-20" /></td>
                        ))}
                      </tr>
                    ))
                  : users.map((u) => (
                      <tr key={u.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium lowercase">{u.username}</td>
                        <td className="p-3 text-muted-foreground lowercase">{u.displayName}</td>
                        <td className="p-3"><RoleBadge role={u.role} /></td>
                        <td className="p-3"><StatusDot active={u.active} /></td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "never"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setResetUser(u)}>
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm(`delete user ${u.username}?`)) deleteMutation.mutate(u.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">add user</DialogTitle>
            <DialogDescription className="lowercase">create a new user account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs lowercase">username</Label>
              <Input
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                placeholder="username"
                className="lowercase"
              />
            </div>
            <div>
              <Label className="text-xs lowercase">display name</Label>
              <Input
                value={addForm.displayName}
                onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                placeholder="display name"
              />
            </div>
            <div>
              <Label className="text-xs lowercase">role</Label>
              <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                <SelectTrigger className="lowercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_HIERARCHY.map((r) => (
                    <SelectItem key={r} value={r} className="lowercase">
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs lowercase">initial password</Label>
              <Input
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="min 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="lowercase">cancel</Button>
            <Button
              onClick={() => createMutation.mutate(addForm)}
              disabled={createMutation.isPending || !addForm.username || !addForm.displayName || !addForm.password}
              className="lowercase"
            >
              {createMutation.isPending ? "creating..." : "create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">edit user — {editUser?.username}</DialogTitle>
            <DialogDescription className="lowercase">update user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs lowercase">display name</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs lowercase">role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="lowercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_HIERARCHY.map((r) => (
                    <SelectItem key={r} value={r} className="lowercase">
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs lowercase">active</Label>
              <Switch checked={editForm.active} onCheckedChange={(v) => setEditForm({ ...editForm, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} className="lowercase">cancel</Button>
            <Button
              onClick={() => editUser && updateMutation.mutate({ id: editUser.id, ...editForm })}
              disabled={updateMutation.isPending}
              className="lowercase"
            >
              {updateMutation.isPending ? "saving..." : "save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) { setResetUser(null); setResetPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="lowercase">reset password — {resetUser?.username}</DialogTitle>
            <DialogDescription className="lowercase">set a new password for this user</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs lowercase">new password</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="min 8 characters"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetUser(null); setResetPassword(""); }} className="lowercase">cancel</Button>
            <Button
              onClick={() => resetUser && resetMutation.mutate({ id: resetUser.id, password: resetPassword })}
              disabled={resetMutation.isPending || resetPassword.length < 8}
              className="lowercase"
            >
              {resetMutation.isPending ? "resetting..." : "reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
