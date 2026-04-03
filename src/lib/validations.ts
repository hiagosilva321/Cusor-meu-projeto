import { z } from 'zod';
import { unmask } from './masks';

/** Step 1 — Pedido */
export const checkoutStep1Schema = z.object({
  tamanho: z.string().min(1, 'Selecione o tamanho'),
  quantidade: z.string().regex(/^[1-5]$/, 'Quantidade entre 1 e 5'),
  data_entrega: z.string().optional(),
  horario_entrega: z.enum(['manha', 'tarde', 'dia_todo']),
  observacoes: z.string().max(1000).optional(),
});

/** Step 2 — Dados pessoais */
export const checkoutStep2Schema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  whatsapp: z.string()
    .min(1, 'WhatsApp é obrigatório')
    .refine((v) => unmask(v).length >= 10, 'WhatsApp deve ter pelo menos 10 dígitos'),
  email: z.string().email('E-mail inválido').max(255).or(z.literal('')).optional(),
  cpf_cnpj: z.string()
    .refine((v) => {
      if (!v) return true;
      const digits = unmask(v);
      return digits.length === 11 || digits.length === 14;
    }, 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos')
    .optional(),
});

/** Step 3 — Endereço */
export const checkoutStep3Schema = z.object({
  cep: z.string()
    .refine((v) => {
      if (!v) return true;
      return unmask(v).length === 8;
    }, 'CEP deve ter 8 dígitos')
    .optional(),
  endereco: z.string().max(200).optional(),
  numero: z.string().max(10).optional(),
  complemento: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  estado: z.string().max(2).optional(),
});

export type CheckoutStep1 = z.infer<typeof checkoutStep1Schema>;
export type CheckoutStep2 = z.infer<typeof checkoutStep2Schema>;
export type CheckoutStep3 = z.infer<typeof checkoutStep3Schema>;
