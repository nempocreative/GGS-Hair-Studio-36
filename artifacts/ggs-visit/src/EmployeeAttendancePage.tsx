import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Clock3, LogIn, LogOut, MapPin, QrCode, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocation } from 'wouter';
import {
  getGetGgsEmployeeAttendanceHistoryQueryKey,
  getGetGgsEmployeeAttendanceTodayQueryKey,
  useCheckInGgsEmployeeAttendance,
  useCheckOutGgsEmployeeAttendance,
  useCreateGgsEmployeeAttendanceChallenge,
  useGetGgsEmployeeAttendanceHistory,
  useGetGgsEmployeeAttendanceToday,
} from '@workspace/api-client-react';
import type {
  GgsEmployeeAttendanceActionInput,
  GgsEmployeeAttendanceChallenge,
  GgsEmployeeAttendanceLocationInput,
} from '@workspace/api-client-react';

function attendanceErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
}

function formatAttendanceDate(value: string): string {
  const dateKey = value.slice(0, 10);
  const parsed = new Date(`${dateKey}T12:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(parsed);
}

function formatAttendanceTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return `${new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(parsed)} WIB`;
}

function todayInJakarta(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function readCurrentLocation(): Promise<GgsEmployeeAttendanceLocationInput> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Perangkat ini tidak mendukung akses lokasi.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Izin lokasi ditolak. Aktifkan akses lokasi untuk absensi.'
          : error.code === error.TIMEOUT
            ? 'Lokasi belum ditemukan. Coba lagi di area terbuka.'
            : 'Lokasi tidak dapat dibaca. Pastikan GPS aktif, lalu coba lagi.';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  });
}

export function EmployeeAttendancePage({ employeeName }: { employeeName: string }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const attendanceQueryKey = getGetGgsEmployeeAttendanceTodayQueryKey();
  const historyQueryKey = getGetGgsEmployeeAttendanceHistoryQueryKey();
  const attendance = useGetGgsEmployeeAttendanceToday({
    query: {
      queryKey: attendanceQueryKey,
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  const history = useGetGgsEmployeeAttendanceHistory({
    query: {
      queryKey: historyQueryKey,
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  const checkIn = useCheckInGgsEmployeeAttendance();
  const checkOut = useCheckOutGgsEmployeeAttendance();
  const createChallenge = useCreateGgsEmployeeAttendanceChallenge();
  const [actionError, setActionError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isCreatingQr, setIsCreatingQr] = useState(false);
  const [qrChallenge, setQrChallenge] = useState<GgsEmployeeAttendanceChallenge | null>(null);
  const [qrError, setQrError] = useState('');
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const autoRefreshForToken = useRef('');
  const isSubmitting = isLocating || checkIn.isPending || checkOut.isPending;
  const currentStatus = attendance.data?.status;
  const challengeToken = useMemo(
    () => new URLSearchParams(window.location.search).get('attendanceChallenge')?.trim() ?? '',
    [window.location.search],
  );
  const challengeUrl = useMemo(() => {
    if (!qrChallenge) return '';
    const url = new URL('/employee/attendance', window.location.origin);
    url.searchParams.set('attendanceChallenge', qrChallenge.challengeToken);
    return url.toString();
  }, [qrChallenge]);

  const saveAttendanceResult = async (result: NonNullable<typeof attendance.data>) => {
    setActionError('');
    queryClient.setQueryData(attendanceQueryKey, result);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: attendanceQueryKey, exact: true }),
      queryClient.invalidateQueries({ queryKey: historyQueryKey, exact: true }),
    ]);
  };

  const createQrChallenge = useCallback(async () => {
    if (isCreatingQr) return;
    setIsCreatingQr(true);
    setQrError('');
    try {
      const location = await readCurrentLocation();
      const result = await createChallenge.mutateAsync({ data: location });
      setQrChallenge(result);
      setQrSecondsLeft(Math.max(0, Math.ceil((Date.parse(result.expiresAt) - Date.now()) / 1000)));
      autoRefreshForToken.current = '';
    } catch (error) {
      setQrError(attendanceErrorMessage(error, error instanceof Error ? error.message : 'QR belum dapat dibuat. Periksa lokasi lalu coba lagi.'));
    } finally {
      setIsCreatingQr(false);
    }
  }, [createChallenge.mutateAsync, isCreatingQr]);

  useEffect(() => {
    if (!showQr || !qrChallenge) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((Date.parse(qrChallenge.expiresAt) - Date.now()) / 1000));
      setQrSecondsLeft((current) => current === remaining ? current : remaining);
      if (
        remaining > 0 &&
        remaining <= 12 &&
        !isCreatingQr &&
        autoRefreshForToken.current !== qrChallenge.challengeToken
      ) {
        autoRefreshForToken.current = qrChallenge.challengeToken;
        void createQrChallenge();
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [createQrChallenge, isCreatingQr, qrChallenge, showQr]);

  const submitAttendance = async () => {
    setActionError('');
    if (!challengeToken) {
      setActionError('Scan QR absensi di layar salon dengan kamera HP terlebih dahulu.');
      return;
    }

    setIsLocating(true);
    try {
      const location = await readCurrentLocation();
      const input: GgsEmployeeAttendanceActionInput = {
        challengeToken,
        ...location,
      };
      const result = currentStatus === 'not_started'
        ? await checkIn.mutateAsync({ data: input })
        : await checkOut.mutateAsync({ data: input });
      await saveAttendanceResult(result);
      setLocation('/employee/attendance');
    } catch (error) {
      setActionError(attendanceErrorMessage(
        error,
        error instanceof Error ? error.message : 'Absensi belum tersimpan. Silakan coba lagi.',
      ));
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="employee-attendance" data-testid="employee-attendance">
      <header className="employee-attendance__heading">
        <div>
          <p className="employee-kicker">KEHADIRAN KARYAWAN</p>
          <h1>Absensi <em>hari ini.</em></h1>
          <p>Halo, {employeeName}. Scan QR salon, aktifkan lokasi, lalu konfirmasi absensi dari HP.</p>
        </div>
        <div className="employee-attendance__heading-actions">
          <button
            type="button"
            className="employee-refresh-button"
            onClick={() => void attendance.refetch()}
            disabled={attendance.isFetching || isSubmitting}
            data-testid="button-refresh-employee-attendance"
          >
            <RefreshCw size={15} aria-hidden="true" className={attendance.isFetching ? 'is-spinning' : ''} />
            Perbarui status
          </button>
          <button
            type="button"
            className="employee-refresh-button employee-attendance__qr-trigger"
            onClick={() => {
              setShowQr(true);
              setQrError('');
              void createQrChallenge();
            }}
            disabled={isCreatingQr || isSubmitting}
            data-testid="button-open-attendance-qr"
          >
            <QrCode size={15} aria-hidden="true" />
            {isCreatingQr ? 'Menyiapkan QR…' : 'Tampilkan QR salon'}
          </button>
        </div>
      </header>

      {attendance.isLoading ? (
        <section className="employee-attendance__feedback" aria-live="polite" data-testid="status-employee-attendance-loading">
          <span className="employee-attendance__feedback-icon"><Clock3 size={18} aria-hidden="true" /></span>
          <div><strong>Memuat absensi hari ini…</strong><p>Memeriksa catatan kehadiran akun Anda.</p></div>
        </section>
      ) : attendance.isError || !attendance.data ? (
        <section className="employee-attendance__feedback employee-attendance__feedback--error" role="alert" data-testid="status-employee-attendance-error">
          <span className="employee-attendance__feedback-icon"><ShieldCheck size={18} aria-hidden="true" /></span>
          <div>
            <strong>Absensi belum dapat dimuat.</strong>
            <p>{attendanceErrorMessage(attendance.error, 'Periksa koneksi, lalu coba muat ulang.')}</p>
          </div>
          <button type="button" onClick={() => void attendance.refetch()} disabled={attendance.isFetching}>Coba lagi</button>
        </section>
      ) : (
        <>
          <section className={`employee-attendance__card employee-attendance__card--${currentStatus}`} aria-labelledby="employee-attendance-title">
            <div className="employee-attendance__overview">
              <div className="employee-attendance__overview-icon"><CalendarDays size={19} aria-hidden="true" /></div>
              <div>
                <p className="employee-kicker">TANGGAL KERJA · WIB</p>
                <h2 id="employee-attendance-title">{formatAttendanceDate(attendance.data.attendanceDate || todayInJakarta())}</h2>
                <span className={`employee-attendance__badge employee-attendance__badge--${currentStatus}`}>
                  <span aria-hidden="true" />
                  {currentStatus === 'not_started' ? 'Belum absen masuk' : currentStatus === 'checked_in' ? 'Sedang bekerja' : 'Absensi selesai'}
                </span>
              </div>
            </div>

            <div className="employee-attendance__times" aria-label="Waktu absensi hari ini">
              <article className="employee-attendance__time">
                <span><LogIn size={14} aria-hidden="true" /> MASUK</span>
                <strong data-testid="text-employee-attendance-check-in">{formatAttendanceTime(attendance.data.checkInAt)}</strong>
              </article>
              <article className="employee-attendance__time">
                <span><LogOut size={14} aria-hidden="true" /> PULANG</span>
                <strong data-testid="text-employee-attendance-check-out">{formatAttendanceTime(attendance.data.checkOutAt)}</strong>
              </article>
            </div>

            <div className="employee-attendance__action">
              <div>
                <strong>
                  {currentStatus === 'not_started'
                    ? 'Mulai hari kerja'
                    : currentStatus === 'checked_in'
                      ? 'Akhiri hari kerja'
                      : 'Catatan hari ini lengkap'}
                </strong>
                <p>
                  {currentStatus === 'not_started'
                    ? challengeToken
                      ? 'QR ditemukan. Izinkan akses lokasi untuk mencatat kedatangan.'
                      : 'Scan QR absensi di layar salon dengan kamera HP untuk melanjutkan.'
                    : currentStatus === 'checked_in'
                      ? challengeToken
                        ? 'QR ditemukan. Izinkan akses lokasi untuk mencatat waktu pulang.'
                        : 'Scan QR absensi di layar salon dengan kamera HP untuk melanjutkan.'
                      : 'Waktu masuk dan pulang Anda sudah tersimpan.'}
                </p>
              </div>
              {currentStatus === 'not_started' ? (
                <button
                  type="button"
                  className="employee-primary-button"
                  onClick={() => void submitAttendance()}
                  disabled={isSubmitting || !challengeToken}
                  data-testid="button-employee-check-in"
                >
                  {isSubmitting ? <MapPin size={15} aria-hidden="true" /> : <LogIn size={15} aria-hidden="true" />}
                  {isLocating ? 'Memeriksa lokasi…' : checkIn.isPending ? 'Menyimpan…' : 'Absen masuk'}
                  {!isSubmitting && <ArrowRight size={15} aria-hidden="true" />}
                </button>
              ) : currentStatus === 'checked_in' ? (
                <button
                  type="button"
                  className="employee-primary-button"
                  onClick={() => void submitAttendance()}
                  disabled={isSubmitting || !challengeToken}
                  data-testid="button-employee-check-out"
                >
                  {isSubmitting ? <MapPin size={15} aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
                  {isLocating ? 'Memeriksa lokasi…' : checkOut.isPending ? 'Menyimpan…' : 'Absen pulang'}
                  {!isSubmitting && <ArrowRight size={15} aria-hidden="true" />}
                </button>
              ) : (
                <span className="employee-attendance__complete"><ShieldCheck size={16} aria-hidden="true" /> Tersimpan</span>
              )}
            </div>
            {challengeToken && currentStatus !== 'checked_out' && (
              <p className="employee-attendance__scan-confirmation" role="status">
                <QrCode size={14} aria-hidden="true" /> QR absensi terbaca. Konfirmasi untuk meminta lokasi GPS.
              </p>
            )}
            {actionError && <p className="employee-attendance__action-error" role="alert" data-testid="status-employee-attendance-action-error">{actionError}</p>}
          </section>
          <p className="employee-attendance__note">QR berlaku 45 detik dan hanya dapat dipakai satu kali per karyawan. Absensi memerlukan GPS dalam radius 100 meter dari salon.</p>

          <section className="employee-attendance__history" aria-labelledby="employee-attendance-history-title">
            <div className="employee-attendance__history-heading">
              <div>
                <p className="employee-kicker">CATATAN TERAKHIR</p>
                <h2 id="employee-attendance-history-title">Riwayat absensi</h2>
              </div>
              <span>Lima hari kerja terakhir</span>
            </div>
            {history.isLoading ? (
              <p className="employee-attendance__history-state" role="status">Memuat riwayat…</p>
            ) : history.isError ? (
              <div className="employee-attendance__history-state employee-attendance__history-state--error" role="alert">
                <span>Riwayat belum dapat dimuat.</span>
                <button type="button" onClick={() => void history.refetch()} disabled={history.isFetching}>Coba lagi</button>
              </div>
            ) : history.data?.length ? (
              <div className="employee-attendance__history-list">
                {history.data.map((item) => (
                  <article key={item.attendanceDate} className="employee-attendance__history-row">
                    <div className="employee-attendance__history-date">
                      <strong>{formatAttendanceDate(item.attendanceDate)}</strong>
                      <span>{item.status === 'checked_out' ? 'Selesai' : 'Belum absen pulang'}</span>
                    </div>
                    <div className="employee-attendance__history-times">
                      <span><LogIn size={13} aria-hidden="true" /> {formatAttendanceTime(item.checkInAt)}</span>
                      <span><LogOut size={13} aria-hidden="true" /> {formatAttendanceTime(item.checkOutAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="employee-attendance__history-state">Riwayat absensi sebelumnya akan muncul di sini.</p>
            )}
          </section>
        </>
      )}

      {showQr && (
        <div className="employee-attendance__qr-backdrop" role="presentation">
          <section className="employee-attendance__qr-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-attendance-qr-title">
            <button
              type="button"
              className="employee-attendance__qr-close"
              onClick={() => setShowQr(false)}
              aria-label="Tutup QR absensi"
              data-testid="button-close-attendance-qr"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <p className="employee-kicker">GGS / ABSENSI SALON</p>
            <h2 id="employee-attendance-qr-title">Scan untuk absen</h2>
            <p className="employee-attendance__qr-instruction">Buka kamera HP karyawan dan arahkan ke QR ini. Kode diperbarui otomatis dan hanya berlaku singkat.</p>
            {qrChallenge && qrSecondsLeft > 0 ? (
              <div className="employee-attendance__qr-code" data-testid="employee-attendance-qr-code">
                <QRCodeSVG value={challengeUrl} size={264} level="M" includeMargin />
              </div>
            ) : (
              <div className="employee-attendance__qr-placeholder" role="status">
                {isCreatingQr ? <RefreshCw size={25} className="is-spinning" aria-hidden="true" /> : <QrCode size={25} aria-hidden="true" />}
                <span>{isCreatingQr ? 'Membuat QR aman…' : 'QR perlu diperbarui'}</span>
              </div>
            )}
            <div className="employee-attendance__qr-meta">
              <span><MapPin size={14} aria-hidden="true" /> Lokasi tablet diperiksa</span>
              <strong>{qrSecondsLeft > 0 ? `Berlaku ${qrSecondsLeft} detik` : 'Kode kedaluwarsa'}</strong>
            </div>
            {qrError && <p className="employee-attendance__qr-error" role="alert">{qrError}</p>}
            <button
              type="button"
              className="employee-primary-button employee-attendance__qr-refresh"
              onClick={() => void createQrChallenge()}
              disabled={isCreatingQr}
              data-testid="button-refresh-attendance-qr"
            >
              <RefreshCw size={15} aria-hidden="true" className={isCreatingQr ? 'is-spinning' : ''} />
              {isCreatingQr ? 'Memperbarui…' : 'Buat QR baru'}
            </button>
            <p className="employee-attendance__qr-footer">Karyawan perlu masuk ke akun masing-masing. Lokasi dan masa berlaku diverifikasi server.</p>
          </section>
        </div>
      )}
    </div>
  );
}
