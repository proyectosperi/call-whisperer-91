import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Country {
  id: string;
  code: string;
  name: string;
  phone_code: string;
}

export default function Countries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone_code: '',
  });

  const fetchCountries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (!error && data) {
      setCountries(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const resetForm = () => {
    setFormData({ code: '', name: '', phone_code: '' });
    setEditingCountry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCountry) {
        const { error } = await supabase
          .from('countries')
          .update(formData)
          .eq('id', editingCountry);

        if (error) throw error;
        toast.success('País actualizado');
      } else {
        const { error } = await supabase
          .from('countries')
          .insert(formData);

        if (error) throw error;
        toast.success('País creado');
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchCountries();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Este código de país ya existe');
      } else {
        toast.error('Error al guardar el país');
      }
    }
  };

  const handleEdit = (country: Country) => {
    setFormData({
      code: country.code,
      name: country.name,
      phone_code: country.phone_code,
    });
    setEditingCountry(country.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este país? Los contactos asociados no se eliminarán.')) {
      try {
        const { error } = await supabase
          .from('countries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('País eliminado');
        fetchCountries();
      } catch (error) {
        toast.error('Error al eliminar el país. Puede que tenga contactos asociados.');
      }
    }
  };

  return (
    <AppLayout title="Países">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Gestión de Países
            </h1>
            <p className="text-muted-foreground">
              Administra los códigos de país para la importación de contactos
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo País
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCountry ? 'Editar País' : 'Nuevo País'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código ISO</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PE, MX, CO..."
                    maxLength={2}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Código de 2 letras (ISO 3166-1)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del País</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Perú, México, Colombia..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_code">Código Telefónico</Label>
                  <Input
                    id="phone_code"
                    value={formData.phone_code}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (!value.startsWith('+')) value = '+' + value;
                      setFormData({ ...formData, phone_code: value });
                    }}
                    placeholder="+51, +52, +57..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">Debe comenzar con +</p>
                </div>
                <Button type="submit" className="w-full">
                  {editingCountry ? 'Actualizar' : 'Crear País'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando...</div>
            ) : countries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay países registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código ISO</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Código Telefónico</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.code}</TableCell>
                      <TableCell>{country.name}</TableCell>
                      <TableCell className="font-mono">{country.phone_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(country)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(country.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
