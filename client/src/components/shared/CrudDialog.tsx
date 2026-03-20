import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "boolean";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
}

interface CrudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldDef[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  isLoading?: boolean;
}

export function CrudDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialData,
  onSubmit,
  isLoading,
}: CrudDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, any> = {};
      fields.forEach((f) => {
        initial[f.key] = initialData?.[f.key] ?? (f.type === "number" ? 0 : "");
      });
      setFormData(initial);
    }
  }, [open, initialData, fields]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processed: Record<string, any> = {};
    fields.forEach((f) => {
      let val = formData[f.key];
      if (f.type === "number") val = Number(val) || 0;
      if (f.type === "boolean") val = val === true || val === "true";
      processed[f.key] = val;
    });
    onSubmit(processed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold lowercase">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs lowercase">{field.label}</Label>
              {field.type === "select" ? (
                <Select
                  value={String(formData[field.key] ?? "")}
                  onValueChange={(val) =>
                    setFormData((d) => ({ ...d, [field.key]: val }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm" data-testid={`select-${field.key}`}>
                    <SelectValue placeholder={field.placeholder || "select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  value={formData[field.key] ?? ""}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="text-sm min-h-[60px]"
                  data-testid={`textarea-${field.key}`}
                />
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  value={formData[field.key] ?? ""}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="h-9 text-sm"
                  required={field.required}
                  data-testid={`input-${field.key}`}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="lowercase"
            >
              cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="lowercase"
              data-testid="button-submit"
            >
              {isLoading ? "saving..." : "save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
