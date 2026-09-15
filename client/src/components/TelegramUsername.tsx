import { Copy, ExternalLink } from 'lucide-react';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';

interface TelegramUsernameProps {
  username: string;
  className?: string;
}

export function TelegramUsername({ username, className = '' }: TelegramUsernameProps) {
  const handle = username.trim().replace(/^@/, '');
  const display = handle ? `@${handle}` : username;
  const link = /^[A-Za-z0-9_]{5,32}$/.test(handle) ? `https://t.me/${handle}` : null;

  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(display);
      } else {
        const field = document.createElement('textarea');
        field.value = display;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Copy failed');
      }
      toast.success('Username скопирован');
    } catch {
      toast.error('Не удалось скопировать username');
    }
  };

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}
          className="min-w-0 break-all text-[#643487] underline-offset-2 hover:underline focus-visible:underline"
          title={`Открыть ${display} в Telegram`}>
          {display}
        </a>
      ) : <span className="min-w-0 break-all">{display}</span>}
      {link && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#8B7198]" aria-hidden="true" />}
      <button type="button" onClick={copy} aria-label={`Скопировать ${display}`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#643487] hover:bg-[#F3EAF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8E52AD]"
        title="Скопировать username">
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
