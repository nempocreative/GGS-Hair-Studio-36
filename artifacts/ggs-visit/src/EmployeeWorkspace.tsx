import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, Download, House, LayoutDashboard, LockKeyhole, LogOut, Menu, Minus, Package, Plus, Printer, QrCode, ReceiptText, RefreshCw, Search, ShieldCheck, ShoppingBag, Scissors, Store, Trash2, UserRound, UsersRound, X, Megaphone } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  getGetGgsEmployeeBookingsQueryKey,
  getGetGgsEmployeeAttendanceHistoryQueryKey,
  getGetGgsEmployeeAttendanceTodayQueryKey,
  getGetGgsEmployeeCashierSessionQueryKey,
  getGetGgsEmployeeCashierVouchersQueryKey,
  getGetGgsEmployeeCashierTransactionsQueryKey,
  getGetGgsEmployeeCashierAnnouncementsQueryKey,
  getGetGgsEmployeeReportsQueryKey,
  getGetGgsEmployeeStockMovementsQueryKey,
  getGetGgsPublicProductsQueryKey,
  getGetGgsPublicServicesQueryKey,
  getGetGgsEmployeeSessionQueryKey,
  useGetGgsEmployeeBookings,
  useGetGgsEmployeeCashierSession,
  useGetGgsEmployeeCashierVouchers,
  useGetGgsEmployeeCashierTransactions,
  useGetGgsEmployeeCashierAnnouncements,
  useGetGgsEmployeeReports,
  useGetGgsEmployeeStockMovements,
  useGetGgsPublicProducts,
  useGetGgsPublicServices,
  useCreateGgsEmployeeCashierTransaction,
  useCreateGgsEmployeeStockMovement,
  useCancelGgsEmployeeCashierTransaction,
  useUpdateGgsEmployeeBookingStatus,
  useGetGgsEmployeeSession,
  useChangeGgsEmployeePassword,
  useLoginGgsEmployee,
  useLogoutGgsEmployeeCashier,
  useLogoutGgsEmployee,
  useUnlockGgsEmployeeCashier,
} from '@workspace/api-client-react';
import type { GetGgsEmployeeCashierTransactionsParams, GetGgsEmployeeReportsParams, GgsEmployeeAccount, GgsEmployeeBooking, GgsEmployeeCashierRegister, GgsEmployeeCashierTransaction, GgsEmployeeCashierTransactionInput, GgsEmployeeCashierVoucher, GgsCashierAnnouncement, GgsEmployeeStockMovement, GgsEmployeeStockMovementInput, GgsProduct, LoginGgsEmployeeMutationVariables } from '@workspace/api-client-react';
import { EmployeeAttendancePage } from './EmployeeAttendancePage';
import './employee-workspace.css';

function employeeErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return 'Tidak dapat masuk saat ini. Periksa ID dan kata sandi, lalu coba lagi.';
}

function displayDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'Asia/Jakarta' }).format(parsed);
}

function displayDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(parsed);
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function jakartaTodayDate(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function shiftCalendarDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatRupiah(value: number): string {
  return `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
}

function isSameDayAsJakarta(value: string): boolean {
  return dateKey(value) === jakartaTodayDate();
}

function normalizeCashAmount(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return Number(digits) > 2_147_483_647 ? '2147483647' : digits;
}

function formatCashAmount(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function cashAmountCaretPosition(value: string, digitsBeforeCaret: number, separatorsBeforeCaret: number): number {
  if (digitsBeforeCaret === 0 && separatorsBeforeCaret === 0) return 0;
  let digits = 0;
  let separators = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) digits += 1;
    else separators += 1;
    if (digits >= digitsBeforeCaret && separators >= separatorsBeforeCaret) return index + 1;
  }
  return value.length;
}

function employeeNextPath(): string {
  const requestedPath = new URLSearchParams(window.location.search).get('next');
  if (!requestedPath) return '/employee/overview';

  try {
    const destination = new URL(requestedPath, window.location.origin);
    if (
      destination.origin !== window.location.origin ||
      !destination.pathname.startsWith('/employee/') ||
      destination.pathname === '/employee/sign-in'
    ) {
      return '/employee/overview';
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/employee/overview';
  }
}

const statusLabels: Record<GgsEmployeeBooking['status'], string> = {
  pending: 'Menunggu',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const LOW_STOCK_LIMIT = 5;

const employeeMenuItems = [
  { href: '/employee/overview', label: 'Ringkasan', icon: LayoutDashboard, description: 'Ringkasan studio.' },
  { href: '/employee/schedule', label: 'Jadwal booking', icon: CalendarDays, description: 'Booking pelanggan yang masuk ke studio.' },
  { href: '/employee/attendance', label: 'Absensi', icon: Clock3, description: 'Pencatatan kehadiran tim karyawan.' },
  { href: '/employee/cashier', label: 'Kasir', icon: Banknote, description: 'Pencatatan transaksi layanan dan produk.' },
  { href: '/employee/customers', label: 'Pelanggan', icon: UsersRound, description: 'Informasi dan riwayat kunjungan pelanggan.' },
  { href: '/employee/stock', label: 'Stok produk', icon: Package, description: 'Pemantauan ketersediaan produk studio.' },
  { href: '/employee/reports', label: 'Laporan', icon: BarChart3, description: 'Rekap kegiatan dan performa studio.' },
  { href: '/employee/profile', label: 'Profil', icon: UserRound, description: 'Detail akun dan keamanan kata sandi.' },
] as const;

const COMPACT_EMPLOYEE_LAYOUT_QUERY = '(max-width: 900px), (max-width: 1180px) and (orientation: portrait)';
const employeeFooterMenuItems = [
  { href: '/', label: 'Home', icon: House },
  { href: '/services', label: 'Services', icon: Scissors },
  { href: '/book', label: 'Booking', icon: CalendarDays },
  { href: '/my-ggs', label: 'My GGS', icon: UserRound },
] as const;

function EmployeeFooterTabbar() {
  const [location] = useLocation();

  return (
    <nav className="employee-footer-tabbar" aria-label="Navigasi bawah">
      {employeeFooterMenuItems.map((item) => (
        <Link
          href={item.href}
          key={item.href}
          aria-current={location === item.href ? 'page' : undefined}
          data-testid={`link-employee-footer-${item.href.slice(1) || 'home'}`}
        >
          <item.icon size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

const cashierRegisters: {
  value: GgsEmployeeCashierRegister;
  label: string;
  description: string;
}[] = [
  { value: 'ggs_beauty', label: 'GGS Beauty', description: 'Kasir layanan kecantikan' },
  { value: 'barber_ggs', label: 'Barber GGS', description: 'Kasir layanan barber' },
];

function cashierErrorMessage(
  error: unknown,
  fallback = 'Kasir belum dapat dibuka. Periksa koneksi lalu coba lagi.',
): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
}

function EmployeeCashierPage() {
  const queryClient = useQueryClient();
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<GetGgsEmployeeCashierTransactionsParams['status']>('all');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyDateRangeValid = !historyFromDate || !historyToDate || historyFromDate <= historyToDate;
  const [selectedTransaction, setSelectedTransaction] = useState<GgsEmployeeCashierTransaction | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const historyParams = useMemo<GetGgsEmployeeCashierTransactionsParams>(() => ({
    ...(historyFromDate ? { fromDate: historyFromDate } : {}),
    ...(historyToDate ? { toDate: historyToDate } : {}),
    ...(historySearch.trim() ? { search: historySearch.trim() } : {}),
    status: historyStatus,
    page: historyPage,
    pageSize: 10,
  }), [historyFromDate, historyToDate, historySearch, historyStatus, historyPage]);
  const cashierSession = useGetGgsEmployeeCashierSession({
    query: {
      queryKey: getGetGgsEmployeeCashierSessionQueryKey(),
      retry: false,
      staleTime: 0,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });
  const isCashierActive = Boolean(cashierSession.data?.active && cashierSession.data.register);
  const announcementsQuery = useGetGgsEmployeeCashierAnnouncements({
    query: {
      queryKey: getGetGgsEmployeeCashierAnnouncementsQueryKey(),
      enabled: isCashierActive,
      retry: false,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const servicesQuery = useGetGgsPublicServices({
    query: { queryKey: getGetGgsPublicServicesQueryKey(), retry: false, enabled: isCashierActive },
  });
  const productsQuery = useGetGgsPublicProducts({
    query: { queryKey: getGetGgsPublicProductsQueryKey(), retry: false, enabled: isCashierActive },
  });
  const vouchersQuery = useGetGgsEmployeeCashierVouchers({
    query: {
      queryKey: getGetGgsEmployeeCashierVouchersQueryKey(),
      retry: false,
      enabled: isCashierActive,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });
  const transactionsQuery = useGetGgsEmployeeCashierTransactions(historyParams, {
    query: {
      queryKey: getGetGgsEmployeeCashierTransactionsQueryKey(historyParams),
      retry: false,
      enabled: isCashierActive && historyDateRangeValid,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const createTransaction = useCreateGgsEmployeeCashierTransaction();
  const cancelTransaction = useCancelGgsEmployeeCashierTransaction();
  const unlockCashier = useUnlockGgsEmployeeCashier();
  const lockCashier = useLogoutGgsEmployeeCashier();
  const [selectedRegister, setSelectedRegister] = useState<GgsEmployeeCashierRegister>('ggs_beauty');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [lockError, setLockError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [catalogTab, setCatalogTab] = useState<'service' | 'product'>('service');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card'>('cash');
  const [voucherCode, setVoucherCode] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [cart, setCart] = useState<{ itemType: 'service' | 'product'; itemId: number; quantity: number }[]>([]);
  const [receipt, setReceipt] = useState<GgsEmployeeCashierTransaction | null>(null);
  const activeRegister = cashierRegisters.find(
    (register) => register.value === cashierSession.data?.register,
  );
  const hasActiveAccess = Boolean(cashierSession.data?.active && activeRegister);
  const services = servicesQuery.data?.filter((service) => service.active) ?? [];
  const products = productsQuery.data?.filter((product) => product.active) ?? [];
  const now = Date.now();
  const vouchers = (vouchersQuery.data ?? []).filter((voucher) =>
    !voucher.expiresAt || new Date(voucher.expiresAt).getTime() >= now,
  );
  const selectedVoucher = vouchers.find((voucher) => voucher.code === voucherCode);
  const subtotal = cart.reduce((sum, line) => {
    const item = line.itemType === 'service'
      ? services.find((service) => service.id === line.itemId)
      : products.find((product) => product.id === line.itemId);
    return sum + (item?.price ?? 0) * line.quantity;
  }, 0);
  const calculateVoucherDiscount = (voucher: GgsEmployeeCashierVoucher) => {
    const discountBase = voucher.appliesTo === 'all_items'
      ? subtotal
      : cart.reduce((sum, line) => line.itemType === 'service'
        ? sum + (services.find((service) => service.id === line.itemId)?.price ?? 0) * line.quantity
        : sum, 0);
    return Math.min(discountBase, voucher.discountType === 'percent'
      ? Math.round(discountBase * voucher.discountValue / 100)
      : voucher.discountValue);
  };
  const discountAmount = selectedVoucher ? calculateVoucherDiscount(selectedVoucher) : 0;
  const taxRate = Math.min(100, Math.max(0, cashierSession.data?.taxRate ?? 0));
  const previewTax = Math.round((subtotal - discountAmount) * taxRate / 100);
  const previewTotal = subtotal - discountAmount + previewTax;
  const receivedValue = Number(amountReceived) || 0;
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, receivedValue - previewTotal) : 0;
  const handleAmountReceivedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const prefix = input.value.slice(0, cursor);
    const digitsBeforeCaret = normalizeCashAmount(prefix).length;
    const separatorsBeforeCaret = (prefix.match(/\./g) ?? []).length;
    const nextAmount = normalizeCashAmount(input.value);
    setAmountReceived(nextAmount);
    setCheckoutError('');
    window.requestAnimationFrame(() => {
      const nextDisplayValue = formatCashAmount(nextAmount);
      const nextCursor = cashAmountCaretPosition(nextDisplayValue, digitsBeforeCaret, separatorsBeforeCaret);
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };
  const cashSuggestions = previewTotal > 0
    ? [
        { label: 'Uang pas', amount: previewTotal },
        { label: 'Pembulatan Rp10 rb', amount: Math.ceil(previewTotal / 10_000) * 10_000 },
        { label: 'Pembulatan Rp50 rb', amount: Math.ceil(previewTotal / 50_000) * 50_000 },
      ].filter((suggestion, index, suggestions) => (
        suggestion.amount <= 2_147_483_647
        && suggestions.findIndex((candidate) => candidate.amount === suggestion.amount) === index
      ))
    : [];
  const visibleCatalog = (catalogTab === 'service' ? services : products).filter((item) => {
    const query = catalogSearch.trim().toLocaleLowerCase('id-ID');
    return !query || `${item.name} ${item.category} ${item.description}`.toLocaleLowerCase('id-ID').includes(query);
  });

  const addItem = (itemType: 'service' | 'product', itemId: number) => {
    setCheckoutError('');
    setReceipt(null);
    setCart((current) => {
      const existing = current.find((line) => line.itemType === itemType && line.itemId === itemId);
      const product = itemType === 'product' ? products.find((entry) => entry.id === itemId) : undefined;
      if (existing) {
        if (product && existing.quantity >= product.stock) return current;
        return current.map((line) => line.itemType === itemType && line.itemId === itemId
          ? { ...line, quantity: Math.min(99, line.quantity + 1) }
          : line);
      }
      if (product && product.stock < 1) return current;
      return [...current, { itemType, itemId, quantity: 1 }];
    });
  };

  const adjustItem = (itemType: 'service' | 'product', itemId: number, delta: number) => {
    setCart((current) => current.flatMap((line) => {
      if (line.itemType !== itemType || line.itemId !== itemId) return [line];
      const product = itemType === 'product' ? products.find((entry) => entry.id === itemId) : undefined;
      const next = line.quantity + delta;
      if (next < 1) return [];
      return [{ ...line, quantity: Math.min(99, product ? Math.min(next, product.stock) : next) }];
    }));
  };

  const submitUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (password.length < 8) {
      setFormError('Kata sandi minimal 8 karakter.');
      return;
    }
    unlockCashier.mutate(
      { data: { register: selectedRegister, password } },
      {
        onSuccess: async () => {
          setPassword('');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierVouchersQueryKey() }),
        ]);
        },
        onError: (error) => setFormError(cashierErrorMessage(error)),
      },
    );
  };

  const submitLock = () => {
    setLockError('');
    if (activeRegister) setSelectedRegister(activeRegister.value);
    lockCashier.mutate(undefined, {
      onSuccess: async () => {
        setCart([]);
        setReceipt(null);
        setCustomerName('');
        setAmountReceived('');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierVouchersQueryKey() }),
        ]);
      },
      onError: (error) => setLockError(cashierErrorMessage(error)),
    });
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError('');
    if (!cart.length) {
      setCheckoutError('Tambahkan layanan atau produk sebelum menyelesaikan pembayaran.');
      return;
    }
    if (paymentMethod === 'cash' && receivedValue < previewTotal) {
      setCheckoutError('Jumlah uang diterima belum mencukupi total pembayaran.');
      return;
    }
    const input: GgsEmployeeCashierTransactionInput = {
      ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
      paymentMethod,
      amountReceived: paymentMethod === 'cash' ? receivedValue : previewTotal,
      ...(selectedVoucher ? { voucherCode: selectedVoucher.code } : {}),
      items: cart,
    };
    createTransaction.mutate({ data: input }, {
      onSuccess: async (completedReceipt) => {
        setReceipt(completedReceipt);
        setCart([]);
        setCustomerName('');
        setAmountReceived('');
        setVoucherCode('');
        setCheckoutError('');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierTransactionsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsPublicProductsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierVouchersQueryKey() }),
        ]);
      },
      onError: (error) => {
        setCheckoutError(cashierErrorMessage(error));
        void productsQuery.refetch();
      },
    });
  };

  const submitCancellation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTransaction || selectedTransaction.status !== 'completed') return;
    const reason = cancellationReason.trim();
    if (reason.length < 3) return;
    if (!confirmCancellation) {
      setConfirmCancellation(true);
      return;
    }
    cancelTransaction.mutate(
      { transactionId: selectedTransaction.transactionId, data: { reason } },
      {
        onSuccess: async () => {
          setSelectedTransaction(null);
          setCancellationReason('');
          setConfirmCancellation(false);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierTransactionsQueryKey() }),
            queryClient.invalidateQueries({ queryKey: getGetGgsPublicProductsQueryKey() }),
          ]);
        },
        onError: () => setConfirmCancellation(false),
      },
    );
  };

  const formatMoney = (value: number) => `Rp${new Intl.NumberFormat('id-ID').format(value)}`;
  const paymentMethodLabel = (method: GgsEmployeeCashierTransaction['paymentMethod']) => (
    method === 'cash' ? 'Tunai' : method === 'qris' ? 'QRIS' : 'Kartu'
  );
  const dateTimeLabel = (value: string) => new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));

  return (
    <div className="employee-cashier" data-testid="employee-cashier">
      <header className="employee-cashier__heading">
        <div>
          <p className="employee-kicker">{hasActiveAccess ? 'PEMBAYARAN RESEPSIONIS' : 'AKSES KASIR'}</p>
          <h1>{hasActiveAccess ? <>Meja <em>kasir.</em></> : <>Kasir <em>GGS.</em></>}</h1>
          {!hasActiveAccess && <p>Pilih unit kasir dan masukkan kata sandi unit.</p>}
        </div>
        {!hasActiveAccess && <span className="employee-cashier__secure-label"><LockKeyhole size={15} aria-hidden="true" /> Akses terlindungi</span>}
      </header>

      {cashierSession.isLoading ? (
        <section className="employee-cashier__state" role="status">Memeriksa akses kasir…</section>
      ) : cashierSession.isError ? (
        <section className="employee-cashier__state employee-cashier__state--error" role="alert">
          <div><strong>Status kasir belum dapat dimuat.</strong><p>Periksa koneksi, lalu perbarui status akses.</p></div>
          <button
            type="button"
            onClick={() => void cashierSession.refetch()}
            disabled={cashierSession.isFetching}
            data-testid="button-refresh-employee-cashier"
          >
            {cashierSession.isFetching ? 'Memuat…' : 'Coba lagi'}
          </button>
        </section>
      ) : hasActiveAccess && activeRegister ? (
        <div className="cashier-workspace">
          <div className="cashier-workspace__bar">
            <div className="cashier-workspace__register">
              <span className="cashier-workspace__register-mark"><Store size={17} aria-hidden="true" /></span>
              <div><span>REGISTER</span><strong id="employee-cashier-active-title">{activeRegister.label}</strong></div>
              {cashierSession.data?.expiresAt && <small>Sesi berakhir {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(cashierSession.data.expiresAt))} · Pajak {taxRate}%</small>}
            </div>
            <div className="cashier-workspace__bar-actions">
              {lockError && <span className="employee-form-error" role="alert">{lockError}</span>}
              <button type="button" className="employee-cashier__lock-button" onClick={submitLock} disabled={lockCashier.isPending} data-testid="button-lock-employee-cashier">
                <LockKeyhole size={14} aria-hidden="true" />{lockCashier.isPending ? 'Mengunci…' : 'Kunci kasir'}
              </button>
            </div>
          </div>

          <CashierAnnouncementStrip query={announcementsQuery} announcements={announcementsQuery.data ?? []} />

          <section className="cashier-day-summary" aria-label="Rekap pemasukan register" data-testid="summary-cashier-today">
            <div className="cashier-day-summary__intro"><span>REKAP REGISTER</span><strong>{transactionsQuery.data?.fromDate || transactionsQuery.data?.toDate ? `${transactionsQuery.data?.fromDate || 'Awal'} — ${transactionsQuery.data?.toDate || 'Hari ini'}` : 'Seluruh riwayat'}</strong></div>
            <div className="cashier-day-summary__metric"><span>Pemasukan bersih</span><strong>{transactionsQuery.isLoading ? 'Memuat…' : transactionsQuery.isError ? '—' : formatMoney(transactionsQuery.data?.totalCollected ?? 0)}</strong></div>
            <div className="cashier-day-summary__metric"><span>Pembayaran selesai</span><strong>{transactionsQuery.isLoading ? '—' : transactionsQuery.isError ? '—' : transactionsQuery.data?.transactionCount ?? 0}</strong></div>
            <div className="cashier-day-summary__metric cashier-day-summary__metric--cancelled"><span>Dibatalkan</span><strong>{transactionsQuery.isLoading ? '—' : transactionsQuery.isError ? '—' : `${transactionsQuery.data?.cancelledTransactionCount ?? 0} · ${formatMoney(transactionsQuery.data?.cancelledTotal ?? 0)}`}</strong></div>
            <button type="button" className="cashier-day-summary__refresh" onClick={() => void transactionsQuery.refetch()} disabled={transactionsQuery.isFetching} aria-label="Perbarui ringkasan"><RefreshCw size={15} className={transactionsQuery.isFetching ? 'is-spinning' : ''} aria-hidden="true" /></button>
          </section>

          {transactionsQuery.isError && <div className="cashier-inline-error" role="alert"><span>Rekap dan riwayat belum dapat dimuat.</span><button type="button" onClick={() => void transactionsQuery.refetch()}>Coba lagi</button></div>}

          <section className="cashier-history" aria-labelledby="cashier-history-title">
            <div className="cashier-history__top">
              <div className="cashier-section-heading">
                <div><span>CATATAN KASIR</span><h2 id="cashier-history-title">Riwayat transaksi</h2></div>
                <span className="cashier-history__count">{transactionsQuery.data ? `${transactionsQuery.data.matchedTransactionCount} hasil` : 'Riwayat lengkap'}</span>
              </div>
              <div className="cashier-history__filters">
                <label className="cashier-history__search"><Search size={15} aria-hidden="true" /><span className="sr-only">Cari struk, pelanggan, atau item</span><input type="search" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setHistoryPage(1); }} placeholder="Struk, pelanggan, item…" data-testid="input-cashier-history-search" /></label>
                <label className="cashier-history__filter">Status<select value={historyStatus} onChange={(event) => { setHistoryStatus(event.target.value as GetGgsEmployeeCashierTransactionsParams['status']); setHistoryPage(1); }} data-testid="select-cashier-history-status"><option value="all">Semua status</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select></label>
                <label className="cashier-history__filter">Dari<input type="date" value={historyFromDate} onChange={(event) => { setHistoryFromDate(event.target.value); setHistoryPage(1); }} data-testid="input-cashier-history-from-date" /></label>
                <label className="cashier-history__filter">Sampai<input type="date" value={historyToDate} onChange={(event) => { setHistoryToDate(event.target.value); setHistoryPage(1); }} data-testid="input-cashier-history-to-date" /></label>
              </div>
            </div>
            {historyFromDate && historyToDate && historyFromDate > historyToDate && <p className="cashier-history__validation" role="alert">Tanggal awal harus sebelum atau sama dengan tanggal akhir.</p>}
            {transactionsQuery.data && <div className="cashier-method-recap" aria-label="Pemasukan menurut metode pembayaran">
              <span className="cashier-method-recap__label">METODE PEMBAYARAN</span>
              {transactionsQuery.data.paymentMethods.map((method) => <div className="cashier-method-recap__item" key={method.paymentMethod}><span>{paymentMethodLabel(method.paymentMethod)} <small>{method.transactionCount} transaksi</small></span><strong>{formatMoney(method.totalCollected)}</strong></div>)}
            </div>}
            {!historyDateRangeValid ? null : transactionsQuery.isLoading ? <div className="cashier-history__skeleton" role="status" aria-label="Memuat riwayat transaksi"><span /><span /><span /><span /></div> :
              transactionsQuery.isError ? <div className="cashier-history__empty cashier-history__empty--error"><strong>Riwayat belum dapat dibuka</strong><span>Periksa koneksi register, lalu coba lagi.</span><button type="button" onClick={() => void transactionsQuery.refetch()}>Coba lagi</button></div> :
                transactionsQuery.data?.transactions.length ? <div className="cashier-history__table-wrap">
                  <table className="cashier-history__table">
                    <thead><tr><th>Struk / waktu</th><th>Pelanggan &amp; item</th><th>Metode</th><th>Status</th><th className="is-number">Jumlah</th><th><span className="sr-only">Detail</span></th></tr></thead>
                    <tbody>{transactionsQuery.data.transactions.map((transaction) => <tr key={transaction.transactionId} data-testid={`row-cashier-transaction-${transaction.transactionId}`}>
                      <td><strong>{transaction.receiptNumber}</strong><span>{dateTimeLabel(transaction.createdAt)}</span></td>
                      <td><strong>{transaction.customerName || 'Pelanggan umum'}</strong><span>{transaction.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}</span></td>
                      <td>{paymentMethodLabel(transaction.paymentMethod)}</td>
                      <td><span className={`cashier-history__status cashier-history__status--${transaction.status}`}>{transaction.status === 'completed' ? 'Selesai' : 'Dibatalkan'}</span></td>
                      <td className="is-number"><strong>{formatMoney(transaction.totalAmount)}</strong></td>
                      <td><button type="button" className="cashier-history__detail" onClick={() => { cancelTransaction.reset(); setSelectedTransaction(transaction); setCancellationReason(''); setConfirmCancellation(false); }} data-testid={`button-cashier-transaction-detail-${transaction.transactionId}`}>Detail <ArrowRight size={13} aria-hidden="true" /></button></td>
                    </tr>)}</tbody>
                  </table>
                </div> : <div className="cashier-history__empty"><span className="cashier-history__empty-mark"><ReceiptText size={20} aria-hidden="true" /></span><strong>{historySearch || historyFromDate || historyToDate || historyStatus !== 'all' ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}</strong><span>{historySearch || historyFromDate || historyToDate || historyStatus !== 'all' ? 'Ubah pencarian atau filter untuk melihat hasil lain.' : 'Pembayaran yang tercatat di register ini akan tampil di sini.'}</span></div>}
            {transactionsQuery.data && <footer className="cashier-history__pagination">
              <span>Halaman {transactionsQuery.data.page} dari {Math.max(1, transactionsQuery.data.pageCount)} <small>· {transactionsQuery.data.matchedTransactionCount} transaksi</small></span>
              <div><button type="button" onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} disabled={historyPage <= 1 || transactionsQuery.isFetching} aria-label="Halaman sebelumnya" data-testid="button-cashier-history-previous"><ChevronLeft size={16} /></button><button type="button" onClick={() => setHistoryPage((page) => Math.min(transactionsQuery.data?.pageCount ?? page, page + 1))} disabled={historyPage >= transactionsQuery.data.pageCount || transactionsQuery.isFetching} aria-label="Halaman berikutnya" data-testid="button-cashier-history-next"><ChevronRight size={16} /></button></div>
            </footer>}
          </section>

          <section className="cashier-voucher-panel" aria-labelledby="cashier-voucher-heading">
            <div className="cashier-voucher-panel__heading">
              <div><span>PROMO KASIR</span><h2 id="cashier-voucher-heading">Voucher atau diskon</h2></div>
              <small>Pilih satu untuk transaksi ini</small>
            </div>
            <div className="cashier-voucher-field">
              {vouchersQuery.isLoading ? <span className="cashier-voucher-state" role="status">Memuat voucher…</span> :
                vouchersQuery.isError ? <span className="cashier-voucher-state cashier-voucher-state--error" role="alert">Voucher belum dapat dimuat. <button type="button" onClick={() => void vouchersQuery.refetch()}>Coba lagi</button></span> :
                  vouchers.length ? <div className="cashier-voucher-list" role="group" aria-label="Pilih voucher atau diskon">
                    <button
                      type="button"
                      className={`cashier-voucher-choice cashier-voucher-choice--none${voucherCode ? '' : ' is-selected'}`}
                      aria-pressed={!voucherCode}
                      onClick={() => { setVoucherCode(''); setCheckoutError(''); }}
                      data-testid="button-cashier-voucher-none"
                    >
                      <span className="cashier-voucher-choice__copy"><strong>Tanpa voucher</strong><small>Harga normal</small></span>
                    </button>
                    {vouchers.map((voucher) => {
                      const voucherDiscount = calculateVoucherDiscount(voucher);
                      return <button
                        type="button"
                        key={voucher.id}
                        className={`cashier-voucher-choice${voucherCode === voucher.code ? ' is-selected' : ''}`}
                        aria-pressed={voucherCode === voucher.code}
                        onClick={() => { setVoucherCode(voucher.code); setCheckoutError(''); }}
                        data-testid={`button-cashier-voucher-${voucher.id}`}
                      >
                        <span className="cashier-voucher-choice__copy">
                          <strong>{voucher.name}</strong>
                          <small>{voucher.code} · {voucher.appliesTo === 'services' ? 'Layanan' : 'Semua item'}{voucher.expiresAt ? ` · Sampai ${displayDate(voucher.expiresAt)}` : ''}</small>
                        </span>
                        <span className="cashier-voucher-choice__discount">
                          <strong>{voucher.discountType === 'percent' ? `${voucher.discountValue}%` : formatMoney(voucher.discountValue)}</strong>
                          {subtotal > 0 && voucherDiscount > 0 && <small>−{formatMoney(voucherDiscount)}</small>}
                        </span>
                      </button>;
                    })}
                  </div> : <span className="cashier-voucher-state">Belum ada voucher aktif.</span>}
              {selectedVoucher && <small className="cashier-voucher-field__note">{selectedVoucher.value}</small>}
            </div>
          </section>

          <div className="cashier-layout">
            <section className="cashier-catalog" aria-label="Katalog layanan dan produk">
              <div className="cashier-section-heading"><div><span>KATALOG</span><h2>Pilih item</h2></div><small>Harga katalog</small></div>
              <div className="cashier-catalog__tools">
                <div className="cashier-tabs" role="tablist" aria-label="Jenis katalog">
                  <button type="button" role="tab" aria-selected={catalogTab === 'service'} className={catalogTab === 'service' ? 'is-active' : ''} onClick={() => setCatalogTab('service')} data-testid="tab-cashier-services"><Scissors size={15} aria-hidden="true" /> Layanan</button>
                  <button type="button" role="tab" aria-selected={catalogTab === 'product'} className={catalogTab === 'product' ? 'is-active' : ''} onClick={() => setCatalogTab('product')} data-testid="tab-cashier-products"><ShoppingBag size={15} aria-hidden="true" /> Produk</button>
                </div>
                <label className="cashier-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Cari item</span><input type="search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Cari item…" data-testid="input-cashier-catalog-search" /></label>
              </div>
              {(catalogTab === 'service' ? servicesQuery.isLoading : productsQuery.isLoading) ? (
                <div className="cashier-catalog-skeleton" role="status" aria-label="Memuat katalog"><span /><span /><span /><span /></div>
              ) : (catalogTab === 'service' ? servicesQuery.isError : productsQuery.isError) ? (
                <div className="cashier-empty cashier-empty--error" role="alert"><strong>Katalog belum tersedia</strong><p>Periksa koneksi, lalu coba muat ulang.</p><button type="button" onClick={() => void (catalogTab === 'service' ? servicesQuery.refetch() : productsQuery.refetch())}>Coba lagi</button></div>
              ) : visibleCatalog.length ? (
                <div className="cashier-catalog__list">
                  {visibleCatalog.map((item) => {
                    const itemType = catalogTab;
                    const line = cart.find((entry) => entry.itemType === itemType && entry.itemId === item.id);
                    const outOfStock = itemType === 'product' && (item as typeof products[number]).stock < 1;
                    return <article className="cashier-item" key={`${itemType}-${item.id}`} data-testid={`card-cashier-${itemType}-${item.id}`}>
                      <div className="cashier-item__type">{itemType === 'service' ? <Scissors size={16} aria-hidden="true" /> : <Package size={16} aria-hidden="true" />}</div>
                      <div className="cashier-item__copy"><strong>{item.name}</strong><span>{item.category}{itemType === 'service' ? ` · ${(item as typeof services[number]).durationMinutes} menit` : ` · Stok ${(item as typeof products[number]).stock}`}</span></div>
                      <strong className="cashier-item__price">{formatMoney(item.price)}</strong>
                      <button type="button" className={`cashier-item__add${line ? ' is-added' : ''}`} onClick={() => addItem(itemType, item.id)} disabled={outOfStock || Boolean(line && itemType === 'product' && line.quantity >= (item as typeof products[number]).stock)} aria-label={`${line ? 'Tambah lagi' : 'Tambah'} ${item.name}`} data-testid={`button-add-cashier-${itemType}-${item.id}`}>
                        {line ? <><CheckCircle2 size={14} aria-hidden="true" /> {line.quantity}</> : <><Plus size={15} aria-hidden="true" /> Tambah</>}
                      </button>
                    </article>;
                  })}
                </div>
              ) : (
                <div className="cashier-empty"><div className="cashier-empty__icon">{catalogTab === 'service' ? <Scissors size={19} /> : <Package size={19} />}</div><strong>{catalogSearch ? 'Tidak ada hasil' : `Belum ada ${catalogTab === 'service' ? 'layanan aktif' : 'produk aktif'}`}</strong><p>{catalogSearch ? 'Coba kata pencarian lain.' : 'Item aktif akan tampil di sini.'}</p></div>
              )}
            </section>

            <aside className="cashier-checkout" aria-label="Rincian pembayaran">
              <div className="cashier-section-heading"><div><span>PEMBAYARAN</span><h2>Rincian pesanan</h2></div><span className="cashier-checkout__count">{cart.reduce((count, item) => count + item.quantity, 0)} item</span></div>
              <label className="cashier-field">Nama pelanggan <span>Opsional</span><input type="text" maxLength={120} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Contoh: Nadia" data-testid="input-cashier-customer-name" /></label>
              <div className="cashier-cart" aria-live="polite">
                {cart.length ? cart.map((line) => {
                  const item = line.itemType === 'service' ? services.find((entry) => entry.id === line.itemId) : products.find((entry) => entry.id === line.itemId);
                  if (!item) return null;
                  return <article className="cashier-cart-line" key={`${line.itemType}-${line.itemId}`}>
                    <div className="cashier-cart-line__copy"><strong>{item.name}</strong><span>{formatMoney(item.price)} / item</span></div>
                    <div className="cashier-quantity">
                      <button type="button" aria-label={`Kurangi ${item.name}`} onClick={() => adjustItem(line.itemType, line.itemId, -1)} data-testid={`button-decrease-cashier-${line.itemType}-${line.itemId}`}><Minus size={13} /></button>
                      <span>{line.quantity}</span>
                      <button type="button" aria-label={`Tambah ${item.name}`} disabled={line.quantity >= 99 || (line.itemType === 'product' && line.quantity >= (item as typeof products[number]).stock)} onClick={() => adjustItem(line.itemType, line.itemId, 1)} data-testid={`button-increase-cashier-${line.itemType}-${line.itemId}`}><Plus size={13} /></button>
                      <button type="button" className="cashier-quantity__remove" aria-label={`Hapus ${item.name}`} onClick={() => setCart((current) => current.filter((entry) => entry.itemType !== line.itemType || entry.itemId !== line.itemId))} data-testid={`button-remove-cashier-${line.itemType}-${line.itemId}`}><Trash2 size={13} /></button>
                    </div>
                    <strong className="cashier-cart-line__total">{formatMoney(item.price * line.quantity)}</strong>
                  </article>;
                }) : <div className="cashier-cart__empty"><ReceiptText size={21} aria-hidden="true" /><strong>Belum ada item</strong><span>Pilih layanan atau produk di samping.</span></div>}
              </div>
              <div className="cashier-breakdown" aria-label="Rincian total">
                <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
                {selectedVoucher && <div className="cashier-breakdown__discount"><span>Diskon · {selectedVoucher.name}</span><strong>−{formatMoney(discountAmount)}</strong></div>}
                <div><span>Pajak ({taxRate}%)</span><strong>{formatMoney(previewTax)}</strong></div>
                <div className="cashier-breakdown__total"><span>Total pembayaran</span><strong>{formatMoney(previewTotal)}</strong></div>
              </div>
              <form onSubmit={submitPayment}>
                <fieldset className="cashier-payment-method">
                  <legend>Metode pembayaran</legend>
                  {([
                    { value: 'cash', label: 'Tunai', icon: Banknote },
                    { value: 'qris', label: 'QRIS', icon: QrCode },
                    { value: 'card', label: 'Kartu', icon: CreditCard },
                  ] as const).map((method) => <button type="button" key={method.value} className={paymentMethod === method.value ? 'is-selected' : ''} aria-pressed={paymentMethod === method.value} onClick={() => { setPaymentMethod(method.value); setCheckoutError(''); }} data-testid={`button-cashier-payment-${method.value}`}>
                    <method.icon size={15} aria-hidden="true" />{method.label}
                  </button>)}
                </fieldset>
                {paymentMethod === 'cash' ? (
                  <>
                    <label className="cashier-field cashier-field--amount">Uang diterima<input type="text" inputMode="numeric" autoComplete="off" value={formatCashAmount(amountReceived)} onChange={handleAmountReceivedChange} placeholder="Contoh: 250.000" data-testid="input-cashier-amount-received" />
                      {receivedValue >= previewTotal && previewTotal > 0 && <span className="cashier-change"><span>Kembalian</span><strong>{formatMoney(changeAmount)}</strong></span>}
                    </label>
                    {cashSuggestions.length > 0 && <div className="cashier-amount-shortcuts" role="group" aria-label="Pilihan cepat uang diterima">
                      {cashSuggestions.map((suggestion) => <button
                        type="button"
                        key={suggestion.amount}
                        onClick={() => {
                          setAmountReceived(String(suggestion.amount));
                          setCheckoutError('');
                        }}
                        aria-label={`Isi ${formatMoney(suggestion.amount)}`}
                        data-testid={`button-cashier-amount-${suggestion.amount}`}
                      >
                        <span>{suggestion.label}</span><strong>{formatMoney(suggestion.amount)}</strong>
                      </button>)}
                    </div>}
                  </>
                ) : <p className="cashier-record-note">Pembayaran {paymentMethod === 'qris' ? 'QRIS' : 'kartu'} diterima di resepsionis dan dicatat di sini. Aplikasi ini tidak memproses pembayaran.</p>}
                {checkoutError && <p className="cashier-form-error" role="alert" data-testid="status-cashier-checkout-error">{checkoutError}</p>}
                <button type="submit" className="cashier-submit" disabled={createTransaction.isPending || !cart.length || (paymentMethod === 'cash' && receivedValue < previewTotal)} data-testid="button-submit-cashier-payment">
                  {createTransaction.isPending ? <><span className="cashier-submit__pending" />Menyimpan pembayaran…</> : <>Konfirmasi pembayaran <ArrowRight size={16} aria-hidden="true" /></>}
                </button>
                <p className="cashier-checkout__footnote"><ShieldCheck size={13} aria-hidden="true" /> Harga akhir dan stok dikonfirmasi oleh sistem.</p>
              </form>
            </aside>
          </div>

          {receipt && <section className="cashier-receipt" aria-labelledby="cashier-receipt-title" data-testid="status-cashier-payment-success">
            <div className="cashier-receipt__heading"><span className="cashier-receipt__success"><CheckCircle2 size={19} aria-hidden="true" /></span><div><p className="employee-kicker">PEMBAYARAN BERHASIL</p><h2 id="cashier-receipt-title">Transaksi tercatat</h2></div><button type="button" className="cashier-print-button" onClick={() => window.print()} data-testid="button-print-cashier-receipt"><Printer size={15} aria-hidden="true" /> Cetak struk</button></div>
            <div className="cashier-receipt__body">
              <div className="cashier-receipt__meta"><span>No. struk<strong>{receipt.receiptNumber}</strong></span><span>Register<strong>{activeRegister.label}</strong></span><span>Waktu<strong>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(receipt.createdAt))}</strong></span><span>Pelanggan<strong>{receipt.customerName || 'Pelanggan umum'}</strong></span></div>
              <div className="cashier-receipt__items">{receipt.items.map((item, index) => <div key={`${item.itemType}-${item.itemId}-${index}`}><span>{item.name} <small>× {item.quantity}</small></span><strong>{formatMoney(item.lineTotal)}</strong></div>)}</div>
              <div className="cashier-receipt__totals">
                <span>Subtotal <strong>{formatMoney(receipt.subtotal)}</strong></span>
                {receipt.voucherName && <span>Voucher · {receipt.voucherName}{receipt.voucherCode ? ` (${receipt.voucherCode})` : ''}<strong>−{formatMoney(receipt.discountAmount)}</strong></span>}
                <span>Pajak ({receipt.taxRate}%) <strong>{formatMoney(receipt.taxAmount)}</strong></span>
                <span className="cashier-receipt__grand-total">Total pembayaran <strong>{formatMoney(receipt.totalAmount)}</strong></span>
                <span>Metode <strong>{receipt.paymentMethod === 'cash' ? 'Tunai' : receipt.paymentMethod === 'qris' ? 'QRIS' : 'Kartu'}</strong></span>
                {receipt.paymentMethod === 'cash' && <><span>Diterima <strong>{formatMoney(receipt.amountReceived)}</strong></span><span>Kembalian <strong>{formatMoney(receipt.changeAmount)}</strong></span></>}
              </div>
            </div>
            <button type="button" className="cashier-receipt__dismiss" onClick={() => setReceipt(null)}>Tutup struk</button>
          </section>}

          {selectedTransaction && <div className="cashier-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTransaction(null); }}>
            <section className="cashier-detail" role="dialog" aria-modal="true" aria-labelledby="cashier-detail-title" data-testid="dialog-cashier-transaction-detail">
              <header className="cashier-detail__header"><div><span>DETAIL TRANSAKSI</span><h2 id="cashier-detail-title">{selectedTransaction.receiptNumber}</h2></div><button type="button" onClick={() => setSelectedTransaction(null)} aria-label="Tutup detail transaksi" data-testid="button-close-cashier-transaction-detail"><X size={18} /></button></header>
              <div className="cashier-detail__state"><span className={`cashier-history__status cashier-history__status--${selectedTransaction.status}`}>{selectedTransaction.status === 'completed' ? 'Selesai' : 'Dibatalkan'}</span><span>{dateTimeLabel(selectedTransaction.createdAt)}</span></div>
              <dl className="cashier-detail__facts"><div><dt>Pelanggan</dt><dd>{selectedTransaction.customerName || 'Pelanggan umum'}</dd></div><div><dt>Petugas</dt><dd>{selectedTransaction.employeeName}</dd></div><div><dt>Register</dt><dd>{selectedTransaction.register === 'ggs_beauty' ? 'GGS Beauty' : 'Barber GGS'}</dd></div><div><dt>Metode</dt><dd>{paymentMethodLabel(selectedTransaction.paymentMethod)}</dd></div></dl>
              <div className="cashier-detail__items"><h3>Item transaksi</h3>{selectedTransaction.items.map((item, index) => <div key={`${item.itemType}-${item.itemId}-${index}`}><span><strong>{item.name}</strong><small>{item.quantity} × {formatMoney(item.unitPrice)}</small></span><strong>{formatMoney(item.lineTotal)}</strong></div>)}</div>
              <div className="cashier-detail__breakdown">
                <div><span>Subtotal</span><strong>{formatMoney(selectedTransaction.subtotal)}</strong></div>
                {selectedTransaction.voucherName && <div className="is-discount"><span>Diskon · {selectedTransaction.voucherName}{selectedTransaction.voucherCode ? ` (${selectedTransaction.voucherCode})` : ''}</span><strong>−{formatMoney(selectedTransaction.discountAmount)}</strong></div>}
                <div><span>Pajak ({selectedTransaction.taxRate}%)</span><strong>{formatMoney(selectedTransaction.taxAmount)}</strong></div>
                <div className="is-total"><span>Total pembayaran</span><strong>{formatMoney(selectedTransaction.totalAmount)}</strong></div>
              </div>
              {selectedTransaction.paymentMethod === 'cash' && <div className="cashier-detail__cash"><span>Uang diterima <strong>{formatMoney(selectedTransaction.amountReceived)}</strong></span><span>Kembalian <strong>{formatMoney(selectedTransaction.changeAmount)}</strong></span></div>}
              {selectedTransaction.status === 'cancelled' ? <div className="cashier-detail__audit"><AlertTriangle size={16} aria-hidden="true" /><div><strong>Pembatalan tercatat</strong><span>Alasan: {selectedTransaction.cancellationReason || 'Tidak tersedia'}</span><small>{selectedTransaction.cancelledAt ? dateTimeLabel(selectedTransaction.cancelledAt) : ''}{selectedTransaction.cancelledByEmployeeName ? ` · oleh ${selectedTransaction.cancelledByEmployeeName}` : ''}</small></div></div> :
                <form className="cashier-detail__cancel" onSubmit={submitCancellation}>
                  <label>Batalkan transaksi <span>Wajib diisi · 3–240 karakter</span><textarea value={cancellationReason} onChange={(event) => { setCancellationReason(event.target.value); setConfirmCancellation(false); }} minLength={3} maxLength={240} required placeholder="Jelaskan kesalahan yang perlu dikoreksi…" data-testid="input-cashier-cancellation-reason" /></label>
                  {confirmCancellation ? <div className="cashier-detail__confirm" role="alert"><AlertTriangle size={16} aria-hidden="true" /><span>Transaksi akan ditandai batal, dikeluarkan dari pemasukan, dan stok produk dipulihkan. Catatan audit tetap tersimpan.</span><button type="submit" disabled={cancelTransaction.isPending || cancellationReason.trim().length < 3} data-testid="button-confirm-cashier-cancellation">{cancelTransaction.isPending ? 'Membatalkan…' : 'Ya, batalkan transaksi'}</button><button type="button" onClick={() => setConfirmCancellation(false)}>Kembali</button></div> :
                    <button type="submit" className="cashier-detail__cancel-button" disabled={cancellationReason.trim().length < 3} data-testid="button-start-cashier-cancellation"><AlertTriangle size={15} aria-hidden="true" /> Tinjau pembatalan</button>}
                  {cancelTransaction.isError && <p className="cashier-history__validation" role="alert">{cashierErrorMessage(cancelTransaction.error, 'Pembatalan belum berhasil. Periksa kembali transaksi dan coba lagi.')}</p>}
                </form>}
            </section>
          </div>}
        </div>
      ) : (
        <section className="employee-cashier__access" aria-label="Buka akses kasir">
          <div className="employee-cashier__registers" role="group" aria-label="Pilih unit kasir">
            {cashierRegisters.map((register) => (
              <button
                key={register.value}
                type="button"
                className={`employee-cashier__register${selectedRegister === register.value ? ' employee-cashier__register--selected' : ''}`}
                aria-pressed={selectedRegister === register.value}
                onClick={() => {
                  setSelectedRegister(register.value);
                  setFormError('');
                }}
                data-testid={`button-select-cashier-${register.value}`}
              >
                <span className="employee-cashier__register-icon"><Store size={18} aria-hidden="true" /></span>
                <span><strong>{register.label}</strong><small>{register.description}</small></span>
                <span className="employee-cashier__register-check" aria-hidden="true">{selectedRegister === register.value ? '✓' : ''}</span>
              </button>
            ))}
          </div>

          <form className="employee-cashier__form" onSubmit={submitUnlock}>
            <label htmlFor="employee-cashier-password">Kata sandi minimal 8 karakter · {cashierRegisters.find((item) => item.value === selectedRegister)?.label}</label>
            <input
              id="employee-cashier-password"
              name="cashier-password"
              type="password"
              autoComplete="off"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan kata sandi kasir"
              data-testid="input-employee-cashier-password"
            />
            {formError && <p className="employee-form-error" role="alert" data-testid="status-employee-cashier-error">{formError}</p>}
            <button
              type="submit"
              className="employee-primary-button"
              disabled={unlockCashier.isPending}
              data-testid="button-unlock-employee-cashier"
            >
              <span>{unlockCashier.isPending ? 'Memverifikasi…' : 'Buka kasir'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="employee-cashier__privacy"><ShieldCheck size={15} aria-hidden="true" /> Kata sandi diperiksa di server dan tidak disimpan di perangkat.</p>
          </form>
        </section>
      )}
    </div>
  );
}

function EmployeeOverview({
  employeeName,
  bookings,
  isLoading,
  isError,
  onRetry,
}: {
  employeeName: string;
  bookings: GgsEmployeeBooking[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const todayBookings = bookings.filter((booking) => isSameDayAsJakarta(booking.appointmentDate));
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending');
  const latestBookings = [...bookings]
    .sort((first, second) => `${dateKey(first.appointmentDate)} ${first.appointmentTime}`.localeCompare(`${dateKey(second.appointmentDate)} ${second.appointmentTime}`))
    .filter((booking) => dateKey(booking.appointmentDate) >= today)
    .slice(0, 3);
  const displayCount = (count: number) => isLoading ? '—' : isError ? '–' : count.toString();

  return (
    <div className="employee-dashboard" data-testid="employee-overview">
      <section className="employee-dashboard__heading">
        <div>
          <h1>Halo, {employeeName}</h1>
          <p>{displayDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link href="/employee/schedule" className="employee-primary-button" data-testid="link-overview-schedule">
          Jadwal booking <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      <section className="employee-dashboard__stats" aria-label="Ringkasan booking">
        <article className="employee-dashboard__stat">
          <span>Booking hari ini</span>
          <strong>{displayCount(todayBookings.length)}</strong>
        </article>
        <article className="employee-dashboard__stat">
          <span>Menunggu konfirmasi</span>
          <strong>{displayCount(pendingBookings.length)}</strong>
        </article>
        <article className="employee-dashboard__stat">
          <span>Total booking</span>
          <strong>{displayCount(bookings.length)}</strong>
        </article>
      </section>

      <section className="employee-dashboard__activity" aria-labelledby="employee-overview-activity-title">
        <div className="employee-dashboard__section-title">
          <h2 id="employee-overview-activity-title">Booking terdekat</h2>
        </div>
        {isLoading ? (
          <EmployeeBookingsSkeleton />
        ) : isError ? (
          <div className="employee-bookings__error" role="alert">
            <div><strong>Ringkasan belum dapat dimuat.</strong><p>Periksa koneksi, lalu coba lagi.</p></div>
            <button type="button" onClick={onRetry}>Coba lagi</button>
          </div>
        ) : latestBookings.length ? (
          <div className="employee-booking-list">
            {latestBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
          </div>
        ) : (
          <div className="employee-bookings__empty">
            <p>Belum ada booking.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EmployeeStockPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedProduct, setSelectedProduct] = useState<GgsProduct | null>(null);
  const [movementType, setMovementType] = useState<GgsEmployeeStockMovementInput['movementType']>('restock');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [movementError, setMovementError] = useState('');
  const [movementSuccess, setMovementSuccess] = useState('');
  const productsQuery = useGetGgsPublicProducts({
    query: {
      queryKey: getGetGgsPublicProductsQueryKey(),
      retry: false,
      staleTime: 0,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      refetchOnMount: 'always',
    },
  });
  const stockMovementsQuery = useGetGgsEmployeeStockMovements({
    query: {
      queryKey: getGetGgsEmployeeStockMovementsQueryKey(),
      retry: false,
      staleTime: 0,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
      refetchOnMount: 'always',
    },
  });
  const createStockMovement = useCreateGgsEmployeeStockMovement();
  const products = productsQuery.data ?? [];
  const lowStockCount = products.filter((product) => product.stock > 0 && product.stock <= LOW_STOCK_LIMIT).length;
  const outOfStockCount = products.filter((product) => product.stock === 0).length;
  const searchQuery = search.trim().toLocaleLowerCase('id-ID');
  const visibleProducts = products.filter((product) => {
    const matchesSearch = !searchQuery
      || `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase('id-ID').includes(searchQuery);
    const matchesStock = stockFilter === 'all'
      || (stockFilter === 'low' && product.stock > 0 && product.stock <= LOW_STOCK_LIMIT)
      || (stockFilter === 'out' && product.stock === 0);
    return matchesSearch && matchesStock;
  });
  const openStockDialog = (product: GgsProduct) => {
    setSelectedProduct(product);
    setMovementType('restock');
    setMovementQuantity('');
    setMovementNote('');
    setMovementError('');
  };
  const submitStockMovement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct) return;

    const quantity = Number(movementQuantity);
    if (
      !Number.isInteger(quantity)
      || quantity < 0
      || quantity > 2_147_483_647
      || (movementType === 'restock' && quantity === 0)
    ) {
      setMovementError(movementType === 'restock'
        ? 'Jumlah stok masuk harus bilangan bulat lebih dari nol.'
        : 'Masukkan jumlah stok aktual berupa bilangan bulat nol atau lebih.');
      return;
    }
    if (movementNote.trim().length < 3) {
      setMovementError('Catatan perubahan minimal 3 karakter.');
      return;
    }

    setMovementError('');
    try {
      await createStockMovement.mutateAsync({
        data: {
          productId: selectedProduct.id,
          movementType,
          quantity,
          note: movementNote.trim(),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetGgsPublicProductsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeStockMovementsQueryKey() }),
      ]);
      setSelectedProduct(null);
      setMovementSuccess(`Perubahan stok ${selectedProduct.name} tersimpan.`);
      window.setTimeout(() => setMovementSuccess(''), 5000);
    } catch (error) {
      setMovementError(cashierErrorMessage(
        error,
        'Stok belum dapat diperbarui. Periksa koneksi lalu coba lagi.',
      ));
    }
  };
  useEffect(() => {
    if (!selectedProduct) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createStockMovement.isPending) setSelectedProduct(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createStockMovement.isPending, selectedProduct]);

  return (
    <div className="employee-schedule__content employee-stock" data-testid="page-employee-stock">
      <section className="employee-schedule__heading employee-stock__heading">
        <div>
          <p className="employee-kicker">INVENTARIS STUDIO</p>
          <h1>Stok <em>produk.</em></h1>
          <p className="employee-schedule__welcome">Stok produk aktif. Menipis berarti 1–{LOW_STOCK_LIMIT} unit.</p>
        </div>
        <button
          type="button"
          className="employee-refresh-button"
          onClick={() => void productsQuery.refetch()}
          disabled={productsQuery.isFetching}
          data-testid="button-refresh-employee-stock"
        >
          <RefreshCw size={15} aria-hidden="true" className={productsQuery.isFetching ? 'is-spinning' : ''} />
          Perbarui stok
        </button>
      </section>

      <section className="employee-stock__metrics" aria-label="Ringkasan stok produk">
        <article><span>PRODUK AKTIF</span><strong>{productsQuery.isLoading || productsQuery.isError ? '—' : products.length.toLocaleString('id-ID')}</strong></article>
        <article><span>STOK MENIPIS</span><strong>{productsQuery.isLoading || productsQuery.isError ? '—' : lowStockCount.toLocaleString('id-ID')}</strong></article>
        <article><span>HABIS</span><strong>{productsQuery.isLoading || productsQuery.isError ? '—' : outOfStockCount.toLocaleString('id-ID')}</strong></article>
      </section>

      <section className="employee-stock__panel" aria-label="Daftar stok produk">
        {movementSuccess ? <p className="employee-stock__notice" role="status">{movementSuccess}</p> : null}
        <div className="employee-stock__toolbar">
          <div className="employee-stock__title">
            <div className="employee-bookings__title">
              <h2>Daftar produk</h2>
              <span>{productsQuery.isLoading || productsQuery.isError ? '—' : `${visibleProducts.length} produk`}</span>
            </div>
            <div className="employee-stock__filters" role="group" aria-label="Filter status stok">
              <button type="button" aria-pressed={stockFilter === 'all'} onClick={() => setStockFilter('all')} data-testid="filter-employee-stock-all">Semua</button>
              <button type="button" aria-pressed={stockFilter === 'low'} onClick={() => setStockFilter('low')} data-testid="filter-employee-stock-low">Menipis <span>{productsQuery.isLoading || productsQuery.isError ? '—' : lowStockCount}</span></button>
              <button type="button" aria-pressed={stockFilter === 'out'} onClick={() => setStockFilter('out')} data-testid="filter-employee-stock-out">Habis <span>{productsQuery.isLoading || productsQuery.isError ? '—' : outOfStockCount}</span></button>
            </div>
          </div>
          <label className="employee-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Cari produk</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau kategori produk"
              data-testid="input-search-employee-stock"
            />
          </label>
        </div>

        {productsQuery.isLoading ? (
          <div className="employee-stock__skeleton" role="status" aria-label="Memuat stok produk"><span /><span /><span /></div>
        ) : productsQuery.isError ? (
          <div className="employee-stock__state employee-stock__state--error" role="alert" data-testid="status-employee-stock-error">
            <div><strong>Stok produk belum dapat dimuat.</strong><p>Periksa koneksi lalu coba perbarui data.</p></div>
            <button type="button" onClick={() => void productsQuery.refetch()} disabled={productsQuery.isFetching}>Coba lagi</button>
          </div>
        ) : visibleProducts.length ? (
          <div className="employee-stock__list" role="list">
            {visibleProducts.map((product) => {
              const stockStatus = product.stock === 0 ? 'out' : product.stock <= LOW_STOCK_LIMIT ? 'low' : 'available';
              const stockLabel = stockStatus === 'out' ? 'Habis' : stockStatus === 'low' ? 'Menipis' : 'Tersedia';
              return (
                <article className="employee-stock__item" key={product.id} role="listitem" data-testid={`row-employee-stock-${product.id}`}>
                  <div className="employee-stock__image">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <Package size={20} aria-hidden="true" />}
                  </div>
                  <div className="employee-stock__copy">
                    <span className="employee-stock__category">{product.category || 'Produk GGS'}</span>
                    <h3>{product.name}</h3>
                    {product.description ? <p>{product.description}</p> : null}
                    <small>Rp{new Intl.NumberFormat('id-ID').format(product.price)}</small>
                    <button
                      type="button"
                      className="employee-stock__adjust"
                      onClick={() => openStockDialog(product)}
                      data-testid={`button-adjust-stock-${product.id}`}
                    >
                      Catat stok
                    </button>
                  </div>
                  <div className="employee-stock__quantity">
                    <span className={`employee-stock__status employee-stock__status--${stockStatus}`}>{stockLabel}</span>
                    <strong>{product.stock.toLocaleString('id-ID')}</strong>
                    <small>unit</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="employee-stock__state" data-testid="status-employee-stock-empty">
            <div className="employee-stock__empty-mark"><Package size={20} aria-hidden="true" /></div>
            <div>
              <strong>{products.length ? 'Produk tidak ditemukan.' : 'Belum ada produk aktif.'}</strong>
              <p>{products.length ? 'Coba kata pencarian atau filter stok lain.' : 'Produk aktif akan muncul di daftar stok.'}</p>
            </div>
          </div>
        )}
      </section>
      <section className="employee-stock__panel employee-stock__history" aria-labelledby="employee-stock-history-title">
        <div className="employee-stock__history-heading">
          <div><h2 id="employee-stock-history-title">Riwayat penambahan &amp; opname</h2><p>25 perubahan terakhir yang dicatat oleh karyawan.</p></div>
          <button
            type="button"
            className="employee-refresh-button"
            onClick={() => void stockMovementsQuery.refetch()}
            disabled={stockMovementsQuery.isFetching}
            data-testid="button-refresh-stock-history"
          >
            <RefreshCw size={14} aria-hidden="true" className={stockMovementsQuery.isFetching ? 'is-spinning' : ''} />
            Perbarui riwayat
          </button>
        </div>
        {stockMovementsQuery.isLoading ? (
          <div className="employee-stock__skeleton" role="status" aria-label="Memuat riwayat stok"><span /><span /></div>
        ) : stockMovementsQuery.isError ? (
          <div className="employee-stock__state employee-stock__state--error" role="alert">
            <div><strong>Riwayat stok belum dapat dimuat.</strong><p>Periksa koneksi lalu coba lagi.</p></div>
            <button type="button" onClick={() => void stockMovementsQuery.refetch()} disabled={stockMovementsQuery.isFetching}>Coba lagi</button>
          </div>
        ) : stockMovementsQuery.data?.length ? (
          <div className="employee-stock__history-list">
            {stockMovementsQuery.data.map((movement: GgsEmployeeStockMovement) => (
              <article className="employee-stock__movement" key={movement.id} data-testid={`row-stock-movement-${movement.id}`}>
                <div className="employee-stock__movement-product">
                  <strong>{movement.productName}</strong>
                  <span>{movement.movementType === 'restock' ? 'Stok masuk' : 'Opname'}</span>
                </div>
                <div className="employee-stock__movement-count">
                  <strong className={movement.quantityChange < 0 ? 'is-negative' : 'is-positive'}>
                    {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange.toLocaleString('id-ID')} unit
                  </strong>
                  <small>{movement.previousStock.toLocaleString('id-ID')} → {movement.newStock.toLocaleString('id-ID')} unit</small>
                </div>
                <p>{movement.note}</p>
                <small className="employee-stock__movement-meta">{movement.employeeName} · {displayDateTime(movement.createdAt)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="employee-stock__state" data-testid="status-stock-movements-empty">
            <div><strong>Belum ada perubahan yang dicatat.</strong><p>Stok masuk dan hasil opname akan muncul di sini.</p></div>
          </div>
        )}
      </section>

      {selectedProduct ? (
        <div className="employee-stock__dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !createStockMovement.isPending) setSelectedProduct(null);
        }}>
          <section className="employee-stock__dialog" role="dialog" aria-modal="true" aria-labelledby="employee-stock-dialog-title">
            <header>
              <div><span>PERUBAHAN INVENTARIS</span><h2 id="employee-stock-dialog-title">{selectedProduct.name}</h2></div>
              <button type="button" onClick={() => setSelectedProduct(null)} disabled={createStockMovement.isPending} aria-label="Tutup catatan stok"><X size={18} /></button>
            </header>
            <p className="employee-stock__dialog-current">Stok tercatat saat ini: <strong>{selectedProduct.stock.toLocaleString('id-ID')} unit</strong></p>
            <form onSubmit={(event) => void submitStockMovement(event)}>
              <div className="employee-stock__movement-types" role="group" aria-label="Jenis perubahan stok">
                <button type="button" aria-pressed={movementType === 'restock'} onClick={() => { setMovementType('restock'); setMovementQuantity(''); setMovementError(''); }} data-testid="stock-movement-type-restock">Stok masuk</button>
                <button type="button" aria-pressed={movementType === 'stocktake'} onClick={() => { setMovementType('stocktake'); setMovementQuantity(''); setMovementError(''); }} data-testid="stock-movement-type-stocktake">Opname</button>
              </div>
              <label>
                <span>{movementType === 'restock' ? 'Jumlah stok masuk' : 'Jumlah stok aktual'}</span>
                <div className="employee-stock__number-field">
                  <input
                    type="number"
                    min={movementType === 'restock' ? 1 : 0}
                    max={2_147_483_647}
                    step="1"
                    required
                    value={movementQuantity}
                    onChange={(event) => setMovementQuantity(event.target.value)}
                    data-testid="input-stock-movement-quantity"
                  />
                  <span>unit</span>
                </div>
              </label>
              <label>
                <span>Catatan perubahan</span>
                <textarea
                  required
                  minLength={3}
                  maxLength={240}
                  rows={3}
                  value={movementNote}
                  onChange={(event) => setMovementNote(event.target.value)}
                  placeholder={movementType === 'restock' ? 'Contoh: stok baru diterima' : 'Contoh: hasil hitung stok rak'}
                  data-testid="input-stock-movement-note"
                />
              </label>
              <p className="employee-stock__dialog-hint">
                {movementType === 'restock'
                  ? 'Jumlah akan ditambahkan ke stok yang tercatat.'
                  : 'Stok akan disamakan dengan jumlah aktual yang dihitung.'}
              </p>
              {movementError ? <p className="employee-stock__dialog-error" role="alert" data-testid="status-stock-movement-error">{movementError}</p> : null}
              <div className="employee-stock__dialog-actions">
                <button type="button" onClick={() => setSelectedProduct(null)} disabled={createStockMovement.isPending}>Batal</button>
                <button type="submit" disabled={createStockMovement.isPending} data-testid="button-submit-stock-movement">
                  {createStockMovement.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

const reportPaymentLabels: Record<'cash' | 'qris' | 'card', string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  card: 'Kartu',
};

const reportRegisterLabels: Record<NonNullable<GetGgsEmployeeReportsParams['register']>, string> = {
  all: 'Semua kasir',
  ggs_beauty: 'GGS Beauty',
  barber_ggs: 'Barber GGS',
};

function EmployeeReportsPage() {
  const [rangePreset, setRangePreset] = useState<'7' | '30' | 'custom'>('7');
  const [registerFilter, setRegisterFilter] = useState<NonNullable<GetGgsEmployeeReportsParams['register']>>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<NonNullable<GetGgsEmployeeReportsParams['paymentMethod']>>('all');
  const [dateRange, setDateRange] = useState(() => {
    const toDate = jakartaTodayDate();
    return { fromDate: shiftCalendarDate(toDate, -6), toDate };
  });
  const rangeIsValid = Boolean(dateRange.fromDate && dateRange.toDate)
    && dateRange.fromDate <= dateRange.toDate;
  const reportParams = useMemo<GetGgsEmployeeReportsParams>(() => ({
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    register: registerFilter,
    paymentMethod: paymentMethodFilter,
  }), [dateRange.fromDate, dateRange.toDate, registerFilter, paymentMethodFilter]);
  const reportQuery = useGetGgsEmployeeReports(reportParams, {
    query: {
      queryKey: getGetGgsEmployeeReportsQueryKey(reportParams),
      enabled: rangeIsValid,
      retry: false,
      staleTime: 0,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });
  const report = rangeIsValid ? reportQuery.data : undefined;
  const hasActivity = Boolean(
    report &&
    (report.completedTransactionCount > 0
      || report.cancelledTransactionCount > 0
      || report.bookingCount > 0),
  );

  const setPreset = (days: 7 | 30) => {
    const toDate = jakartaTodayDate();
    setRangePreset(String(days) as '7' | '30');
    setDateRange({ fromDate: shiftCalendarDate(toDate, -(days - 1)), toDate });
  };
  const downloadReportCsv = () => {
    if (!report) return;
    const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows: (string | number)[][] = [
      ['Laporan GGS Hair Studio'],
      ['Periode', dateRange.fromDate, 's.d.', dateRange.toDate],
      ['Kasir', reportRegisterLabels[registerFilter]],
      ['Metode pembayaran', paymentMethodFilter === 'all' ? 'Semua metode' : reportPaymentLabels[paymentMethodFilter]],
      [],
      ['Ringkasan'],
      ['Total terbayar', report.totalCollected],
      ['Transaksi selesai', report.completedTransactionCount],
      ['Transaksi dibatalkan', report.cancelledTransactionCount],
      ['Booking terjadwal', report.bookingCount],
      ['Booking selesai', report.completedBookingCount],
      ['Booking dibatalkan', report.cancelledBookingCount],
      ['Rata-rata transaksi', report.averageTransactionValue],
      [],
      ['Metode pembayaran', 'Jumlah transaksi', 'Total terbayar'],
      ...report.paymentMethods.map((method) => [
        reportPaymentLabels[method.paymentMethod],
        method.transactionCount,
        method.totalCollected,
      ]),
      [],
      ['Rincian harian', 'Booking', 'Selesai', 'Batal', 'Transaksi', 'Total terbayar'],
      ...report.daily.map((day) => [
        dateKey(day.date),
        day.bookingCount,
        day.completedBookingCount,
        day.cancelledBookingCount,
        day.transactionCount,
        day.totalCollected,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `laporan-ggs-${dateRange.fromDate}-${dateRange.toDate}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="employee-schedule__content employee-reports" data-testid="page-employee-reports">
      <section className="employee-schedule__heading employee-reports__heading">
        <div>
          <p className="employee-kicker">RINGKASAN STUDIO</p>
          <h1>Laporan <em>studio.</em></h1>
          <p className="employee-schedule__welcome">Rekap booking dan transaksi sesuai periode dan filter.</p>
        </div>
        <div className="employee-reports__actions">
          <button
            type="button"
            className="employee-refresh-button employee-reports__download"
            onClick={downloadReportCsv}
            disabled={!report || reportQuery.isError}
            data-testid="button-download-employee-report"
          >
            <Download size={15} aria-hidden="true" />
            Unduh CSV
          </button>
          <button
            type="button"
            className="employee-refresh-button"
            onClick={() => void reportQuery.refetch()}
            disabled={reportQuery.isFetching || !rangeIsValid}
            data-testid="button-refresh-employee-reports"
          >
            <RefreshCw size={15} aria-hidden="true" className={reportQuery.isFetching ? 'is-spinning' : ''} />
            Perbarui laporan
          </button>
        </div>
      </section>

      <section className="employee-reports__filters" aria-label="Periode laporan">
        <div className="employee-reports__presets" role="group" aria-label="Pilih periode cepat">
          <button type="button" aria-pressed={rangePreset === '7'} onClick={() => setPreset(7)} data-testid="filter-report-7-days">7 hari</button>
          <button type="button" aria-pressed={rangePreset === '30'} onClick={() => setPreset(30)} data-testid="filter-report-30-days">30 hari</button>
          <button type="button" aria-pressed={rangePreset === 'custom'} onClick={() => setRangePreset('custom')} data-testid="filter-report-custom">Pilih tanggal</button>
        </div>
        <div className="employee-reports__date-fields">
          <label>
            <span>Dari</span>
            <input
              type="date"
              value={dateRange.fromDate}
              max={dateRange.toDate || undefined}
              onChange={(event) => {
                setRangePreset('custom');
                setDateRange((current) => ({ ...current, fromDate: event.target.value }));
              }}
              data-testid="input-report-from-date"
            />
          </label>
          <span className="employee-reports__date-separator" aria-hidden="true">—</span>
          <label>
            <span>Sampai</span>
            <input
              type="date"
              value={dateRange.toDate}
              min={dateRange.fromDate || undefined}
              onChange={(event) => {
                setRangePreset('custom');
                setDateRange((current) => ({ ...current, toDate: event.target.value }));
              }}
              data-testid="input-report-to-date"
            />
          </label>
        </div>
        <div className="employee-reports__select-fields">
          <label>
            <span>Kasir</span>
            <select value={registerFilter} onChange={(event) => setRegisterFilter(event.target.value as NonNullable<GetGgsEmployeeReportsParams['register']>)} data-testid="select-report-register">
              <option value="all">Semua kasir</option>
              <option value="ggs_beauty">GGS Beauty</option>
              <option value="barber_ggs">Barber GGS</option>
            </select>
          </label>
          <label>
            <span>Metode bayar</span>
            <select value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value as NonNullable<GetGgsEmployeeReportsParams['paymentMethod']>)} data-testid="select-report-payment-method">
              <option value="all">Semua metode</option>
              <option value="cash">Tunai</option>
              <option value="qris">QRIS</option>
              <option value="card">Kartu</option>
            </select>
          </label>
        </div>
        <p className="employee-reports__note">Booking dihitung menurut tanggal jadwal dan tetap mencakup semua booking. Filter kasir/metode hanya memengaruhi transaksi. Pendapatan mencakup transaksi selesai setelah diskon dan termasuk pajak.</p>
      </section>

      {!rangeIsValid ? (
        <div className="employee-reports__state" role="alert" data-testid="status-employee-reports-invalid-range">
          Tanggal awal harus sebelum atau sama dengan tanggal akhir.
        </div>
      ) : null}

      <section className="employee-reports__metrics" aria-label="Ringkasan periode laporan">
        <article><span>TOTAL TERBAYAR</span><strong>{report ? formatRupiah(report.totalCollected) : reportQuery.isLoading ? '…' : '—'}</strong></article>
        <article>
          <span>TRANSAKSI SELESAI</span>
          <strong>{report ? report.completedTransactionCount.toLocaleString('id-ID') : reportQuery.isLoading ? '…' : '—'}</strong>
          {report ? <small>{report.cancelledTransactionCount.toLocaleString('id-ID')} dibatalkan</small> : null}
        </article>
        <article>
          <span>BOOKING TERJADWAL</span>
          <strong>{report ? report.bookingCount.toLocaleString('id-ID') : reportQuery.isLoading ? '…' : '—'}</strong>
          {report ? <small>{report.completedBookingCount.toLocaleString('id-ID')} selesai · {report.cancelledBookingCount.toLocaleString('id-ID')} batal</small> : null}
        </article>
        <article><span>RATA-RATA TRANSAKSI</span><strong>{report ? formatRupiah(report.averageTransactionValue) : reportQuery.isLoading ? '…' : '—'}</strong></article>
      </section>

      {reportQuery.isLoading ? (
        <div className="employee-reports__skeleton" role="status" aria-label="Memuat laporan">
          <span /><span /><span />
        </div>
      ) : reportQuery.isError && rangeIsValid ? (
        <div className="employee-reports__state employee-reports__state--error" role="alert" data-testid="status-employee-reports-error">
          <div><strong>Laporan belum dapat dimuat.</strong><p>{cashierErrorMessage(reportQuery.error, 'Periksa koneksi lalu coba lagi.')}</p></div>
          <button type="button" onClick={() => void reportQuery.refetch()} disabled={reportQuery.isFetching}>Coba lagi</button>
        </div>
      ) : report ? (
        hasActivity ? (
          <div className="employee-reports__sections">
            <section className="employee-reports__panel" aria-labelledby="employee-report-payment-title">
              <div className="employee-reports__panel-heading">
                <div><h2 id="employee-report-payment-title">Metode pembayaran</h2><p>Transaksi yang selesai pada periode ini.</p></div>
              </div>
              <div className="employee-reports__payment-list">
                {report.paymentMethods.length ? report.paymentMethods.map((method) => (
                  <div className="employee-reports__payment-row" key={method.paymentMethod} data-testid={`report-payment-${method.paymentMethod}`}>
                    <span>{reportPaymentLabels[method.paymentMethod]}</span>
                    <small>{method.transactionCount.toLocaleString('id-ID')} transaksi</small>
                    <strong>{formatRupiah(method.totalCollected)}</strong>
                  </div>
                )) : <p className="employee-reports__muted">Belum ada transaksi selesai.</p>}
              </div>
            </section>

            <section className="employee-reports__panel" aria-labelledby="employee-report-daily-title">
              <div className="employee-reports__panel-heading">
                <div><h2 id="employee-report-daily-title">Rincian harian</h2><p>Booking mengikuti tanggal jadwal; transaksi mengikuti tanggal pembayaran.</p></div>
              </div>
              <div className="employee-reports__table-wrap">
                <table className="employee-reports__table">
                  <thead><tr><th scope="col">Tanggal</th><th scope="col">Booking</th><th scope="col">Selesai</th><th scope="col">Batal</th><th scope="col">Transaksi</th><th scope="col">Total terbayar</th></tr></thead>
                  <tbody>
                    {report.daily.map((day) => (
                      <tr key={day.date} data-testid={`report-daily-${dateKey(day.date)}`}>
                        <th scope="row">{displayDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' })}</th>
                        <td>{day.bookingCount.toLocaleString('id-ID')}</td>
                        <td>{day.completedBookingCount.toLocaleString('id-ID')}</td>
                        <td>{day.cancelledBookingCount.toLocaleString('id-ID')}</td>
                        <td>{day.transactionCount.toLocaleString('id-ID')}</td>
                        <td>{formatRupiah(day.totalCollected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <div className="employee-reports__state" data-testid="status-employee-reports-empty">
            <strong>Belum ada aktivitas pada periode ini.</strong>
            <p>Booking terjadwal dan transaksi yang selesai atau dibatalkan akan tercatat di sini.</p>
          </div>
        )
      ) : null}
    </div>
  );
}

type EmployeeCustomerSummary = {
  key: string;
  name: string;
  phone: string;
  bookingCount: number;
  latestBooking: GgsEmployeeBooking;
  serviceNames: string[];
  history: GgsEmployeeBooking[];
};

function EmployeeCustomersPage({
  bookings,
  isLoading,
  isError,
  isRefreshing,
  onRefresh,
}: {
  bookings: GgsEmployeeBooking[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<EmployeeCustomerSummary | null>(null);

  useEffect(() => {
    if (!selectedCustomer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedCustomer(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCustomer]);

  const customers = useMemo(() => {
    const byIdentity = new Map<string, {
      key: string;
      name: string;
      phone: string;
      bookingCount: number;
      latestBooking: GgsEmployeeBooking;
      latestBookingKey: string;
      serviceNames: Set<string>;
      history: GgsEmployeeBooking[];
    }>();

    for (const booking of bookings) {
      const normalizedPhone = booking.phone.replace(/\D/g, '');
      const normalizedName = booking.customerName.trim().toLocaleLowerCase('id-ID');
      const key = normalizedPhone ? `phone:${normalizedPhone}` : `name:${normalizedName}`;
      const bookingKey = `${dateKey(booking.appointmentDate)} ${booking.appointmentTime}`;
      const existing = byIdentity.get(key);

      if (!existing) {
        byIdentity.set(key, {
          key,
          name: booking.customerName,
          phone: booking.phone,
          bookingCount: 1,
          latestBooking: booking,
          latestBookingKey: bookingKey,
          serviceNames: new Set([booking.serviceName]),
          history: [booking],
        });
        continue;
      }

      existing.bookingCount += 1;
      existing.serviceNames.add(booking.serviceName);
      existing.history.push(booking);
      if (bookingKey > existing.latestBookingKey) {
        existing.name = booking.customerName;
        existing.phone = booking.phone;
        existing.latestBooking = booking;
        existing.latestBookingKey = bookingKey;
      }
    }

    return Array.from(byIdentity.values())
      .map(({ latestBookingKey: _latestBookingKey, serviceNames, ...customer }) => ({
        ...customer,
        serviceNames: Array.from(serviceNames),
      }))
      .sort((first, second) => {
        const firstKey = `${dateKey(first.latestBooking.appointmentDate)} ${first.latestBooking.appointmentTime}`;
        const secondKey = `${dateKey(second.latestBooking.appointmentDate)} ${second.latestBooking.appointmentTime}`;
        return secondKey.localeCompare(firstKey);
      });
  }, [bookings]);

  const query = search.trim().toLocaleLowerCase('id-ID');
  const visibleCustomers = customers.filter((customer) =>
    !query || `${customer.name} ${customer.phone} ${customer.serviceNames.join(' ')}`
      .toLocaleLowerCase('id-ID')
      .includes(query),
  );
  const metricValue = (value: number) => isLoading || isError ? '—' : value.toLocaleString('id-ID');
  const returningCustomers = customers.filter((customer) => customer.bookingCount > 1).length;

  return (
    <div className="employee-schedule__content employee-customers" data-testid="page-employee-customers">
      <section className="employee-schedule__heading employee-customers__heading">
        <div>
          <p className="employee-kicker">DATA PELANGGAN</p>
          <h1>Pelanggan <em>studio.</em></h1>
          <p className="employee-schedule__welcome">Ringkasan pelanggan berdasarkan riwayat booking yang masuk ke studio.</p>
        </div>
        <button
          type="button"
          className="employee-refresh-button"
          onClick={onRefresh}
          disabled={isRefreshing}
          data-testid="button-refresh-employee-customers"
        >
          <RefreshCw size={15} aria-hidden="true" className={isRefreshing ? 'is-spinning' : ''} />
          Perbarui data
        </button>
      </section>

      <section className="employee-customers__metrics" aria-label="Ringkasan pelanggan">
        <article><span>PELANGGAN UNIK</span><strong>{metricValue(customers.length)}</strong></article>
        <article><span>TOTAL BOOKING</span><strong>{metricValue(bookings.length)}</strong></article>
        <article><span>BOOKING BERULANG</span><strong>{metricValue(returningCustomers)}</strong></article>
      </section>

      <section className="employee-customers__panel" aria-label="Daftar pelanggan">
        <div className="employee-customers__toolbar">
          <div className="employee-bookings__title">
            <h2>Daftar pelanggan</h2>
            <span>{isLoading || isError ? '—' : `${visibleCustomers.length} tampil`}</span>
          </div>
          <label className="employee-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Cari pelanggan</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, telepon, layanan"
              data-testid="input-search-employee-customers"
            />
          </label>
        </div>

        {isLoading ? (
          <EmployeeBookingsSkeleton />
        ) : isError ? (
          <div className="employee-bookings__error" role="alert" data-testid="status-employee-customers-error">
            <div><strong>Data pelanggan belum dapat dimuat.</strong><p>Periksa koneksi, lalu coba perbarui data.</p></div>
            <button type="button" onClick={onRefresh} disabled={isRefreshing}>Coba lagi</button>
          </div>
        ) : visibleCustomers.length ? (
          <div className="employee-customers__table-wrap">
            <table className="employee-customers__table">
              <thead><tr><th>Pelanggan</th><th>Telepon</th><th>Booking</th><th>Booking terakhir</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {visibleCustomers.map((customer) => (
                  <tr key={customer.key} data-testid={`row-employee-customer-${customer.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`}>
                    <td>
                      <button
                        type="button"
                        className="employee-customers__name-button"
                        onClick={() => setSelectedCustomer(customer)}
                        data-testid={`button-employee-customer-history-${customer.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                      >
                        <strong>{customer.name}</strong>
                        <small>{customer.latestBooking.serviceName}</small>
                      </button>
                    </td>
                    <td>{customer.phone ? <a href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}>{customer.phone}</a> : '—'}</td>
                    <td>{customer.bookingCount}</td>
                    <td><strong>{displayDate(customer.latestBooking.appointmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}</strong><small>{customer.latestBooking.appointmentTime}</small></td>
                    <td><span className={`employee-status employee-status--${customer.latestBooking.status}`}>{statusLabels[customer.latestBooking.status] ?? customer.latestBooking.status}</span></td>
                    <td><button type="button" className="employee-customers__detail-button" onClick={() => setSelectedCustomer(customer)}>Riwayat</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="employee-bookings__empty" data-testid="status-employee-customers-empty">
            <div className="employee-bookings__empty-mark"><UsersRound size={21} aria-hidden="true" /></div>
            <h3>{customers.length ? 'Tidak ada pelanggan yang cocok.' : 'Belum ada data pelanggan.'}</h3>
            <p>{customers.length ? 'Coba kata pencarian lain.' : 'Pelanggan akan tercatat setelah booking masuk ke studio.'}</p>
          </div>
        )}
      </section>

      {selectedCustomer && (
        <div
          className="employee-customer-detail-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedCustomer(null);
          }}
        >
          <section
            className="employee-customer-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-customer-detail-title"
            data-testid="dialog-employee-customer-history"
          >
            <header className="employee-customer-detail__header">
              <div>
                <span>PROFIL PELANGGAN</span>
                <h2 id="employee-customer-detail-title">{selectedCustomer.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedCustomer(null)} aria-label="Tutup riwayat pelanggan" data-testid="button-close-employee-customer-history">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <dl className="employee-customer-detail__facts">
              <div>
                <dt>Telepon</dt>
                <dd>{selectedCustomer.phone ? <a href={`tel:${selectedCustomer.phone.replace(/[^\d+]/g, '')}`}>{selectedCustomer.phone}</a> : 'Belum tersedia'}</dd>
              </div>
              <div>
                <dt>Total booking</dt>
                <dd>{selectedCustomer.bookingCount.toLocaleString('id-ID')}</dd>
              </div>
              <div>
                <dt>Kunjungan terakhir</dt>
                <dd>{displayDate(selectedCustomer.latestBooking.appointmentDate, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              </div>
              <div>
                <dt>Layanan tercatat</dt>
                <dd>{selectedCustomer.serviceNames.join(', ')}</dd>
              </div>
            </dl>

            <section className="employee-customer-detail__history" aria-labelledby="employee-customer-history-title">
              <div className="employee-customer-detail__section-heading">
                <h3 id="employee-customer-history-title">Riwayat booking</h3>
                <span>{selectedCustomer.history.length} kunjungan</span>
              </div>
              <ol>
                {[...selectedCustomer.history]
                  .sort((first, second) => {
                    const firstKey = `${dateKey(first.appointmentDate)} ${first.appointmentTime}`;
                    const secondKey = `${dateKey(second.appointmentDate)} ${second.appointmentTime}`;
                    return secondKey.localeCompare(firstKey);
                  })
                  .map((booking) => (
                    <li key={booking.id}>
                      <div className="employee-customer-detail__visit-date">
                        <strong>{displayDate(booking.appointmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                        <span>{booking.appointmentTime}</span>
                      </div>
                      <div className="employee-customer-detail__visit-copy">
                        <strong>{booking.serviceName}</strong>
                        {booking.notes.trim() ? <p>{booking.notes}</p> : null}
                      </div>
                      <span className={`employee-status employee-status--${booking.status}`}>{statusLabels[booking.status] ?? booking.status}</span>
                    </li>
                  ))}
              </ol>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}

export function EmployeeSignInPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLoginGgsEmployee();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const variables: LoginGgsEmployeeMutationVariables = {
      data: {
        employeeId: employeeId.trim(),
        password,
      },
    };
    login.mutate(variables, {
      onSuccess: async () => {
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceTodayQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceHistoryQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey(), exact: true });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
        ]);
        setLocation(employeeNextPath());
      },
      onError: (error) => setFormError(employeeErrorMessage(error)),
    });
  };

  return (
    <main className="employee-workspace employee-sign-in" data-testid="page-employee-sign-in">
      <header className="employee-topbar">
        <Link href="/" className="employee-brand" data-testid="link-employee-home">
          <span className="employee-brand__mark" aria-hidden="true">G</span>
          <span><strong>GGS</strong><small>HAIR STUDIO</small></span>
        </Link>
        <span className="employee-topbar__label">RUANG KERJA / KARYAWAN</span>
      </header>

      <div className="employee-sign-in__layout">
        <section className="employee-sign-in__intro">
          <div className="employee-sign-in__ornament" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>Kerja rapi.<br /><em>Studio siap.</em></h1>
          <p>Masuk untuk membuka ruang kerja karyawan dan melanjutkan absensi.</p>
          <div className="employee-sign-in__privacy">
            <ShieldCheck size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>Area khusus tim GGS. Informasi booking ditampilkan untuk kebutuhan operasional.</span>
          </div>
          <Link href="/sign-in" className="employee-back-link" data-testid="link-employee-customer-sign-in">
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali ke masuk pelanggan
          </Link>
        </section>

        <section className="employee-login-card" aria-labelledby="employee-login-title">
          <div className="employee-login-card__heading">
            <span className="employee-login-card__icon"><UserRound size={18} aria-hidden="true" /></span>
            <div>
              <p className="employee-kicker">GGS / TEAM ACCESS</p>
              <h2 id="employee-login-title">Masuk karyawan</h2>
            </div>
          </div>
          <form className="employee-login-form" onSubmit={submitLogin}>
            <label htmlFor="employee-id">ID karyawan</label>
            <input
              id="employee-id"
              name="employeeId"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              minLength={2}
              maxLength={32}
              required
              placeholder="Masukkan ID karyawan"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              data-testid="input-employee-id"
            />
            <label htmlFor="employee-password">Kata sandi</label>
            <input
              id="employee-password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              required
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="input-employee-password"
            />
            {(formError || login.isError) && (
              <p className="employee-form-error" role="alert" data-testid="status-employee-login-error">
                {formError || 'Tidak dapat masuk. Silakan coba lagi.'}
              </p>
            )}
            <button className="employee-primary-button" type="submit" disabled={login.isPending} data-testid="button-employee-sign-in">
              <span>{login.isPending ? 'Memeriksa akses…' : 'Masuk ke jadwal'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>

      <footer className="employee-page-footer">
        <span>GGS HAIR STUDIO</span>
        <span>INTERNAL / STAFF ONLY</span>
      </footer>
      <EmployeeFooterTabbar />
    </main>
  );
}

function CashierAnnouncementStrip({
  query,
  announcements,
}: {
  query: ReturnType<typeof useGetGgsEmployeeCashierAnnouncements>;
  announcements: GgsCashierAnnouncement[];
}) {
  const formatRange = (item: GgsCashierAnnouncement) => {
    if (!item.startsAt && !item.expiresAt) return 'Tanpa batas tanggal';
    if (item.startsAt && item.expiresAt) return `${displayDate(item.startsAt, { day: 'numeric', month: 'short' })} – ${displayDate(item.expiresAt, { day: 'numeric', month: 'short' })}`;
    return item.startsAt
      ? `Mulai ${displayDate(item.startsAt, { day: 'numeric', month: 'short' })}`
      : `Sampai ${displayDate(item.expiresAt!, { day: 'numeric', month: 'short' })}`;
  };
  return (
    <section className="cashier-announcements" aria-labelledby="cashier-announcements-title" data-testid="cashier-announcements">
      <div className="cashier-announcements__heading">
        <span className="cashier-announcements__icon"><Megaphone size={17} aria-hidden="true" /></span>
        <div><span>INFO UNTUK REGISTER</span><h2 id="cashier-announcements-title">Pengumuman studio</h2></div>
        <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Perbarui pengumuman kasir" data-testid="button-refresh-cashier-announcements">
          <RefreshCw size={14} className={query.isFetching ? 'is-spinning' : ''} aria-hidden="true" />
          <span>{query.isFetching ? 'Memperbarui' : 'Perbarui'}</span>
        </button>
      </div>
      {query.isLoading ? (
        <div className="cashier-announcements__skeleton" role="status" aria-label="Memuat pengumuman"><i /><i /></div>
      ) : query.isError ? (
        <div className="cashier-announcements__state cashier-announcements__state--error" role="alert">
          <div><strong>Pengumuman belum dapat dimuat.</strong><span>Periksa koneksi lalu coba lagi.</span></div>
          <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} data-testid="button-retry-cashier-announcements">{query.isFetching ? 'Memuat…' : 'Coba lagi'}</button>
        </div>
      ) : announcements.length ? (
        <div className="cashier-announcements__list">
          {announcements.map((item) => <article className={`cashier-announcement cashier-announcement--${item.category}`} key={item.id} data-testid={`announcement-cashier-${item.id}`}>
            <span className="cashier-announcement__marker" aria-hidden="true" />
            <div className="cashier-announcement__copy">
              <div className="cashier-announcement__meta"><span>{item.category === 'promo' ? 'PROMO' : 'INFORMASI'}</span><small>{formatRange(item)}</small></div>
              <h3>{item.title}</h3><p>{item.message}</p>
            </div>
          </article>)}
        </div>
      ) : (
        <div className="cashier-announcements__empty" data-testid="empty-cashier-announcements">
          <span>Belum ada pengumuman aktif.</span><small>Info baru dari studio akan tampil di sini.</small>
        </div>
      )}
    </section>
  );
}

function EmployeeBookingsSkeleton() {
  return (
    <div className="employee-bookings-skeleton" role="status" aria-label="Memuat jadwal booking">
      <span />
      <span />
      <span />
    </div>
  );
}

type EmployeeBookingStatusAction = Extract<GgsEmployeeBooking['status'], 'confirmed' | 'completed' | 'cancelled'>;

function BookingCard({
  booking,
  onStatusChange,
  isUpdating = false,
}: {
  booking: GgsEmployeeBooking;
  onStatusChange?: (booking: GgsEmployeeBooking, status: EmployeeBookingStatusAction) => void;
  isUpdating?: boolean;
}) {
  return (
    <article className="employee-booking-card" data-testid={`card-employee-booking-${booking.id}`}>
      <div className="employee-booking-card__time">
        <span>{booking.appointmentTime}</span>
        <small>{displayDate(booking.appointmentDate, { day: 'numeric', month: 'short' })}</small>
      </div>
      <div className="employee-booking-card__main">
        <div className="employee-booking-card__title">
          <div>
            <h3>{booking.customerName}</h3>
            <p>{booking.serviceName}</p>
          </div>
          <span className={`employee-status employee-status--${booking.status}`}>{statusLabels[booking.status] ?? booking.status}</span>
        </div>
        <div className="employee-booking-card__details">
          <span><Clock3 size={14} aria-hidden="true" /> {booking.phone}</span>
          {booking.notes.trim() && <p>{booking.notes}</p>}
        </div>
        {onStatusChange && (booking.status === 'pending' || booking.status === 'confirmed') ? (
          <div className="employee-booking-card__actions" role="group" aria-label={`Aksi booking ${booking.customerName}`}>
            {booking.status === 'pending' ? (
              <button
                type="button"
                className="employee-booking-card__confirm"
                onClick={() => onStatusChange(booking, 'confirmed')}
                disabled={isUpdating}
                data-testid={`button-confirm-booking-${booking.id}`}
              >
                {isUpdating ? 'Menyimpan…' : 'Konfirmasi'}
              </button>
            ) : (
              <button
                type="button"
                className="employee-booking-card__confirm"
                onClick={() => onStatusChange(booking, 'completed')}
                disabled={isUpdating}
                data-testid={`button-complete-booking-${booking.id}`}
              >
                {isUpdating ? 'Menyimpan…' : 'Tandai selesai'}
              </button>
            )}
            <button
              type="button"
              className="employee-booking-card__cancel"
              onClick={() => onStatusChange(booking, 'cancelled')}
              disabled={isUpdating}
              data-testid={`button-cancel-booking-${booking.id}`}
            >
              Batalkan
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function employeePasswordError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return 'Kata sandi belum dapat diperbarui. Periksa kata sandi saat ini lalu coba lagi.';
}

function EmployeeProfilePage({ employee }: { employee: GgsEmployeeAccount }) {
  const queryClient = useQueryClient();
  const changePassword = useChangeGgsEmployeePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSuccess('');
    if (newPassword.length < 8) {
      setFormError('Kata sandi baru minimal 8 karakter.');
      return;
    }
    if (newPassword.length > 128) {
      setFormError('Kata sandi baru maksimal 128 karakter.');
      return;
    }
    if (newPassword !== confirmation) {
      setFormError('Konfirmasi kata sandi belum sama.');
      return;
    }
    try {
      await changePassword.mutateAsync({ data: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setSuccess('Kata sandi berhasil diperbarui. Masuk kembali ke kasir untuk melanjutkan.');
      await queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey() });
    } catch (error) {
      setFormError(employeePasswordError(error));
    }
  };

  const createdDate = new Date(employee.createdAt);
  const createdLabel = Number.isNaN(createdDate.getTime())
    ? employee.createdAt
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(createdDate);

  return (
    <div className="employee-profile" data-testid="page-employee-profile">
      <section className="employee-profile__heading">
        <div>
          <p className="employee-kicker">AKUN KARYAWAN</p>
          <h1>Profil <em>akun.</em></h1>
          <p>Periksa detail akun dan perbarui kata sandi Anda.</p>
        </div>
        <span className={`employee-profile__status${employee.active ? '' : ' employee-profile__status--inactive'}`}>
          <span aria-hidden="true" />{employee.active ? 'Akun aktif' : 'Akun tidak aktif'}
        </span>
      </section>

      <div className="employee-profile__grid">
        <section className="employee-profile__card" aria-labelledby="employee-profile-details-title">
          <div className="employee-profile__card-heading">
            <div><p className="employee-kicker">INFORMASI AKUN</p><h2 id="employee-profile-details-title">Detail karyawan</h2></div>
          </div>
          <dl className="employee-profile__details">
            <div><dt>Nama</dt><dd data-testid="text-employee-profile-name">{employee.name}</dd></div>
            <div><dt>ID karyawan</dt><dd data-testid="text-employee-profile-id">{employee.employeeId}</dd></div>
            <div><dt>ID akun</dt><dd data-testid="text-employee-profile-account-id">{employee.id}</dd></div>
            <div><dt>Akun dibuat</dt><dd data-testid="text-employee-profile-created">{createdLabel}</dd></div>
          </dl>
          <p className="employee-profile__note">Nama dan ID karyawan dikelola oleh administrator. Hubungi pengelola studio jika detail ini perlu diperbaiki.</p>
        </section>

        <section className="employee-profile__card employee-profile__security" aria-labelledby="employee-profile-password-title">
          <div className="employee-profile__card-heading">
            <div><p className="employee-kicker">KEAMANAN</p><h2 id="employee-profile-password-title">Ubah kata sandi</h2></div>
            <LockKeyhole size={18} aria-hidden="true" />
          </div>
          <form className="employee-profile__form" onSubmit={submitPasswordChange}>
            <input
              className="employee-profile__username"
              type="text"
              name="username"
              autoComplete="username"
              value={employee.employeeId}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
            />
            <label htmlFor="employee-profile-current-password">Kata sandi saat ini</label>
            <input id="employee-profile-current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setFormError(''); setSuccess(''); }} data-testid="input-employee-current-password" />
            <label htmlFor="employee-profile-new-password">Kata sandi baru</label>
            <input id="employee-profile-new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setFormError(''); setSuccess(''); }} aria-describedby="employee-profile-password-help" data-testid="input-employee-new-password" />
            <label htmlFor="employee-profile-confirm-password">Konfirmasi kata sandi baru</label>
            <input id="employee-profile-confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setFormError(''); setSuccess(''); }} data-testid="input-employee-confirm-password" />
            <p className="employee-profile__hint" id="employee-profile-password-help">Gunakan 8–128 karakter. Kasir akan terkunci setelah kata sandi diperbarui.</p>
            {formError && <p className="employee-profile__feedback employee-profile__feedback--error" role="alert" data-testid="status-employee-password-error">{formError}</p>}
            {success && <p className="employee-profile__feedback" role="status" data-testid="status-employee-password-success">{success}</p>}
            <button className="employee-primary-button" type="submit" disabled={changePassword.isPending} data-testid="button-change-employee-password">
              <span>{changePassword.isPending ? 'Memperbarui…' : 'Simpan kata sandi'}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export function EmployeeSchedulePage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = useGetGgsEmployeeSession({
    query: {
      queryKey: getGetGgsEmployeeSessionQueryKey(),
      retry: false,
      staleTime: 0,
    },
  });
  const bookings = useGetGgsEmployeeBookings({
    query: {
      queryKey: getGetGgsEmployeeBookingsQueryKey(),
      enabled: Boolean(session.isSuccess && session.data?.active),
      retry: false,
      staleTime: 0,
    },
  });
  const logout = useLogoutGgsEmployee();
  const updateBookingStatus = useUpdateGgsEmployeeBookingStatus();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [logoutError, setLogoutError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [bookingStatusError, setBookingStatusError] = useState('');
  const [bookingStatusSuccess, setBookingStatusSuccess] = useState('');
  const [savingBookingId, setSavingBookingId] = useState<number | null>(null);
  const [pendingBookingCancellation, setPendingBookingCancellation] = useState<GgsEmployeeBooking | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COMPACT_EMPLOYEE_LAYOUT_QUERY).matches,
  );
  useEffect(() => {
    const compactLayout = window.matchMedia(COMPACT_EMPLOYEE_LAYOUT_QUERY);
    const syncSidebarWithViewport = (event: MediaQueryListEvent) => setSidebarCollapsed(event.matches);
    compactLayout.addEventListener('change', syncSidebarWithViewport);
    return () => compactLayout.removeEventListener('change', syncSidebarWithViewport);
  }, []);
  const normalizedLocation = location.length > 1 ? location.replace(/\/+$/, '') : location;
  const matchedMenu = employeeMenuItems.find((item) => item.href === normalizedLocation);
  const currentMenu = matchedMenu ?? employeeMenuItems[0];
  const employeeRouteNotFound = !matchedMenu;
  const authenticated = Boolean(session.isSuccess && session.data?.active);

  const sortedBookings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return [...(bookings.data ?? [])]
      .filter((booking) => {
        const matchesSearch = !query || `${booking.customerName} ${booking.phone} ${booking.serviceName}`.toLocaleLowerCase('id-ID').includes(query);
        const today = isSameDayAsJakarta(booking.appointmentDate);
        const matchesDate = dateFilter === 'all' || (dateFilter === 'today' && today) || (dateFilter === 'upcoming' && dateKey(booking.appointmentDate) >= new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date()));
        return matchesSearch && matchesDate;
      })
      .sort((first, second) => `${dateKey(first.appointmentDate)} ${first.appointmentTime}`.localeCompare(`${dateKey(second.appointmentDate)} ${second.appointmentTime}`));
  }, [bookings.data, dateFilter, search]);

  const refreshSchedule = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
    ]);
    setRefreshing(false);
  };

  const saveBookingStatus = async (
    booking: GgsEmployeeBooking,
    status: EmployeeBookingStatusAction,
  ) => {
    setBookingStatusError('');
    setBookingStatusSuccess('');
    setSavingBookingId(booking.id);
    try {
      const updated = await updateBookingStatus.mutateAsync({
        appointmentId: booking.id,
        data: { status },
      });
      queryClient.setQueryData<GgsEmployeeBooking[]>(
        getGetGgsEmployeeBookingsQueryKey(),
        (current) => current?.map((item) => item.id === updated.id ? updated : item),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeReportsQueryKey() }),
      ]);
      setPendingBookingCancellation(null);
      setBookingStatusSuccess(
        status === 'confirmed'
          ? 'Booking berhasil dikonfirmasi.'
          : status === 'completed'
            ? 'Booking ditandai selesai.'
            : 'Booking berhasil dibatalkan.',
      );
    } catch (error) {
      setBookingStatusError(cashierErrorMessage(
        error,
        'Status booking belum dapat diperbarui. Muat ulang jadwal lalu coba lagi.',
      ));
    } finally {
      setSavingBookingId(null);
    }
  };

  const requestBookingStatusChange = (
    booking: GgsEmployeeBooking,
    status: EmployeeBookingStatusAction,
  ) => {
    setBookingStatusError('');
    setBookingStatusSuccess('');
    if (status === 'cancelled') {
      setPendingBookingCancellation(booking);
      return;
    }
    void saveBookingStatus(booking, status);
  };

  const signOut = () => {
    setLogoutError('');
    logout.mutate(undefined, {
      onSuccess: async () => {
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceTodayQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceHistoryQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey(), exact: true });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
        ]);
        setLocation('/employee/sign-in');
      },
      onError: () => setLogoutError('Belum dapat keluar. Periksa koneksi lalu coba lagi.'),
    });
  };

  const needsSignIn = session.isError || (session.isSuccess && !session.data.active);
  const closeSidebarAfterNavigation = () => {
    if (window.matchMedia(COMPACT_EMPLOYEE_LAYOUT_QUERY).matches) setSidebarCollapsed(true);
  };

  return (
    <main className={`employee-workspace employee-schedule employee-cms${sidebarCollapsed ? ' employee-cms--collapsed' : ''}`} data-testid="page-employee-schedule">
      {authenticated && (
        <>
          <aside
            id="employee-workspace-nav"
            className={`employee-cms__sidebar${sidebarCollapsed ? ' employee-cms__sidebar--collapsed' : ''}`}
            aria-label="Navigasi karyawan"
            data-testid="employee-sidebar"
          >
            <Link href="/employee/overview" className="employee-sidebar__brand" aria-label="GGS workspace">
              <span className="employee-brand__mark" aria-hidden="true">G</span>
              <span className="employee-sidebar__brand-copy"><strong>GGS</strong><small>HAIR STUDIO</small></span>
            </Link>
            <nav className="employee-sidebar__nav">
              {employeeMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = !employeeRouteNotFound && currentMenu.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`employee-sidebar__item${isActive ? ' employee-sidebar__item--active' : ''}`}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={closeSidebarAfterNavigation}
                    data-testid={`link-employee-menu-${item.href.split('/').pop()}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="employee-sidebar__account" title={session.data?.name}>
              <span className="employee-sidebar__avatar" aria-hidden="true">
                {session.data?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <span className="employee-sidebar__account-copy">
                <strong>{session.data?.name}</strong>
                <small>ID {session.data?.employeeId}</small>
              </span>
            </div>
          </aside>
          {!sidebarCollapsed && (
            <button
              type="button"
              className="employee-sidebar-backdrop"
              aria-label="Tutup menu"
              onClick={() => setSidebarCollapsed(true)}
            />
          )}
        </>
      )}

      <div className="employee-cms__main">
        <header className="employee-schedule__topbar employee-cms__topbar">
          {authenticated ? (
            <>
              <button
                type="button"
                className="employee-menu-toggle"
                aria-label={sidebarCollapsed ? 'Tampilkan menu' : 'Sembunyikan menu'}
                aria-controls="employee-workspace-nav"
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                data-testid="button-employee-sidebar-toggle"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <div className="employee-cms__breadcrumb">
                <strong>{employeeRouteNotFound ? 'Halaman tidak ditemukan' : currentMenu.label}</strong>
              </div>
            </>
          ) : (
            <Link href="/" className="employee-brand" data-testid="link-schedule-home">
              <span className="employee-brand__mark" aria-hidden="true">G</span>
              <span><strong>GGS</strong><small>HAIR STUDIO</small></span>
            </Link>
          )}
          <div className="employee-schedule__topbar-actions">
            <button type="button" className="employee-logout-button" onClick={signOut} disabled={logout.isPending || needsSignIn} data-testid="button-employee-sign-out">
              <LogOut size={15} aria-hidden="true" />
              {logout.isPending ? 'Keluar…' : 'Keluar'}
            </button>
          </div>
        </header>

        {session.isLoading ? (
          <div className="employee-schedule__loading">
            <div className="employee-schedule__loading-line" />
            <EmployeeBookingsSkeleton />
          </div>
        ) : needsSignIn ? (
          <section className="employee-protected-message" role="alert" data-testid="status-employee-session-required">
            <span className="employee-protected-message__icon"><ShieldCheck size={20} aria-hidden="true" /></span>
            <div>
              <p className="employee-kicker">SESI TIDAK AKTIF</p>
              <h1>Masuk untuk melanjutkan.</h1>
              <p>Ruang kerja dan absensi hanya tersedia untuk karyawan yang sudah masuk.</p>
            </div>
            <Link
              href={`/employee/sign-in?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`}
              className="employee-primary-button"
              data-testid="link-schedule-sign-in"
            >
              Masuk karyawan <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        ) : employeeRouteNotFound ? (
          <section className="employee-protected-message" role="status" data-testid="page-employee-not-found">
            <span className="employee-protected-message__icon"><ShieldCheck size={20} aria-hidden="true" /></span>
            <div>
              <p className="employee-kicker">HALAMAN TIDAK DITEMUKAN</p>
              <h1>Alamat ini tidak tersedia.</h1>
              <p>Pilih menu karyawan yang tersedia untuk melanjutkan.</p>
            </div>
            <Link href="/employee/overview" className="employee-primary-button" data-testid="link-employee-not-found-home">
              Kembali ke ringkasan <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        ) : currentMenu.href === '/employee/overview' ? (
          <EmployeeOverview
            employeeName={session.data?.name ?? 'Karyawan'}
            bookings={bookings.data ?? []}
            isLoading={bookings.isLoading}
            isError={bookings.isError}
            onRetry={() => void refreshSchedule()}
          />
        ) : currentMenu.href === '/employee/schedule' ? (
          <div className="employee-schedule__content">
            <section className="employee-schedule__heading">
              <div>
                <p className="employee-kicker">AGENDA STUDIO</p>
                <h1>Jadwal <em>studio.</em></h1>
                <p className="employee-schedule__welcome">Halo, {session.data?.name} <span>· ID {session.data?.employeeId}</span>. Berikut seluruh booking studio yang perlu diperhatikan.</p>
              </div>
              <button
                type="button"
                className="employee-refresh-button"
                onClick={refreshSchedule}
                disabled={refreshing || bookings.isFetching || session.isFetching}
                data-testid="button-refresh-employee-schedule"
              >
                <RefreshCw size={15} aria-hidden="true" className={refreshing || bookings.isFetching ? 'is-spinning' : ''} />
                Perbarui jadwal
              </button>
            </section>

            <section className="employee-schedule__summary" aria-label="Ringkasan jadwal">
              <div><span>BOOKING TERLIHAT</span><strong>{bookings.isLoading ? '—' : (bookings.data?.length ?? 0)}</strong></div>
              <p>Semua booking tampil untuk tim studio. Booking belum ditetapkan ke karyawan tertentu.</p>
            </section>

            {bookingStatusError ? <div className="employee-booking-action__feedback employee-booking-action__feedback--error" role="alert">{bookingStatusError}</div> : null}
            {bookingStatusSuccess ? <div className="employee-booking-action__feedback" role="status">{bookingStatusSuccess}</div> : null}

            <section className="employee-bookings" aria-label="Daftar booking studio">
              <div className="employee-bookings__toolbar">
                <div className="employee-bookings__title">
                  <h2>Agenda booking</h2>
                  <span>{sortedBookings.length} tampil</span>
                </div>
                <div className="employee-bookings__filters">
                  <label className="employee-search">
                    <Search size={15} aria-hidden="true" />
                    <span className="sr-only">Cari booking</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari nama, telepon, layanan"
                      data-testid="input-search-employee-bookings"
                    />
                  </label>
                  <label className="employee-date-filter">
                    <span className="sr-only">Filter tanggal booking</span>
                    <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as 'all' | 'today' | 'upcoming')} data-testid="select-employee-booking-date">
                      <option value="all">Semua tanggal</option>
                      <option value="today">Hari ini</option>
                      <option value="upcoming">Hari ini & berikutnya</option>
                    </select>
                  </label>
                </div>
              </div>

              {bookings.isLoading ? (
                <EmployeeBookingsSkeleton />
              ) : bookings.isError ? (
                <div className="employee-bookings__error" role="alert" data-testid="status-employee-bookings-error">
                  <div><strong>Jadwal belum dapat dimuat.</strong><p>Periksa koneksi, lalu coba perbarui data booking.</p></div>
                  <button type="button" onClick={refreshSchedule} disabled={refreshing}>Coba lagi</button>
                </div>
              ) : sortedBookings.length ? (
                <div className="employee-booking-list">
                  {sortedBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onStatusChange={requestBookingStatusChange}
                      isUpdating={savingBookingId === booking.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="employee-bookings__empty" data-testid="status-employee-bookings-empty">
                  <div className="employee-bookings__empty-mark"><CalendarDays size={21} aria-hidden="true" /></div>
                  <h3>{bookings.data?.length ? 'Tidak ada booking yang cocok.' : 'Belum ada booking.'}</h3>
                  <p>{bookings.data?.length ? 'Ubah kata pencarian atau filter tanggal untuk melihat agenda lain.' : 'Booking yang masuk ke studio akan muncul di halaman ini.'}</p>
                  {search || dateFilter !== 'all' ? <button type="button" onClick={() => { setSearch(''); setDateFilter('all'); }}>Hapus filter</button> : null}
                </div>
              )}
            </section>
          </div>
        ) : currentMenu.href === '/employee/attendance' ? (
          <EmployeeAttendancePage employeeName={session.data?.name ?? 'Karyawan'} />
        ) : currentMenu.href === '/employee/cashier' ? (
          <EmployeeCashierPage />
        ) : currentMenu.href === '/employee/customers' ? (
          <EmployeeCustomersPage
            bookings={bookings.data ?? []}
            isLoading={bookings.isLoading}
            isError={bookings.isError}
            isRefreshing={refreshing || bookings.isFetching}
            onRefresh={() => void refreshSchedule()}
          />
        ) : currentMenu.href === '/employee/stock' ? (
          <EmployeeStockPage />
        ) : currentMenu.href === '/employee/reports' ? (
          <EmployeeReportsPage />
        ) : currentMenu.href === '/employee/profile' ? (
          <EmployeeProfilePage employee={session.data!} />
        ) : null}

        {authenticated && pendingBookingCancellation ? (
          <div className="employee-booking-action__backdrop" role="presentation">
            <section className="employee-booking-action__dialog" role="dialog" aria-modal="true" aria-labelledby="employee-booking-cancel-title">
              <p className="employee-kicker">KONFIRMASI PEMBATALAN</p>
              <h2 id="employee-booking-cancel-title">Batalkan booking ini?</h2>
              <p>{pendingBookingCancellation.customerName} · {pendingBookingCancellation.serviceName} · {displayDate(pendingBookingCancellation.appointmentDate, { day: 'numeric', month: 'short' })}</p>
              <div>
                <button type="button" onClick={() => setPendingBookingCancellation(null)} disabled={savingBookingId !== null}>Kembali</button>
                <button
                  type="button"
                  onClick={() => void saveBookingStatus(pendingBookingCancellation, 'cancelled')}
                  disabled={savingBookingId !== null}
                  data-testid="button-confirm-booking-cancellation"
                >
                  {savingBookingId === pendingBookingCancellation.id ? 'Membatalkan…' : 'Ya, batalkan booking'}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {authenticated && logoutError && <p className="employee-form-error employee-schedule__logout-error" role="alert">{logoutError}</p>}
      </div>
      <EmployeeFooterTabbar />
    </main>
  );
}
