import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCourses } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GroupType, GroupMetric } from '@/types/database';
import { GROUP_LABELS } from '@/types/database';

interface MetricWithCourse {
  id: string;
  course_id: string;
  group_type: GroupType;
  contact_count: number;
  recorded_date: string;
  created_at: string;
  course: { id: string; code: string; name: string };
}

export default function Metrics() {
  const { courses } = useCourses();
  const [metrics, setMetrics] = useState<MetricWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    course_id: '',
    group_type: '' as GroupType | '',
    contact_count: '',
    recorded_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchMetrics = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('group_metrics')
      .select(`
        *,
        course:courses!group_metrics_course_id_fkey(id, code, name)
      `)
      .order('recorded_date', { ascending: false })
      .limit(100);

    if (!error && data) {
      setMetrics(data as MetricWithCourse[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id || !form.group_type || !form.contact_count) {
      toast.error('Completa todos los campos');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('group_metrics').upsert(
        {
          course_id: form.course_id,
          group_type: form.group_type,
          contact_count: parseInt(form.contact_count),
          recorded_date: form.recorded_date,
        },
        { onConflict: 'course_id,group_type,recorded_date' }
      );

      if (error) throw error;

      toast.success('Métrica registrada');
      setForm({ ...form, contact_count: '' });
      fetchMetrics();
    } catch (error) {
      toast.error('Error al registrar métrica');
    } finally {
      setIsSaving(false);
    }
  };

  // Group metrics by course and date for display
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const key = `${metric.course.code}-${metric.recorded_date}`;
    if (!acc[key]) {
      acc[key] = {
        course: metric.course,
        date: metric.recorded_date,
        groups: {} as Record<GroupType, number>,
      };
    }
    acc[key].groups[metric.group_type] = metric.contact_count;
    return acc;
  }, {} as Record<string, { course: { code: string; name: string }; date: string; groups: Record<GroupType, number> }>);

  return (
    <AppLayout title="Métricas">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Métricas de Grupos
          </h1>
          <p className="text-muted-foreground">
            Registro histórico de cantidad de números por grupo
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar Métrica</CardTitle>
            <CardDescription>
              Ingresa la cantidad de números en cada grupo por curso y fecha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 min-w-[150px]">
                <Label>Curso</Label>
                <Select
                  value={form.course_id}
                  onValueChange={(v) => setForm({ ...form, course_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.filter((c) => c.is_active).map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-[120px]">
                <Label>Grupo</Label>
                <Select
                  value={form.group_type}
                  onValueChange={(v) => setForm({ ...form, group_type: v as GroupType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(['G1', 'G2', 'G3', 'G4', 'M1'] as GroupType[]).map((group) => (
                      <SelectItem key={group} value={group}>
                        {GROUP_LABELS[group]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-32">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  value={form.contact_count}
                  onChange={(e) => setForm({ ...form, contact_count: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.recorded_date}
                  onChange={(e) => setForm({ ...form, recorded_date: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Registrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Metrics Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Historial de Métricas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando...</div>
            ) : Object.keys(groupedMetrics).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay métricas registradas
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead className="text-center">G1</TableHead>
                    <TableHead className="text-center">G2</TableHead>
                    <TableHead className="text-center">G3</TableHead>
                    <TableHead className="text-center">G4</TableHead>
                    <TableHead className="text-center">M1</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(groupedMetrics).map((row, idx) => {
                    const total = Object.values(row.groups).reduce((a, b) => a + b, 0);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(row.date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.course.code}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{row.groups.G1 || '—'}</TableCell>
                        <TableCell className="text-center">{row.groups.G2 || '—'}</TableCell>
                        <TableCell className="text-center">{row.groups.G3 || '—'}</TableCell>
                        <TableCell className="text-center">{row.groups.G4 || '—'}</TableCell>
                        <TableCell className="text-center">{row.groups.M1 || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
