import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import QuickInput from './QuickInput';
import { cn } from '@/lib/utils';

export default function CaptureFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Capturar nova ideia"
        className={cn(
          'fixed z-40 bottom-20 right-4 h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg shadow-primary/30',
          'flex items-center justify-center',
          'hover:scale-105 active:scale-95 transition-transform',
          'ring-4 ring-primary/10'
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t pb-6 max-h-[80vh]">
          <SheetHeader className="text-left mb-3">
            <SheetTitle className="text-base flex items-center gap-2">
              <span>⚡</span> Captura rápida
            </SheetTitle>
          </SheetHeader>
          <div onClick={() => setTimeout(() => setOpen(false), 150)}>
            <QuickInput />
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Texto, foto ou áudio. A IA interpreta e organiza.
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
