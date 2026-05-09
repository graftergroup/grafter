import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useApi } from "@/hooks/useApi";
import type { Invoice, Payment } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/admin/SearchFilter";
import { Pagination } from "@/components/admin/Pagination";

const ITEMS_PER_PAGE = 10;

export function RevenueManagement() {
  const { call } = useApi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invoicesData, paymentsData] = await Promise.all([
          call("/invoices"),
          call("/payments"),
        ]);

        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      } catch (err) {
        console.error("Failed to load revenue data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call]);

  // Filter and paginate invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.customer_id.toString().includes(invoiceSearch.toLowerCase())
    );
  }, [invoices, invoiceSearch]);

  const invoiceTotalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * ITEMS_PER_PAGE,
    invoicePage * ITEMS_PER_PAGE
  );

  // Filter and paginate payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) =>
      p.invoice_id.toString().includes(paymentSearch.toLowerCase())
    );
  }, [payments, paymentSearch]);

  const paymentTotalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * ITEMS_PER_PAGE,
    paymentPage * ITEMS_PER_PAGE
  );

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = totalRevenue - paidAmount;

  if (isLoading) {
    return (
      <AdminLayout title="Revenue Management" description="Manage invoices and payments">
        <div className="flex items-center justify-center h-96">Loading revenue data...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Revenue Management" description="Manage invoices and payments">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${paidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>All invoices for your franchise</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchFilter
              placeholder="Search by invoice number or customer..."
              value={invoiceSearch}
              onChange={setInvoiceSearch}
              onClear={() => setInvoiceSearch("")}
            />
          </div>

          {paginatedInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {invoices.length === 0 ? "No invoices yet" : "No matching invoices found"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>{String(invoice.customer_id).slice(0, 8)}</TableCell>
                        <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>${invoice.tax.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">${invoice.total.toFixed(2)}</TableCell>
                        <TableCell>
                          {invoice.due_date
                            ? new Date(invoice.due_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">pending</Badge>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {invoiceTotalPages > 1 && (
                <Pagination
                  currentPage={invoicePage}
                  totalPages={invoiceTotalPages}
                  onPageChange={setInvoicePage}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>Payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchFilter
              placeholder="Search by invoice ID..."
              value={paymentSearch}
              onChange={setPaymentSearch}
              onClear={() => setPaymentSearch("")}
            />
          </div>

          {paginatedPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {payments.length === 0 ? "No payments recorded" : "No matching payments found"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {String(payment.invoice_id).slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-bold">${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>{payment.payment_method || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "completed" ? "default" : "secondary"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {paymentTotalPages > 1 && (
                <Pagination
                  currentPage={paymentPage}
                  totalPages={paymentTotalPages}
                  onPageChange={setPaymentPage}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
