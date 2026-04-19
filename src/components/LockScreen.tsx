import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const PIN_HASH = '0507';
const PIN_LENGTH = 4;

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const reset = () => {
    setShake(true);
    setError(true);
    setTimeout(() => {
      setShake(false);
      setPin(Array(PIN_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    }, 600);
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError(false);

    if (digit && index < PIN_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (digit && index === PIN_LENGTH - 1) {
      const entered = newPin.join('');
      if (entered === PIN_HASH) {
        sessionStorage.setItem('central_unlocked', '1');
        onUnlock();
      } else {
        reset();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;
    const newPin = [...pin];
    for (let i = 0; i < PIN_LENGTH; i++) {
      newPin[i] = pasted[i] || '';
    }
    setPin(newPin);

    if (pasted.length === PIN_LENGTH) {
      if (pasted === PIN_HASH) {
        sessionStorage.setItem('central_unlocked', '1');
        onUnlock();
      } else {
        reset();
      }
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="space-y-8 text-center">
        <div>
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-foreground">Central</h1>
          <p className="text-xs text-muted-foreground mt-1">Digite a senha para acessar</p>
        </div>

        <div
          className={cn(
            'flex gap-3 justify-center transition-transform relative',
            shake && 'animate-shake'
          )}
        >
          {pin.map((digit, i) => (
            <div
              key={i}
              className={cn(
                'w-12 h-14 flex items-center justify-center rounded-xl border-2 bg-card transition-colors cursor-text',
                error ? 'border-destructive' : digit ? 'border-primary' : 'border-border',
                'focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30'
              )}
              onClick={() => inputsRef.current[i]?.focus()}
            >
              {digit ? (
                <div className="w-3 h-3 rounded-full bg-foreground" />
              ) : null}
              <input
                ref={el => { inputsRef.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className="absolute opacity-0 w-0 h-0"
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-destructive font-medium">Senha incorreta</p>
        )}
      </div>
    </div>
  );
});

LockScreen.displayName = 'LockScreen';

export default LockScreen;
