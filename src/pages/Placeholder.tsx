import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="grid place-items-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <div className="text-lg font-semibold">Module scheduled for next iteration</div>
          <p className="max-w-md text-sm text-muted-foreground">
            The database, RLS policies and seed data for this module are already live. The operational UI for {title.toLowerCase()} will be added in the next build pass.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}