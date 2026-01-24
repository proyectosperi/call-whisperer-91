import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCall1Data } from '@/hooks/useCall1Data';
import { useCall2Data } from '@/hooks/useCall2Data';
import { useCallers } from '@/hooks/useCallers';
import { useCourses } from '@/hooks/useCourses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Users, Phone } from 'lucide-react';
import { CALL1_STATUS_LABELS, CALL2_STATUS_LABELS } from '@/types/database';
import type { Call1Status, Call2Status } from '@/types/database';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function CallReports() {
  const [activeTab, setActiveTab] = useState('call1');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const { records: call1RecordsAll, isLoading: isLoadingCall1 } = useCall1Data();
  const { records: call2RecordsAll, isLoading: isLoadingCall2 } = useCall2Data();
  const { callers } = useCallers();
  const { courses } = useCourses();

  // Filtrar por curso
  const call1Records = selectedCourse === 'all' 
    ? call1RecordsAll 
    : call1RecordsAll.filter(r => r.contact?.course?.id === selectedCourse);
  
  const call2Records = selectedCourse === 'all' 
    ? call2RecordsAll 
    : call2RecordsAll.filter(r => r.contact?.course?.id === selectedCourse);

  // ============ MÉTRICAS LLAMADA 1 ============
  
  // 1. Cantidad de números por estado
  const call1ByStatus = Object.entries(
    call1Records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<Call1Status, number>)
  ).map(([status, count]) => ({
    name: CALL1_STATUS_LABELS[status as Call1Status],
    value: count,
    status,
  }));

  // 2. % de números atendidos por llamadoras
  const call1ByCaller = Object.entries(
    call1Records
      .filter(r => r.caller_id)
      .reduce((acc, record) => {
        const callerId = record.caller_id!;
        acc[callerId] = (acc[callerId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
  ).map(([callerId, count]) => {
    const caller = callers.find(c => c.user_id === callerId);
    return {
      name: caller?.full_name || 'Sin asignar',
      value: count,
    };
  });

  // 3. % de números por país
  const call1ByCountry = Object.entries(
    call1Records.reduce((acc, record) => {
      const country = record.contact.country_code;
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([country, count]) => ({
    name: country,
    value: count,
  }));

  // 4. Matriz: Números por llamadoras y estado
  const call1Matrix = callers.map(caller => {
    const callerRecords = call1Records.filter(r => r.caller_id === caller.user_id);
    const byStatus = Object.entries(CALL1_STATUS_LABELS).reduce((acc, [status]) => {
      acc[status as Call1Status] = callerRecords.filter(r => r.status === status).length;
      return acc;
    }, {} as Record<Call1Status, number>);
    
    return {
      callerName: caller.full_name,
      ...byStatus,
      total: callerRecords.length,
    };
  });

  // 5. Tarjetas de cantidad por estado
  const call1StatusCards = Object.entries(CALL1_STATUS_LABELS).map(([status, label]) => ({
    status: status as Call1Status,
    label,
    count: call1Records.filter(r => r.status === status).length,
  }));

  // ============ MÉTRICAS LLAMADA 2 ============
  
  // 1. Cantidad de números por estado
  const call2ByStatus = Object.entries(
    call2Records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<Call2Status, number>)
  ).map(([status, count]) => ({
    name: CALL2_STATUS_LABELS[status as Call2Status],
    value: count,
    status,
  }));

  // 2. % de números atendidos por llamadoras
  const call2ByCaller = Object.entries(
    call2Records
      .filter(r => r.caller_id)
      .reduce((acc, record) => {
        const callerId = record.caller_id!;
        acc[callerId] = (acc[callerId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
  ).map(([callerId, count]) => {
    const caller = callers.find(c => c.user_id === callerId);
    return {
      name: caller?.full_name || 'Sin asignar',
      value: count,
    };
  });

  // 3. % de números por país
  const call2ByCountry = Object.entries(
    call2Records.reduce((acc, record) => {
      const country = record.contact.country_code;
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([country, count]) => ({
    name: country,
    value: count,
  }));

  // 4. Matriz: Números por llamadoras y estado
  const call2Matrix = callers.map(caller => {
    const callerRecords = call2Records.filter(r => r.caller_id === caller.user_id);
    const byStatus = Object.entries(CALL2_STATUS_LABELS).reduce((acc, [status]) => {
      acc[status as Call2Status] = callerRecords.filter(r => r.status === status).length;
      return acc;
    }, {} as Record<Call2Status, number>);
    
    return {
      callerName: caller.full_name,
      ...byStatus,
      total: callerRecords.length,
    };
  });

  // 5. Tarjetas de cantidad por estado
  const call2StatusCards = Object.entries(CALL2_STATUS_LABELS).map(([status, label]) => ({
    status: status as Call2Status,
    label,
    count: call2Records.filter(r => r.status === status).length,
  }));

  if (isLoadingCall1 || isLoadingCall2) {
    return (
      <AppLayout title="Reportes de Llamadas">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reportes de Llamadas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Reportes de Llamadas
            </h1>
            <p className="text-muted-foreground">
              Análisis detallado de métricas por llamada
            </p>
          </div>
          <div className="w-64">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los cursos</SelectItem>
                {courses.filter(c => c.is_active).map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="call1">
              <Phone className="h-4 w-4 mr-2" />
              Llamada 1
            </TabsTrigger>
            <TabsTrigger value="call2">
              <Phone className="h-4 w-4 mr-2" />
              Llamada 2
            </TabsTrigger>
          </TabsList>

          {/* ==================== LLAMADA 1 ==================== */}
          <TabsContent value="call1" className="space-y-6">
            {/* Tarjetas por Estado */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Números por Estado</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {call1StatusCards.map((card) => (
                  <Card key={card.status}>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">{card.label}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.count}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {call1Records.length > 0
                          ? `${((card.count / call1Records.length) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gráfica de Barras: Números por Estado */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Números por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={call1ByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Torta: % por Llamadoras */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    % Atendidos por Llamadora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {call1ByCaller.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={call1ByCaller}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {call1ByCaller.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos de llamadoras
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Torta: % por País */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    % de Números por País
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {call1ByCountry.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={call1ByCountry}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {call1ByCountry.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos de países
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Matriz: Números por Llamadora y Estado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Matriz: Números por Llamadora y Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Llamadora</TableHead>
                        {Object.values(CALL1_STATUS_LABELS).map((label) => (
                          <TableHead key={label} className="text-center">
                            {label}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {call1Matrix.map((row) => (
                        <TableRow key={row.callerName}>
                          <TableCell className="font-medium">{row.callerName}</TableCell>
                          {Object.keys(CALL1_STATUS_LABELS).map((status) => (
                            <TableCell key={status} className="text-center">
                              {row[status as Call1Status] || 0}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">
                            {row.total}
                          </TableCell>
                        </TableRow>
                      ))}
                      {call1Matrix.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={Object.keys(CALL1_STATUS_LABELS).length + 2}
                            className="text-center text-muted-foreground"
                          >
                            No hay llamadoras registradas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== LLAMADA 2 ==================== */}
          <TabsContent value="call2" className="space-y-6">
            {/* Tarjetas por Estado */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Números por Estado</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {call2StatusCards.map((card) => (
                  <Card key={card.status}>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">{card.label}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.count}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {call2Records.length > 0
                          ? `${((card.count / call2Records.length) * 100).toFixed(1)}%`
                          : '0%'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gráfica de Barras: Números por Estado */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Números por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={call2ByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Torta: % por Llamadoras */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    % Atendidos por Llamadora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {call2ByCaller.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={call2ByCaller}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {call2ByCaller.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos de llamadoras
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Torta: % por País */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    % de Números por País
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {call2ByCountry.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={call2ByCountry}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {call2ByCountry.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No hay datos de países
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Matriz: Números por Llamadora y Estado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Matriz: Números por Llamadora y Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Llamadora</TableHead>
                        {Object.values(CALL2_STATUS_LABELS).map((label) => (
                          <TableHead key={label} className="text-center">
                            {label}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {call2Matrix.map((row) => (
                        <TableRow key={row.callerName}>
                          <TableCell className="font-medium">{row.callerName}</TableCell>
                          {Object.keys(CALL2_STATUS_LABELS).map((status) => (
                            <TableCell key={status} className="text-center">
                              {row[status as Call2Status] || 0}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">
                            {row.total}
                          </TableCell>
                        </TableRow>
                      ))}
                      {call2Matrix.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={Object.keys(CALL2_STATUS_LABELS).length + 2}
                            className="text-center text-muted-foreground"
                          >
                            No hay llamadoras registradas
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
