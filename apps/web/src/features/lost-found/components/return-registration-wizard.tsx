"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
  cn,
} from "@safecampus/ui-kit";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronsUpDown,
  FileCheck2,
  IdCard,
  ImageIcon,
  PackageCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { lostFoundClient } from "../client";
import { estadoLabel, formatDateTimePe } from "../presentation";
import { EstadoLfBadge } from "./estado-lf-badge";
import { CharCounter } from "./text-field-help";
import {
  ImageAttachments,
  SingleImageAttachment,
  revokeFotos,
  type FotoAdjunta,
} from "./image-attachments";
import type { CasoLfListItem, CustodiaLf, UbicacionMaestra } from "../types";
import type { UsuarioConRoles } from "@/features/admin/services/usuario.service";

type CurrentUser = {
  id: string;
  roles: string[];
  nombre: string;
  apellido: string;
  codigoInstitucional: string | null;
  telefono: string | null;
  navUser: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
} | null;

type Props = {
  open: boolean;
  custodia: CustodiaLf | null;
  casos: CasoLfListItem[];
  usuarios: UsuarioConRoles[];
  ubicacionesCustodia: UbicacionMaestra[];
  currentUser: CurrentUser;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

type ClaimantType = "COMUNIDAD" | "VISITANTE" | "OTRO";
type ObjectCondition = "BUENO" | "DESGASTE_PREVIO" | "OBSERVACIONES";
type EvidenceType = "CONFIRMACION_VERBAL" | "FIRMA" | "FOTO" | "CARGO_CONSTANCIA" | "OTRO";

type FormState = {
  claimantType: ClaimantType;
  claimantTypeOther: string;
  claimantUserId: string;
  firstName: string;
  lastName: string;
  document: string;
  email: string;
  phone: string;
  methods: string[];
  evidenceOtherDetail: string;
  verificationDetail: string;
  verificationFiles: FotoAdjunta[];
  handoffAt: string;
  deliveredById: string;
  handoffLocationId: string;
  objectCondition: ObjectCondition;
  deliveryEvidenceTypes: EvidenceType[];
  deliveryEvidenceOther: string;
  deliveryFilesByType: Partial<Record<EvidenceType, FotoAdjunta>>;
  receiverConfirmed: boolean;
  finalNotes: string;
};

// Evidencias de entrega que admiten adjuntar una imagen individual.
const PHOTO_EVIDENCE_TYPES: EvidenceType[] = ["FIRMA", "FOTO", "CARGO_CONSTANCIA"];

const STEPS = [
  { id: 1, label: "Resumen" },
  { id: 2, label: "Reclamante" },
  { id: 3, label: "Verificacion" },
  { id: 4, label: "Entrega" },
  { id: 5, label: "Confirmacion" },
];

const VERIFICATION_METHODS = [
  { value: "DESCRIPCION_COINCIDENTE", label: "Descripcion coincidente del objeto" },
  { value: "FOTO_EVIDENCIA_PREVIA", label: "Foto o evidencia previa del objeto" },
  { value: "OTRO_DETALLE", label: "Otro detalle de evidencia" },
];

const DELIVERY_EVIDENCE_OPTIONS: Array<{ value: EvidenceType; label: string }> = [
  { value: "CONFIRMACION_VERBAL", label: "Confirmacion verbal" },
  { value: "FIRMA", label: "Firma" },
  { value: "FOTO", label: "Foto" },
  { value: "CARGO_CONSTANCIA", label: "Cargo o constancia" },
  { value: "OTRO", label: "Otro" },
];

// Limites de caracteres de los campos de texto del asistente. El detalle se
// concatena en `observaciones`, por lo que se mantienen acotados para no
// exceder el limite de trazabilidad (2000) ni saturar la lectura.
const TEXT_LIMITS = {
  claimantTypeOther: { min: 3, max: 60 },
  firstName: { min: 2, max: 60 },
  lastName: { min: 2, max: 60 },
  document: { min: 4, max: 20 },
  email: { min: 0, max: 120 },
  phone: { min: 0, max: 20 },
  evidenceOtherDetail: { min: 4, max: 300 },
  verificationDetail: { min: 12, max: 600 },
  deliveryEvidenceOther: { min: 3, max: 100 },
  finalNotes: { min: 0, max: 600 },
} as const;

const NAME_RE = /^[\p{L}\p{M}\s'.-]+$/u;
const DOCUMENT_RE = /^[A-Za-z0-9.\- ]+$/;
const PHONE_RE = /^[0-9+\s()-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<keyof FormState, string>>;

// Orden de los campos por paso: define tambien la prioridad del primer error
// que se muestra en el toast / alerta resumen al intentar avanzar.
const STEP_FIELD_ORDER: Record<number, Array<keyof FormState>> = {
  2: ["claimantTypeOther", "firstName", "lastName", "document", "email", "phone"],
  3: ["methods", "evidenceOtherDetail", "verificationDetail"],
  4: [
    "handoffAt",
    "deliveredById",
    "handoffLocationId",
    "deliveryEvidenceTypes",
    "deliveryEvidenceOther",
    "receiverConfirmed",
  ],
  5: [],
};

export function ReturnRegistrationWizard({
  open,
  custodia,
  casos,
  usuarios,
  ubicacionesCustodia,
  currentUser,
  onOpenChange,
  onDone,
}: Props) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentUserOption = useMemo(() => {
    if (!currentUser) return "";
    return usuarios.some((user) => user.id === currentUser.id) ? currentUser.id : "";
  }, [currentUser, usuarios]);
  const [form, setForm] = useState<FormState>(() => initialForm(currentUserOption));

  const caso = useMemo(
    () => casos.find((item) => item.id === custodia?.caso_id),
    [casos, custodia?.caso_id],
  );
  const selectedClaimant = usuarios.find((user) => user.id === form.claimantUserId);
  const selectedDeliverer = usuarios.find((user) => user.id === form.deliveredById);
  const selectedLocation = ubicacionesCustodia.find((location) => location.id === form.handoffLocationId);
  const isDirty = isFormDirty(form, currentUserOption);
  const fieldErrors = useMemo(() => validateFields(form), [form]);
  const validation = validateStep(step, form, custodia);
  const sensitive = isSensitiveObject(caso?.categoria_nombre, custodia?.titulo ?? caso?.titulo);

  // Mantiene la referencia al form actual para liberar los object URLs de las
  // previsualizaciones cuando el asistente se desmonta.
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  useEffect(() => {
    return () => revokeFotos(collectFotos(formRef.current));
  }, []);

  const resetAndClose = () => {
    revokeFotos(collectFotos(form));
    setStep(1);
    setSubmitted(false);
    setForm(initialForm(currentUserOption));
    onOpenChange(false);
  };

  const requestClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    resetAndClose();
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectClaimant = (userId: string) => {
    if (userId === "OTRO") {
      setForm((current) => ({
        ...current,
        claimantUserId: "",
        firstName: "",
        lastName: "",
        document: "",
        email: "",
        phone: "",
      }));
      return;
    }
    const user = usuarios.find((item) => item.id === userId);
    setForm((current) => ({
      ...current,
      claimantUserId: userId,
      firstName: user?.nombre ?? current.firstName,
      lastName: user?.apellido ?? current.lastName,
      document: user?.codigo_institucional ?? current.document,
      email: user?.email ?? current.email,
      phone: user?.telefono ?? current.phone,
    }));
  };

  const goNext = () => {
    setSubmitted(true);
    if (validation.length > 0) {
      toast.error(validation[0]);
      return;
    }
    setSubmitted(false);
    setStep((current) => Math.min(5, current + 1));
  };

  const goBack = () => {
    setSubmitted(false);
    setStep((current) => Math.max(1, current - 1));
  };

  const confirmReturn = () => {
    setSubmitted(true);
    const allErrors = STEPS.flatMap((item) => validateStep(item.id, form, custodia));
    if (allErrors.length > 0) {
      toast.error(allErrors[0]);
      return;
    }
    if (!custodia) return;
    startTransition(async () => {
      try {
        await lostFoundClient.devolver(custodia.id, {
          reclamante_id: form.claimantUserId || undefined,
          metodo_verificacion: form.methods.join(",").slice(0, 100),
          observaciones: buildTraceNotes(form, {
            custodia,
            caso,
            claimant: selectedClaimant,
            deliverer: selectedDeliverer,
            location: selectedLocation,
          }),
        });
        toast.success("Devolucion registrada. El caso actualizara su trazabilidad.");
        resetAndClose();
        onDone();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar la devolucion.");
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>Registrar devolucion</DialogTitle>
            <DialogDescription>
              Completa la informacion necesaria para devolver el objeto a su legitimo propietario.
            </DialogDescription>
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-600">Paso {step} de {STEPS.length}</p>
                <p className="text-xs text-slate-500">{STEPS[step - 1]?.label}</p>
              </div>
              {/* Barra semaforo: cada segmento se completa en verde a medida que se avanza */}
              <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step}>
                {STEPS.map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors duration-500",
                      item.id < step && "bg-emerald-500",
                      item.id === step && "bg-amber-400",
                      item.id > step && "bg-slate-200",
                    )}
                  />
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {STEPS.map((item) => {
                  const done = item.id < step;
                  const active = item.id === step;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.id > step}
                      onClick={() => item.id < step && setStep(item.id)}
                      className={cn(
                        "flex min-h-10 items-center gap-2 rounded-md border px-3 text-left text-xs font-medium transition-colors",
                        active && "border-[#001C55] bg-[#001C55] text-white",
                        done && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                        item.id > step && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                          active && "bg-white/20 text-white",
                          done && "bg-emerald-500 text-white",
                          item.id > step && "bg-slate-200 text-slate-500",
                        )}
                      >
                        {done ? <Check className="h-3 w-3" /> : item.id}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-5 px-6 py-5">
              {step === 1 && (
                <StepCaseSummary custodia={custodia} caso={caso} />
              )}
              {step === 2 && (
                <StepClaimant
                  form={form}
                  usuarios={usuarios}
                  selectedClaimant={selectedClaimant}
                  submitted={submitted}
                  errors={fieldErrors}
                  onUpdate={update}
                  onSelectClaimant={selectClaimant}
                />
              )}
              {step === 3 && (
                <StepVerification
                  form={form}
                  caso={caso}
                  sensitive={sensitive}
                  submitted={submitted}
                  errors={fieldErrors}
                  onUpdate={update}
                />
              )}
              {step === 4 && (
                <StepDelivery
                  form={form}
                  usuarios={usuarios}
                  ubicacionesCustodia={ubicacionesCustodia}
                  selectedDeliverer={selectedDeliverer}
                  selectedLocation={selectedLocation}
                  submitted={submitted}
                  errors={fieldErrors}
                  onUpdate={update}
                />
              )}
              {step === 5 && (
                <StepConfirmation
                  form={form}
                  custodia={custodia}
                  caso={caso}
                  claimant={selectedClaimant}
                  deliverer={selectedDeliverer}
                  location={selectedLocation}
                  onUpdate={update}
                />
              )}

              {submitted && validation.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validation[0]}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-white px-6 py-4">
            <Button type="button" variant="outline" onClick={requestClose.bind(null, false)} disabled={isPending}>
              Cancelar
            </Button>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={isPending}>
                Anterior
              </Button>
            )}
            {step < 5 ? (
              <Button type="button" onClick={goNext} disabled={isPending}>
                {step === 1 ? "Continuar con validacion" : "Continuar"}
              </Button>
            ) : (
              <Button type="button" onClick={confirmReturn} disabled={isPending}>
                <PackageCheck className="mr-2 h-4 w-4" />
                Confirmar devolucion
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar registro de devolucion</AlertDialogTitle>
            <AlertDialogDescription>
              Ya ingresaste informacion en el asistente. Si cancelas, se descartara lo completado en este registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={resetAndClose}>Descartar cambios</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StepCaseSummary({ custodia, caso }: { custodia: CustodiaLf | null; caso?: CasoLfListItem }) {
  const custodyDays = custodia ? daysBetween(custodia.fecha_recepcion, new Date().toISOString()) : null;
  return (
    <section className="space-y-4">
      <SupportText icon={ShieldCheck}>
        Verifica que el objeto y el caso correspondan a la devolucion que estas por registrar.
      </SupportText>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-slate-50">
          {caso?.foto_url ? (
            <Image src={caso.foto_url} alt="" fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <ReadonlyItem label="Codigo del caso" value={custodia?.codigo ?? caso?.codigo ?? "No disponible"} />
          <ReadonlyItem label="Objeto" value={custodia?.titulo ?? caso?.titulo ?? "Objeto encontrado"} />
          <ReadonlyItem label="Categoria" value={caso?.categoria_nombre ?? "Sin categoria"} />
          <div className="rounded-lg border bg-white p-3">
            <dt className="text-xs text-slate-500">Estado actual</dt>
            <dd className="mt-1"><EstadoLfBadge estado={custodia?.estado ?? caso?.estado ?? "EN_CUSTODIA"} /></dd>
          </div>
          <ReadonlyItem label="Fecha de recepcion" value={custodia ? formatDateTimePe(custodia.fecha_recepcion) : "No disponible"} />
          <ReadonlyItem label="Tiempo en custodia" value={custodyDays == null ? "No disponible" : `${custodyDays} dias`} />
          <div className="rounded-lg border bg-white p-3 sm:col-span-2">
            <dt className="text-xs text-slate-500">Estado visual</dt>
            <dd className="mt-1">
              <Badge variant="outline" className={custodyVisualClass(custodia)}>
                {custodyVisualLabel(custodia)}
              </Badge>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function StepClaimant({
  form,
  usuarios,
  selectedClaimant,
  submitted,
  errors,
  onUpdate,
  onSelectClaimant,
}: {
  form: FormState;
  usuarios: UsuarioConRoles[];
  selectedClaimant?: UsuarioConRoles;
  submitted: boolean;
  errors: FieldErrors;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSelectClaimant: (userId: string) => void;
}) {
  const manual = !form.claimantUserId;
  return (
    <section className="space-y-4">
      <SupportText icon={IdCard}>
        Registra los datos minimos necesarios para identificar a la persona que solicita la devolucion.
      </SupportText>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Field label="Tipo de reclamante" required>
          <Select value={form.claimantType} onValueChange={(value) => onUpdate("claimantType", value as ClaimantType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="COMUNIDAD">Miembro de la comunidad PUCP</SelectItem>
              <SelectItem value="VISITANTE">Visitante o persona externa</SelectItem>
              <SelectItem value="OTRO">Otro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {form.claimantType === "OTRO" && (
          <TextField
            label="Detalle del tipo"
            required
            value={form.claimantTypeOther}
            onChange={(value) => onUpdate("claimantTypeOther", value)}
            limits={TEXT_LIMITS.claimantTypeOther}
            error={errors.claimantTypeOther}
            submitted={submitted}
          />
        )}
      </div>
      <Field label="Datos del usuario que reclama">
        <SearchCombobox
          value={form.claimantUserId}
          placeholder="Buscar usuario o elegir Otro"
          emptyText="No se encontraron usuarios"
          options={[
            ...usuarios.map((user) => ({
              value: user.id,
              label: fullName(user),
              description: [user.codigo_institucional, user.email].filter(Boolean).join(" - "),
            })),
            { value: "OTRO", label: "Otro", description: "Ingresar datos manualmente" },
          ]}
          onChange={onSelectClaimant}
        />
      </Field>
      <div className="rounded-lg border bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-950">Usuario validado</p>
            <p className="text-xs text-slate-500">Se activa cuando el reclamante existe en el sistema.</p>
          </div>
          <Badge variant="outline" className={selectedClaimant ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}>
            {selectedClaimant ? "Registrado" : "Manual"}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nombre"
          required
          value={form.firstName}
          onChange={(value) => onUpdate("firstName", value)}
          limits={TEXT_LIMITS.firstName}
          error={errors.firstName}
          submitted={submitted}
          readOnly={Boolean(selectedClaimant?.nombre)}
        />
        <TextField
          label="Apellido"
          required
          value={form.lastName}
          onChange={(value) => onUpdate("lastName", value)}
          limits={TEXT_LIMITS.lastName}
          error={errors.lastName}
          submitted={submitted}
          readOnly={Boolean(selectedClaimant?.apellido)}
        />
        <TextField
          label="Codigo PUCP o documento"
          required
          value={form.document}
          onChange={(value) => onUpdate("document", value)}
          limits={TEXT_LIMITS.document}
          error={errors.document}
          submitted={submitted}
          readOnly={Boolean(selectedClaimant?.codigo_institucional)}
        />
        <TextField
          label="Correo institucional"
          type="email"
          inputMode="email"
          value={form.email}
          onChange={(value) => onUpdate("email", value)}
          limits={TEXT_LIMITS.email}
          error={errors.email}
          submitted={submitted}
          readOnly={Boolean(selectedClaimant?.email)}
        />
        <TextField
          label="Telefono de contacto"
          inputMode="tel"
          value={form.phone}
          onChange={(value) => onUpdate("phone", value)}
          limits={TEXT_LIMITS.phone}
          error={errors.phone}
          submitted={submitted}
          readOnly={Boolean(selectedClaimant?.telefono)}
        />
      </div>
      {manual && (
        <p className="text-xs text-slate-500">
          Si el dato no esta en el sistema, puedes completarlo manualmente para dejar constancia de la identificacion.
        </p>
      )}
    </section>
  );
}

function StepVerification({
  form,
  caso,
  sensitive,
  submitted,
  errors,
  onUpdate,
}: {
  form: FormState;
  caso?: CasoLfListItem;
  sensitive: boolean;
  submitted: boolean;
  errors: FieldErrors;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const toggleMethod = (value: string, checked: boolean) => {
    onUpdate("methods", checked ? [...form.methods, value] : form.methods.filter((item) => item !== value));
  };
  return (
    <section className="space-y-4">
      <SupportText icon={FileCheck2}>
        Deja evidencia de como se valido que el objeto pertenece al reclamante.
      </SupportText>
      {sensitive && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Este objeto puede ser sensible. Revisa con mayor cuidado la descripcion y la evidencia antes de entregarlo.
          </AlertDescription>
        </Alert>
      )}
      {/* El caso Lost & Found ya viene determinado por la custodia: se muestra
          como detalle (no editable) para dar contexto a la verificacion. */}
      <RelatedCaseDetail caso={caso} />
      <div className="space-y-2">
        <Label>Metodos de verificacion</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {VERIFICATION_METHODS.map((method) => (
            <label key={method.value} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 text-sm">
              <Checkbox
                checked={form.methods.includes(method.value)}
                onCheckedChange={(checked) => toggleMethod(method.value, checked === true)}
              />
              <span>{method.label}</span>
            </label>
          ))}
        </div>
        {submitted && errors.methods && <FieldError message={errors.methods} />}
      </div>
      {form.methods.includes("FOTO_EVIDENCIA_PREVIA") && (
        <ImageAttachments
          id="verification-fotos"
          label="Foto o evidencia previa"
          value={form.verificationFiles}
          onChange={(next) => onUpdate("verificationFiles", next)}
          max={3}
          helperText="Puedes adjuntar hasta 3 imagenes. Los nombres se registraran en la trazabilidad."
        />
      )}
      {form.methods.includes("OTRO_DETALLE") && (
        <TextAreaField
          label="Detalle de evidencia manual"
          required
          value={form.evidenceOtherDetail}
          onChange={(value) => onUpdate("evidenceOtherDetail", value)}
          limits={TEXT_LIMITS.evidenceOtherDetail}
          error={errors.evidenceOtherDetail}
          submitted={submitted}
          rows={3}
        />
      )}
      <TextAreaField
        label="Detalle de verificacion"
        required
        value={form.verificationDetail}
        onChange={(value) => onUpdate("verificationDetail", value)}
        limits={TEXT_LIMITS.verificationDetail}
        error={errors.verificationDetail}
        submitted={submitted}
        rows={5}
        placeholder="Describe que informacion proporciono la persona y por que se considero suficiente."
      />
    </section>
  );
}

function RelatedCaseDetail({ caso }: { caso?: CasoLfListItem }) {
  return (
    <div className="space-y-2">
      <Label>Caso Lost &amp; Found relacionado</Label>
      {caso ? (
        <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ReadonlyItem label="Codigo del caso" value={caso.codigo} />
            <ReadonlyItem label="Objeto" value={caso.titulo} />
            <ReadonlyItem label="Categoria" value={caso.categoria_nombre ?? "Sin categoria"} />
            <div className="rounded-lg border bg-white p-3">
              <dt className="text-xs text-slate-500">Estado</dt>
              <dd className="mt-1"><EstadoLfBadge estado={caso.estado} /></dd>
            </div>
          </div>
          {caso.descripcion && (
            <div className="rounded-lg border bg-white p-3">
              <dt className="text-xs text-slate-500">Descripcion</dt>
              <dd className="mt-1 text-sm break-words text-slate-800">{caso.descripcion}</dd>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-500">
          No hay un caso Lost &amp; Found asociado a esta custodia.
        </p>
      )}
    </div>
  );
}

function StepDelivery({
  form,
  usuarios,
  ubicacionesCustodia,
  selectedDeliverer,
  selectedLocation,
  submitted,
  errors,
  onUpdate,
}: {
  form: FormState;
  usuarios: UsuarioConRoles[];
  ubicacionesCustodia: UbicacionMaestra[];
  selectedDeliverer?: UsuarioConRoles;
  selectedLocation?: UbicacionMaestra;
  submitted: boolean;
  errors: FieldErrors;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const staff = usuarios.filter((user) => user.roles.some((role) => ["administrador", "supervisor", "operador"].includes(role.nombre.toLowerCase())));
  const updateDeliveryFile = (type: EvidenceType, foto: FotoAdjunta | null) => {
    const next = { ...form.deliveryFilesByType };
    if (foto) next[type] = foto;
    else delete next[type];
    onUpdate("deliveryFilesByType", next);
  };
  const toggleEvidence = (value: EvidenceType, checked: boolean) => {
    onUpdate("deliveryEvidenceTypes", checked ? [...form.deliveryEvidenceTypes, value] : form.deliveryEvidenceTypes.filter((item) => item !== value));
    // Al desactivar un check de foto se descarta su adjunto (y se libera el preview).
    if (!checked) {
      const existing = form.deliveryFilesByType[value];
      if (existing) {
        URL.revokeObjectURL(existing.previewUrl);
        updateDeliveryFile(value, null);
      }
    }
  };
  return (
    <section className="space-y-4">
      <SupportText icon={CalendarClock}>
        Registra la evidencia disponible para dejar constancia de la entrega fisica.
      </SupportText>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Fecha y hora de entrega" required>
          <Input type="datetime-local" value={form.handoffAt} onChange={(event) => onUpdate("handoffAt", event.target.value)} aria-invalid={submitted && Boolean(errors.handoffAt)} />
          {submitted && errors.handoffAt && <FieldError message={errors.handoffAt} />}
        </Field>
        <Field label="Persona que realizo la entrega" required>
          <SearchCombobox
            value={form.deliveredById}
            placeholder="Buscar responsable"
            emptyText="No se encontraron responsables"
            options={staff.map((user) => ({
              value: user.id,
              label: fullName(user),
              description: user.roles.map((role) => role.nombre).join(", "),
            }))}
            onChange={(value) => onUpdate("deliveredById", value)}
          />
          {submitted && errors.deliveredById && <FieldError message={errors.deliveredById} />}
        </Field>
      </div>
      {selectedDeliverer && (
        <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
          <Avatar>
            <AvatarImage src={selectedDeliverer.avatar_url ?? undefined} />
            <AvatarFallback>{initials(fullName(selectedDeliverer))}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-slate-950">{fullName(selectedDeliverer)}</p>
            <p className="text-xs text-slate-500">{selectedDeliverer.roles.map((role) => role.nombre).join(", ") || "Sin rol"}</p>
          </div>
        </div>
      )}
      <Field label="Punto donde se realizo la entrega" required>
        <SearchCombobox
          value={form.handoffLocationId}
          placeholder="Buscar punto de custodia"
          emptyText="No hay ubicaciones de custodia"
          options={ubicacionesCustodia.map((location) => ({
            value: location.id,
            label: location.nombre,
            description: location.codigo,
          }))}
          onChange={(value) => onUpdate("handoffLocationId", value)}
        />
        {selectedLocation && <p className="text-xs text-slate-500">Tipo: {selectedLocation.tipo}</p>}
        {submitted && errors.handoffLocationId && <FieldError message={errors.handoffLocationId} />}
      </Field>
      <Field label="Estado del objeto al momento de devolverlo" required>
        <Select value={form.objectCondition} onValueChange={(value) => onUpdate("objectCondition", value as ObjectCondition)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="BUENO">Bueno</SelectItem>
            <SelectItem value="DESGASTE_PREVIO">Con desgaste previo</SelectItem>
            <SelectItem value="OBSERVACIONES">Con observaciones</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="space-y-2">
        <Label>Tipo de evidencia de entrega</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DELIVERY_EVIDENCE_OPTIONS.map((option) => (
            <label key={option.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 text-sm">
              <Checkbox checked={form.deliveryEvidenceTypes.includes(option.value)} onCheckedChange={(checked) => toggleEvidence(option.value, checked === true)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {submitted && errors.deliveryEvidenceTypes && <FieldError message={errors.deliveryEvidenceTypes} />}
      </div>
      {form.deliveryEvidenceTypes.includes("OTRO") && (
        <TextField
          label="Detalle de otra evidencia"
          required
          value={form.deliveryEvidenceOther}
          onChange={(value) => onUpdate("deliveryEvidenceOther", value)}
          limits={TEXT_LIMITS.deliveryEvidenceOther}
          error={errors.deliveryEvidenceOther}
          submitted={submitted}
        />
      )}
      {PHOTO_EVIDENCE_TYPES.some((type) => form.deliveryEvidenceTypes.includes(type)) && (
        <div className="space-y-2">
          <Label>Adjuntar evidencia disponible</Label>
          {/* Cada evidencia activa (firma, foto, constancia) admite una sola imagen. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PHOTO_EVIDENCE_TYPES.filter((type) => form.deliveryEvidenceTypes.includes(type)).map((type) => (
              <SingleImageAttachment
                key={type}
                id={`delivery-foto-${type}`}
                label={evidenceLabel(type)}
                value={form.deliveryFilesByType[type] ?? null}
                onChange={(foto) => updateDeliveryFile(type, foto)}
              />
            ))}
          </div>
        </div>
      )}
      <label className="flex items-center justify-between gap-4 rounded-lg border bg-slate-50 p-4">
        <span className="text-sm font-medium text-slate-950">La persona reclamante confirmo haber recibido el objeto.</span>
        <Switch checked={form.receiverConfirmed} onCheckedChange={(checked) => onUpdate("receiverConfirmed", checked)} />
      </label>
      {submitted && errors.receiverConfirmed && <FieldError message={errors.receiverConfirmed} />}
    </section>
  );
}

function StepConfirmation({
  form,
  custodia,
  caso,
  claimant,
  deliverer,
  location,
  onUpdate,
}: {
  form: FormState;
  custodia: CustodiaLf | null;
  caso?: CasoLfListItem;
  claimant?: UsuarioConRoles;
  deliverer?: UsuarioConRoles;
  location?: UbicacionMaestra;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const attachmentCount = form.verificationFiles.length + Object.keys(form.deliveryFilesByType).length;
  return (
    <section className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <SummaryBlock title="Caso y objeto" items={[
          ["Codigo", custodia?.codigo ?? caso?.codigo ?? "No disponible"],
          ["Objeto", custodia?.titulo ?? caso?.titulo ?? "Objeto encontrado"],
          ["Estado", custodia?.estado ? estadoLabel(custodia.estado) : "En custodia"],
        ]} />
        <SummaryBlock title="Persona reclamante" items={[
          ["Nombre", claimant ? fullName(claimant) : `${form.firstName} ${form.lastName}`.trim()],
          ["Documento", form.document || "No registrado"],
          ["Tipo", claimantTypeLabel(form)],
        ]} />
        <SummaryBlock title="Verificacion" items={[
          ["Caso", caso ? `${caso.codigo} - ${caso.titulo}` : "No disponible"],
          ["Metodos", form.methods.map(methodLabel).join(", ")],
          ["Detalle", form.verificationDetail],
          ["Evidencia manual", form.evidenceOtherDetail || "No aplica"],
        ]} />
        <SummaryBlock title="Entrega" items={[
          ["Fecha y hora", form.handoffAt ? formatDateTimePe(new Date(form.handoffAt).toISOString()) : "No registrada"],
          ["Lugar", location?.nombre ?? "No registrado"],
          ["Responsable", deliverer ? fullName(deliverer) : "No registrado"],
          ["Evidencia", form.deliveryEvidenceTypes.map(evidenceLabel).join(", ")],
          ["Imagenes adjuntas", attachmentCount > 0 ? String(attachmentCount) : "Ninguna"],
        ]} />
      </div>
      <TextAreaField
        label="Observaciones adicionales"
        value={form.finalNotes}
        onChange={(value) => onUpdate("finalNotes", value)}
        limits={TEXT_LIMITS.finalNotes}
        submitted={false}
        rows={4}
        placeholder="Estado, presencia de seguridad, evidencia adicional o condiciones particulares de la entrega."
      />
      <Alert className="border-sky-200 bg-sky-50 text-sky-900">
        <PackageCheck className="h-4 w-4" />
        <AlertDescription>
          Al confirmar, el objeto se marcara como devuelto y el caso actualizara su historial de trazabilidad.
        </AlertDescription>
      </Alert>
    </section>
  );
}

function SearchCombobox({
  value,
  options,
  placeholder,
  emptyText,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  placeholder: string;
  emptyText: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          {/* onWheel detiene la propagacion para que el scroll-lock del Dialog
              (react-remove-scroll) no cancele el desplazamiento con la rueda. */}
          <CommandList
            className="max-h-64 overflow-y-auto overscroll-contain"
            onWheel={(event) => event.stopPropagation()}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && <span className="block truncate text-xs text-slate-500">{option.description}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SupportText({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">Requerido</span>}
      </Label>
      {children}
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs font-medium text-rose-600">{message}</p>;
}

// Campo de texto con contador de caracteres y validacion inline reutilizando
// los componentes del proyecto (Input + CharCounter + FieldError).
function TextField({
  label,
  required,
  value,
  onChange,
  limits,
  error,
  submitted,
  readOnly = false,
  type = "text",
  placeholder,
  inputMode,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  limits: { min: number; max: number };
  error?: string;
  submitted: boolean;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  inputMode?: React.ComponentProps<"input">["inputMode"];
}) {
  const showError = submitted && Boolean(error);
  return (
    <Field label={label} required={required}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        readOnly={readOnly}
        maxLength={limits.max}
        aria-invalid={showError}
        onChange={(event) => onChange(event.target.value)}
      />
      {!readOnly && <CharCounter value={value} min={limits.min} max={limits.max} />}
      {showError && <FieldError message={error ?? ""} />}
    </Field>
  );
}

function TextAreaField({
  label,
  required,
  value,
  onChange,
  limits,
  error,
  submitted,
  rows = 4,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  limits: { min: number; max: number };
  error?: string;
  submitted: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const showError = submitted && Boolean(error);
  return (
    <Field label={label} required={required}>
      <Textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={limits.max}
        aria-invalid={showError}
        onChange={(event) => onChange(event.target.value)}
      />
      <CharCounter value={value} min={limits.min} max={limits.max} />
      {showError && <FieldError message={error ?? ""} />}
    </Field>
  );
}

function ReadonlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}

function SummaryBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-950">{title}</p>
      <dl className="space-y-2 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="min-w-0 break-words font-medium text-slate-800">{value || "No registrado"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function initialForm(deliveredById = ""): FormState {
  return {
    claimantType: "COMUNIDAD",
    claimantTypeOther: "",
    claimantUserId: "",
    firstName: "",
    lastName: "",
    document: "",
    email: "",
    phone: "",
    methods: [],
    evidenceOtherDetail: "",
    verificationDetail: "",
    verificationFiles: [],
    handoffAt: toDateTimeLocalValue(new Date()),
    deliveredById,
    handoffLocationId: "",
    objectCondition: "BUENO",
    deliveryEvidenceTypes: ["CONFIRMACION_VERBAL"],
    deliveryEvidenceOther: "",
    deliveryFilesByType: {},
    receiverConfirmed: false,
    finalNotes: "",
  };
}

// Reune todas las imagenes adjuntas del formulario (verificacion + entrega).
function collectFotos(form: FormState): FotoAdjunta[] {
  const deliveryFotos = Object.values(form.deliveryFilesByType).filter(
    (foto): foto is FotoAdjunta => Boolean(foto),
  );
  return [...form.verificationFiles, ...deliveryFotos];
}

// Valida campo por campo y devuelve el mensaje asociado a cada uno, para poder
// mostrar el error inline junto al campo y resaltarlo con aria-invalid.
function validateFields(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  // Paso 2 · Reclamante
  if (form.claimantType === "OTRO") {
    if (form.claimantTypeOther.trim().length < TEXT_LIMITS.claimantTypeOther.min)
      errors.claimantTypeOther = `Detalla el tipo de reclamante (minimo ${TEXT_LIMITS.claimantTypeOther.min} caracteres).`;
    else if (form.claimantTypeOther.length > TEXT_LIMITS.claimantTypeOther.max)
      errors.claimantTypeOther = `Maximo ${TEXT_LIMITS.claimantTypeOther.max} caracteres.`;
  }
  if (!form.firstName.trim()) errors.firstName = "Ingresa el nombre del reclamante.";
  else if (!NAME_RE.test(form.firstName.trim())) errors.firstName = "El nombre solo admite letras, espacios, apostrofes y guiones.";
  else if (form.firstName.trim().length < TEXT_LIMITS.firstName.min) errors.firstName = `Minimo ${TEXT_LIMITS.firstName.min} caracteres.`;
  if (!form.lastName.trim()) errors.lastName = "Ingresa el apellido del reclamante.";
  else if (!NAME_RE.test(form.lastName.trim())) errors.lastName = "El apellido solo admite letras, espacios, apostrofes y guiones.";
  else if (form.lastName.trim().length < TEXT_LIMITS.lastName.min) errors.lastName = `Minimo ${TEXT_LIMITS.lastName.min} caracteres.`;
  if (!form.document.trim()) errors.document = "Ingresa el codigo PUCP o documento de identificacion.";
  else if (!DOCUMENT_RE.test(form.document.trim())) errors.document = "El documento solo admite letras, numeros, puntos y guiones.";
  else if (form.document.trim().length < TEXT_LIMITS.document.min) errors.document = `Minimo ${TEXT_LIMITS.document.min} caracteres.`;
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = "Ingresa un correo electronico valido.";
  if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) errors.phone = "El telefono solo admite numeros, espacios y los signos + - ( ).";

  // Paso 3 · Verificacion
  if (form.methods.length === 0) errors.methods = "Selecciona al menos un metodo de verificacion.";
  if (form.methods.includes("OTRO_DETALLE") && form.evidenceOtherDetail.trim().length < TEXT_LIMITS.evidenceOtherDetail.min)
    errors.evidenceOtherDetail = `Describe el detalle de evidencia manual (minimo ${TEXT_LIMITS.evidenceOtherDetail.min} caracteres).`;
  if (form.verificationDetail.trim().length < TEXT_LIMITS.verificationDetail.min)
    errors.verificationDetail = `Explica brevemente la verificacion realizada (minimo ${TEXT_LIMITS.verificationDetail.min} caracteres).`;

  // Paso 4 · Entrega
  if (!form.handoffAt) errors.handoffAt = "Ingresa la fecha y hora de entrega.";
  if (!form.deliveredById) errors.deliveredById = "Selecciona quien realizo la entrega.";
  if (!form.handoffLocationId) errors.handoffLocationId = "Selecciona el punto de entrega.";
  if (form.deliveryEvidenceTypes.length === 0) errors.deliveryEvidenceTypes = "Registra que evidencia de entrega se obtuvo.";
  if (form.deliveryEvidenceTypes.includes("OTRO") && form.deliveryEvidenceOther.trim().length < TEXT_LIMITS.deliveryEvidenceOther.min)
    errors.deliveryEvidenceOther = `Describe la evidencia de entrega indicada como otro (minimo ${TEXT_LIMITS.deliveryEvidenceOther.min} caracteres).`;
  if (!form.receiverConfirmed) errors.receiverConfirmed = "Confirma que la persona reclamante recibio el objeto.";

  return errors;
}

function validateStep(step: number, form: FormState, custodia: CustodiaLf | null): string[] {
  if (step === 1) return custodia ? [] : ["Selecciona una custodia para registrar la devolucion."];
  const errors = validateFields(form);
  return (STEP_FIELD_ORDER[step] ?? [])
    .map((field) => errors[field])
    .filter((message): message is string => Boolean(message));
}

function isFormDirty(form: FormState, deliveredById: string) {
  return serializeForm(form) !== serializeForm(initialForm(deliveredById));
}

// Serializa el formulario para comparar cambios sin depender de los object URLs
// (que cambian en cada seleccion): las imagenes se representan por su nombre.
function serializeForm(form: FormState) {
  return JSON.stringify({
    ...form,
    verificationFiles: form.verificationFiles.map((foto) => foto.file.name),
    deliveryFilesByType: Object.fromEntries(
      Object.entries(form.deliveryFilesByType).map(([type, foto]) => [type, foto?.file.name]),
    ),
  });
}

function buildTraceNotes(
  form: FormState,
  context: {
    custodia: CustodiaLf;
    caso?: CasoLfListItem;
    claimant?: UsuarioConRoles;
    deliverer?: UsuarioConRoles;
    location?: UbicacionMaestra;
  },
) {
  const fotos = collectFotos(form);
  const notes = [
    "Registro de devolucion",
    `Caso: ${context.custodia.codigo ?? context.caso?.codigo ?? context.custodia.caso_id}`,
    `Objeto: ${context.custodia.titulo ?? context.caso?.titulo ?? "Objeto encontrado"}`,
    context.caso ? `Caso relacionado: ${context.caso.codigo} - ${context.caso.titulo}` : "",
    `Reclamante: ${context.claimant ? fullName(context.claimant) : `${form.firstName} ${form.lastName}`.trim()} (${claimantTypeLabel(form)})`,
    `Documento/Codigo: ${form.document}`,
    form.email ? `Correo: ${form.email}` : "",
    form.phone ? `Telefono: ${form.phone}` : "",
    `Metodos de verificacion: ${form.methods.map(methodLabel).join(", ")}`,
    form.evidenceOtherDetail ? `Evidencia manual: ${form.evidenceOtherDetail}` : "",
    `Detalle de verificacion: ${form.verificationDetail}`,
    `Entrega: ${formatDateTimePe(new Date(form.handoffAt).toISOString())}`,
    `Responsable: ${context.deliverer ? fullName(context.deliverer) : form.deliveredById}`,
    `Punto de entrega: ${context.location?.nombre ?? form.handoffLocationId}`,
    `Estado al devolver: ${conditionLabel(form.objectCondition)}`,
    `Evidencia de entrega: ${form.deliveryEvidenceTypes.map(evidenceLabel).join(", ")}`,
    form.deliveryEvidenceOther ? `Otra evidencia: ${form.deliveryEvidenceOther}` : "",
    fotos.length ? `Imagenes adjuntas: ${fotos.map((foto) => foto.file.name).join(", ")}` : "",
    form.receiverConfirmed ? "Recepcion confirmada por la persona reclamante." : "",
    form.finalNotes ? `Observaciones adicionales: ${form.finalNotes}` : "",
  ].filter(Boolean).join("\n");
  return notes.length > 2000 ? `${notes.slice(0, 1990)}...` : notes;
}

function fullName(user: UsuarioConRoles) {
  return `${user.nombre} ${user.apellido}`.trim() || user.email;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function claimantTypeLabel(form: FormState) {
  if (form.claimantType === "COMUNIDAD") return "Miembro de la comunidad PUCP";
  if (form.claimantType === "VISITANTE") return "Visitante o persona externa";
  return form.claimantTypeOther || "Otro";
}

function methodLabel(value: string) {
  return VERIFICATION_METHODS.find((item) => item.value === value)?.label ?? value;
}

function evidenceLabel(value: EvidenceType) {
  return DELIVERY_EVIDENCE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function conditionLabel(value: ObjectCondition) {
  if (value === "BUENO") return "Bueno";
  if (value === "DESGASTE_PREVIO") return "Con desgaste previo";
  return "Con observaciones";
}

function isSensitiveObject(category?: string | null, title?: string | null) {
  const text = `${category ?? ""} ${title ?? ""}`.toLowerCase();
  return ["documento", "dni", "carnet", "tarjeta", "billetera", "celular", "telefono", "laptop", "dispositivo", "electronico"].some((word) => text.includes(word));
}

function custodyVisualLabel(custodia: CustodiaLf | null) {
  if (!custodia) return "En custodia";
  if (custodia.estado === "VENCIDA" || new Date(custodia.fecha_vencimiento).getTime() < Date.now()) return "Vencido";
  if (custodia.estado === "PROXIMA_VENCER") return "Proximo a vencer";
  return "En custodia";
}

function custodyVisualClass(custodia: CustodiaLf | null) {
  const label = custodyVisualLabel(custodia);
  if (label === "Vencido") return "border-rose-200 bg-rose-50 text-rose-700";
  if (label === "Proximo a vencer") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function daysBetween(from: string, to: string) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function toDateTimeLocalValue(value: Date) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
