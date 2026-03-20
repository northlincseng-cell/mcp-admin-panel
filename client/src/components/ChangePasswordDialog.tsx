import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

interface Props {
  open: boolean;
  forced?: boolean;
  onClose?: () => void;
}

export default function ChangePasswordDialog({ open, forced = false, onClose }: Props) {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "passwords don't match",
        description: "please ensure both password fields match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "password too short",
        description: "password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({
        title: "password changed",
        description: "your password has been updated successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose?.();
    } catch (err: any) {
      const msg = err?.message || "failed to change password";
      toast({
        title: "error",
        description: msg.includes("401") ? "current password is incorrect" : msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={forced ? undefined : (v) => !v && onClose?.()}>
      <DialogContent
        className="sm:max-w-md bg-slate-900 border-slate-800"
        onInteractOutside={forced ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-slate-200 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            change password
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {forced
              ? "you must change your password before continuing"
              : "update your password"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="current-pw" className="text-slate-300 text-sm">
              current password
            </Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              className="bg-slate-800/50 border-slate-700 text-slate-100"
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw" className="text-slate-300 text-sm">
              new password
            </Label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              className="bg-slate-800/50 border-slate-700 text-slate-100"
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw" className="text-slate-300 text-sm">
              confirm new password
            </Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              className="bg-slate-800/50 border-slate-700 text-slate-100"
              data-testid="input-confirm-password"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            data-testid="button-change-password"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                updating...
              </>
            ) : (
              "change password"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
