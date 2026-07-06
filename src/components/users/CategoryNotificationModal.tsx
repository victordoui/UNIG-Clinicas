import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Mail, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OptionBadge } from "@/components/ui/select";
import { categories } from "@/lib/categoryUtils";

interface CategoryNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryNotificationModal({ open, onOpenChange }: CategoryNotificationModalProps) {
  const [categoryEmails, setCategoryEmails] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCategoryEmails();
    }
  }, [open]);

  const loadCategoryEmails = async () => {
    try {
      setLoading(true);
      const emailsByCategory: Record<string, string[]> = {};

      categories.forEach((category) => {
        emailsByCategory[category.value] = [];
      });

      setCategoryEmails(emailsByCategory);
    } catch (error) {
      console.error("Error loading category emails:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os emails das categorias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addEmail = (category: string) => {
    const currentEmails = categoryEmails[category] || [];
    if (currentEmails.length < 3) {
      setCategoryEmails((prev) => ({
        ...prev,
        [category]: [...currentEmails, ""],
      }));
    }
  };

  const removeEmail = (category: string, index: number) => {
    setCategoryEmails((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const updateEmail = (category: string, index: number, email: string) => {
    setCategoryEmails((prev) => ({
      ...prev,
      [category]: prev[category].map((e, i) => i === index ? email : e),
    }));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const saveEmails = async () => {
    try {
      setLoading(true);

      for (const [category, emails] of Object.entries(categoryEmails)) {
        for (const email of emails) {
          if (email && !validateEmail(email)) {
            toast({
              title: "Email inválido",
              description: `O email "${email}" na categoria ${categories.find((c) => c.value === category)?.label} não é válido.`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      const { error: deleteError } = await supabase
        .from("category_notifications")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      const insertData = [];
      for (const [category, emails] of Object.entries(categoryEmails)) {
        for (const email of emails) {
          if (email && validateEmail(email)) {
            insertData.push({
              category,
              notification_email: email,
            });
          }
        }
      }

      if (insertData.length > 0) {
        const { error: insertError } = await supabase
          .from("category_notifications")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      toast({
        title: "Sucesso",
        description: "Emails das categorias salvos com sucesso!",
        variant: "default",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving emails:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os emails.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configurar Notificações por Categoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure os emails que receberão notificações quando produtos de cada categoria forem adicionados ao estoque.
            Máximo de 3 emails por categoria.
          </p>

          {categories.map((category) => (
            <Card key={category.value}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <OptionBadge domain="productCategory" value={category.value} label={category.label} />
                  <span className="text-sm text-muted-foreground">
                    ({(categoryEmails[category.value] || []).filter((email) => email).length}/3)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(categoryEmails[category.value] || []).map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`email-${category.value}-${index}`} className="sr-only">
                        Email {index + 1}
                      </Label>
                      <Input
                        id={`email-${category.value}-${index}`}
                        type="email"
                        placeholder="exemplo@empresa.com"
                        value={email}
                        onChange={(e) => updateEmail(category.value, index, e.target.value)}
                        className={email && !validateEmail(email) ? "border-destructive" : ""}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmail(category.value, index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {(!categoryEmails[category.value] || categoryEmails[category.value].length < 3) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEmail(category.value)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Email
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveEmails} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
