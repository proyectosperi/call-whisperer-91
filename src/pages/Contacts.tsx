import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCourses } from '@/hooks/useCourses';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Contact, GroupType } from '@/types/database';
import { GROUP_LABELS } from '@/types/database';

interface ContactWithCourse {
  id: string;
  country_code: string;
  phone_number: string;
  full_phone: string;
  course_id: string;
  source_group?: GroupType;
  created_at: string;
  course: { id: string; code: string; name: string };
}

export default function Contacts() {
  const { courses } = useCourses();
  const [contacts, setContacts] = useState<ContactWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          course:courses!contacts_course_id_fkey(id, code, name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setContacts(data as ContactWithCourse[]);
      }
      setIsLoading(false);
    };

    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.full_phone.includes(search) ||
      contact.course.code.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = courseFilter === 'all' || contact.course_id === courseFilter;
    const matchesGroup = groupFilter === 'all' || contact.source_group === groupFilter;
    return matchesSearch && matchesCourse && matchesGroup;
  });

  const copyPhone = async (id: string, phone: string) => {
    await navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast.success('Número copiado');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout title="Contactos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gestión de Contactos
            </h1>
            <p className="text-muted-foreground">
              Todos los números registrados de campañas
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {filteredContacts.length} contactos
          </Badge>
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
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  {(['G1', 'G2', 'G3', 'G4', 'M1'] as GroupType[]).map((group) => (
                    <SelectItem key={group} value={group}>
                      {GROUP_LABELS[group]}
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
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay contactos que mostrar
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-16">Copiar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono">{contact.full_phone}</TableCell>
                      <TableCell>{contact.country_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{contact.course.code}</Badge>
                      </TableCell>
                      <TableCell>
                        {contact.source_group ? (
                          <Badge variant="secondary">{GROUP_LABELS[contact.source_group]}</Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(contact.created_at), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyPhone(contact.id, contact.full_phone)}
                        >
                          {copiedId === contact.id ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
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
