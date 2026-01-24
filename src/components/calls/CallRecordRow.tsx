import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TableCell, TableRow } from '@/components/ui/table';
import { Copy, Check, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Call1Status, Call2Status, GroupType } from '@/types/database';
import { CALL1_STATUS_LABELS, CALL2_STATUS_LABELS, CALL1_STATUS_COLORS, CALL2_STATUS_COLORS, GROUP_LABELS } from '@/types/database';

export interface CallRecordRowProps {
  type: 'call1' | 'call2';
  record: {
    id: string;
    status: Call1Status | Call2Status;
    target_group?: GroupType;
    origin_group?: GroupType;
    observation?: string;
    contact: {
      country_code: string;
      phone_number: string;
      full_phone: string;
      course: {
        code: string;
        name: string;
      };
    };
  };
  onUpdate: (id: string, updates: any) => Promise<void>;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function CallRecordRow({ type, record, onUpdate, selected, onToggleSelect }: CallRecordRowProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(record.status);
  const [localGroup, setLocalGroup] = useState(record.target_group);
  const [localObservation, setLocalObservation] = useState(record.observation || '');

  const statusLabels = type === 'call1' ? CALL1_STATUS_LABELS : CALL2_STATUS_LABELS;
  const statusColors = type === 'call1' ? CALL1_STATUS_COLORS : CALL2_STATUS_COLORS;
  const availableStatuses = type === 'call1' 
    ? ['confirmara', 'no_contesta', 'asistira', 'no_asistira', 'se_unio', 'no_se_une']
    : ['matriculado', 'no_matriculado', 'no_contesta', 'confirmara', 'siguiente_mes'];

  const copyPhone = async () => {
    await navigator.clipboard.writeText(record.contact.full_phone);
    setCopied(true);
    toast.success('Número copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const cleanNumber = record.contact.full_phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(record.id, {
        status: localStatus,
        target_group: localGroup,
        observation: localObservation,
      });
      toast.success('Registro actualizado');
      setIsExpanded(false);
    } catch (error) {
      toast.error('Error al actualizar');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        {onToggleSelect && (
          <TableCell className="w-12">
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
          </TableCell>
        )}
        <TableCell className="font-mono">
          <div className="flex items-center gap-2">
            <span className="text-sm">{record.contact.full_phone}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={copyPhone}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-normal">
            {record.contact.course.code}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={cn('font-normal', statusColors[localStatus as keyof typeof statusColors])}>
            {statusLabels[localStatus as keyof typeof statusLabels]}
          </Badge>
        </TableCell>
        <TableCell>
          {localGroup ? (
            <Badge variant="secondary">{GROUP_LABELS[localGroup]}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4 text-success" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={onToggleSelect ? 6 : 5} className="p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={localStatus}
                  onValueChange={(v) => setLocalStatus(v as Call1Status | Call2Status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s as keyof typeof statusLabels]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grupo destino</label>
                <Select
                  value={localGroup || ''}
                  onValueChange={(v) => setLocalGroup(v as GroupType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(['G1', 'G2', 'G3', 'G4', 'M1'] as GroupType[]).map((g) => (
                      <SelectItem key={g} value={g}>
                        {GROUP_LABELS[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-3 md:col-span-1">
                <label className="text-sm font-medium">Observación</label>
                <Textarea
                  value={localObservation}
                  onChange={(e) => setLocalObservation(e.target.value)}
                  placeholder="Agregar observación..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
