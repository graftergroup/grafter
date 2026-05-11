import { Banknote } from "lucide-react"
import { ModuleGate } from "@/components/ModuleGate"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function PayrollContent() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Payroll</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Module</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Full payroll processing, pay runs, HMRC submissions and payslips will be available here once the Payroll module is fully configured.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function HRPayroll() {
  return (
    <ModuleGate slug="payroll" moduleName="Payroll Module">
      <PayrollContent />
    </ModuleGate>
  )
}
