import { useMemo, useState, type FormEvent } from "react";
import {
  getGetGgsAdminOwnerCenterQueryKey,
  getGgsAdminOwnerCenterBackup,
  useApplyGgsAdminOwnerCorrection,
  useApproveGgsAdminOwnerCorrection,
  useCreateGgsAdminOwnerCorrection,
  useCreateGgsAdminOwnerRecord,
  useDeleteGgsAdminOwnerRecord,
  useGetGgsAdminOwnerCenter,
  useRejectGgsAdminOwnerCorrection,
  useRestoreGgsAdminOwnerCenterBackup,
  useUpdateGgsAdminOwnerRecord,
  type GgsAdminOwnerCorrection,
  type GgsAdminOwnerRecord,
  type GgsAdminOwnerRecordInput,
  type GgsAdminOwnerRecordUpdate,
  type GgsAdminOwnerTransaction,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FileClock,
  FileText,
  Heart,
  History,
  Package,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import "./owner-center.css";

type Tab =
  | "overview"
  | "transactions"
  | "customers"
  | "team"
  | "finance"
  | "settings";
type OwnerData = Record<string, unknown>;
type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  occupation: string;
  social: string;
  membershipType: string;
  memberId: string;
  memberExpiry: string;
  memberBenefit: string;
  points: number;
  notes: string;
};
type FinanceForm = {
  type: "expense" | "stock_purchase" | "advance" | "deduction";
  date: string;
  title: string;
  amount: number;
  employeeId: string;
  branchId: string;
  quantity: number;
  unitCost: number;
  note: string;
};
type ProfileForm = {
  branchId: string;
  jobTitle: string;
  salaryMode: "commission_only" | "salary_plus_commission" | "fixed_salary";
  baseSalary: number;
  commissionService: number;
  commissionTreatment: number;
  commissionBeauty: number;
  mealPerDay: number;
  standardStartTime: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  attitudeScore: number;
};

const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
const currentPeriod = () => today().slice(0, 7);
const monthStart = (period: string) => `${period}-01`;
const monthEnd = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
};
const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
const dateLabel = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00+07:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(date);
};
const dateTimeLabel = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value))
    : "—";
const DEFAULT_CUSTOMER: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  occupation: "",
  social: "",
  membershipType: "",
  memberId: "",
  memberExpiry: "",
  memberBenefit: "",
  points: 0,
  notes: "",
};
const DEFAULT_FINANCE: FinanceForm = {
  type: "expense",
  date: today(),
  title: "",
  amount: 0,
  employeeId: "",
  branchId: "",
  quantity: 0,
  unitCost: 0,
  note: "",
};
const DEFAULT_PROFILE: ProfileForm = {
  branchId: "",
  jobTitle: "",
  salaryMode: "commission_only",
  baseSalary: 0,
  commissionService: 40,
  commissionTreatment: 30,
  commissionBeauty: 10,
  mealPerDay: 30000,
  standardStartTime: "09:00",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  attitudeScore: 100,
};
const DEFAULT_SETTINGS: OwnerData = {
  receipt: {
    businessName: "GGS Hair Studio",
    branchLabel: "",
    tagline: "Grooming Is Better",
    receiptSize: "80mm",
    footer: "",
    showFooter: true,
    showMessage: true,
    receiptMessages: [],
    showSocial: false,
    socialText: "",
    showQr: false,
    qrText: "",
    logoUrl: "",
  },
  social: { instagram: "", facebook: "", tiktok: "", whatsapp: "", bookingUrl: "" },
  reminders: {
    followUp:
      "Halo {nama}, terima kasih sudah berkunjung ke GGS Hair Studio. Kami siap menyambut Anda kembali.",
    birthday:
      "Selamat ulang tahun, {nama}! Semoga hari Anda menyenangkan. Salam hangat dari GGS Hair Studio.",
  },
  kpi: {
    attitudeWeight: 20,
    attendanceWeight: 30,
    productivityWeight: 50,
    targetTransactions: 165,
    productTreatmentTarget: 15,
    lateTier1Minutes: 30,
    lateTier2Minutes: 60,
    lateTier3Minutes: 90,
    lateTier1Deduction: 10000,
    lateTier2Deduction: 15000,
    lateTier3Deduction: 20000,
    lateTier4Deduction: 30000,
  },
};
const emptyCorrection = {
  reason: "",
  proposedCustomerName: "",
  proposedEmployeeName: "",
  proposedDiscountAmount: 0,
  proposedAmountReceived: 0,
  proposedPaymentMethod: "Tunai",
};

function dataOf(record: GgsAdminOwnerRecord | undefined): OwnerData {
  return (record?.data as OwnerData | undefined) ?? {};
}
function readString(data: OwnerData, key: string, fallback = "") {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}
function readNumber(data: OwnerData, key: string, fallback = 0) {
  const value = Number(data[key]);
  return Number.isFinite(value) ? value : fallback;
}
function readBoolean(data: OwnerData, key: string, fallback = false) {
  return typeof data[key] === "boolean" ? (data[key] as boolean) : fallback;
}
function readObject(data: OwnerData, key: string): OwnerData {
  const value = data[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as OwnerData)
    : {};
}
function errorText(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string") return value;
  }
  return "Perubahan belum tersimpan. Silakan coba lagi.";
}
function slug(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function waNumber(value: string) {
  return value.replace(/\D/g, "").replace(/^0/, "62");
}
function interpolate(template: string, name: string) {
  return template.replaceAll("{nama}", name || "Pelanggan GGS");
}

export default function OwnerCenterPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [fromDate, setFromDate] = useState(monthStart(currentPeriod()));
  const [toDate, setToDate] = useState(today());
  const [branchFilter, setBranchFilter] = useState("");
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [customerEditor, setCustomerEditor] = useState<GgsAdminOwnerRecord | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(DEFAULT_CUSTOMER);
  const [financeForm, setFinanceForm] = useState<FinanceForm>(DEFAULT_FINANCE);
  const [profileEmployeeId, setProfileEmployeeId] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileForm>(DEFAULT_PROFILE);
  const [payrollPeriod, setPayrollPeriod] = useState(currentPeriod());
  const [payrollEmployeeId, setPayrollEmployeeId] = useState("");
  const [correctionTransaction, setCorrectionTransaction] =
    useState<GgsAdminOwnerTransaction | null>(null);
  const [correctionForm, setCorrectionForm] = useState(emptyCorrection);
  const [applyCorrectionId, setApplyCorrectionId] = useState<number | null>(null);
  const [approvalCode, setApprovalCode] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "" });
  const [receiptMessagesText, setReceiptMessagesText] = useState("");
  const client = useQueryClient();

  const queryParams = { fromDate, toDate };
  const query = useGetGgsAdminOwnerCenter(queryParams, {
    query: {
      queryKey: getGetGgsAdminOwnerCenterQueryKey(queryParams),
      refetchOnMount: "always",
      staleTime: 20_000,
    },
  });
  const createRecord = useCreateGgsAdminOwnerRecord();
  const updateRecord = useUpdateGgsAdminOwnerRecord();
  const deleteRecord = useDeleteGgsAdminOwnerRecord();
  const createCorrection = useCreateGgsAdminOwnerCorrection();
  const approveCorrection = useApproveGgsAdminOwnerCorrection();
  const rejectCorrection = useRejectGgsAdminOwnerCorrection();
  const applyCorrection = useApplyGgsAdminOwnerCorrection();
  const restoreBackup = useRestoreGgsAdminOwnerCenterBackup();

  const data = query.data;
  const records = data?.records ?? [];
  const activeRecords = records.filter((record) => record.status !== "archived" && record.status !== "void");
  const branches = activeRecords.filter((record) => record.recordType === "branch");
  const customers = activeRecords.filter((record) => record.recordType === "customer");
  const financeEntries = activeRecords.filter(
    (record) => record.recordType === "finance" && record.status !== "void",
  );
  const payrollRecords = activeRecords.filter(
    (record) => record.recordType === "payroll" && record.status !== "void",
  );
  const employeeProfiles = activeRecords.filter(
    (record) => record.recordType === "employee_profile",
  );
  const settingRecord = records.find(
    (record) => record.recordType === "settings" && record.recordKey === "main",
  );
  const settings = settingRecord?.data ?? DEFAULT_SETTINGS;
  const receiptSettings = readObject(settings as OwnerData, "receipt");
  const socialSettings = readObject(settings as OwnerData, "social");
  const reminderSettings = readObject(settings as OwnerData, "reminders");
  const kpiSettings = readObject(settings as OwnerData, "kpi");
  const employeeById = useMemo(
    () => new Map((data?.employees ?? []).map((employee) => [employee.id, employee])),
    [data?.employees],
  );
  const employeeProfileById = useMemo(
    () => new Map(employeeProfiles.map((record) => [record.employeeId ?? record.recordKey, record])),
    [employeeProfiles],
  );
  const selectedEmployee = data?.employees.find((employee) => employee.id === profileEmployeeId);

  const filteredTransactions = useMemo(() => {
    const branchId = branchFilter;
    const needle = search.trim().toLocaleLowerCase("id-ID");
    return (data?.transactions ?? []).filter((transaction) => {
      const profile = employeeProfileById.get(transaction.employeeId);
      if (branchId && profile?.branchId !== branchId) return false;
      if (!needle) return true;
      return `${transaction.receiptNumber} ${transaction.customerName} ${transaction.employeeName} ${transaction.status}`
        .toLocaleLowerCase("id-ID")
        .includes(needle);
    });
  }, [branchFilter, data?.transactions, employeeProfileById, search]);

  const filteredAttendance = useMemo(
    () =>
      (data?.attendance ?? []).filter((attendance) => {
        if (!branchFilter) return true;
        return employeeProfileById.get(attendance.employeeId)?.branchId === branchFilter;
      }),
    [branchFilter, data?.attendance, employeeProfileById],
  );
  const filteredMovements = useMemo(
    () =>
      (data?.stockMovements ?? []).filter((movement) => {
        if (!branchFilter) return true;
        return employeeProfileById.get(movement.employeeId)?.branchId === branchFilter;
      }),
    [branchFilter, data?.stockMovements, employeeProfileById],
  );
  const filteredRecords = useMemo(
    () =>
      financeEntries.filter((record) => {
        if (!branchFilter) return true;
        return record.branchId === branchFilter;
      }),
    [branchFilter, financeEntries],
  );
  const completedTransactions = filteredTransactions.filter((item) => item.status === "completed");
  const totalRevenue = completedTransactions.reduce((sum, item) => sum + item.total, 0);
  const attendanceCount = filteredAttendance.length;
  const lowStock = (data?.products ?? []).filter((product) => product.active && product.stock <= 5).length;

  function refresh() {
    void client.invalidateQueries({
      queryKey: getGetGgsAdminOwnerCenterQueryKey(queryParams),
    });
  }
  function resetFeedback() {
    setPageError("");
    setNotice("");
    setOneTimeCode("");
  }
  async function saveOwnerRecord(input: GgsAdminOwnerRecordInput, existing?: GgsAdminOwnerRecord) {
    resetFeedback();
    try {
      if (existing) {
        const dataToSave: GgsAdminOwnerRecordUpdate = {
          recordKey: input.recordKey,
          branchId: input.branchId,
          employeeId: input.employeeId,
          recordDate: input.recordDate,
          recordPeriod: input.recordPeriod,
          status: input.status,
          data: input.data,
        };
        await updateRecord.mutateAsync({ id: existing.id, data: dataToSave });
      } else {
        await createRecord.mutateAsync({ data: input });
      }
      setNotice("Perubahan tersimpan.");
      refresh();
      return true;
    } catch (error) {
      setPageError(errorText(error));
      return false;
    }
  }
  async function archiveRecord(record: GgsAdminOwnerRecord, label: string) {
    if (!window.confirm(`Arsipkan ${label}? Riwayat transaksi dan keuangan tidak akan dihapus.`)) return;
    resetFeedback();
    try {
      await deleteRecord.mutateAsync({ id: record.id });
      setNotice("Data diarsipkan.");
      refresh();
    } catch (error) {
      setPageError(errorText(error));
    }
  }

  function startCustomerEdit(record?: GgsAdminOwnerRecord) {
    resetFeedback();
    setCustomerEditor(record ?? null);
    const recordData = dataOf(record);
    setCustomerForm(
      record
        ? {
            name: readString(recordData, "name"),
            phone: readString(recordData, "phone"),
            email: readString(recordData, "email"),
            dateOfBirth: readString(recordData, "dateOfBirth"),
            occupation: readString(recordData, "occupation"),
            social: readString(recordData, "social"),
            membershipType: readString(recordData, "membershipType"),
            memberId: readString(recordData, "memberId"),
            memberExpiry: readString(recordData, "memberExpiry"),
            memberBenefit: readString(recordData, "memberBenefit"),
            points: readNumber(recordData, "points"),
            notes: readString(recordData, "notes"),
          }
        : DEFAULT_CUSTOMER,
    );
  }
  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recordKey =
      customerEditor?.recordKey ??
      customerForm.phone.replace(/\D/g, "") ||
      crypto.randomUUID();
    const saved = await saveOwnerRecord(
      {
        recordType: "customer",
        recordKey,
        data: customerForm as unknown as Record<string, unknown>,
      },
      customerEditor ?? undefined,
    );
    if (saved) setCustomerEditor(null);
  }
  async function submitFinance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = crypto.randomUUID();
    const saved = await saveOwnerRecord({
      recordType: "finance",
      recordKey: key,
      branchId: financeForm.branchId || undefined,
      employeeId: financeForm.employeeId || undefined,
      recordDate: financeForm.date,
      data: financeForm as unknown as Record<string, unknown>,
    });
    if (saved) setFinanceForm({ ...DEFAULT_FINANCE, date: today() });
  }
  function loadEmployeeProfile(employeeId: string) {
    setProfileEmployeeId(employeeId);
    const record = employeeProfileById.get(employeeId);
    const recordData = dataOf(record);
    setProfileForm({
      branchId: readString(recordData, "branchId", record?.branchId ?? ""),
      jobTitle: readString(recordData, "jobTitle"),
      salaryMode:
        (readString(recordData, "salaryMode", "commission_only") as ProfileForm["salaryMode"]),
      baseSalary: readNumber(recordData, "baseSalary"),
      commissionService: readNumber(recordData, "commissionService", 40),
      commissionTreatment: readNumber(recordData, "commissionTreatment", 30),
      commissionBeauty: readNumber(recordData, "commissionBeauty", 10),
      mealPerDay: readNumber(recordData, "mealPerDay", 30000),
      standardStartTime: readString(recordData, "standardStartTime", "09:00"),
      bankName: readString(recordData, "bankName"),
      bankAccountName: readString(recordData, "bankAccountName"),
      bankAccountNumber: readString(recordData, "bankAccountNumber"),
      attitudeScore: readNumber(recordData, "attitudeScore", 100),
    });
  }
  async function submitEmployeeProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) return;
    const existing = employeeProfileById.get(selectedEmployee.id);
    await saveOwnerRecord(
      {
        recordType: "employee_profile",
        recordKey: selectedEmployee.id,
        employeeId: selectedEmployee.id,
        branchId: profileForm.branchId || undefined,
        data: profileForm as unknown as Record<string, unknown>,
      },
      existing,
    );
  }
  async function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recordKey = slug(branchForm.name);
    if (!recordKey) {
      setPageError("Nama cabang belum valid.");
      return;
    }
    const saved = await saveOwnerRecord({
      recordType: "branch",
      recordKey,
      data: { ...branchForm, active: true },
    });
    if (saved) setBranchForm({ name: "", address: "", phone: "" });
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const receipt = {
      businessName: readString(receiptSettings, "businessName", "GGS Hair Studio"),
      branchLabel: readString(receiptSettings, "branchLabel"),
      tagline: readString(receiptSettings, "tagline"),
      receiptSize: readString(receiptSettings, "receiptSize", "80mm"),
      footer: readString(receiptSettings, "footer"),
      showFooter: readBoolean(receiptSettings, "showFooter", true),
      showMessage: readBoolean(receiptSettings, "showMessage", true),
      receiptMessages: receiptMessagesText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      showSocial: readBoolean(receiptSettings, "showSocial"),
      socialText: readString(receiptSettings, "socialText"),
      showQr: readBoolean(receiptSettings, "showQr"),
      qrText: readString(receiptSettings, "qrText"),
      logoUrl: readString(receiptSettings, "logoUrl"),
    };
    const saved = await saveOwnerRecord(
      {
        recordType: "settings",
        recordKey: "main",
        data: {
          receipt,
          social: socialSettings,
          reminders: reminderSettings,
          kpi: kpiSettings,
        },
      },
      settingRecord,
    );
    if (saved) setReceiptMessagesText(receipt.receiptMessages.join("\n"));
  }
  function setSettingGroup(group: string, key: string, value: unknown) {
    const current = settings as OwnerData;
    const nextGroup = { ...readObject(current, group), [key]: value };
    const next = { ...current, [group]: nextGroup };
    if (settingRecord) {
      void updateRecord.mutateAsync({
        id: settingRecord.id,
        data: { data: next },
      }).then(() => {
        refresh();
      }).catch((error) => setPageError(errorText(error)));
    } else {
      void createRecord.mutateAsync({
        data: { recordType: "settings", recordKey: "main", data: next },
      }).then(() => refresh()).catch((error) => setPageError(errorText(error)));
    }
  }
  async function exportBackup() {
    resetFeedback();
    try {
      const backup = await getGgsAdminOwnerCenterBackup();
      const file = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const href = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = href;
      link.download = `ggs-owner-backup-${today()}.json`;
      link.click();
      URL.revokeObjectURL(href);
      setNotice("Backup data pemilik berhasil diunduh.");
    } catch (error) {
      setPageError(errorText(error));
    }
  }
  async function importBackup(file: File | undefined) {
    if (!file) return;
    resetFeedback();
    try {
      const parsed = JSON.parse(await file.text()) as {
        formatVersion?: number;
        records?: GgsAdminOwnerRecordInput[];
      };
      if (parsed.formatVersion !== 1 || !Array.isArray(parsed.records)) {
        throw new Error("Format file backup GGS tidak dikenali.");
      }
      if (
        !window.confirm(
          `Gabungkan ${parsed.records.length} catatan owner dari backup? Data lama tidak dihapus; catatan keuangan yang kuncinya sama dilewati.`,
        )
      ) {
        return;
      }
      const result = await restoreBackup.mutateAsync({
        data: { formatVersion: 1, records: parsed.records },
      });
      setNotice(
        `Backup digabung: ${result.imported} data baru, ${result.updated} pengaturan diperbarui, ${result.skipped} catatan dilewati.`,
      );
      refresh();
    } catch (error) {
      setPageError(errorText(error));
    }
  }
  async function requestCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!correctionTransaction) return;
    resetFeedback();
    try {
      await createCorrection.mutateAsync({
        data: {
          transactionId: correctionTransaction.id,
          ...correctionForm,
        },
      });
      setNotice("Pengajuan koreksi tercatat. Transaksi belum berubah.");
      setCorrectionTransaction(null);
      refresh();
    } catch (error) {
      setPageError(errorText(error));
    }
  }
  async function approve(request: GgsAdminOwnerCorrection) {
    resetFeedback();
    try {
      const result = await approveCorrection.mutateAsync({ id: request.id });
      setOneTimeCode(result.approvalCode);
      setNotice("Koreksi disetujui. Kode hanya ditampilkan satu kali.");
      refresh();
    } catch (error) {
      setPageError(errorText(error));
    }
  }
  async function reject(request: GgsAdminOwnerCorrection) {
    const reason = window.prompt("Alasan penolakan koreksi");
    if (!reason?.trim()) return;
    resetFeedback();
    try {
      await rejectCorrection.mutateAsync({ id: request.id, data: { reason } });
      setNotice("Pengajuan ditolak. Transaksi tidak berubah.");
      refresh();
    } catch (error) {
      setPageError(errorText(error));
    }
  }
  async function submitApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (applyCorrectionId === null) return;
    resetFeedback();
    try {
      await applyCorrection.mutateAsync({
        id: applyCorrectionId,
        data: { approvalCode },
      });
      setNotice("Koreksi diterapkan dan jejak sebelum/sesudahnya tersimpan.");
      setApplyCorrectionId(null);
      setApprovalCode("");
      refresh();
    } catch (error) {
      setPageError(errorText(error));
    }
  }
  async function savePayroll() {
    const employeeId = payrollEmployeeId;
    const employee = data?.employees.find((item) => item.id === employeeId);
    const profileRecord = employeeProfileById.get(employeeId);
    if (!employee || !profileRecord) {
      setPageError("Lengkapi profil gaji karyawan sebelum menghitung payroll.");
      return;
    }
    const profile = dataOf(profileRecord);
    const serviceCategories = new Map((data?.services ?? []).map((service) => [service.id, service.category.toLowerCase()]));
    const employeeTransactions = completedTransactions.filter(
      (transaction) =>
        transaction.employeeId === employeeId ||
        transaction.employeeName === employee.name,
    );
    let service = 0;
    let treatment = 0;
    let beauty = 0;
    let treatmentOrProductQuantity = 0;
    for (const transaction of employeeTransactions) {
      for (const item of transaction.items) {
        if (item.itemType !== "service") {
          if (item.itemType === "product") treatmentOrProductQuantity += item.quantity;
          continue;
        }
        const category = serviceCategories.get(item.itemId) ?? item.itemName.toLowerCase();
        if (category.includes("treatment") || category.includes("treat")) {
          treatment += item.lineTotal;
          treatmentOrProductQuantity += item.quantity;
        } else if (category.includes("beauty") || category.includes("nail") || category.includes("eyelash")) {
          beauty += item.lineTotal;
        } else {
          service += item.lineTotal;
        }
      }
    }
    const employeeAttendance = filteredAttendance.filter((item) => item.employeeId === employeeId);
    const mealPerDay = readNumber(profile, "mealPerDay", 30000);
    const kpi = readObject(settings as OwnerData, "kpi");
    let lateDeduction = 0;
    for (const attendance of employeeAttendance) {
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(attendance.checkInAt));
      const [hour, minute] = time.split(":").map(Number);
      const [startHour, startMinute] = readString(profile, "standardStartTime", "09:00")
        .split(":")
        .map(Number);
      const lateMinutes = hour * 60 + minute - (startHour * 60 + startMinute);
      if (lateMinutes >= readNumber(kpi, "lateTier3Minutes", 90)) {
        lateDeduction += readNumber(kpi, "lateTier4Deduction", 30000);
      } else if (lateMinutes >= readNumber(kpi, "lateTier2Minutes", 60)) {
        lateDeduction += readNumber(kpi, "lateTier3Deduction", 20000);
      } else if (lateMinutes >= readNumber(kpi, "lateTier1Minutes", 30)) {
        lateDeduction += readNumber(kpi, "lateTier2Deduction", 15000);
      } else if (lateMinutes > 0) {
        lateDeduction += readNumber(kpi, "lateTier1Deduction", 10000);
      }
    }
    const employeeFinance = financeEntries.filter((record) => {
      const item = dataOf(record);
      return (
        (record.employeeId === employeeId || readString(item, "employeeId") === employeeId) &&
        readString(item, "date") >= monthStart(payrollPeriod) &&
        readString(item, "date") <= monthEnd(payrollPeriod)
      );
    });
    const advances = employeeFinance
      .filter((record) => readString(dataOf(record), "type") === "advance")
      .reduce((sum, record) => sum + readNumber(dataOf(record), "amount"), 0);
    const otherDeductions = employeeFinance
      .filter((record) => readString(dataOf(record), "type") === "deduction")
      .reduce((sum, record) => sum + readNumber(dataOf(record), "amount"), 0);
    const salaryMode = readString(profile, "salaryMode", "commission_only");
    const baseSalary =
      salaryMode === "commission_only" ? 0 : readNumber(profile, "baseSalary");
    const commissionService = Math.round(
      (service * readNumber(profile, "commissionService", 40)) / 100,
    );
    const commissionTreatment = Math.round(
      (treatment * readNumber(profile, "commissionTreatment", 30)) / 100,
    );
    const commissionBeauty = Math.round(
      (beauty * readNumber(profile, "commissionBeauty", 10)) / 100,
    );
    const meal = employeeAttendance.length * mealPerDay;
    const gross =
      baseSalary + commissionService + commissionTreatment + commissionBeauty + meal;
    const deductions = otherDeductions + advances + lateDeduction;
    const net = Math.max(0, gross - deductions);
    const key = `${payrollPeriod}-${employeeId}`;
    const existing = payrollRecords.find((record) => record.recordKey === key);
    if (existing?.status === "paid") {
      setPageError("Payroll yang sudah dibayar tidak dapat dihitung ulang.");
      return;
    }
    const saved = await saveOwnerRecord(
      {
        recordType: "payroll",
        recordKey: key,
        branchId: profileRecord.branchId ?? readString(profile, "branchId") || undefined,
        employeeId,
        recordPeriod: payrollPeriod,
        status: "draft",
        data: {
          employeeId,
          employeeName: employee.name,
          period: payrollPeriod,
          jobTitle: readString(profile, "jobTitle"),
          baseSalary,
          commissionService,
          commissionTreatment,
          commissionBeauty,
          serviceBase: service,
          treatmentBase: treatment,
          beautyBase: beauty,
          attendedDays: employeeAttendance.length,
          meal,
          advances,
          lateDeduction,
          deductions: otherDeductions,
          gross,
          net,
          kpiQuantity: treatmentOrProductQuantity,
        },
      },
      existing,
    );
    if (saved) setNotice(`Payroll ${employee.name} untuk ${payrollPeriod} berhasil dihitung.`);
  }

  const navTabs: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
    { id: "overview", label: "Ringkasan", icon: ClipboardList },
    { id: "transactions", label: "Transaksi & stok", icon: ReceiptText },
    { id: "customers", label: "Pelanggan", icon: Heart },
    { id: "team", label: "Tim & payroll", icon: UsersRound },
    { id: "finance", label: "Keuangan & laporan", icon: Wallet },
    { id: "settings", label: "Pengaturan", icon: Settings2 },
  ];

  return (
    <main className="owner-center">
      <header className="owner-center-heading">
        <div>
          <span className="owner-eyebrow">RUANG KENDALI PEMILIK</span>
          <h1>Pusat operasional</h1>
          <p>Data kasir, tim, pelanggan, cabang, dan keuangan dalam satu tempat.</p>
        </div>
        <div className="owner-heading-mark"><Sparkles size={18} /> GGS Hair Studio</div>
      </header>

      <div className="owner-tabs" role="tablist" aria-label="Modul operasional pemilik">
        {navTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              resetFeedback();
              setTab(id);
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <section className="owner-filters">
        <label>
          <span>Dari</span>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          <span>Sampai</span>
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label>
          <span>Cabang</span>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">Semua cabang</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.recordKey}>
                {readString(dataOf(branch), "name", branch.recordKey)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="owner-icon-action"
          type="button"
          onClick={() => void query.refetch()}
          aria-label="Muat ulang data"
          title="Muat ulang data"
        >
          <RefreshCw size={16} />
        </button>
      </section>

      {pageError && (
        <div className="owner-alert owner-alert-error" role="alert">
          <ShieldAlert size={17} /> <span>{pageError}</span>
          <button type="button" aria-label="Tutup pesan" onClick={() => setPageError("")}><X size={15} /></button>
        </div>
      )}
      {notice && (
        <div className="owner-alert owner-alert-success" role="status">
          <Check size={17} /> <span>{notice}</span>
          <button type="button" aria-label="Tutup pesan" onClick={() => setNotice("")}><X size={15} /></button>
        </div>
      )}
      {oneTimeCode && (
        <div className="owner-code-callout">
          <BadgeCheck size={19} />
          <span><b>Kode persetujuan koreksi:</b> <code>{oneTimeCode}</code> Simpan sekarang; kode tidak ditampilkan lagi.</span>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(oneTimeCode)}>Salin kode</button>
          <button type="button" aria-label="Tutup kode" onClick={() => setOneTimeCode("")}><X size={15} /></button>
        </div>
      )}

      {query.isLoading ? (
        <div className="owner-loading"><span /><span /><span /><span /></div>
      ) : query.isError ? (
        <section className="owner-empty owner-error-state">
          <ShieldAlert size={24} />
          <h2>Tidak dapat memuat data operasional</h2>
          <p>{errorText(query.error)} Pastikan akun ini terdaftar sebagai pemilik GGS.</p>
          <button className="owner-button owner-button-outline" type="button" onClick={() => void query.refetch()}>
            Coba lagi
          </button>
        </section>
      ) : (
        <>
          {tab === "overview" && (
            <section className="owner-panel">
              <div className="owner-metric-grid">
                <Metric icon={<Banknote />} label="Pendapatan kasir" value={currency(totalRevenue)} note="Transaksi selesai" />
                <Metric icon={<ReceiptText />} label="Transaksi selesai" value={String(completedTransactions.length)} note={`${filteredTransactions.filter((item) => item.status === "cancelled").length} dibatalkan`} />
                <Metric icon={<CalendarDays />} label="Absensi tercatat" value={String(attendanceCount)} note={`${data?.appointments.completed ?? 0} booking selesai`} />
                <Metric icon={<Package />} label="Stok perlu dicek" value={String(lowStock)} note="Produk dengan stok ≤ 5" />
              </div>
              <div className="owner-two-column">
                <section className="owner-card">
                  <div className="owner-section-head">
                    <div><span className="owner-eyebrow">KASIR</span><h2>Transaksi terbaru</h2></div>
                    <button className="owner-text-button" type="button" onClick={() => setTab("transactions")}>Lihat semua <ChevronRight size={15} /></button>
                  </div>
                  <TransactionTable transactions={filteredTransactions.slice(0, 6)} />
                </section>
                <section className="owner-card">
                  <div className="owner-section-head">
                    <div><span className="owner-eyebrow">JANJI TEMU</span><h2>Aktivitas periode ini</h2></div>
                    <CalendarDays size={18} />
                  </div>
                  <div className="owner-booking-stats">
                    <span><b>{data?.appointments.total ?? 0}</b><small>Total booking</small></span>
                    <span><b>{data?.appointments.pending ?? 0}</b><small>Menunggu</small></span>
                    <span><b>{data?.appointments.completed ?? 0}</b><small>Selesai</small></span>
                    <span><b>{data?.appointments.cancelled ?? 0}</b><small>Dibatalkan</small></span>
                  </div>
                  <p className="owner-note">Status booking diubah dari menu Janji temu. Angka ini mengambil seluruh cabang karena booking belum memiliki penetapan cabang.</p>
                </section>
              </div>
              <section className="owner-card">
                <div className="owner-section-head">
                  <div><span className="owner-eyebrow">LAPORAN TIM</span><h2>Aktivitas karyawan</h2></div>
                  <button className="owner-text-button" type="button" onClick={() => setTab("team")}>Buka payroll <ChevronRight size={15} /></button>
                </div>
                <TeamSummary
                  employees={data?.employees ?? []}
                  transactions={filteredTransactions}
                  attendance={filteredAttendance}
                  profileById={employeeProfileById}
                  kpiSettings={kpiSettings}
                />
              </section>
            </section>
          )}

          {tab === "transactions" && (
            <section className="owner-panel">
              <div className="owner-section-head owner-page-title">
                <div><span className="owner-eyebrow">KASIR & PERSEDIAAN</span><h2>Transaksi dan stok</h2></div>
                <label className="owner-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari struk, pelanggan, karyawan" /></label>
              </div>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">BUKU TRANSAKSI</span><h3>Riwayat kasir</h3></div><span className="owner-badge">{filteredTransactions.length} transaksi</span></div>
                <TransactionTable transactions={filteredTransactions} onRequestCorrection={(transaction) => {
                  setCorrectionTransaction(transaction);
                  setCorrectionForm({
                    reason: "",
                    proposedCustomerName: transaction.customerName,
                    proposedEmployeeName: transaction.employeeName,
                    proposedDiscountAmount: transaction.discountAmount,
                    proposedAmountReceived: transaction.amountReceived,
                    proposedPaymentMethod: transaction.paymentMethod,
                  });
                }} />
              </section>
              {correctionTransaction && (
                <section className="owner-card owner-form-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">PENGAJUAN KOREKSI</span><h3>{correctionTransaction.receiptNumber}</h3></div><button className="owner-icon-action" type="button" onClick={() => setCorrectionTransaction(null)} aria-label="Tutup"><X size={16} /></button></div>
                  <p className="owner-note">Hanya tiga transaksi terbaru yang dapat diajukan. Pengajuan tidak langsung mengubah nilai transaksi; koreksi baru berlaku setelah persetujuan dan kode sekali pakai.</p>
                  <form className="owner-form-grid" onSubmit={requestCorrection}>
                    <Field label="Alasan" className="span-2"><textarea required minLength={5} maxLength={600} value={correctionForm.reason} onChange={(event) => setCorrectionForm({ ...correctionForm, reason: event.target.value })} /></Field>
                    <Field label="Nama pelanggan"><input required value={correctionForm.proposedCustomerName} onChange={(event) => setCorrectionForm({ ...correctionForm, proposedCustomerName: event.target.value })} /></Field>
                    <Field label="Nama karyawan"><input required value={correctionForm.proposedEmployeeName} onChange={(event) => setCorrectionForm({ ...correctionForm, proposedEmployeeName: event.target.value })} /></Field>
                    <Field label="Diskon baru (Rp)"><input required min={0} type="number" value={correctionForm.proposedDiscountAmount} onChange={(event) => setCorrectionForm({ ...correctionForm, proposedDiscountAmount: Number(event.target.value) })} /></Field>
                    <Field label="Uang diterima (Rp)"><input required min={0} type="number" value={correctionForm.proposedAmountReceived} onChange={(event) => setCorrectionForm({ ...correctionForm, proposedAmountReceived: Number(event.target.value) })} /></Field>
                    <Field label="Metode pembayaran"><select value={correctionForm.proposedPaymentMethod} onChange={(event) => setCorrectionForm({ ...correctionForm, proposedPaymentMethod: event.target.value })}><option>Tunai</option><option>QRIS</option><option>Transfer</option><option>Debit</option></select></Field>
                    <div className="owner-form-actions span-2"><button className="owner-button owner-button-outline" type="button" onClick={() => setCorrectionTransaction(null)}>Batal</button><button className="owner-button" disabled={createCorrection.isPending}>{createCorrection.isPending ? "Menyimpan…" : "Ajukan koreksi"}</button></div>
                  </form>
                </section>
              )}
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">PERSETUJUAN</span><h3>Pengajuan koreksi transaksi</h3></div><FileClock size={18} /></div>
                <CorrectionList
                  requests={data?.correctionRequests ?? []}
                  onApprove={approve}
                  onReject={reject}
                  onApply={(request) => {
                    setApplyCorrectionId(request.id);
                    setApprovalCode("");
                  }}
                  busy={approveCorrection.isPending || rejectCorrection.isPending || applyCorrection.isPending}
                />
                {applyCorrectionId !== null && (
                  <form className="owner-inline-code" onSubmit={submitApply}>
                    <label>Kode persetujuan <input required minLength={6} maxLength={32} value={approvalCode} onChange={(event) => setApprovalCode(event.target.value)} autoComplete="one-time-code" /></label>
                    <button className="owner-button" disabled={applyCorrection.isPending}>{applyCorrection.isPending ? "Menerapkan…" : "Terapkan koreksi"}</button>
                    <button className="owner-icon-action" type="button" onClick={() => setApplyCorrectionId(null)} aria-label="Batal"><X size={15} /></button>
                  </form>
                )}
              </section>
              <div className="owner-two-column">
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">PERSEDIAAN</span><h3>Produk dan stok saat ini</h3></div><Package size={18} /></div>
                  <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Stok</th><th>Harga jual</th></tr></thead><tbody>{(data?.products ?? []).map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category || "—"}</td><td><b className={product.stock <= 5 ? "owner-low-stock" : ""}>{product.stock}</b></td><td>{currency(product.price)}</td></tr>)}</tbody></table></div>
                </section>
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">RIWAYAT STOK</span><h3>Pergerakan stok</h3></div><History size={18} /></div>
                  <MovementList movements={filteredMovements.slice(0, 20)} />
                </section>
              </div>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">ABSENSI</span><h3>Jam masuk dan pulang</h3></div><Clock3 size={18} /></div>
                <AttendanceTable attendance={filteredAttendance} />
              </section>
            </section>
          )}

          {tab === "customers" && (
            <section className="owner-panel">
              <div className="owner-section-head owner-page-title">
                <div><span className="owner-eyebrow">CRM & PROGRAM MEMBER</span><h2>Pelanggan GGS</h2></div>
                <button className="owner-button" type="button" onClick={() => startCustomerEdit()}><Plus size={16} /> Tambah pelanggan</button>
              </div>
              {customerEditor !== null && (
                <CustomerEditor
                  form={customerForm}
                  setForm={setCustomerForm}
                  saving={createRecord.isPending || updateRecord.isPending}
                  existing={customerEditor}
                  onSubmit={submitCustomer}
                  onClose={() => setCustomerEditor(null)}
                />
              )}
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">PELANGGAN & MEMBER</span><h3>Profil tersimpan</h3></div><span className="owner-badge">{customers.length}</span></div>
                {customers.length ? (
                  <div className="owner-customer-grid">
                    {customers.filter((customer) => {
                      const item = dataOf(customer);
                      return `${readString(item, "name")} ${readString(item, "phone")} ${readString(item, "memberId")}`.toLocaleLowerCase("id-ID").includes(search.toLocaleLowerCase("id-ID"));
                    }).map((customer) => <CustomerCard
                      key={customer.id}
                      record={customer}
                      reminder={reminderSettings}
                      onEdit={() => startCustomerEdit(customer)}
                      onArchive={() => void archiveRecord(customer, readString(dataOf(customer), "name", "pelanggan"))}
                    />)}
                  </div>
                ) : (
                  <EmptyInline title="Belum ada profil pelanggan" body="Tambahkan data pelanggan/member. Manfaat member dicatat sesuai kebijakan GGS, tanpa asumsi otomatis." />
                )}
              </section>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">PENGINGAT MANUAL</span><h3>Ulang tahun dalam 14 hari</h3></div><Heart size={18} /></div>
                <BirthdayList customers={customers} reminder={reminderSettings} />
              </section>
              <p className="owner-note">Pengingat membuka WhatsApp dengan teks siap kirim. Pesan tidak dikirim otomatis.</p>
            </section>
          )}

          {tab === "team" && (
            <section className="owner-panel">
              <div className="owner-section-head owner-page-title">
                <div><span className="owner-eyebrow">SDM & PENGGAJIAN</span><h2>Tim, komisi, dan payroll</h2></div>
                <label className="owner-compact-field">Periode payroll<input type="month" value={payrollPeriod} onChange={(event) => {
                  setPayrollPeriod(event.target.value);
                  if (event.target.value) {
                    setFromDate(monthStart(event.target.value));
                    setToDate(monthEnd(event.target.value));
                  }
                }} /></label>
              </div>
              <div className="owner-two-column">
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">DATA KOMPENSASI</span><h3>Profil karyawan</h3></div><UsersRound size={18} /></div>
                  <label className="owner-field"><span>Pilih akun karyawan</span><select value={profileEmployeeId} onChange={(event) => loadEmployeeProfile(event.target.value)}><option value="">Pilih karyawan…</option>{(data?.employees ?? []).map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employeeId}</option>)}</select></label>
                  {selectedEmployee ? (
                    <form className="owner-form-grid" onSubmit={submitEmployeeProfile}>
                      <Field label="Jabatan"><input value={profileForm.jobTitle} onChange={(event) => setProfileForm({ ...profileForm, jobTitle: event.target.value })} /></Field>
                      <Field label="Cabang"><select value={profileForm.branchId} onChange={(event) => setProfileForm({ ...profileForm, branchId: event.target.value })}><option value="">Belum ditentukan</option>{branches.map((branch) => <option key={branch.id} value={branch.recordKey}>{readString(dataOf(branch), "name", branch.recordKey)}</option>)}</select></Field>
                      <Field label="Sistem gaji"><select value={profileForm.salaryMode} onChange={(event) => setProfileForm({ ...profileForm, salaryMode: event.target.value as ProfileForm["salaryMode"] })}><option value="commission_only">Komisi saja</option><option value="salary_plus_commission">Gaji + komisi</option><option value="fixed_salary">Gaji tetap</option></select></Field>
                      <Field label="Gaji pokok (Rp)"><input type="number" min={0} value={profileForm.baseSalary} onChange={(event) => setProfileForm({ ...profileForm, baseSalary: Number(event.target.value) })} /></Field>
                      <Field label="Komisi layanan (%)"><input type="number" min={0} max={100} value={profileForm.commissionService} onChange={(event) => setProfileForm({ ...profileForm, commissionService: Number(event.target.value) })} /></Field>
                      <Field label="Komisi treatment (%)"><input type="number" min={0} max={100} value={profileForm.commissionTreatment} onChange={(event) => setProfileForm({ ...profileForm, commissionTreatment: Number(event.target.value) })} /></Field>
                      <Field label="Komisi beauty (%)"><input type="number" min={0} max={100} value={profileForm.commissionBeauty} onChange={(event) => setProfileForm({ ...profileForm, commissionBeauty: Number(event.target.value) })} /></Field>
                      <Field label="Uang makan/hari (Rp)"><input type="number" min={0} value={profileForm.mealPerDay} onChange={(event) => setProfileForm({ ...profileForm, mealPerDay: Number(event.target.value) })} /></Field>
                      <Field label="Jam masuk standar"><input type="time" value={profileForm.standardStartTime} onChange={(event) => setProfileForm({ ...profileForm, standardStartTime: event.target.value })} /></Field>
                      <Field label="Nilai sikap KPI (0–100)"><input type="number" min={0} max={100} value={profileForm.attitudeScore} onChange={(event) => setProfileForm({ ...profileForm, attitudeScore: Number(event.target.value) })} /></Field>
                      <Field label="Bank"><input value={profileForm.bankName} onChange={(event) => setProfileForm({ ...profileForm, bankName: event.target.value })} /></Field>
                      <Field label="Nama rekening"><input value={profileForm.bankAccountName} onChange={(event) => setProfileForm({ ...profileForm, bankAccountName: event.target.value })} /></Field>
                      <Field label="Nomor rekening"><input autoComplete="off" value={profileForm.bankAccountNumber} onChange={(event) => setProfileForm({ ...profileForm, bankAccountNumber: event.target.value })} /></Field>
                      <div className="owner-form-actions span-2"><button className="owner-button" disabled={createRecord.isPending || updateRecord.isPending}>{createRecord.isPending || updateRecord.isPending ? "Menyimpan…" : "Simpan profil karyawan"}</button></div>
                    </form>
                  ) : <EmptyInline title="Pilih karyawan" body="Pengaturan gaji dan cabang tersimpan terpisah dari data login." />}
                </section>
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">HITUNG OTOMATIS</span><h3>Payroll periode</h3></div><Banknote size={18} /></div>
                  <label className="owner-field"><span>Karyawan untuk dihitung</span><select value={payrollEmployeeId} onChange={(event) => setPayrollEmployeeId(event.target.value)}><option value="">Pilih karyawan…</option>{(data?.employees ?? []).filter((employee) => employee.active).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
                  <div className="owner-payroll-info">
                    <p>Dasar hitung: transaksi selesai, komisi per kategori layanan, absensi tercatat, uang makan, kasbon, potongan, dan aturan keterlambatan.</p>
                    <button className="owner-button" type="button" onClick={() => void savePayroll()} disabled={!payrollEmployeeId || createRecord.isPending || updateRecord.isPending}><Sparkles size={15} /> Hitung & simpan payroll</button>
                  </div>
                  <div className="owner-note owner-note-warning">Pastikan transaksi dan absensi untuk {payrollPeriod} sudah lengkap sebelum payroll dibayar. Profil akun/rekening hanya terlihat di CMS pemilik.</div>
                </section>
              </div>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">SLIP & STATUS</span><h3>Daftar payroll tersimpan</h3></div><FileText size={18} /></div>
                <PayrollTable
                  records={payrollRecords}
                  employeeById={employeeById}
                  onMarkPaid={(record) => {
                    void saveOwnerRecord({
                      recordType: "payroll",
                      recordKey: record.recordKey,
                      employeeId: record.employeeId ?? undefined,
                      branchId: record.branchId ?? undefined,
                      recordPeriod: record.recordPeriod ?? undefined,
                      status: "paid",
                      data: dataOf(record),
                    }, record);
                  }}
                />
              </section>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">ABSENSI & KPI</span><h3>Rekap tim periode ini</h3></div><BadgeCheck size={18} /></div>
                <TeamSummary employees={data?.employees ?? []} transactions={filteredTransactions} attendance={filteredAttendance} profileById={employeeProfileById} kpiSettings={kpiSettings} />
                <p className="owner-note">KPI menggunakan bobot yang dapat diatur. Nilai kehadiran didasarkan pada catatan check-in yang tersedia; hari izin/sakit belum dicatat di modul absensi saat ini.</p>
              </section>
            </section>
          )}

          {tab === "finance" && (
            <section className="owner-panel">
              <div className="owner-section-head owner-page-title">
                <div><span className="owner-eyebrow">LAPORAN KEUANGAN</span><h2>Pendapatan, biaya, dan kasbon</h2></div>
                <span className="owner-badge">{dateLabel(fromDate)} — {dateLabel(toDate)}</span>
              </div>
              <FinanceSummary transactions={filteredTransactions} entries={filteredRecords} payroll={payrollRecords} />
              <div className="owner-two-column">
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">CATATAN BARU</span><h3>Tambah transaksi keuangan</h3></div><Plus size={18} /></div>
                  <form className="owner-form-grid" onSubmit={submitFinance}>
                    <Field label="Jenis"><select value={financeForm.type} onChange={(event) => setFinanceForm({ ...financeForm, type: event.target.value as FinanceForm["type"] })}><option value="expense">Pengeluaran operasional</option><option value="stock_purchase">Pembelian stok jual</option><option value="advance">Kasbon karyawan</option><option value="deduction">Potongan lain</option></select></Field>
                    <Field label="Tanggal"><input type="date" required value={financeForm.date} onChange={(event) => setFinanceForm({ ...financeForm, date: event.target.value })} /></Field>
                    <Field label="Nama/keterangan" className="span-2"><input required minLength={2} value={financeForm.title} onChange={(event) => setFinanceForm({ ...financeForm, title: event.target.value })} placeholder="Contoh: listrik, pembelian shampoo" /></Field>
                    <Field label="Nominal (Rp)"><input type="number" min={0} required value={financeForm.amount} onChange={(event) => setFinanceForm({ ...financeForm, amount: Number(event.target.value) })} /></Field>
                    <Field label="Cabang"><select value={financeForm.branchId} onChange={(event) => setFinanceForm({ ...financeForm, branchId: event.target.value })}><option value="">Semua/tidak ditentukan</option>{branches.map((branch) => <option key={branch.id} value={branch.recordKey}>{readString(dataOf(branch), "name", branch.recordKey)}</option>)}</select></Field>
                    {(financeForm.type === "advance" || financeForm.type === "deduction") && <Field label="Karyawan"><select required={financeForm.type === "advance"} value={financeForm.employeeId} onChange={(event) => setFinanceForm({ ...financeForm, employeeId: event.target.value })}><option value="">Pilih karyawan…</option>{(data?.employees ?? []).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field>}
                    {financeForm.type === "stock_purchase" && <><Field label="Jumlah"><input type="number" min={0} value={financeForm.quantity} onChange={(event) => setFinanceForm({ ...financeForm, quantity: Number(event.target.value) })} /></Field><Field label="Biaya per unit (Rp)"><input type="number" min={0} value={financeForm.unitCost} onChange={(event) => setFinanceForm({ ...financeForm, unitCost: Number(event.target.value) })} /></Field></>}
                    <Field label="Catatan" className="span-2"><textarea value={financeForm.note} onChange={(event) => setFinanceForm({ ...financeForm, note: event.target.value })} maxLength={1200} /></Field>
                    <div className="owner-form-actions span-2"><button className="owner-button" disabled={createRecord.isPending}>{createRecord.isPending ? "Menyimpan…" : "Simpan catatan"}</button></div>
                  </form>
                </section>
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">RIWAYAT</span><h3>Catatan keuangan</h3></div><History size={18} /></div>
                  <FinanceEntries records={filteredRecords} onArchive={(record) => void archiveRecord(record, readString(dataOf(record), "title", "catatan"))} />
                </section>
              </div>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">RINGKASAN OPERASIONAL</span><h3>Produk, transaksi, booking, dan absensi</h3></div><ClipboardList size={18} /></div>
                <div className="owner-report-grid">
                  <ReportCell label="Pendapatan kasir" value={currency(totalRevenue)} />
                  <ReportCell label="Booking selesai" value={String(data?.appointments.completed ?? 0)} />
                  <ReportCell label="Stok masuk/keluar" value={String(filteredMovements.length)} />
                  <ReportCell label="Absensi tercatat" value={String(filteredAttendance.length)} />
                  <ReportCell label="Produk terjual" value={String(completedTransactions.flatMap((transaction) => transaction.items).filter((item) => item.itemType === "product").reduce((sum, item) => sum + item.quantity, 0))} />
                  <ReportCell label="Transaksi batal" value={String(filteredTransactions.filter((transaction) => transaction.status === "cancelled").length)} />
                </div>
              </section>
            </section>
          )}

          {tab === "settings" && (
            <section className="owner-panel">
              <div className="owner-section-head owner-page-title">
                <div><span className="owner-eyebrow">KONFIGURASI GGS</span><h2>Cabang, struk, KPI, dan backup</h2></div>
                <Settings2 size={20} />
              </div>
              <div className="owner-two-column">
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">CABANG</span><h3>Daftar lokasi</h3></div><Archive size={18} /></div>
                  <div className="owner-branch-list">{branches.map((branch) => <div className="owner-branch-row" key={branch.id}><span><b>{readString(dataOf(branch), "name", branch.recordKey)}</b><small>{readString(dataOf(branch), "address") || "Alamat belum diisi"} · {readString(dataOf(branch), "phone") || "Kontak belum diisi"}</small></span><button className="owner-icon-action" type="button" onClick={() => void archiveRecord(branch, readString(dataOf(branch), "name", "cabang"))} aria-label="Arsipkan cabang"><Archive size={15} /></button></div>)}</div>
                  <form className="owner-form-grid owner-top-rule" onSubmit={submitBranch}>
                    <Field label="Nama cabang"><input required minLength={2} value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} /></Field>
                    <Field label="Telepon"><input value={branchForm.phone} onChange={(event) => setBranchForm({ ...branchForm, phone: event.target.value })} /></Field>
                    <Field label="Alamat" className="span-2"><input value={branchForm.address} onChange={(event) => setBranchForm({ ...branchForm, address: event.target.value })} /></Field>
                    <div className="owner-form-actions span-2"><button className="owner-button" disabled={createRecord.isPending}><Plus size={15} /> Tambah cabang</button></div>
                  </form>
                </section>
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">STRUK KASIR</span><h3>Format cetak</h3></div><ReceiptText size={18} /></div>
                  <form className="owner-form-grid" onSubmit={saveSettings}>
                    <Field label="Nama usaha"><input value={readString(receiptSettings, "businessName", "GGS Hair Studio")} onChange={(event) => setSettingGroup("receipt", "businessName", event.target.value)} /></Field>
                    <Field label="Ukuran struk"><select value={readString(receiptSettings, "receiptSize", "80mm")} onChange={(event) => setSettingGroup("receipt", "receiptSize", event.target.value)}><option value="58mm">58 mm</option><option value="80mm">80 mm</option></select></Field>
                    <Field label="Tagline"><input value={readString(receiptSettings, "tagline")} onChange={(event) => setSettingGroup("receipt", "tagline", event.target.value)} /></Field>
                    <Field label="Nama cabang pada struk"><input value={readString(receiptSettings, "branchLabel")} onChange={(event) => setSettingGroup("receipt", "branchLabel", event.target.value)} /></Field>
                    <Field label="Pesan struk (satu per baris)" className="span-2"><textarea value={receiptMessagesText || (Array.isArray(receiptSettings.receiptMessages) ? (receiptSettings.receiptMessages as string[]).join("\n") : "")} onChange={(event) => setReceiptMessagesText(event.target.value)} /></Field>
                    <Field label="Footer struk" className="span-2"><textarea value={readString(receiptSettings, "footer")} onChange={(event) => setSettingGroup("receipt", "footer", event.target.value)} /></Field>
                    <Field label="Teks QR / pembayaran"><input value={readString(receiptSettings, "qrText")} onChange={(event) => setSettingGroup("receipt", "qrText", event.target.value)} /></Field>
                    <Field label="URL logo (opsional)"><input type="url" value={readString(receiptSettings, "logoUrl")} onChange={(event) => setSettingGroup("receipt", "logoUrl", event.target.value)} /></Field>
                    <div className="owner-toggle-list span-2">
                      <Toggle label="Tampilkan footer" value={readBoolean(receiptSettings, "showFooter", true)} onChange={(value) => setSettingGroup("receipt", "showFooter", value)} />
                      <Toggle label="Tampilkan pesan" value={readBoolean(receiptSettings, "showMessage", true)} onChange={(value) => setSettingGroup("receipt", "showMessage", value)} />
                      <Toggle label="Tampilkan media sosial" value={readBoolean(receiptSettings, "showSocial")} onChange={(value) => setSettingGroup("receipt", "showSocial", value)} />
                      <Toggle label="Tampilkan QR" value={readBoolean(receiptSettings, "showQr")} onChange={(value) => setSettingGroup("receipt", "showQr", value)} />
                    </div>
                    <div className="owner-form-actions span-2"><button className="owner-button" disabled={createRecord.isPending || updateRecord.isPending}>Simpan pengaturan struk</button><button className="owner-button owner-button-outline" type="button" onClick={() => window.print()}><Printer size={15} /> Pratinjau</button></div>
                  </form>
                </section>
              </div>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">KPI & KETERLAMBATAN</span><h3>Bobot dan aturan potongan</h3></div><Clock3 size={18} /></div>
                <div className="owner-form-grid">
                  <Field label="Bobot sikap (%)"><input type="number" min={0} max={100} value={readNumber(kpiSettings, "attitudeWeight", 20)} onChange={(event) => setSettingGroup("kpi", "attitudeWeight", Number(event.target.value))} /></Field>
                  <Field label="Bobot absensi (%)"><input type="number" min={0} max={100} value={readNumber(kpiSettings, "attendanceWeight", 30)} onChange={(event) => setSettingGroup("kpi", "attendanceWeight", Number(event.target.value))} /></Field>
                  <Field label="Bobot produktivitas (%)"><input type="number" min={0} max={100} value={readNumber(kpiSettings, "productivityWeight", 50)} onChange={(event) => setSettingGroup("kpi", "productivityWeight", Number(event.target.value))} /></Field>
                  <Field label="Target transaksi/karyawan"><input type="number" min={1} value={readNumber(kpiSettings, "targetTransactions", 165)} onChange={(event) => setSettingGroup("kpi", "targetTransactions", Number(event.target.value))} /></Field>
                  <Field label="Target produk/treatment"><input type="number" min={0} value={readNumber(kpiSettings, "productTreatmentTarget", 15)} onChange={(event) => setSettingGroup("kpi", "productTreatmentTarget", Number(event.target.value))} /></Field>
                  <Field label="RED1 mulai (menit)"><input type="number" min={1} value={readNumber(kpiSettings, "lateTier1Minutes", 30)} onChange={(event) => setSettingGroup("kpi", "lateTier1Minutes", Number(event.target.value))} /></Field>
                  <Field label="Potongan RED1 (Rp)"><input type="number" min={0} value={readNumber(kpiSettings, "lateTier1Deduction", 10000)} onChange={(event) => setSettingGroup("kpi", "lateTier1Deduction", Number(event.target.value))} /></Field>
                  <Field label="RED2 mulai (menit)"><input type="number" min={1} value={readNumber(kpiSettings, "lateTier2Minutes", 60)} onChange={(event) => setSettingGroup("kpi", "lateTier2Minutes", Number(event.target.value))} /></Field>
                  <Field label="Potongan RED2 (Rp)"><input type="number" min={0} value={readNumber(kpiSettings, "lateTier2Deduction", 15000)} onChange={(event) => setSettingGroup("kpi", "lateTier2Deduction", Number(event.target.value))} /></Field>
                  <Field label="RED3 mulai (menit)"><input type="number" min={1} value={readNumber(kpiSettings, "lateTier3Minutes", 90)} onChange={(event) => setSettingGroup("kpi", "lateTier3Minutes", Number(event.target.value))} /></Field>
                  <Field label="Potongan RED3 (Rp)"><input type="number" min={0} value={readNumber(kpiSettings, "lateTier3Deduction", 20000)} onChange={(event) => setSettingGroup("kpi", "lateTier3Deduction", Number(event.target.value))} /></Field>
                  <Field label="Potongan RED4 (Rp)"><input type="number" min={0} value={readNumber(kpiSettings, "lateTier4Deduction", 30000)} onChange={(event) => setSettingGroup("kpi", "lateTier4Deduction", Number(event.target.value))} /></Field>
                </div>
                <p className="owner-note">Bobot KPI idealnya berjumlah 100%. Potongan diterapkan saat payroll dihitung berdasarkan check-in Jakarta dan jam masuk standar tiap karyawan.</p>
              </section>
              <div className="owner-two-column">
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">MEDIA SOSIAL & BOOKING</span><h3>Tautan GGS</h3></div><Heart size={18} /></div>
                  <div className="owner-form-grid">
                    <Field label="Instagram"><input value={readString(socialSettings, "instagram")} onChange={(event) => setSettingGroup("social", "instagram", event.target.value)} /></Field>
                    <Field label="Facebook"><input value={readString(socialSettings, "facebook")} onChange={(event) => setSettingGroup("social", "facebook", event.target.value)} /></Field>
                    <Field label="TikTok"><input value={readString(socialSettings, "tiktok")} onChange={(event) => setSettingGroup("social", "tiktok", event.target.value)} /></Field>
                    <Field label="WhatsApp"><input value={readString(socialSettings, "whatsapp")} onChange={(event) => setSettingGroup("social", "whatsapp", event.target.value)} /></Field>
                    <Field label="Link booking"><input type="url" value={readString(socialSettings, "bookingUrl")} onChange={(event) => setSettingGroup("social", "bookingUrl", event.target.value)} /></Field>
                  </div>
                  <p className="owner-note">Tautan dan template disimpan pada profil operasional pemilik. Booking online yang sudah ada tetap dikelola di menu Janji temu.</p>
                </section>
                <section className="owner-card">
                  <div className="owner-section-head"><div><span className="owner-eyebrow">FOLLOW-UP PELANGGAN</span><h3>Template pengingat</h3></div><CalendarDays size={18} /></div>
                  <div className="owner-form-grid">
                    <Field label="Follow-up kunjungan" className="span-2"><textarea value={readString(reminderSettings, "followUp")} onChange={(event) => setSettingGroup("reminders", "followUp", event.target.value)} /></Field>
                    <Field label="Ucapan ulang tahun" className="span-2"><textarea value={readString(reminderSettings, "birthday")} onChange={(event) => setSettingGroup("reminders", "birthday", event.target.value)} /></Field>
                  </div>
                  <p className="owner-note">Gunakan {`{nama}`} untuk menyisipkan nama pelanggan. Pesan hanya disiapkan untuk dikirim manual.</p>
                </section>
              </div>
              <section className="owner-card">
                <div className="owner-section-head"><div><span className="owner-eyebrow">BACKUP & PEMULIHAN</span><h3>Data operasional pemilik</h3></div><Archive size={18} /></div>
                <p className="owner-note">Backup ini mencakup cabang, profil pelanggan/member, profil kompensasi karyawan, catatan keuangan, payroll, dan pengaturan. Kredensial/login serta riwayat transaksi dan absensi tidak dimasukkan. Pemulihan menggabungkan catatan tanpa menghapus data yang sudah ada.</p>
                <div className="owner-backup-actions">
                  <button className="owner-button owner-button-outline" type="button" onClick={() => void exportBackup()}><Download size={16} /> Unduh backup JSON</button>
                  <label className="owner-button owner-button-outline owner-file-button"><ArrowUpFromLine size={16} /> Gabungkan backup JSON<input type="file" accept=".json,application/json" onChange={(event) => {
                    void importBackup(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }} /></label>
                </div>
              </section>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`owner-field ${className}`}><span>{label}</span>{children}</label>;
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <article className="owner-metric"><span className="owner-metric-icon">{icon}</span><small>{label}</small><b>{value}</b><span>{note}</span></article>;
}

function ReportCell({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><b>{value}</b></div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="owner-toggle"><span>{label}</span><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

function EmptyInline({ title, body }: { title: string; body: string }) {
  return <div className="owner-inline-empty"><span><Sparkles size={17} /></span><b>{title}</b><small>{body}</small></div>;
}

function TransactionTable({ transactions, onRequestCorrection }: { transactions: GgsAdminOwnerTransaction[]; onRequestCorrection?: (transaction: GgsAdminOwnerTransaction) => void }) {
  if (!transactions.length) return <EmptyInline title="Belum ada transaksi di periode ini" body="Transaksi dari ruang kasir karyawan akan muncul di sini." />;
  return <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Struk / tanggal</th><th>Pelanggan</th><th>Karyawan</th><th>Status</th><th>Total</th>{onRequestCorrection && <th>Aksi</th>}</tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td><b>{transaction.receiptNumber}</b><small>{dateTimeLabel(transaction.createdAt)}</small></td><td>{transaction.customerName || "Walk-in"}</td><td>{transaction.employeeName}</td><td><span className={`owner-status owner-status-${transaction.status}`}>{transaction.status === "completed" ? "Selesai" : transaction.status === "cancelled" ? "Batal" : transaction.status}</span>{transaction.cancellationReason && <small>{transaction.cancellationReason}</small>}</td><td><b>{currency(transaction.total)}</b></td>{onRequestCorrection && <td><button className="owner-small-button" type="button" disabled={transaction.status !== "completed"} onClick={() => onRequestCorrection(transaction)}>Ajukan koreksi</button></td>}</tr>)}</tbody></table></div>;
}

function CorrectionList({ requests, onApprove, onReject, onApply, busy }: { requests: GgsAdminOwnerCorrection[]; onApprove: (request: GgsAdminOwnerCorrection) => void; onReject: (request: GgsAdminOwnerCorrection) => void; onApply: (request: GgsAdminOwnerCorrection) => void; busy: boolean }) {
  if (!requests.length) return <EmptyInline title="Belum ada pengajuan koreksi" body="Pengajuan dari tiga transaksi terbaru akan dicatat di sini." />;
  return <div className="owner-correction-list">{requests.map((request) => <article className="owner-correction" key={request.id}><div><b>{request.receiptNumber}</b><span className={`owner-status owner-status-${request.status}`}>{request.status}</span></div><p>{request.reason}</p><small>Usulan: {request.proposedCustomerName} · {request.proposedEmployeeName} · diskon {currency(request.proposedDiscountAmount)} · diterima {currency(request.proposedAmountReceived)} · {request.proposedPaymentMethod}</small>{request.rejectReason && <small className="owner-danger-text">Alasan penolakan: {request.rejectReason}</small>}{request.beforeSnapshot && <details><summary>Lihat audit koreksi</summary><pre>{JSON.stringify({ sebelum: request.beforeSnapshot, sesudah: request.afterSnapshot }, null, 2)}</pre></details>}<div className="owner-row-actions">{request.status === "pending" && <><button className="owner-small-button" type="button" disabled={busy} onClick={() => onApprove(request)}><Check size={14} /> Setujui</button><button className="owner-small-button owner-small-danger" type="button" disabled={busy} onClick={() => onReject(request)}>Tolak</button></>}{request.status === "approved" && <button className="owner-small-button" type="button" disabled={busy} onClick={() => onApply(request)}>Terapkan dengan kode</button>}{request.status === "applied" && <span className="owner-note">Koreksi diterapkan {dateTimeLabel(request.appliedAt)}</span>}</div></article>)}</div>;
}

function MovementList({ movements }: { movements: Array<{ id: number; productName: string; movementType: string; quantityChange: number; previousStock: number; newStock: number; note: string; employeeName: string; createdAt: string }> }) {
  if (!movements.length) return <EmptyInline title="Belum ada pergerakan stok" body="Penyesuaian stok dari workspace kasir karyawan tercatat di sini." />;
  return <div className="owner-activity-list">{movements.map((movement) => <div key={movement.id}><span className={movement.quantityChange >= 0 ? "owner-activity-plus" : "owner-activity-minus"}>{movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}</span><span><b>{movement.productName}</b><small>{movement.movementType} · {movement.employeeName} · {movement.note || "—"}</small></span><time>{dateTimeLabel(movement.createdAt)}</time></div>)}</div>;
}

function AttendanceTable({ attendance }: { attendance: Array<{ id: string; employeeName: string; employeeCode: string; attendanceDate: string; checkInAt: string; checkOutAt: string | null }> }) {
  if (!attendance.length) return <EmptyInline title="Belum ada absensi pada rentang tanggal ini" body="Rekap mengambil catatan check-in dan check-out dari workspace karyawan." />;
  return <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr></thead><tbody>{attendance.map((item) => <tr key={item.id}><td>{dateLabel(item.attendanceDate)}</td><td><b>{item.employeeName}</b><small>{item.employeeCode}</small></td><td>{dateTimeLabel(item.checkInAt)}</td><td>{dateTimeLabel(item.checkOutAt)}</td><td><span className="owner-status owner-status-completed">{item.checkOutAt ? "Lengkap" : "Belum pulang"}</span></td></tr>)}</tbody></table></div>;
}

function CustomerEditor({ form, setForm, saving, existing, onSubmit, onClose }: { form: CustomerForm; setForm: (value: CustomerForm) => void; saving: boolean; existing: GgsAdminOwnerRecord | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  return <section className="owner-card owner-form-card"><div className="owner-section-head"><div><span className="owner-eyebrow">PROFIL PELANGGAN</span><h3>{existing ? "Ubah pelanggan/member" : "Tambah pelanggan/member"}</h3></div><button className="owner-icon-action" type="button" onClick={onClose} aria-label="Tutup"><X size={16} /></button></div><form className="owner-form-grid" onSubmit={onSubmit}>
    <Field label="Nama"><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
    <Field label="WhatsApp / telepon"><input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
    <Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
    <Field label="Tanggal lahir"><input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></Field>
    <Field label="Pekerjaan"><input value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} /></Field>
    <Field label="Media sosial"><input value={form.social} onChange={(event) => setForm({ ...form, social: event.target.value })} /></Field>
    <Field label="Program member"><input value={form.membershipType} onChange={(event) => setForm({ ...form, membershipType: event.target.value })} placeholder="Isi sesuai program GGS" /></Field>
    <Field label="ID member"><input value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} /></Field>
    <Field label="Berlaku sampai"><input type="date" value={form.memberExpiry} onChange={(event) => setForm({ ...form, memberExpiry: event.target.value })} /></Field>
    <Field label="Poin manual"><input type="number" min={0} value={form.points} onChange={(event) => setForm({ ...form, points: Number(event.target.value) })} /></Field>
    <Field label="Manfaat member" className="span-2"><textarea value={form.memberBenefit} onChange={(event) => setForm({ ...form, memberBenefit: event.target.value })} placeholder="Tulis manfaat resmi yang berlaku; tidak ada manfaat otomatis." /></Field>
    <Field label="Catatan" className="span-2"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
    <div className="owner-form-actions span-2"><button className="owner-button owner-button-outline" type="button" onClick={onClose}>Batal</button><button className="owner-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan profil"}</button></div>
  </form></section>;
}

function CustomerCard({ record, reminder, onEdit, onArchive }: { record: GgsAdminOwnerRecord; reminder: OwnerData; onEdit: () => void; onArchive: () => void }) {
  const data = dataOf(record);
  const phone = waNumber(readString(data, "phone"));
  const message = interpolate(readString(reminder, "followUp"), readString(data, "name"));
  return <article className="owner-customer-card"><div className="owner-customer-top"><span className="owner-customer-avatar"><Heart size={17} /></span><span><b>{readString(data, "name")}</b><small>{readString(data, "phone")}</small></span><span className="owner-points">{readNumber(data, "points")} poin</span></div><div className="owner-member-line"><span>{readString(data, "membershipType", "Pelanggan")}</span>{readString(data, "memberId") && <code>{readString(data, "memberId")}</code>}</div>{readString(data, "memberBenefit") && <p>{readString(data, "memberBenefit")}</p>}<div className="owner-customer-meta"><span>Ulang tahun: {dateLabel(readString(data, "dateOfBirth"))}</span><span>Member sampai: {dateLabel(readString(data, "memberExpiry"))}</span></div><div className="owner-row-actions"><button className="owner-small-button" type="button" onClick={onEdit}><Pencil size={14} /> Edit</button>{phone && <a className="owner-small-button" href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>}<button className="owner-small-button owner-small-danger" type="button" onClick={onArchive}><Archive size={14} /> Arsip</button></div></article>;
}

function BirthdayList({ customers, reminder }: { customers: GgsAdminOwnerRecord[]; reminder: OwnerData }) {
  const now = today();
  const monthDay = now.slice(5);
  const nextDates = customers.flatMap((record) => {
    const data = dataOf(record);
    const birth = readString(data, "dateOfBirth");
    if (!birth) return [];
    const currentYearBirthday = `${now.slice(0, 4)}-${birth.slice(5, 10)}`;
    const days = Math.round((new Date(`${currentYearBirthday}T00:00:00+07:00`).getTime() - new Date(`${now}T00:00:00+07:00`).getTime()) / 86400000);
    const nextYearBirthday = `${Number(now.slice(0, 4)) + 1}-${birth.slice(5, 10)}`;
    const until = days < 0
      ? Math.round((new Date(`${nextYearBirthday}T00:00:00+07:00`).getTime() - new Date(`${now}T00:00:00+07:00`).getTime()) / 86400000)
      : days;
    if (until > 14) return [];
    const phone = waNumber(readString(data, "phone"));
    const text = interpolate(readString(reminder, "birthday"), readString(data, "name"));
    return [{ id: record.id, name: readString(data, "name"), birth, until, phone, text }];
  }).sort((a, b) => a.until - b.until);
  if (!nextDates.length) return <EmptyInline title="Tidak ada ulang tahun dalam 14 hari" body="Tanggal lahir perlu diisi pada profil pelanggan." />;
  return <div className="owner-activity-list">{nextDates.map((item) => <div key={item.id}><span className="owner-birthday-days">{item.until === 0 ? "Hari ini" : `${item.until} hari`}</span><span><b>{item.name}</b><small>{dateLabel(`${now.slice(0, 4)}-${item.birth.slice(5, 10)}`)}</small></span>{item.phone ? <a className="owner-small-button" href={`https://wa.me/${item.phone}?text=${encodeURIComponent(item.text)}`} target="_blank" rel="noreferrer">Siapkan pesan</a> : <small>Nomor belum ada</small>}</div>)}</div>;
}

function TeamSummary({ employees, transactions, attendance, profileById, kpiSettings }: { employees: Array<{ id: string; name: string; employeeId: string; active: boolean }>; transactions: GgsAdminOwnerTransaction[]; attendance: Array<{ employeeId: string }>; profileById: Map<string, GgsAdminOwnerRecord>; kpiSettings: OwnerData }) {
  const rows = employees.filter((employee) => employee.active).map((employee) => {
    const employeeTransactions = transactions.filter((transaction) => transaction.employeeId === employee.id || transaction.employeeName === employee.name);
    const sales = employeeTransactions.filter((transaction) => transaction.status === "completed").reduce((sum, transaction) => sum + transaction.total, 0);
    const present = attendance.filter((item) => item.employeeId === employee.id).length;
    const profile = dataOf(profileById.get(employee.id));
    const target = readNumber(kpiSettings, "targetTransactions", 165);
    const productivity = Math.min(100, (employeeTransactions.length / target) * 100);
    const attitude = readNumber(profile, "attitudeScore", 100);
    const attendanceScore = present > 0 ? 100 : 0;
    const weights = readNumber(kpiSettings, "attitudeWeight", 20) + readNumber(kpiSettings, "attendanceWeight", 30) + readNumber(kpiSettings, "productivityWeight", 50);
    const total = weights > 0
      ? (attitude * readNumber(kpiSettings, "attitudeWeight", 20) + attendanceScore * readNumber(kpiSettings, "attendanceWeight", 30) + productivity * readNumber(kpiSettings, "productivityWeight", 50)) / weights
      : 0;
    return { ...employee, sales, transactions: employeeTransactions.length, present, total };
  });
  if (!rows.length) return <EmptyInline title="Belum ada karyawan aktif" body="Buat akun karyawan terlebih dahulu di menu Karyawan." />;
  return <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Karyawan</th><th>Penjualan tercatat</th><th>Transaksi</th><th>Check-in</th><th>KPI indikatif</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.name}</b><small>{row.employeeId}</small></td><td>{currency(row.sales)}</td><td>{row.transactions}</td><td>{row.present} hari</td><td><span className="owner-kpi-meter"><i style={{ width: `${row.total}%` }} /></span><b>{row.total.toFixed(0)}%</b></td></tr>)}</tbody></table></div>;
}

function FinanceSummary({ transactions, entries, payroll }: { transactions: GgsAdminOwnerTransaction[]; entries: GgsAdminOwnerRecord[]; payroll: GgsAdminOwnerRecord[] }) {
  const revenue = transactions.filter((item) => item.status === "completed").reduce((sum, item) => sum + item.total, 0);
  const expenses = entries.filter((record) => readString(dataOf(record), "type") === "expense").reduce((sum, record) => sum + readNumber(dataOf(record), "amount"), 0);
  const purchases = entries.filter((record) => readString(dataOf(record), "type") === "stock_purchase").reduce((sum, record) => sum + readNumber(dataOf(record), "amount"), 0);
  const advances = entries.filter((record) => readString(dataOf(record), "type") === "advance").reduce((sum, record) => sum + readNumber(dataOf(record), "amount"), 0);
  const paidPayroll = payroll.filter((record) => record.status === "paid").reduce((sum, record) => sum + readNumber(dataOf(record), "net"), 0);
  const productSales = transactions.filter((item) => item.status === "completed").flatMap((item) => item.items).filter((item) => item.itemType === "product").reduce((sum, item) => sum + item.lineTotal, 0);
  return <div className="owner-metric-grid owner-finance-metrics">
    <Metric icon={<ArrowDownToLine />} label="Pendapatan kasir" value={currency(revenue)} note="Transaksi selesai" />
    <Metric icon={<ArrowUpFromLine />} label="Operasional" value={currency(expenses)} note="Pengeluaran tercatat" />
    <Metric icon={<Package />} label="Modal stok" value={currency(purchases)} note="Pembelian produk jual" />
    <Metric icon={<Wallet />} label="Kasbon" value={currency(advances)} note="Uang muka karyawan" />
    <Metric icon={<Banknote />} label="Payroll dibayar" value={currency(paidPayroll)} note="Slip berstatus dibayar" />
    <Metric icon={<Sparkles />} label="Penjualan produk" value={currency(productSales)} note="Dari rincian transaksi kasir" />
  </div>;
}

function FinanceEntries({ records, onArchive }: { records: GgsAdminOwnerRecord[]; onArchive: (record: GgsAdminOwnerRecord) => void }) {
  const entries = [...records].sort((a, b) => (b.recordDate ?? "").localeCompare(a.recordDate ?? ""));
  if (!entries.length) return <EmptyInline title="Belum ada catatan keuangan" body="Tambahkan biaya, pembelian stok, kasbon, atau potongan." />;
  return <div className="owner-activity-list">{entries.slice(0, 40).map((record) => {
    const data = dataOf(record);
    const type = readString(data, "type");
    const typeLabel = type === "expense" ? "Operasional" : type === "stock_purchase" ? "Pembelian stok" : type === "advance" ? "Kasbon" : "Potongan";
    return <div key={record.id}><span className="owner-finance-kind">{typeLabel}</span><span><b>{readString(data, "title")}</b><small>{dateLabel(readString(data, "date", record.recordDate ?? ""))} · {readString(data, "note")}</small></span><b>{currency(readNumber(data, "amount"))}</b><button className="owner-icon-action" type="button" onClick={() => onArchive(record)} aria-label="Arsipkan catatan"><Archive size={14} /></button></div>;
  })}</div>;
}

function PayrollTable({ records, employeeById, onMarkPaid }: { records: GgsAdminOwnerRecord[]; employeeById: Map<string, { id: string; name: string }>; onMarkPaid: (record: GgsAdminOwnerRecord) => void }) {
  if (!records.length) return <EmptyInline title="Belum ada payroll tersimpan" body="Hitung payroll setelah profil gaji dan data operasional periode tersebut lengkap." />;
  const dataRows = [...records].sort((a, b) => (b.recordPeriod ?? "").localeCompare(a.recordPeriod ?? ""));
  return <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>Periode</th><th>Karyawan</th><th>Pokok</th><th>Komisi</th><th>Makan</th><th>Potongan</th><th>Bersih</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{dataRows.map((record) => {
    const data = dataOf(record);
    const commission = readNumber(data, "commissionService") + readNumber(data, "commissionTreatment") + readNumber(data, "commissionBeauty");
    const name = readString(data, "employeeName") || employeeById.get(record.employeeId ?? "")?.name || "Karyawan";
    return <tr key={record.id}><td>{record.recordPeriod ?? readString(data, "period")}</td><td><b>{name}</b><small>{readString(data, "jobTitle")}</small></td><td>{currency(readNumber(data, "baseSalary"))}</td><td>{currency(commission)}</td><td>{currency(readNumber(data, "meal"))}</td><td>{currency(readNumber(data, "deductions") + readNumber(data, "advances") + readNumber(data, "lateDeduction"))}</td><td><b>{currency(readNumber(data, "net"))}</b></td><td><span className={`owner-status owner-status-${record.status}`}>{record.status === "paid" ? "Dibayar" : "Draft"}</span></td><td><button className="owner-icon-action" type="button" title="Cetak slip" aria-label="Cetak slip gaji" onClick={() => window.print()}><Printer size={15} /></button>{record.status !== "paid" && <button className="owner-small-button" type="button" onClick={() => onMarkPaid(record)}>Tandai dibayar</button>}</td></tr>;
  })}</tbody></table></div>;
}
