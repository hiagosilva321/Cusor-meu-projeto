import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aguardando_pagamento: 'bg-orange-100 text-orange-800',
  pago: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  entregue: 'bg-blue-100 text-blue-800',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'pago') {
      patch.payment_status = 'paid';
      patch.paid_at = new Date().toISOString();
    }
    await supabase.from('orders').update(patch).eq('id', id);
    fetchOrders();
  };

  if (loading) {
    return (
      <AdminLayout title="Pedidos PIX">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pedidos PIX">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package size={24} /> Pedidos
          </h1>
          <Badge variant="secondary">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</Badge>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Caçamba</th>
                <th className="text-left p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Pagamento</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-t hover:bg-muted/50">
                  <td className="p-3">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <div className="font-medium">{order.nome}</div>
                    <div className="text-xs text-muted-foreground">{order.whatsapp}</div>
                  </td>
                  <td className="p-3">{order.tamanho} x{order.quantidade}</td>
                  <td className="p-3 font-medium">R$ {Number(order.valor_total).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${statusColors[order.status] || 'bg-gray-100'}`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="aguardando_pagamento">Aguardando Pgto</option>
                      <option value="pago">Pago</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Pedido #{order.id.slice(0, 8)}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 text-sm">
                          <div><strong>Cliente:</strong> {order.nome}</div>
                          <div><strong>WhatsApp:</strong> {order.whatsapp}</div>
                          {order.email && <div><strong>Email:</strong> {order.email}</div>}
                          {order.cpf_cnpj && <div><strong>CPF/CNPJ:</strong> {order.cpf_cnpj}</div>}
                          <div><strong>Endereço:</strong> {[order.endereco, order.numero, order.bairro, order.cidade, order.estado].filter(Boolean).join(', ')}</div>
                          <div><strong>Caçamba:</strong> {order.tamanho} x{order.quantidade}</div>
                          <div><strong>Valor:</strong> R$ {Number(order.valor_total).toFixed(2)}</div>
                          <div><strong>Pagamento:</strong> {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}</div>
                          {order.paid_at && <div><strong>Pago em:</strong> {new Date(order.paid_at).toLocaleString('pt-BR')}</div>}
                          {order.observacoes && <div><strong>Obs:</strong> {order.observacoes}</div>}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum pedido ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
