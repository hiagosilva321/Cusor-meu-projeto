import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

export function AdminThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useAdminTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
