import { CreditCard, QrCode, Banknote, Landmark, type LucideIcon } from "lucide-react";

// Catálogo único dos métodos de pagamento. Usado no admin (teto do plano),
// nas configurações do médico (ativar/desativar) e na tela pública (escolha).

export type MetodoPagamento = "credito" | "debito" | "pix" | "dinheiro";

export const METODOS_PAGAMENTO: {
  value: MetodoPagamento;
  label: string;
  /** true = pago online via Mercado Pago; false = presencial (dinheiro) */
  online: boolean;
  icon: LucideIcon;
}[] = [
  { value: "credito", label: "Cartão de crédito", online: true, icon: CreditCard },
  { value: "debito", label: "Cartão de débito", online: true, icon: Landmark },
  { value: "pix", label: "Pix", online: true, icon: QrCode },
  { value: "dinheiro", label: "Dinheiro", online: false, icon: Banknote },
];

export const METODO_LABEL: Record<MetodoPagamento, string> = {
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
};
