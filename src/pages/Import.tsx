import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCourses } from '@/hooks/useCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupType } from '@/types/database';
import { GROUP_LABELS } from '@/types/database';

export default function Import() {
  const { courses } = useCourses();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  // Single contact form
  const [singleForm, setSingleForm] = useState({
    country_code: '+51',
    phone_number: '',
    course_id: '',
    source_group: '' as GroupType | '',
    call_type: 'call1' as 'call1' | 'call2',
  });

  // Bulk import form
  const [bulkForm, setBulkForm] = useState({
    numbers: '',
    course_id: '',
    source_group: '' as GroupType | '',
    call_type: 'call1' as 'call1' | 'call2',
  });

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.course_id || !singleForm.phone_number) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setIsImporting(true);
    try {
      // Insert contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          country_code: singleForm.country_code,
          phone_number: singleForm.phone_number.replace(/\D/g, ''),
          course_id: singleForm.course_id,
          source_group: singleForm.source_group || null,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Create call record
      if (singleForm.call_type === 'call1') {
        await supabase.from('call1_records').insert({
          contact_id: contact.id,
          target_group: singleForm.source_group || null,
        });
      } else {
        await supabase.from('call2_records').insert({
          contact_id: contact.id,
          origin_group: singleForm.source_group || null,
        });
      }

      toast.success('Contacto agregado correctamente');
      setSingleForm({ ...singleForm, phone_number: '' });
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Este número ya existe para este curso');
      } else {
        toast.error('Error al agregar contacto');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.course_id || !bulkForm.numbers.trim()) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const lines = bulkForm.numbers.split('\n').filter((line) => line.trim());
    let success = 0;
    let errors = 0;

    for (const line of lines) {
      try {
        const parts = line.trim().split(/[\t,;]/);
        let countryCode = '+51';
        let phoneNumber = '';

        if (parts.length >= 2) {
          countryCode = parts[0].trim();
          phoneNumber = parts[1].trim();
        } else {
          phoneNumber = parts[0].trim();
        }

        phoneNumber = phoneNumber.replace(/\D/g, '');
        if (!phoneNumber) continue;

        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            country_code: countryCode,
            phone_number: phoneNumber,
            course_id: bulkForm.course_id,
            source_group: bulkForm.source_group || null,
          })
          .select()
          .single();

        if (contactError) {
          errors++;
          continue;
        }

        // Create call record
        if (bulkForm.call_type === 'call1') {
          await supabase.from('call1_records').insert({
            contact_id: contact.id,
            target_group: bulkForm.source_group || null,
          });
        } else {
          await supabase.from('call2_records').insert({
            contact_id: contact.id,
            origin_group: bulkForm.source_group || null,
          });
        }

        success++;
      } catch {
        errors++;
      }
    }

    setImportResult({ success, errors });
    if (success > 0) {
      toast.success(`${success} contactos importados`);
      setBulkForm({ ...bulkForm, numbers: '' });
    }
    if (errors > 0) {
      toast.error(`${errors} errores durante la importación`);
    }

    setIsImporting(false);
  };

  return (
    <AppLayout title="Importar Contactos">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Importar Contactos
          </h1>
          <p className="text-muted-foreground">
            Agrega números de forma individual o masiva
          </p>
        </div>

        <Tabs defaultValue="single" className="space-y-6">
          <TabsList>
            <TabsTrigger value="single" className="gap-2">
              <Plus className="h-4 w-4" />
              Individual
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <FileText className="h-4 w-4" />
              Masivo
            </TabsTrigger>
          </TabsList>

          {/* Single Import */}
          <TabsContent value="single">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Contacto</CardTitle>
                <CardDescription>
                  Ingresa un número de teléfono individualmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Código de país</Label>
                      <Select
                        value={singleForm.country_code}
                        onValueChange={(v) => setSingleForm({ ...singleForm, country_code: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+51">+51 Perú</SelectItem>
                          <SelectItem value="+52">+52 México</SelectItem>
                          <SelectItem value="+57">+57 Colombia</SelectItem>
                          <SelectItem value="+54">+54 Argentina</SelectItem>
                          <SelectItem value="+56">+56 Chile</SelectItem>
                          <SelectItem value="+593">+593 Ecuador</SelectItem>
                          <SelectItem value="+1">+1 USA</SelectItem>
                          <SelectItem value="+34">+34 España</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Número de teléfono *</Label>
                      <Input
                        value={singleForm.phone_number}
                        onChange={(e) => setSingleForm({ ...singleForm, phone_number: e.target.value })}
                        placeholder="999888777"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Curso *</Label>
                      <Select
                        value={singleForm.course_id}
                        onValueChange={(v) => setSingleForm({ ...singleForm, course_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar curso" />
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
                    <div className="space-y-2">
                      <Label>Grupo origen</Label>
                      <Select
                        value={singleForm.source_group}
                        onValueChange={(v) => setSingleForm({ ...singleForm, source_group: v as GroupType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['G1', 'G2', 'G3', 'G4'] as GroupType[]).map((group) => (
                            <SelectItem key={group} value={group}>
                              {GROUP_LABELS[group]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de llamada</Label>
                      <Select
                        value={singleForm.call_type}
                        onValueChange={(v) => setSingleForm({ ...singleForm, call_type: v as 'call1' | 'call2' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call1">Llamada 1</SelectItem>
                          <SelectItem value="call2">Llamada 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isImporting}>
                    {isImporting ? 'Agregando...' : 'Agregar Contacto'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bulk Import */}
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Importación Masiva</CardTitle>
                <CardDescription>
                  Pega múltiples números (uno por línea). Formato: código_país, número o solo número
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Curso *</Label>
                      <Select
                        value={bulkForm.course_id}
                        onValueChange={(v) => setBulkForm({ ...bulkForm, course_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar curso" />
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
                    <div className="space-y-2">
                      <Label>Grupo origen</Label>
                      <Select
                        value={bulkForm.source_group}
                        onValueChange={(v) => setBulkForm({ ...bulkForm, source_group: v as GroupType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['G1', 'G2', 'G3', 'G4'] as GroupType[]).map((group) => (
                            <SelectItem key={group} value={group}>
                              {GROUP_LABELS[group]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de llamada</Label>
                      <Select
                        value={bulkForm.call_type}
                        onValueChange={(v) => setBulkForm({ ...bulkForm, call_type: v as 'call1' | 'call2' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call1">Llamada 1</SelectItem>
                          <SelectItem value="call2">Llamada 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Números (uno por línea) *</Label>
                    <Textarea
                      value={bulkForm.numbers}
                      onChange={(e) => setBulkForm({ ...bulkForm, numbers: e.target.value })}
                      placeholder={`+51\t999888777\n+52\t5512345678\n987654321`}
                      rows={10}
                      className="font-mono"
                    />
                    <p className="text-sm text-muted-foreground">
                      Puedes pegar directamente desde Excel. Formato: código_país[tab/coma]número o solo número (usará +51)
                    </p>
                  </div>
                  {importResult && (
                    <div className="flex gap-4">
                      <Badge variant="default" className="gap-1 bg-success">
                        <CheckCircle className="h-3 w-3" />
                        {importResult.success} exitosos
                      </Badge>
                      {importResult.errors > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {importResult.errors} errores
                        </Badge>
                      )}
                    </div>
                  )}
                  <Button type="submit" disabled={isImporting}>
                    {isImporting ? 'Importando...' : 'Importar Contactos'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
