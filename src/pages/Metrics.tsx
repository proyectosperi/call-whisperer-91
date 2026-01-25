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
import { BarChart3, Plus, Calendar, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { GroupType, GroupMetric } from '@/types/database';
import { GROUP_LABELS } from '@/types/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricWithCourse {
  id: string;
  course_id: string;
  group_type: GroupType;
  contact_count: number;
  recorded_date: string;
  created_at: string;
  course: { id: string; code: string; name: string };
}

interface LatestMetric {
  course_id: string;
  group_type: GroupType;
  contact_count: number;
  recorded_date: string;
}

export default function Metrics() {
  const { courses } = useCourses();
  const [metrics, setMetrics] = useState<MetricWithCourse[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, Record<GroupType, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const [form, setForm] = useState({
    course_id: '',
    group_type: '' as GroupType | '',
    contact_count: '',
  });

  const [bulkForm, setBulkForm] = useState({
    course_id: '',
    G1: '',
    G2: '',
    G3: '',
    G4: '',
    M1: '',
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
      .limit(500);

    if (!error && data) {
      setMetrics(data as MetricWithCourse[]);
      
      // Calcular las métricas más recientes por curso y grupo
      const latest: Record<string, Record<GroupType, number>> = {};
      data.forEach((metric) => {
        const courseId = metric.course_id;
        if (!latest[courseId]) {
          latest[courseId] = {} as Record<GroupType, number>;
        }
        // Solo tomar el primer valor (más reciente) para cada grupo
        if (!latest[courseId][metric.group_type]) {
          latest[courseId][metric.group_type] = metric.contact_count;
        }
      });
      setLatestMetrics(latest);
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
      // Insertar sin especificar recorded_date - usará NOW() por defecto
      const { error } = await supabase.from('group_metrics').insert({
        course_id: form.course_id,
        group_type: form.group_type,
        contact_count: parseInt(form.contact_count),
      });

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

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.course_id) {
      toast.error('Selecciona un curso');
      return;
    }

    // Verificar que al menos un grupo tenga valor
    const hasValues = bulkForm.G1 || bulkForm.G2 || bulkForm.G3 || bulkForm.G4 || bulkForm.M1;
    if (!hasValues) {
      toast.error('Ingresa al menos un valor');
      return;
    }

    setIsSaving(true);
    try {
      const records = [];
      
      if (bulkForm.G1) records.push({ course_id: bulkForm.course_id, group_type: 'G1' as GroupType, contact_count: parseInt(bulkForm.G1) });
      if (bulkForm.G2) records.push({ course_id: bulkForm.course_id, group_type: 'G2' as GroupType, contact_count: parseInt(bulkForm.G2) });
      if (bulkForm.G3) records.push({ course_id: bulkForm.course_id, group_type: 'G3' as GroupType, contact_count: parseInt(bulkForm.G3) });
      if (bulkForm.G4) records.push({ course_id: bulkForm.course_id, group_type: 'G4' as GroupType, contact_count: parseInt(bulkForm.G4) });
      if (bulkForm.M1) records.push({ course_id: bulkForm.course_id, group_type: 'M1' as GroupType, contact_count: parseInt(bulkForm.M1) });

      const { error } = await supabase.from('group_metrics').insert(records);

      if (error) throw error;

      toast.success(`${records.length} métricas registradas en la misma hora`);
      setBulkForm({ course_id: bulkForm.course_id, G1: '', G2: '', G3: '', G4: '', M1: '' });
      fetchMetrics();
    } catch (error) {
      toast.error('Error al registrar métricas');
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

  // Preparar datos para gráficos - filtrar por curso seleccionado
  const chartData = selectedCourse
    ? metrics
        .filter((m) => m.course_id === selectedCourse)
        .reduce((acc, metric) => {
          const dateKey = format(new Date(metric.recorded_date), 'dd/MM HH:mm');
          const existingEntry = acc.find((entry) => entry.date === dateKey);
          
          if (existingEntry) {
            existingEntry[metric.group_type] = metric.contact_count;
          } else {
            acc.push({
              date: dateKey,
              fullDate: metric.recorded_date,
              [metric.group_type]: metric.contact_count,
            });
          }
          return acc;
        }, [] as any[])
        .reverse() // Mostrar de más antiguo a más reciente
    : [];

  const selectedCourseName = courses.find((c) => c.id === selectedCourse)?.name || '';

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

        {/* Métricas Principales - Último Registro */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.filter((c) => c.is_active).map((course) => {
            const latest = latestMetrics[course.id] || {};
            const total = Object.values(latest).reduce((sum: number, val: number) => sum + (val || 0), 0);
            
            return (
              <Card key={course.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {course.code}
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">{course.name}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-3">{total.toLocaleString()}</div>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    {(['G1', 'G2', 'G3', 'G4', 'M1'] as GroupType[]).map((group) => (
                      <div key={group} className="text-center">
                        <div className="text-muted-foreground">{group}</div>
                        <div className="font-semibold">{latest[group] || 0}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Form */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulario Individual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar por Grupo</CardTitle>
              <CardDescription>
                Ingresa la cantidad de un grupo específico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
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
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      value={form.contact_count}
                      onChange={(e) => setForm({ ...form, contact_count: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {isSaving ? 'Guardando...' : 'Registrar'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Formulario Completo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar Todos los Grupos</CardTitle>
              <CardDescription>
                Ingresa todos los grupos en un solo registro (misma hora)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Curso</Label>
                  <Select
                    value={bulkForm.course_id}
                    onValueChange={(v) => setBulkForm({ ...bulkForm, course_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.filter((c) => c.is_active).map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">G1</Label>
                    <Input
                      type="number"
                      value={bulkForm.G1}
                      onChange={(e) => setBulkForm({ ...bulkForm, G1: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">G2</Label>
                    <Input
                      type="number"
                      value={bulkForm.G2}
                      onChange={(e) => setBulkForm({ ...bulkForm, G2: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">G3</Label>
                    <Input
                      type="number"
                      value={bulkForm.G3}
                      onChange={(e) => setBulkForm({ ...bulkForm, G3: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">G4</Label>
                    <Input
                      type="number"
                      value={bulkForm.G4}
                      onChange={(e) => setBulkForm({ ...bulkForm, G4: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">M1</Label>
                    <Input
                      type="number"
                      value={bulkForm.M1}
                      onChange={(e) => setBulkForm({ ...bulkForm, M1: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {isSaving ? 'Guardando...' : 'Registrar Todos'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolución */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Evolución por Grupo
                </CardTitle>
                <CardDescription>
                  Visualiza el crecimiento de números por grupo a lo largo del tiempo
                </CardDescription>
              </div>
              <div className="w-64">
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar curso" />
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
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCourse ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Selecciona un curso para ver la evolución
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No hay datos para este curso
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="G1" stroke="#8884d8" name="G1" strokeWidth={2} />
                  <Line type="monotone" dataKey="G2" stroke="#82ca9d" name="G2" strokeWidth={2} />
                  <Line type="monotone" dataKey="G3" stroke="#ffc658" name="G3" strokeWidth={2} />
                  <Line type="monotone" dataKey="G4" stroke="#ff7c7c" name="G4" strokeWidth={2} />
                  <Line type="monotone" dataKey="M1" stroke="#a78bfa" name="M1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
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
              <div className="overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
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
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(new Date(row.date), 'dd MMM yyyy HH:mm', { locale: es })}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
