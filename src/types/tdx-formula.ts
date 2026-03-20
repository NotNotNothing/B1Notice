export interface TdxFormula {
  id: string;
  userId: string;
  name: string;
  formula: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TdxFormulaInput {
  name: string;
  formula: string;
  description?: string | null;
  isDefault?: boolean;
}
