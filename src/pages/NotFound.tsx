import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota não encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-center px-6">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="text-destructive" size={40} />
          </div>
        </div>
        <h1 className="text-7xl font-extrabold text-foreground tracking-tight">404</h1>
        <p className="mt-3 text-xl text-muted-foreground">Página não encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          O endereço <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> não existe.
        </p>
        <Link to="/" className="inline-block mt-8">
          <Button size="lg" className="gap-2">
            <Home size={18} /> Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
