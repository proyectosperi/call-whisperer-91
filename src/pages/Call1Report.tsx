import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCall1Data } from '@/hooks/useCall1Data';
import { useCourses } from '@/hooks/useCourses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download } from 'lucide-react';
import { CALL1_STATUS_LABELS, CALL1_STATUS_COLORS, Call1Status } from '@/types/database';
import * as XLSX from 'xlsx';

export default function Call1Report() {
  const { records, isLoading } = useCall1Data();
  const { courses } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  // Filtrar registros: excluir "asistira" y "se_unio"
  const excludedStatuses: Call1Status[] = ['asistira', 'se_unio'];
  
  const filteredRecords = records.filter((record) => {
    const matchesCourse = selectedCourse ? record.contact.course.id === selectedCourse : false;
    const notExcluded = !excludedStatuses.includes(record.status);
    return matchesCourse && notExcluded;
  });

  const handleExport = () => {
    if (filteredRecords.length === 0) return;

    const selectedCourseName = courses.find(c => c.id === selectedCourse)?.code || 'curso';

    const exportData = filteredRecords.map((record) => ({
      'Teléfono': record.contact.full_phone,
      'País': record.contact.country?.name || '-',
      'Curso': record.contact.course.code,
      'Estado': CALL1_STATUS_LABELS[record.status],
      'Grupo Origen': record.contact.source_group || '-',
      'Grupo Destino': record.target_group || '-',
      'Observación': record.observation || '-',
      'Llamadora': record.caller?.full_name || 'Sin asignar',
      'Última Llamada': record.called_at 
        ? new Date(record.called_at).toLocaleDateString('es-ES')
        : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'No Logrados');

    // Auto-ajustar ancho de columnas
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `llamada1_no_logrados_${selectedCourseName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const statusCounts = filteredRecords.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout title="Reporte Llamada 1">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Reporte: Números No Logrados
            </h1>
            <p className="text-sm text-muted-foreground">
              Números que no tienen estado "Asistirá" o "Se Unió" - pendientes de convencer
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seleccionar Curso</CardTitle>
            <CardDescription>
              Elige un curso para ver los números no logrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecciona un curso..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.filter(c => c.is_active).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCourse && filteredRecords.length > 0 && (
                <Button onClick={handleExport} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel ({filteredRecords.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {selectedCourse && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Total: {filteredRecords.length} registros
            </Badge>
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-xs">
                {CALL1_STATUS_LABELS[status as Call1Status]}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Content */}
        {!selectedCourse ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona un curso para ver el reporte</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>¡Excelente! No hay números pendientes de convencer para este curso.</p>
              <p className="text-sm mt-2">Todos los contactos tienen estado "Asistirá" o "Se Unió".</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Llamadora</TableHead>
                    <TableHead>Observación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">{record.contact.full_phone}</TableCell>
                      <TableCell>{record.contact.country?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={CALL1_STATUS_COLORS[record.status]}>
                          {CALL1_STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.contact.source_group && (
                          <Badge variant="outline">{record.contact.source_group}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{record.caller?.full_name || 'Sin asignar'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.observation || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
