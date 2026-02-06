import { useState, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CallRecordRow } from '@/components/calls/CallRecordRow';
import { CallRecordCard } from '@/components/calls/CallRecordCard';
import { ActivePhoneIndicator } from '@/components/calls/ActivePhoneIndicator';
import { useCall1Data } from '@/hooks/useCall1Data';
import { useCourses } from '@/hooks/useCourses';
import { useCallFilters } from '@/hooks/useCallFilters';
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
import { Search, Phone, Users, X } from 'lucide-react';
import { CALL1_STATUS_LABELS, Call1Status } from '@/types/database';

export default function Call1() {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { records, isLoading, updateRecord, refetch } = useCall1Data();
  const { courses } = useCourses();
  const {
    search,
    statusFilter,
    courseFilter,
    countryFilter,
    callerFilter,
    activePhone,
    setSearch,
    setStatusFilter,
    setCourseFilter,
    setCountryFilter,
    setCallerFilter,
    setActivePhone,
    clearFilters,
    clearActivePhone,
    hasActiveFilters,
    hasActivePhone,
  } = useCallFilters('call1');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const recordRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Scroll to active phone record when page loads
  useEffect(() => {
    if (activePhone && !isLoading) {
      const activeRecord = records.find(r => r.contact.full_phone === activePhone);
      if (activeRecord) {
        const element = recordRefs.current.get(activeRecord.id);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  }, [activePhone, isLoading, records]);

  const handleToggleActivePhone = (phone: string) => {
    if (activePhone === phone) {
      clearActivePhone();
    } else {
      setActivePhone(phone);
    }
  };

  const scrollToActiveRecord = () => {
    const activeRecord = records.find(r => r.contact.full_phone === activePhone);
    if (activeRecord) {
      const element = recordRefs.current.get(activeRecord.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Extraer países únicos de los registros
  const uniqueCountries = Array.from(
    new Map(
      records
        .filter(r => r.contact.country)
        .map(r => [r.contact.country!.id, r.contact.country!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Extraer llamadoras únicas de los registros (solo para admin)
  const uniqueCallers = Array.from(
    new Map(
      records
        .filter(r => r.caller_id && r.caller)
        .map(r => [r.caller_id!, { id: r.caller_id!, name: r.caller!.full_name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

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
    const matchesCountry = countryFilter === 'all' || record.contact.country?.id === countryFilter;
    const matchesCaller = callerFilter === 'all' || 
      (callerFilter === 'unassigned' ? !record.caller_id : record.caller_id === callerFilter);
    return matchesSearch && matchesStatus && matchesCourse && matchesCountry && matchesCaller;
  });

  const statusCounts = filteredRecords.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout title="Llamada 1">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {isAdmin ? 'Gestión Llamada 1' : 'Mis Llamadas 1'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Seguimiento de llamadas para unirse a G1/G3'
                : 'Tus números asignados para llamar'}
            </p>
          </div>
          <Badge variant="secondary" className="text-base sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2 w-fit">
            {filteredRecords.length} registros
          </Badge>
        </div>

        {/* Stats + Bulk Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-xs sm:text-sm">
                {CALL1_STATUS_LABELS[status as Call1Status]}: {count}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
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
              <div className={`grid gap-2 sm:flex sm:gap-4 ${isAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueCountries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {Object.entries(CALL1_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Select value={callerFilter} onValueChange={setCallerFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Llamadora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {uniqueCallers.map((caller) => (
                        <SelectItem key={caller.id} value={caller.id}>
                          {caller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
          <div className="space-y-3 pb-20">
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
              <div
                key={record.id}
                ref={(el) => {
                  if (el) recordRefs.current.set(record.id, el);
                }}
              >
                <CallRecordCard
                  type="call1"
                  record={record}
                  onUpdate={updateRecord}
                  selected={selectedIds.includes(record.id)}
                  onToggleSelect={isAdmin ? () => toggleSelect(record.id) : undefined}
                  showCaller={isAdmin}
                  isActive={record.contact.full_phone === activePhone}
                  onToggleActive={() => handleToggleActivePhone(record.contact.full_phone)}
                />
              </div>
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
                    <TableHead>Grupo</TableHead>
                    {isAdmin && <TableHead>Llamadora</TableHead>}
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      ref={(el) => {
                        if (el) recordRefs.current.set(record.id, el);
                      }}
                      style={{ display: 'contents' }}
                    >
                      <CallRecordRow
                        type="call1"
                        record={record}
                        onUpdate={updateRecord}
                        selected={selectedIds.includes(record.id)}
                        onToggleSelect={isAdmin ? () => toggleSelect(record.id) : undefined}
                        showCaller={isAdmin}
                        isActive={record.contact.full_phone === activePhone}
                        onToggleActive={() => handleToggleActivePhone(record.contact.full_phone)}
                      />
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Active Phone Indicator */}
        {hasActivePhone && (
          <ActivePhoneIndicator
            phone={activePhone}
            onClear={clearActivePhone}
            onScrollTo={scrollToActiveRecord}
          />
        )}

        {/* Bulk Assign Dialog */}
        <BulkAssignDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          selectedIds={selectedIds}
          callType="call1"
          onSuccess={handleAssignSuccess}
        />
      </div>
    </AppLayout>
  );
}
