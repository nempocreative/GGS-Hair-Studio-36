import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, LayoutDashboard, LockKeyhole, LogOut, Menu, Minus, Package, Plus, Printer, QrCode, ReceiptText, RefreshCw, Search, ShieldCheck, ShoppingBag, Scissors, Store, Trash2, UserRound, UsersRound, X, Megaphone } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  getGetGgsEmployeeBookingsQueryKey,
  getGetGgsEmployeeAttendanceHistoryQueryKey,
  getGetGgsEmployeeAttendanceTodayQueryKey,
  getGetGgsEmployeeCashierSessionQueryKey,
  getGetGgsEmployeeCashierVouchersQueryKey,
  getGetGgsEmployeeCashierTransactionsQueryKey,
  getGetGgsEmployeeCashierAnnouncementsQueryKey,
  getGetGgsPublicProductsQueryKey,
  getGetGgsPublicServicesQueryKey,
  getGetGgsEmployeeSessionQueryKey,
  useGetGgsEmployeeBookings,
  useGetGgsEmployeeCashierSession,
  useGetGgsEmployeeCashierVouchers,
  useGetGgsEmployeeCashierTransactions,
  useGetGgsEmployeeCashierAnnouncements,
  useGetGgsPublicProducts,
  useGetGgsPublicServices,
  useCreateGgsEmployeeCashierTransaction,
  useCancelGgsEmployeeCashierTransaction,
  useGetGgsEmployeeSession,
  useLoginGgsEmployee,
  useLogoutGgsEmployeeCashier,
  useLogoutGgsEmployee,
  useUnlockGgsEmployeeCashier,
} from '@workspace/api-client-react';
import type { GetGgsEmployeeCashierTransactionsParams, GgsEmployeeBooking, GgsEmployeeCashierRegister, GgsEmployeeCashierTransaction, GgsEmployeeCashierTransactionInput, GgsEmployeeCashierVoucher, GgsCashierAnnouncement, LoginGgsEmployeeMutationVariables } from '@workspace/api-client-react';
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

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function isSameDayAsJakarta(value: string): boolean {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  return dateKey(value) === today;
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

const employeeMenuItems = [
  { href: '/employee/overview', label: 'Ringkasan', icon: LayoutDashboard, description: 'Ringkasan studio.' },
  { href: '/employee/schedule', label: 'Jadwal booking', icon: CalendarDays, description: 'Booking pelanggan yang masuk ke studio.' },
  { href: '/employee/attendance', label: 'Absensi', icon: Clock3, description: 'Pencatatan kehadiran tim karyawan.' },
  { href: '/employee/cashier', label: 'Kasir', icon: Banknote, description: 'Pencatatan transaksi layanan dan produk.' },
  { href: '/employee/customers', label: 'Pelanggan', icon: UsersRound, description: 'Informasi dan riwayat kunjungan pelanggan.' },
  { href: '/employee/stock', label: 'Stok produk', icon: Package, description: 'Pemantauan ketersediaan produk studio.' },
  { href: '/employee/reports', label: 'Laporan', icon: BarChart3, description: 'Rekap kegiatan dan performa studio.' },
] as const;

const cashierRegisters: {
  value: GgsEmployeeCashierRegister;
  label: string;
  description: string;
}[] = [
  { value: 'ggs_beauty', label: 'GGS Beauty', description: 'Kasir layanan kecantikan' },
  { value: 'barber_ggs', label: 'Barber GGS', description: 'Kasir layanan barber' },
];

type EmployeeMenuItem = (typeof employeeMenuItems)[number];

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

function EmployeeModulePlaceholder({ item }: { item: EmployeeMenuItem }) {
  const Icon = item.icon;

  return (
    <section className="employee-module-placeholder" data-testid={`employee-module-${item.href.split('/').pop()}`}>
      <div className="employee-module-placeholder__icon"><Icon size={21} aria-hidden="true" /></div>
      <p className="employee-kicker">MENU KARYAWAN</p>
      <h1>{item.label}</h1>
      <p>{item.description}</p>
      <span className="employee-module-placeholder__status">MENU BELUM AKTIF</span>
    </section>
  );
}

type EmployeeCustomerSummary = {
  key: string;
  name: string;
  phone: string;
  bookingCount: number;
  latestBooking: GgsEmployeeBooking;
  serviceNames: string[];
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
  const customers = useMemo(() => {
    const byIdentity = new Map<string, {
      key: string;
      name: string;
      phone: string;
      bookingCount: number;
      latestBooking: GgsEmployeeBooking;
      latestBookingKey: string;
      serviceNames: Set<string>;
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
        });
        continue;
      }

      existing.bookingCount += 1;
      existing.serviceNames.add(booking.serviceName);
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
              <thead><tr><th>Pelanggan</th><th>Telepon</th><th>Booking</th><th>Booking terakhir</th><th>Status</th></tr></thead>
              <tbody>
                {visibleCustomers.map((customer) => (
                  <tr key={customer.key} data-testid={`row-employee-customer-${customer.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`}>
                    <td><strong>{customer.name}</strong><small>{customer.latestBooking.serviceName}</small></td>
                    <td>{customer.phone ? <a href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}>{customer.phone}</a> : '—'}</td>
                    <td>{customer.bookingCount}</td>
                    <td><strong>{displayDate(customer.latestBooking.appointmentDate, { day: 'numeric', month: 'short', year: 'numeric' })}</strong><small>{customer.latestBooking.appointmentTime}</small></td>
                    <td><span className={`employee-status employee-status--${customer.latestBooking.status}`}>{statusLabels[customer.latestBooking.status] ?? customer.latestBooking.status}</span></td>
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

function BookingCard({ booking }: { booking: GgsEmployeeBooking }) {
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
      </div>
    </article>
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
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [logoutError, setLogoutError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  );
  const currentMenu = employeeMenuItems.find((item) => item.href === location) ?? employeeMenuItems[0];
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
    if (window.matchMedia('(max-width: 900px)').matches) setSidebarCollapsed(true);
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
                const isActive = currentMenu.href === item.href;
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
                <strong>{currentMenu.label}</strong>
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
              <div className="employee-schedule__summary-icon"><CalendarDays size={19} aria-hidden="true" /></div>
              <div><span>BOOKING TERLIHAT</span><strong>{bookings.isLoading ? '—' : (bookings.data?.length ?? 0).toString().padStart(2, '0')}</strong></div>
              <p>Semua booking tampil untuk tim studio. Booking belum ditetapkan ke karyawan tertentu.</p>
            </section>

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
                    <BookingCard key={booking.id} booking={booking} />
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
        ) : (
          <EmployeeModulePlaceholder item={currentMenu} />
        )}

        {authenticated && logoutError && <p className="employee-form-error employee-schedule__logout-error" role="alert">{logoutError}</p>}
      </div>
    </main>
  );
}
