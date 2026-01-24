import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCourses } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BookOpen, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Courses() {
  const { courses, isLoading, createCourse, updateCourse, deleteCourse } = useCourses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    campaign_start_date: '',
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '', campaign_start_date: '' });
    setEditingCourse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await updateCourse(editingCourse, {
          ...formData,
          campaign_start_date: formData.campaign_start_date || null,
        });
        toast.success('Curso actualizado');
      } else {
        await createCourse({
          ...formData,
          is_active: true,
          campaign_start_date: formData.campaign_start_date || undefined,
        });
        toast.success('Curso creado');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Error al guardar el curso');
    }
  };

  const handleEdit = (course: any) => {
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      campaign_start_date: course.campaign_start_date || '',
    });
    setEditingCourse(course.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este curso?')) {
      try {
        await deleteCourse(id);
        toast.success('Curso eliminado');
      } catch (error) {
        toast.error('Error al eliminar el curso');
      }
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateCourse(id, { is_active: isActive });
      toast.success(isActive ? 'Curso activado' : 'Curso desactivado');
    } catch (error) {
      toast.error('Error al actualizar el curso');
    }
  };

  return (
    <AppLayout title="Cursos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Gestión de Cursos
            </h1>
            <p className="text-muted-foreground">
              Administra los cursos y sus campañas publicitarias
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'Editar Curso' : 'Nuevo Curso'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ej: PAT-2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Patronaje Básico 2024"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del curso"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign_date">Fecha inicio campaña</Label>
                  <Input
                    id="campaign_date"
                    type="date"
                    value={formData.campaign_start_date}
                    onChange={(e) => setFormData({ ...formData, campaign_start_date: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingCourse ? 'Actualizar' : 'Crear Curso'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando...</div>
            ) : courses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay cursos registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Inicio Campaña</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.code}</TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>
                        {course.campaign_start_date
                          ? format(new Date(course.campaign_start_date), 'dd MMM yyyy', { locale: es })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={course.is_active}
                            onCheckedChange={(checked) => handleToggleActive(course.id, checked)}
                          />
                          <Badge variant={course.is_active ? 'default' : 'secondary'}>
                            {course.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(course)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
