import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Phone, MessageCircle, Copy, Check, Pin } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ActivePhoneIndicatorProps {
  phone: string;
  onClear: () => void;
  onScrollTo?: () => void;
}

export function ActivePhoneIndicator({ phone, onClear, onScrollTo }: ActivePhoneIndicatorProps) {
  const [copied, setCopied] = useState(false);

  const copyPhone = async () => {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    toast.success('Número copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const callPhone = () => {
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanNumber}`;
  };

  const openWhatsApp = () => {
    let cleanNumber = phone.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    window.open(`https://api.whatsapp.com/send?phone=${cleanNumber}`, '_blank');
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 bg-warning/95 text-warning-foreground rounded-full px-4 py-2 shadow-lg backdrop-blur-sm border border-warning">
        <Pin className="h-4 w-4 flex-shrink-0" />
        <span className="font-mono text-sm font-medium">{phone}</span>
        
        <div className="flex items-center gap-1 ml-2 border-l border-warning-foreground/20 pl-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-warning-foreground/10"
            onClick={copyPhone}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-warning-foreground/10"
            onClick={callPhone}
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-warning-foreground/10"
            onClick={openWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          {onScrollTo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs hover:bg-warning-foreground/10"
              onClick={onScrollTo}
            >
              Ir al registro
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-warning-foreground/10 ml-1"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
