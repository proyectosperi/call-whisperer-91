import { useState, useRef } from 'react';
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
import { Upload, Plus, FileText, AlertCircle, CheckCircle, FileSpreadsheet, Download, Code2, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import type { GroupType } from '@/types/database';
import { GROUP_LABELS } from '@/types/database';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParsedContact {
  country_code: string;
  phone_number: string;
}

const downloadTemplate = () => {
  const templateData = [
    ['Código País', 'Número Teléfono'],
    ['+51', '912345678'],
    ['+51', '987654321'],
    ['+52', '5512345678'],
    ['+57', '3012345678'],
    ['+56', '961234567'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
  XLSX.writeFile(wb, 'plantilla_contactos.xlsx');
  toast.success('Plantilla descargada');
};

export default function Import() {
  const { courses } = useCourses();
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-PE');
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  // Función helper para obtener country_id basándose en el código de país
  const getCountryId = async (phoneCode: string): Promise<string | null> => {
    const { data } = await supabase
      .from('countries')
      .select('id')
      .eq('phone_code', phoneCode)
      .single();
    
    return data?.id || null;
  };

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

  // File import form
  const [fileForm, setFileForm] = useState({
    course_id: '',
    source_group: '' as GroupType | '',
    call_type: 'call1' as 'call1' | 'call2',
  });
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // HTML import form
  const [htmlForm, setHtmlForm] = useState({
    htmlContent: '',
    course_id: '',
    source_group: '' as GroupType | '',
    call_type: 'call1' as 'call1' | 'call2',
  });

  // Función para extraer números de teléfono de HTML
  const parsePhoneNumbersFromHTML = (html: string): ParsedContact[] => {
    addLog('Iniciando análisis de HTML...');
    
    // Extraer el texto del HTML (eliminar tags)
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    
    // Buscar todos los números de teléfono con formato +XX ...
    const phoneRegex = /(\+\d{1,3})\s*([\d\s]+)/g;
    const matches = [...textContent.matchAll(phoneRegex)];
    
    addLog(`Se encontraron ${matches.length} posibles números...`);
    
    const contacts: ParsedContact[] = [];
    const seen = new Set<string>();
    
    matches.forEach((match, index) => {
      const countryCode = match[1];
      const numberPart = match[2].replace(/\D/g, '');
      
      // Validar que el número tenga al menos 7 dígitos
      if (numberPart.length >= 7) {
        const fullPhone = `${countryCode}${numberPart}`;
        if (!seen.has(fullPhone)) {
          seen.add(fullPhone);
          contacts.push({
            country_code: countryCode,
            phone_number: numberPart,
          });
          if ((index + 1) % 20 === 0) {
            addLog(`Procesados ${index + 1} números...`);
          }
        }
      }
    });
    
    addLog(`✓ ${contacts.length} números únicos extraídos del HTML`);
    return contacts;
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.course_id || !singleForm.phone_number) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setIsImporting(true);
    try {
      const countryId = await getCountryId(singleForm.country_code);
      
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          country_code: singleForm.country_code,
          phone_number: singleForm.phone_number.replace(/\D/g, ''),
          country_id: countryId,
          course_id: singleForm.course_id,
          source_group: singleForm.source_group || null,
        })
        .select()
        .single();

      if (contactError) throw contactError;

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

    clearLogs();
    setIsImporting(true);
    setImportResult(null);

    addLog('Iniciando importación masiva por texto...');

    const lines = bulkForm.numbers.split('\n').filter((line) => line.trim());
    addLog(`Se encontraron ${lines.length} líneas para procesar`);
    
    let success = 0;
    let errors = 0;
    const duplicates: string[] = [];

    // Obtener contactos existentes para este curso
    addLog('Consultando duplicados existentes...');
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('country_code, phone_number')
      .eq('course_id', bulkForm.course_id);

    const existingPhones = new Set(
      (existingContacts || []).map(c => `${c.country_code}${c.phone_number}`)
    );

    addLog(`${existingPhones.size} contactos ya registrados en este curso`);

    for (const line of lines) {
      try {
        // Extraer código de país y número del formato +XX XXX XXX XXX
        const cleanLine = line.trim();
        const match = cleanLine.match(/^(\+\d{1,3})\s*(.+)$/);
        
        let countryCode = '+51';
        let phoneNumber = '';

        if (match) {
          countryCode = match[1];
          phoneNumber = match[2].replace(/\D/g, '');
        } else {
          // Intentar parsear con delimitadores tradicionales
          const parts = cleanLine.split(/[\t,;]/);
          if (parts.length >= 2) {
            countryCode = parts[0].trim();
            phoneNumber = parts[1].trim().replace(/\D/g, '');
          } else {
            phoneNumber = cleanLine.replace(/\D/g, '');
          }
        }

        if (!phoneNumber || phoneNumber.length < 7) continue;

        // Verificar duplicados
        const fullPhone = `${countryCode}${phoneNumber}`;
        if (existingPhones.has(fullPhone)) {
          duplicates.push(fullPhone);
          errors++;
          continue;
        }
        existingPhones.add(fullPhone);

        const countryId = await getCountryId(countryCode);

        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            country_code: countryCode,
            phone_number: phoneNumber,
            country_id: countryId,
            course_id: bulkForm.course_id,
            source_group: bulkForm.source_group || null,
          })
          .select()
          .single();

        if (contactError) {
          errors++;
          continue;
        }

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

      if ((success + errors) % 20 === 0) {
        addLog(`Progreso: ${success + errors}/${lines.length} procesados...`);
      }
    }

    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    addLog(`✓ Importación completada`);
    addLog(`   • Exitosos: ${success}`);
    addLog(`   • Duplicados: ${duplicates.length}`);
    addLog(`   • Errores: ${errors - duplicates.length}`);

    setImportResult({ success, errors });
    if (success > 0) {
      toast.success(`${success} contactos importados`);
      setBulkForm({ ...bulkForm, numbers: '' });
    }
    if (errors > 0) {
      const msg = duplicates.length > 0 
        ? `${errors} errores (${duplicates.length} duplicados)`
        : `${errors} errores durante la importación`;
      toast.error(msg);
    }

    setIsImporting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

        const contacts: ParsedContact[] = [];
        const seen = new Set<string>();
        
        // Skip header row if it looks like a header
        const startRow = jsonData.length > 0 && 
          typeof jsonData[0]?.[0] === 'string' && 
          (jsonData[0][0].toLowerCase().includes('codigo') || 
           jsonData[0][0].toLowerCase().includes('phone') ||
           jsonData[0][0].toLowerCase().includes('pais') ||
           jsonData[0][0].toLowerCase().includes('telefono')) ? 1 : 0;

        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          let countryCode = '+51';
          let phoneNumber = '';

          if (row.length >= 2) {
            // Two columns: country code and phone number
            const col1 = String(row[0] || '').trim();
            const col2 = String(row[1] || '').trim();
            
            if (col1.startsWith('+') || /^\d{1,3}$/.test(col1)) {
              countryCode = col1.startsWith('+') ? col1 : `+${col1}`;
              phoneNumber = col2.replace(/\D/g, '');
            } else {
              phoneNumber = col1.replace(/\D/g, '');
            }
          } else {
            // Single column: could be full phone with code or just number
            const col1 = String(row[0] || '').trim();
            const match = col1.match(/^(\+\d{1,3})\s*(.+)$/);
            if (match) {
              countryCode = match[1];
              phoneNumber = match[2].replace(/\D/g, '');
            } else {
              phoneNumber = col1.replace(/\D/g, '');
            }
          }

          if (phoneNumber && phoneNumber.length >= 7) {
            const fullPhone = `${countryCode}${phoneNumber}`;
            if (!seen.has(fullPhone)) {
              seen.add(fullPhone);
              contacts.push({ country_code: countryCode, phone_number: phoneNumber });
            }
          }
        }

        setParsedContacts(contacts);
        toast.success(`${contacts.length} contactos únicos encontrados en el archivo`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Error al leer el archivo. Asegúrate de que sea un archivo Excel o CSV válido.');
        setParsedContacts([]);
      }
    };

    reader.onerror = () => {
      toast.error('Error al leer el archivo');
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleFileImport = async () => {
    if (!fileForm.course_id) {
      toast.error('Selecciona un curso');
      return;
    }

    if (parsedContacts.length === 0) {
      toast.error('No hay contactos para importar');
      return;
    }

    clearLogs();
    setIsImporting(true);
    setImportResult(null);

    addLog(`Iniciando importación de ${parsedContacts.length} contactos...`);

    let success = 0;
    let errors = 0;
    const duplicates: string[] = [];

    // Obtener contactos existentes para este curso
    addLog('Verificando duplicados...');
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('country_code, phone_number')
      .eq('course_id', fileForm.course_id);

    const existingPhones = new Set(
      (existingContacts || []).map(c => `${c.country_code}${c.phone_number}`)
    );

    addLog(`${existingPhones.size} contactos ya registrados en este curso`);

    for (const contact of parsedContacts) {
      try {
        // Verificar duplicados
        const fullPhone = `${contact.country_code}${contact.phone_number}`;
        if (existingPhones.has(fullPhone)) {
          duplicates.push(fullPhone);
          errors++;
          continue;
        }
        existingPhones.add(fullPhone);

        const countryId = await getCountryId(contact.country_code);

        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            country_code: contact.country_code,
            phone_number: contact.phone_number,
            country_id: countryId,
            course_id: fileForm.course_id,
            source_group: fileForm.source_group || null,
          })
          .select()
          .single();

        if (contactError) {
          errors++;
          continue;
        }

        if (fileForm.call_type === 'call1') {
          await supabase.from('call1_records').insert({
            contact_id: newContact.id,
            target_group: fileForm.source_group || null,
          });
        } else {
          await supabase.from('call2_records').insert({
            contact_id: newContact.id,
            origin_group: fileForm.source_group || null,
          });
        }

        success++;
      } catch {
        errors++;
      }

      if ((success + errors) % 50 === 0) {
        addLog(`Progreso: ${success + errors}/${parsedContacts.length} procesados...`);
      }
    }

    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    addLog(`✓ Importación desde archivo completada`);
    addLog(`   • Exitosos: ${success}`);
    addLog(`   • Duplicados: ${duplicates.length}`);
    addLog(`   • Errores: ${errors - duplicates.length}`);

    setImportResult({ success, errors });
    if (success > 0) {
      toast.success(`${success} contactos importados desde archivo`);
      setParsedContacts([]);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    if (errors > 0) {
      const msg = duplicates.length > 0 
        ? `${errors} errores (${duplicates.length} duplicados en este curso)`
        : `${errors} errores durante la importación`;
      toast.error(msg);
    }

    setIsImporting(false);
  };

  const handleHTMLImport = async () => {
    if (!htmlForm.course_id) {
      toast.error('Selecciona un curso');
      return;
    }

    if (!htmlForm.htmlContent.trim()) {
      toast.error('Pega el código HTML');
      return;
    }

    clearLogs();
    setIsImporting(true);
    setImportResult(null);

    addLog('Iniciando proceso de importación desde HTML...');

    // Extraer números del HTML
    const contacts = parsePhoneNumbersFromHTML(htmlForm.htmlContent);

    if (contacts.length === 0) {
      addLog('✗ No se encontraron números válidos en el HTML');
      toast.error('No se encontraron números válidos');
      setIsImporting(false);
      return;
    }

    addLog(`Verificando duplicados en el curso...`);

    // Obtener contactos existentes para este curso
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('country_code, phone_number')
      .eq('course_id', htmlForm.course_id);

    const existingPhones = new Set(
      (existingContacts || []).map(c => `${c.country_code}${c.phone_number}`)
    );

    addLog(`${existingPhones.size} contactos ya registrados en este curso`);

    let success = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      try {
        // Verificar duplicados
        const fullPhone = `${contact.country_code}${contact.phone_number}`;
        if (existingPhones.has(fullPhone)) {
          skipped++;
          if (skipped <= 5) {
            addLog(`⊘ Duplicado: ${fullPhone}`);
          }
          continue;
        }
        existingPhones.add(fullPhone);

        const countryId = await getCountryId(contact.country_code);

        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            country_code: contact.country_code,
            phone_number: contact.phone_number,
            country_id: countryId,
            course_id: htmlForm.course_id,
            source_group: htmlForm.source_group || null,
          })
          .select()
          .single();

        if (contactError) {
          errors++;
          addLog(`✗ Error: ${fullPhone}`);
          continue;
        }

        if (htmlForm.call_type === 'call1') {
          await supabase.from('call1_records').insert({
            contact_id: newContact.id,
            target_group: htmlForm.source_group || null,
          });
        } else {
          await supabase.from('call2_records').insert({
            contact_id: newContact.id,
            origin_group: htmlForm.source_group || null,
          });
        }

        success++;
        if (success <= 10 || (success % 10 === 0)) {
          addLog(`✓ Importado: ${fullPhone} (${success}/${contacts.length})`);
        }
      } catch {
        errors++;
      }
    }

    if (skipped > 5) {
      addLog(`... y ${skipped - 5} duplicados más`);
    }

    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    addLog(`✓ Proceso completado`);
    addLog(`   • Exitosos: ${success}`);
    addLog(`   • Duplicados: ${skipped}`);
    addLog(`   • Errores: ${errors}`);

    setImportResult({ success, errors: errors + skipped });
    
    if (success > 0) {
      toast.success(`${success} contactos importados`);
      setHtmlForm({ ...htmlForm, htmlContent: '' });
    }
    if (skipped > 0) {
      toast.info(`${skipped} duplicados omitidos`);
    }
    if (errors > 0) {
      toast.error(`${errors} errores`);
    }

    setIsImporting(false);
  };

  const clearFile = () => {
    setParsedContacts([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppLayout title="Importar Contactos">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Importar Contactos
          </h1>
          <p className="text-muted-foreground">
            Agrega números de forma individual, masiva o desde archivo Excel/CSV
          </p>
        </div>

        <Tabs defaultValue="file" className="space-y-6">
          <TabsList>
            <TabsTrigger value="file" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Archivo Excel/CSV
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-2">
              <Code2 className="h-4 w-4" />
              HTML/WhatsApp
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <FileText className="h-4 w-4" />
              Texto Masivo
            </TabsTrigger>
            <TabsTrigger value="single" className="gap-2">
              <Plus className="h-4 w-4" />
              Individual
            </TabsTrigger>
          </TabsList>

          {/* File Import */}
          <TabsContent value="file">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Importar desde Archivo</CardTitle>
                    <CardDescription>
                      Sube un archivo Excel (.xlsx, .xls) o CSV con los números de teléfono
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Curso *</Label>
                    <Select
                      value={fileForm.course_id}
                      onValueChange={(v) => setFileForm({ ...fileForm, course_id: v })}
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
                      value={fileForm.source_group}
                      onValueChange={(v) => setFileForm({ ...fileForm, source_group: v as GroupType })}
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
                      value={fileForm.call_type}
                      onValueChange={(v) => setFileForm({ ...fileForm, call_type: v as 'call1' | 'call2' })}
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
                  <Label>Archivo Excel o CSV</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {fileName && (
                      <Button variant="outline" onClick={clearFile}>
                        Limpiar
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    El archivo debe tener una columna con números de teléfono. Opcionalmente puede tener una columna de código de país.
                  </p>
                </div>

                {parsedContacts.length > 0 && (
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Vista previa</span>
                      <Badge variant="secondary">{parsedContacts.length} contactos</Badge>
                    </div>
                    <div className="max-h-40 overflow-auto text-sm font-mono space-y-1">
                      {parsedContacts.slice(0, 10).map((c, i) => (
                        <div key={i} className="text-muted-foreground">
                          {c.country_code} {c.phone_number}
                        </div>
                      ))}
                      {parsedContacts.length > 10 && (
                        <div className="text-muted-foreground">
                          ... y {parsedContacts.length - 10} más
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

                {logs.length > 0 && (
                  <div className="rounded-lg border bg-slate-950 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-green-400" />
                        <span className="font-medium text-green-400">Logs de Importación</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearLogs}>
                        Limpiar
                      </Button>
                    </div>
                    <ScrollArea className="h-48">
                      <div className="text-xs font-mono text-green-400 space-y-1">
                        {logs.map((log, i) => (
                          <div key={i}>{log}</div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <Button 
                  onClick={handleFileImport} 
                  disabled={isImporting || parsedContacts.length === 0}
                >
                  {isImporting ? 'Importando...' : `Importar ${parsedContacts.length} Contactos`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HTML Import */}
          <TabsContent value="html">
            <Card>
              <CardHeader>
                <CardTitle>Importar desde HTML/WhatsApp</CardTitle>
                <CardDescription>
                  Pega el código HTML de WhatsApp Web con números de teléfono. El sistema extrae automáticamente solo los números.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Curso *</Label>
                    <Select
                      value={htmlForm.course_id}
                      onValueChange={(v) => setHtmlForm({ ...htmlForm, course_id: v })}
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
                      value={htmlForm.source_group}
                      onValueChange={(v) => setHtmlForm({ ...htmlForm, source_group: v as GroupType })}
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
                      value={htmlForm.call_type}
                      onValueChange={(v) => setHtmlForm({ ...htmlForm, call_type: v as 'call1' | 'call2' })}
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
                  <Label>Código HTML *</Label>
                  <Textarea
                    value={htmlForm.htmlContent}
                    onChange={(e) => setHtmlForm({ ...htmlForm, htmlContent: e.target.value })}
                    placeholder='<span>+51 918 951 753, +52 1 656 307 3112, ...</span>'
                    rows={8}
                    className="font-mono text-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Pega aquí el código HTML copiado de WhatsApp Web. El sistema extraerá solo los números de teléfono y verificará duplicados.
                  </p>
                </div>

                {logs.length > 0 && (
                  <div className="rounded-lg border bg-slate-950 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-green-400" />
                        <span className="font-medium text-green-400">Logs de Importación</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearLogs}>
                        Limpiar
                      </Button>
                    </div>
                    <ScrollArea className="h-48">
                      <div className="text-xs font-mono text-green-400 space-y-1">
                        {logs.map((log, i) => (
                          <div key={i}>{log}</div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {importResult && (
                  <div className="flex gap-4">
                    <Badge variant="default" className="gap-1 bg-success">
                      <CheckCircle className="h-3 w-3" />
                      {importResult.success} exitosos
                    </Badge>
                    {importResult.errors > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {importResult.errors} errores/duplicados
                      </Badge>
                    )}
                  </div>
                )}

                <Button 
                  onClick={handleHTMLImport} 
                  disabled={isImporting}
                >
                  {isImporting ? 'Procesando...' : 'Procesar HTML'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

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
                <CardTitle>Importación Masiva por Texto</CardTitle>
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
                      placeholder={`+51 912 345 678\n+52 1 55 1234 5678\n+57 301 234 5678\n+56 9 6123 4567`}
                      rows={10}
                      className="font-mono"
                    />
                    <p className="text-sm text-muted-foreground">
                      Acepta números con espacios. Formatos válidos: "+51 912 345 678", "+51\t912345678", o solo número (usará +51)
                    </p>
                  </div>

                  {logs.length > 0 && (
                    <div className="rounded-lg border bg-slate-950 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-green-400">Logs de Importación</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearLogs}>
                          Limpiar
                        </Button>
                      </div>
                      <ScrollArea className="h-48">
                        <div className="text-xs font-mono text-green-400 space-y-1">
                          {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

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
