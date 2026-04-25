"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createTask, type CreateTaskInput } from "@/actions/tasks";
import { type TaskPriority } from "@/types/tasks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_CONFIG } from "@/types/tasks";

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      await createTask({
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error creando tarea:", error);
      alert("Error al crear la tarea. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-1.5">
          <Plus className="size-4" />
          Nueva Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0f0f1a] border-white/10 text-white sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Crear nueva tarea</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Completa los detalles de tu nueva tarea
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Título */}
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-neutral-200">
                Título <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: Revisar documentos del proyecto"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                disabled={loading}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
              />
            </div>

            {/* Descripción */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-neutral-200">
                Descripción
              </Label>
              <Textarea
                id="description"
                placeholder="Agrega detalles adicionales..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={loading}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Prioridad y Fecha */}
            <div className="grid grid-cols-2 gap-4">
              {/* Prioridad */}
              <div className="grid gap-2">
                <Label htmlFor="priority" className="text-neutral-200">
                  Prioridad
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TaskPriority })
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f0f1a] border-white/10">
                    {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((priority) => (
                      <SelectItem
                        key={priority}
                        value={priority}
                        className="text-white focus:bg-white/10 focus:text-white"
                      >
                        {PRIORITY_CONFIG[priority].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha de vencimiento */}
              <div className="grid gap-2">
                <Label htmlFor="due_date" className="text-neutral-200">
                  Vencimiento
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-neutral-400 hover:text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? "Creando..." : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
