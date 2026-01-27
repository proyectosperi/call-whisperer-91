import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CallRecordRow } from '@/components/calls/CallRecordRow';
import { CallRecordCard } from '@/components/calls/CallRecordCard';
import { useCall2Data } from '@/hooks/useCall2Data';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkAssignDialog } from '@/components/admin/BulkAssignDialog';
import { Search, PhoneCall, Users } from 'lucide-react';
import { CALL2_STATUS_LABELS, Call2Status } from '@/types/database';

export default function Call2() {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { records, isLoading, updateRecord, refetch } = useCall2Data();
  const { courses } = useCourses();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map((r) => r.id));
    }
  };

  const handleAssignSuccess = () => {
    setSelectedIds([]);
    refetch();
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.contact.full_phone.includes(search) ||
      record.contact.course.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesCourse = courseFilter === 'all' || record.contact.course.id === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  const statusCounts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout title="Llamada 2">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <PhoneCall className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {isAdmin ? 'Gestión Llamada 2' : 'Mis Llamadas 2'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Seguimiento de llamadas para matrícula en M1'
                : 'Tus números asignados para seguimiento'}
            </p>
          </div>
          <Badge variant="secondary" className="text-base sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2 w-fit">
            {records.length} registros
          </Badge>
        </div>

        {/* Stats + Bulk Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-xs sm:text-sm">
                {CALL2_STATUS_LABELS[status as Call2Status]}: {count}
              </Badge>
            ))}
          </div>
          {isAdmin && selectedIds.length > 0 && (
            <Button onClick={() => setShowAssignDialog(true)} size="sm" className="w-full sm:w-auto">
              <Users className="h-4 w-4 mr-2" />
              Asignar ({selectedIds.length})
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar teléfono o curso..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {courses.filter(c => c.is_active).map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(CALL2_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No hay registros que mostrar
          </div>
        ) : isMobile ? (
          /* Mobile: Card layout */
          <div className="space-y-3">
            {isAdmin && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Seleccionar todos ({filteredRecords.length})
                </span>
              </div>
            )}
            {filteredRecords.map((record) => (
              <CallRecordCard
                key={record.id}
                type="call2"
                record={record}
                onUpdate={updateRecord}
                selected={selectedIds.includes(record.id)}
                onToggleSelect={isAdmin ? () => toggleSelect(record.id) : undefined}
                showCaller={isAdmin}
              />
            ))}
          </div>
        ) : (
          /* Desktop: Table layout */
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Grupo Origen</TableHead>
                    <TableHead>Grupo Destino</TableHead>
                    {isAdmin && <TableHead>Llamadora</TableHead>}
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <CallRecordRow
                      key={record.id}
                      type="call2"
                      record={record}
                      onUpdate={updateRecord}
                      selected={selectedIds.includes(record.id)}
                      onToggleSelect={isAdmin ? () => toggleSelect(record.id) : undefined}
                      showCaller={isAdmin}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Bulk Assign Dialog */}
        <BulkAssignDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          selectedIds={selectedIds}
          callType="call2"
          onSuccess={handleAssignSuccess}
        />
      </div>
    </AppLayout>
  );
}
