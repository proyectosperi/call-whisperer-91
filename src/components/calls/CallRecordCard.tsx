import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Check, MessageCircle, ChevronDown, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Call1Status, Call2Status, GroupType } from '@/types/database';
import { CALL1_STATUS_LABELS, CALL2_STATUS_LABELS, CALL1_STATUS_COLORS, CALL2_STATUS_COLORS, GROUP_LABELS } from '@/types/database';

export interface CallRecordCardProps {
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
    caller?: {
      full_name: string;
    };
  };
  onUpdate: (id: string, updates: any) => Promise<void>;
  selected?: boolean;
  onToggleSelect?: () => void;
  showCaller?: boolean;
}

export function CallRecordCard({ type, record, onUpdate, selected, onToggleSelect, showCaller }: CallRecordCardProps) {
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

  const callPhone = () => {
    window.location.href = `tel:${record.contact.full_phone}`;
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
    <Card className={cn("transition-shadow", selected && "ring-2 ring-primary")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <Checkbox 
              checked={selected} 
              onCheckedChange={onToggleSelect}
              className="mt-1"
            />
          )}
          
          <div className="flex-1 min-w-0 space-y-3">
            {/* Phone number and actions */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-base font-medium truncate">
                {record.contact.full_phone}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={copyPhone}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={callPhone}
                >
                  <Phone className="h-4 w-4 text-primary" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 text-success" />
                </Button>
              </div>
            </div>

            {/* Course and status */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {record.contact.course.code}
              </Badge>
              <Badge className={cn('font-normal', statusColors[localStatus as keyof typeof statusColors])}>
                {statusLabels[localStatus as keyof typeof statusLabels]}
              </Badge>
              {type === 'call2' && record.origin_group && (
                <Badge variant="outline" className="text-xs">
                  Origen: {GROUP_LABELS[record.origin_group]}
                </Badge>
              )}
              {localGroup && (
                <Badge variant="secondary" className="text-xs">
                  Destino: {GROUP_LABELS[localGroup]}
                </Badge>
              )}
              {showCaller && record.caller?.full_name && (
                <Badge variant="outline" className="text-xs bg-muted">
                  📞 {record.caller.full_name}
                </Badge>
              )}
              {showCaller && !record.caller?.full_name && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Sin asignar
                </Badge>
              )}
            </div>

            {/* Expandable form */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", isExpanded && "rotate-180")} />
                  {isExpanded ? 'Ocultar' : 'Actualizar'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                        {type === 'call2' ? (
                          <SelectItem value="M1">{GROUP_LABELS['M1']}</SelectItem>
                        ) : (
                          (['G1', 'G2', 'G3', 'G4', 'M1'] as GroupType[]).map((g) => (
                            <SelectItem key={g} value={g}>
                              {GROUP_LABELS[g]}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observación</label>
                  <Textarea
                    value={localObservation}
                    onChange={(e) => setLocalObservation(e.target.value)}
                    placeholder="Agregar observación..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleSave} disabled={isUpdating} className="w-full">
                  {isUpdating ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
