export type Role = "OWNER" | "MANAGER" | "EMPLOYEE";
export type MovementType = "IN" | "OUT";
export type MovementSource = "MANUAL" | "QRCODE";
export type PackageType = "CX" | "PCT";
export type PaymentMethod = "DINHEIRO" | "PIX" | "CARTAO" | "FIADO" | "BOLETO";

export interface Adega {
  id: string;
  name: string;
  cnpjCpf: string | null;
  importEnabled: boolean;
  approved: boolean;
  paidUntil: string | null;
  maxFiliais: number;
  createdAt: string;
}

export interface Filial {
  id: string;
  adegaId: string;
  name: string;
  createdAt: string;
}

export interface Promotion {
  id: string;
  adegaId: string;
  filialId: string;
  productId: string;
  promoPrice: number;
  startDate: string | null;
  endDate: string | null;
  minQuantity: number | null;
  createdAt: string;
  createdByUserId: string;
}

export interface User {
  id: string;
  adegaId: string;
  filialId: string | null;
  name: string;
  phone: string | null;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Product {
  id: string;
  adegaId: string;
  filialId: string;
  code: string;
  barcode: string | null;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStockAlert: number | null;
  packageType: PackageType | null;
  unitsPerPackage: number | null;
  active: boolean;
  createdAt: string;
}

export interface Movement {
  id: string;
  adegaId: string;
  filialId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  unitValue: number;
  totalValue: number;
  createdAt: string;
  createdByUserId: string;
  source: MovementSource;
  pedidoId: string | null;
}

export interface MovementWithRelations extends Movement {
  productName: string;
  productUnit: string;
  createdByName: string;
}

export interface Pedido {
  id: string;
  adegaId: string;
  filialId: string;
  type: MovementType;
  number: number;
  totalValue: number;
  createdAt: string;
  createdByUserId: string;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  paymentMethod: PaymentMethod | null;
  boletoDueDays: number | null;
}

export interface PedidoItem {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
}

export interface PedidoWithItems extends Pedido {
  createdByName: string;
  cancelledByName: string | null;
  items: PedidoItem[];
}
