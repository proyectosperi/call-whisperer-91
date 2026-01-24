import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CallRecordRow } from '@/components/calls/CallRecordRow';
import { useCall1Data } from '@/hooks/useCall1Data';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Phone } from 'lucide-react';
import { CALL1_STATUS_LABELS, Call1Status } from '@/types/database';

export default function Call1() {
  const { isAdmin } = useAuth();
  const { records, isLoading, updateRecord } = useCall1Data();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.contact.full_phone.includes(search) ||
      record.contact.course.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout title="Llamada 1">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Phone className="h-6 w-6 text-primary" />
              {isAdmin ? 'Gestión Llamada 1' : 'Mis Llamadas 1'}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Seguimiento de llamadas para unirse a G1/G3'
                : 'Tus números asignados para llamar'}
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {records.length} registros
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge key={status} variant="outline" className="text-sm">
              {CALL1_STATUS_LABELS[status as Call1Status]}: {count}
            </Badge>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por teléfono o código de curso..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(CALL1_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay registros que mostrar
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <CallRecordRow
                      key={record.id}
                      type="call1"
                      record={record}
                      onUpdate={updateRecord}
                    />
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
