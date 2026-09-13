import { useState } from "react";
import { ArrowRight, Building2, CalendarDays, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import type { School } from "../types/auth";

interface SchoolsDirectoryProps {
  schools: School[];
  onOpenSchool: (school: School) => void;
  onCreateSchool: (data: { name: string; description?: string }) => Promise<School>;
  onUpdateSchool: (schoolId: string, data: { name: string; adminName?: string; adminEmail?: string }) => Promise<School>;
}

export function SchoolsDirectory({ schools, onOpenSchool, onCreateSchool, onUpdateSchool }: SchoolsDirectoryProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAdminName, setEditingAdminName] = useState("");
  const [editingAdminEmail, setEditingAdminEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.error("Укажите название школы");
      return;
    }

    setIsCreating(true);
    try {
      const school = await onCreateSchool({
        name: normalizedName,
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      setIsCreateOpen(false);
      toast.success("Школа создана");
      onOpenSchool(school);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Не удалось создать школу");
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (school: School) => {
    setEditingSchool(school);
    setEditingName(school.name);
    setEditingAdminName(school.adminName || "");
    setEditingAdminEmail(school.adminEmail || "");
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingSchool) return;

    const normalizedName = editingName.trim();
    if (!normalizedName) {
      toast.error("Укажите название школы");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateSchool(editingSchool.id, {
        name: normalizedName,
        adminName: editingAdminName.trim(),
        adminEmail: editingAdminEmail.trim(),
      });
      setEditingSchool(null);
      toast.success("Данные школы сохранены");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Не удалось сохранить изменения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="schools-directory">
      <div className="schools-directory-header">
        <div className="schools-directory-header-copy">
          <p className="schools-directory-eyebrow">Календарь встреч</p>
          <div className="schools-directory-title-row mt-2">
            <h1 className="schools-directory-title">Мои школы</h1>
            {schools.length > 0 && <span className="schools-directory-count">{schools.length}</span>}
          </div>
          <p className="schools-directory-description mt-2">
            Откройте школу, чтобы перейти к клиентам, календарю и менеджерам.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="schools-directory-create brand-primary-button rounded-xl px-5 py-5 sm:w-auto">
              <Plus className="h-5 w-5" />
              Добавить школу
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Новая школа</DialogTitle>
              <DialogDescription>
                После создания откроется её календарь. Менеджеров можно будет добавить во вкладке «Менеджеры».
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-school-name">Название школы</Label>
                <Input
                  id="new-school-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Например, Отдел продаж — Москва"
                  autoFocus
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-school-description">Комментарий</Label>
                <Textarea
                  id="new-school-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Необязательно"
                  rows={3}
                  disabled={isCreating}
                />
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                  Отмена
                </Button>
                <Button type="submit" className="brand-primary-button" disabled={isCreating}>
                  {isCreating ? "Создаём…" : "Создать и открыть"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {schools.length === 0 ? (
        <Card className="schools-directory-empty p-10 text-center">
          <div className="schools-directory-empty-icon mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4">Школ пока нет</h2>
          <p className="schools-directory-description mt-2">Добавьте первую школу, чтобы начать планировать встречи.</p>
        </Card>
      ) : (
        <div className="schools-directory-list">
          {schools.map((school) => (
            <Card key={school.id} className="schools-directory-row group">
              <div className="schools-directory-row-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="schools-directory-row-main">
                <h2 className="schools-directory-card-title">{school.name}</h2>
                <p className="schools-directory-admin mt-1">
                  {school.adminName ? `Администратор: ${school.adminName}` : 'Администратор пока не назначен'}
                </p>
              </div>
              <div className="schools-directory-date flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Создана {school.createdAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="schools-directory-actions">
                <Button
                  variant="outline"
                  onClick={() => openEditDialog(school)}
                  className="schools-directory-edit rounded-xl"
                >
                  <Pencil className="h-4 w-4" />
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenSchool(school)}
                  className="schools-directory-open justify-between rounded-xl"
                >
                  Открыть календарь
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editingSchool)}
        onOpenChange={(open) => {
          if (!open && !isSaving) setEditingSchool(null);
        }}
      >
        <DialogContent className="school-editor-dialog">
          <DialogHeader className="school-editor-header">
            <DialogTitle>Редактирование школы</DialogTitle>
            <DialogDescription>Скорректируйте название и данные администратора.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="school-editor-form">
            <div className="school-editor-field">
              <Label htmlFor="edit-school-name">Название школы</Label>
              <Input
                id="edit-school-name"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                disabled={isSaving}
                autoFocus
                className="school-editor-input"
              />
            </div>
            <div className="school-editor-admin-grid">
              <div className="school-editor-field">
                <Label htmlFor="edit-school-admin-name">Администратор</Label>
                <Input
                  id="edit-school-admin-name"
                  value={editingAdminName}
                  onChange={(event) => setEditingAdminName(event.target.value)}
                  placeholder="Имя администратора"
                  disabled={isSaving}
                  className="school-editor-input"
                />
              </div>
              <div className="school-editor-field">
                <Label htmlFor="edit-school-admin-email">Email администратора</Label>
                <Input
                  id="edit-school-admin-email"
                  type="email"
                  value={editingAdminEmail}
                  onChange={(event) => setEditingAdminEmail(event.target.value)}
                  placeholder="admin@example.com"
                  disabled={isSaving}
                  className="school-editor-input"
                />
              </div>
            </div>
            <div className="school-editor-actions">
              <Button type="button" variant="outline" onClick={() => setEditingSchool(null)} disabled={isSaving}>
                Отмена
              </Button>
              <Button type="submit" className="brand-primary-button" disabled={isSaving}>
                {isSaving ? "Сохраняем…" : "Сохранить"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
