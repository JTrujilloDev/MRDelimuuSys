import { Button, Modal, toast } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getCustomers,
  saveCustomer,
  updateCustomer,
  type CustomerIdentificationType,
  type CustomerOrganizationType,
  type FiscalCustomer,
} from "../../POS/services/customer.service";

type CustomerForm = {
  identificationType: CustomerIdentificationType;
  identification: string;
  verificationDigit: string;
  organizationType: CustomerOrganizationType;
  name: string;
  tradeName: string;
  phone: string;
  email: string;
  address: string;
  countryCode: string;
  municipalityCode: string;
  tributeCode: string;
  responsibilities: string;
};

const emptyForm = (): CustomerForm => ({
  identificationType: "CC",
  identification: "",
  verificationDigit: "",
  organizationType: "NATURAL_PERSON",
  name: "",
  tradeName: "",
  phone: "",
  email: "",
  address: "",
  countryCode: "CO",
  municipalityCode: "",
  tributeCode: "ZZ",
  responsibilities: "R-99-PN",
});

const identificationLabels: Record<CustomerIdentificationType, string> = {
  NIT: "NIT",
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
  PASSPORT: "Pasaporte",
  OTHER: "Otro documento",
};

const inputClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
const labelClass = "mb-1.5 block text-xs font-bold text-foreground/75";

const messageFromError = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
  ? error.response?.data?.message ?? "No fue posible guardar el cliente"
  : error instanceof Error ? error.message : "No fue posible guardar el cliente";

const customerToForm = (customer: FiscalCustomer): CustomerForm => ({
  identificationType: customer.identificationType,
  identification: customer.identification,
  verificationDigit: customer.verificationDigit ?? "",
  organizationType: customer.organizationType,
  name: customer.name,
  tradeName: customer.tradeName ?? "",
  phone: customer.phone ?? "",
  email: customer.email ?? "",
  address: customer.address ?? "",
  countryCode: customer.countryCode || "CO",
  municipalityCode: customer.municipalityCode ?? "",
  tributeCode: customer.tributeCode || "ZZ",
  responsibilities: customer.responsibilities.join(", ") || "R-99-PN",
});

const formToCustomer = (form: CustomerForm): FiscalCustomer => ({
  identificationType: form.identificationType,
  identification: form.identification.trim(),
  verificationDigit: form.verificationDigit.trim(),
  organizationType: form.organizationType,
  name: form.name.trim(),
  tradeName: form.tradeName.trim(),
  phone: form.phone.trim(),
  email: form.email.trim(),
  address: form.address.trim(),
  countryCode: form.countryCode.trim().toUpperCase(),
  municipalityCode: form.municipalityCode.trim(),
  tributeCode: form.tributeCode.trim().toUpperCase(),
  responsibilities: form.responsibilities
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
});

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<FiscalCustomer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const customersQuery = useQuery({
    queryKey: ["customers", debouncedSearch, page],
    queryFn: () => getCustomers(debouncedSearch, page),
  });

  const saveMutation = useMutation({
    mutationFn: async (customer: FiscalCustomer) => {
      if (editingCustomer?.id) return updateCustomer(editingCustomer.id, customer);
      return saveCustomer(customer);
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingCustomer);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm());
      toast(wasEditing ? "Cliente actualizado" : "Cliente guardado", {
        variant: "success",
        description: "Sus datos ya están disponibles en el punto de venta.",
      });
    },
    onError: (error) => toast("No fue posible guardar el cliente", {
      variant: "danger",
      description: messageFromError(error),
    }),
  });

  const customers = customersQuery.data?.customers ?? [];
  const total = customersQuery.data?.total ?? 0;
  const pageCount = customersQuery.data?.pageCount ?? 1;
  const firstResult = total === 0 ? 0 : (page - 1) * 30 + 1;
  const lastResult = Math.min(page * 30, total);
  const isValid = useMemo(() => {
    if (form.identification.trim().length < 3 || form.name.trim().length < 2) return false;
    if (form.verificationDigit && !/^\d$/.test(form.verificationDigit)) return false;
    if (form.municipalityCode && !/^\d{5}$/.test(form.municipalityCode)) return false;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return false;
    return Boolean(form.countryCode.trim() && form.tributeCode.trim() && form.responsibilities.trim());
  }, [form]);

  const updateField = <K extends keyof CustomerForm>(field: K, value: CustomerForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(emptyForm());
    setIsOpen(true);
  };

  const openEdit = (customer: FiscalCustomer) => {
    setEditingCustomer(customer);
    setForm(customerToForm(customer));
    setIsOpen(true);
  };

  const closeForm = () => {
    if (saveMutation.isPending) return;
    setIsOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) saveMutation.mutate(formToCustomer(form));
  };

  return (
    <main className="h-full overflow-y-auto bg-background p-5 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Directorio</p>
            <h1 className="mt-1 text-3xl font-black text-foreground">Clientes</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Consulta y mantén los datos que se autocompletan al identificar al cliente durante el cobro.
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Agregar cliente
          </Button>
        </header>

        <section className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px]">
          <label className="relative">
            <span className="sr-only">Buscar clientes</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-12 w-full rounded-2xl border border-border bg-pos-surface pl-10 pr-4 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, documento, teléfono o correo"
            />
          </label>
          <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-pos-surface px-4 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><ContactRound className="h-4 w-4" /></span>
            <div><p className="text-xs text-muted-foreground">Clientes registrados</p><p className="text-sm font-black text-foreground">{total}</p></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-pos-surface shadow-sm">
          {customersQuery.isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Consultando clientes…</div>
          ) : customersQuery.isError ? (
            <div className="p-12 text-center text-sm text-danger">No fue posible cargar los clientes.</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <ContactRound className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-black text-foreground">{debouncedSearch ? "No hay coincidencias" : "Todavía no hay clientes registrados"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{debouncedSearch ? "Prueba con otro nombre o número de documento." : "Agrega el primero para reutilizar sus datos en futuras ventas."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-border bg-secondary/45 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Identificación</th><th className="px-5 py-3">Contacto</th><th className="px-5 py-3">Tipo</th><th className="w-20 px-5 py-3 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr key={customer.id ?? `${customer.identificationType}-${customer.identification}`} className="transition hover:bg-secondary/25">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{customer.organizationType === "LEGAL_ENTITY" ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span><div className="min-w-0"><p className="max-w-xs truncate font-black text-foreground">{customer.name}</p>{customer.tradeName && <p className="max-w-xs truncate text-xs text-muted-foreground">{customer.tradeName}</p>}</div></div></td>
                      <td className="px-5 py-4"><p className="text-sm font-semibold text-foreground">{customer.identificationType} {customer.identification}{customer.verificationDigit ? `-${customer.verificationDigit}` : ""}</p></td>
                      <td className="px-5 py-4 text-sm"><div className="space-y-1">{customer.phone ? <p className="flex items-center gap-2 text-foreground"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{customer.phone}</p> : null}{customer.email ? <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{customer.email}</p> : null}{!customer.phone && !customer.email ? <span className="text-muted-foreground">Sin datos</span> : null}</div></td>
                      <td className="px-5 py-4"><span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground">{customer.organizationType === "LEGAL_ENTITY" ? "Empresa" : "Persona natural"}</span></td>
                      <td className="px-5 py-4 text-right"><Button isIconOnly variant="ghost" aria-label={`Editar ${customer.name}`} onClick={() => openEdit(customer)}><Pencil className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 0 && (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground">
              <p>Mostrando {firstResult}–{lastResult} de {total}</p>
              <div className="flex items-center gap-2">
                <Button isIconOnly variant="outline" aria-label="Página anterior" isDisabled={page <= 1 || customersQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="min-w-20 text-center font-bold text-foreground">{page} de {pageCount}</span>
                <Button isIconOnly variant="outline" aria-label="Página siguiente" isDisabled={page >= pageCount || customersQuery.isFetching} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </footer>
          )}
        </section>
      </div>

      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-pos-surface text-foreground shadow-2xl">
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <Modal.Header className="shrink-0 border-b border-border px-5 py-4">
                  <div><h2 className="text-xl font-black">{editingCustomer ? "Editar cliente" : "Nuevo cliente"}</h2><p className="mt-1 text-sm text-muted-foreground">Estos datos se usarán al preparar su factura electrónica.</p></div>
                </Modal.Header>
                <Modal.Body className="min-h-0 space-y-5 overflow-y-auto px-5 py-4">
                  <section>
                    <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-primary">Identificación</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label><span className={labelClass}>Tipo de documento</span><select className={inputClass} value={form.identificationType} onChange={(event) => { const value = event.target.value as CustomerIdentificationType; setForm((current) => ({ ...current, identificationType: value, organizationType: value === "NIT" ? "LEGAL_ENTITY" : "NATURAL_PERSON", verificationDigit: value === "NIT" ? current.verificationDigit : "" })); }}>{Object.entries(identificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label className="lg:col-span-2"><span className={labelClass}>Número de identificación *</span><input autoComplete="off" className={inputClass} value={form.identification} onChange={(event) => updateField("identification", event.target.value.replace(/[^0-9A-Za-z]/g, ""))} placeholder="Sin puntos ni espacios" /></label>
                      <label><span className={labelClass}>Dígito verificador</span><input autoComplete="off" className={inputClass} value={form.verificationDigit} disabled={form.identificationType !== "NIT"} maxLength={1} onChange={(event) => updateField("verificationDigit", event.target.value.replace(/\D/g, ""))} placeholder="DV" /></label>
                    </div>
                  </section>

                  <section className="border-t border-border pt-5">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-primary">Información principal</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label><span className={labelClass}>Tipo de cliente</span><select className={inputClass} value={form.organizationType} onChange={(event) => updateField("organizationType", event.target.value as CustomerOrganizationType)}><option value="NATURAL_PERSON">Persona natural</option><option value="LEGAL_ENTITY">Empresa / persona jurídica</option></select></label>
                      <label><span className={labelClass}>Nombre o razón social *</span><input autoComplete="off" className={inputClass} value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
                      <label><span className={labelClass}>Nombre comercial</span><input autoComplete="off" className={inputClass} value={form.tradeName} onChange={(event) => updateField("tradeName", event.target.value)} /></label>
                      <label><span className={labelClass}>Teléfono</span><input autoComplete="off" className={inputClass} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
                      <label><span className={labelClass}>Correo electrónico</span><input autoComplete="off" type="email" className={inputClass} value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
                      <label><span className={labelClass}>Dirección</span><input autoComplete="off" className={inputClass} value={form.address} onChange={(event) => updateField("address", event.target.value)} /></label>
                    </div>
                  </section>

                  <section className="border-t border-border pt-5">
                    <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-primary">Datos fiscales</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label><span className={labelClass}>País</span><input autoComplete="off" className={inputClass} maxLength={2} value={form.countryCode} onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())} /></label>
                      <label><span className={labelClass}>Código municipio DANE</span><input autoComplete="off" inputMode="numeric" className={inputClass} maxLength={5} value={form.municipalityCode} onChange={(event) => updateField("municipalityCode", event.target.value.replace(/\D/g, ""))} placeholder="Ej. 11001" /></label>
                      <label><span className={labelClass}>Código de tributo</span><input autoComplete="off" className={inputClass} value={form.tributeCode} onChange={(event) => updateField("tributeCode", event.target.value.toUpperCase())} /></label>
                      <label><span className={labelClass}>Responsabilidades</span><input autoComplete="off" className={inputClass} value={form.responsibilities} onChange={(event) => updateField("responsibilities", event.target.value)} placeholder="Separadas por coma" /></label>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">El municipio usa el código DANE de cinco dígitos. Se pueden separar varias responsabilidades con comas.</p>
                  </section>
                </Modal.Body>
                <Modal.Footer className="shrink-0 gap-2 border-t border-border px-5 py-3">
                  <Button type="button" variant="outline" onClick={closeForm} isDisabled={saveMutation.isPending}>Cancelar</Button>
                  <Button type="submit" className="min-w-36 bg-primary text-primary-foreground" isDisabled={!isValid || saveMutation.isPending}>{saveMutation.isPending ? "Guardando…" : editingCustomer ? "Guardar cambios" : "Crear cliente"}</Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </main>
  );
}
