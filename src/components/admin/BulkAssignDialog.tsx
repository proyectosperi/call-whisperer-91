import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCallers } from '@/hooks/useCallers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Loader2, UserX, UserPlus } from 'lucide-react';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  callType: 'call1' | 'call2';
  onSuccess: () => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedIds,
  callType,
  onSuccess,
}: BulkAssignDialogProps) {
  const { callers, isLoading: loadingCallers } = useCallers();
  const [selectedCaller, setSelectedCaller] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [action, setAction] = useState<'assign' | 'unassign'>('assign');

  const handleAssign = async () => {
    if (action === 'assign' && !selectedCaller) {
      toast.error('Selecciona una llamadora');
      return;
    }

    setIsAssigning(true);
    try {
      const tableName = callType === 'call1' ? 'call1_records' : 'call2_records';

      const { error } = await supabase
        .from(tableName)
        .update({ caller_id: action === 'assign' ? selectedCaller : null })
        .in('id', selectedIds);

      if (error) throw error;

      const message = action === 'assign'
        ? `${selectedIds.length} registros asignados correctamente`
        : `${selectedIds.length} registros desasignados correctamente`;
      
      toast.success(message);
      onSuccess();
      onOpenChange(false);
      setSelectedCaller('');
      setAction('assign');
    } catch (err) {
      const errorMessage = action === 'assign'
        ? 'Error al asignar registros'
        : 'Error al desasignar registros';
      toast.error(errorMessage);
      console.error(err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestionar Asignación
          </DialogTitle>
          <DialogDescription>
            Asigna o desasigna números de llamadoras
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.length}</Badge>
            <span className="text-sm text-muted-foreground">
              registros seleccionados
            </span>
          </div>

          <div className="space-y-3">
            <Label>Acción a realizar</Label>
            <RadioGroup value={action} onValueChange={(value) => setAction(value as 'assign' | 'unassign')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assign" id="assign" />
                <Label htmlFor="assign" className="flex items-center gap-2 cursor-pointer font-normal">
                  <UserPlus className="h-4 w-4" />
                  Asignar a una llamadora
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unassign" id="unassign" />
                <Label htmlFor="unassign" className="flex items-center gap-2 cursor-pointer font-normal">
                  <UserX className="h-4 w-4" />
                  Desasignar (remover llamadora)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {action === 'assign' && (
            <div className="space-y-2">
              <Label>Seleccionar Llamadora</Label>
              {loadingCallers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando llamadoras...
                </div>
              ) : callers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay llamadoras registradas
                </p>
              ) : (
                <Select value={selectedCaller} onValueChange={setSelectedCaller}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar llamadora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {callers.map((caller) => (
                      <SelectItem key={caller.user_id} value={caller.user_id}>
                        {caller.full_name} ({caller.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={(action === 'assign' && !selectedCaller) || isAssigning || selectedIds.length === 0}
            variant={action === 'unassign' ? 'destructive' : 'default'}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {action === 'assign' ? 'Asignando...' : 'Desasignando...'}
              </>
            ) : (
              <>
                {action === 'assign' ? (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Asignar
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Desasignar
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
