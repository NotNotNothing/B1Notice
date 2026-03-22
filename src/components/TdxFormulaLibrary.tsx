"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TdxFormula, TdxFormulaInput } from "@/types/tdx-formula";

interface TdxFormulaLibraryProps {
  onSelectFormula: (formula: string) => void;
  currentFormula?: string;
}

export function TdxFormulaLibrary({
  onSelectFormula,
  currentFormula,
}: TdxFormulaLibraryProps) {
  const [formulas, setFormulas] = useState<TdxFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFormula, setEditingFormula] = useState<TdxFormula | null>(null);
  const [formData, setFormData] = useState<TdxFormulaInput>({
    name: "",
    formula: "",
    description: "",
    isDefault: false,
  });

  const loadFormulas = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tdx-formulas");
      if (!response.ok) {
        throw new Error("加载公式库失败");
      }
      const data = (await response.json()) as TdxFormula[];
      setFormulas(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载公式库失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFormulas();
  }, []);

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.formula) {
        toast.error("公式名称和公式内容不能为空");
        return;
      }

      const url = editingFormula
        ? `/api/tdx-formulas/${editingFormula.id}`
        : "/api/tdx-formulas";
      const method = editingFormula ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "保存公式失败");
      }

      toast.success(editingFormula ? "公式已更新" : "公式已保存");
      setShowEditor(false);
      setEditingFormula(null);
      setFormData({ name: "", formula: "", description: "", isDefault: false });
      await loadFormulas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存公式失败");
    }
  };

  const handleEdit = (formula: TdxFormula) => {
    setEditingFormula(formula);
    setFormData({
      name: formula.name,
      formula: formula.formula,
      description: formula.description,
      isDefault: formula.isDefault,
    });
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个公式吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/tdx-formulas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "删除公式失败");
      }

      toast.success("公式已删除");
      await loadFormulas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除公式失败");
    }
  };

  const handleSetDefault = async (formula: TdxFormula) => {
    try {
      const response = await fetch(`/api/tdx-formulas/${formula.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formula.name,
          formula: formula.formula,
          description: formula.description,
          isDefault: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "设置默认公式失败");
      }

      toast.success("已设置为默认公式");
      await loadFormulas();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置默认公式失败");
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingFormula(null);
    setFormData({ name: "", formula: "", description: "", isDefault: false });
  };

  return (
    <Card className="rounded-3xl border border-terminal-border-default bg-white/90 shadow-sm backdrop-blur dark:border-terminal-border-default dark:bg-surface-panel/80">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
          <BookOpen className="h-5 w-5" />
          公式库
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowEditor(true);
          }}
          disabled={showEditor}
          className="rounded-md"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建公式
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showEditor ? (
          <div className="space-y-4 rounded-lg border border-terminal-border-default p-4 dark:border-slate-700">
            <div className="space-y-2">
              <Label htmlFor="formula-name">公式名称</Label>
              <Input
                id="formula-name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="例如：BBI金叉选股"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula-content">公式内容</Label>
              <Textarea
                id="formula-content"
                value={formData.formula}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    formula: event.target.value,
                  }))
                }
                className="min-h-[120px] font-mono text-sm"
                placeholder="XG: CROSS(C, BBI) AND J < 20;"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formula-description">公式说明（可选）</Label>
              <Textarea
                id="formula-description"
                value={formData.description || ""}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-[60px]"
                placeholder="例如：筛选收盘价金叉BBI且J值小于20的股票"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-default"
                  checked={formData.isDefault}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      isDefault: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-terminal-border-default"
                />
                <Label htmlFor="is-default" className="text-sm">
                  设为默认公式
                </Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="rounded-md"
                >
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  className="rounded-md"
                >
                  <Check className="mr-2 h-4 w-4" />
                  保存
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground dark:text-slate-300">
            加载中...
          </p>
        ) : formulas.length === 0 ? (
          <p className="text-sm text-muted-foreground dark:text-slate-300">
            暂无保存的公式，点击"新建公式"开始创建。
          </p>
        ) : (
          <div className="space-y-3">
            {formulas.map((formula) => (
              <div
                key={formula.id}
                className="rounded-md border border-terminal-border-default p-3 transition-all hover:border-terminal-border-default dark:border-slate-700 dark:hover:border-slate-600"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {formula.name}
                      </h4>
                      {formula.isDefault && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-blue-500 text-xs text-blue-600 dark:text-blue-400"
                        >
                          默认
                        </Badge>
                      )}
                    </div>
                    {formula.description && (
                      <p className="mt-1 text-sm text-muted-foreground dark:text-slate-300">
                        {formula.description}
                      </p>
                    )}
                  </div>
                </div>
                <pre className="mb-3 overflow-x-auto rounded-lg bg-surface-panel p-2 text-xs font-mono text-foreground dark:bg-slate-800 dark:text-slate-300">
                  {formula.formula}
                </pre>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectFormula(formula.formula)}
                      disabled={currentFormula === formula.formula}
                      className="rounded-md"
                    >
                      {currentFormula === formula.formula
                        ? "当前使用"
                        : "使用此公式"}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {!formula.isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(formula)}
                        className="rounded-md text-foreground hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white"
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(formula)}
                      className="rounded-md text-foreground hover:text-slate-900 dark:text-muted-foreground dark:hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(formula.id)}
                      className="rounded-md text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
