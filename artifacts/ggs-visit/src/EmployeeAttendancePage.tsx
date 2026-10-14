import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Clock3, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  getGetGgsEmployeeAttendanceTodayQueryKey,
  useCheckInGgsEmployeeAttendance,
  useCheckOutGgsEmployeeAttendance,
  useGetGgsEmployeeAttendanceToday,
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

export function EmployeeAttendancePage({ employeeName }: { employeeName: string }) {
  const queryClient = useQueryClient();
  const attendanceQueryKey = getGetGgsEmployeeAttendanceTodayQueryKey();
  const attendance = useGetGgsEmployeeAttendanceToday({
    query: {
      queryKey: attendanceQueryKey,
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  const checkIn = useCheckInGgsEmployeeAttendance();
  const checkOut = useCheckOutGgsEmployeeAttendance();
  const [actionError, setActionError] = useState('');
  const isSubmitting = checkIn.isPending || checkOut.isPending;
  const currentStatus = attendance.data?.status;

  const saveAttendanceResult = async (result: NonNullable<typeof attendance.data>) => {
    setActionError('');
    queryClient.setQueryData(attendanceQueryKey, result);
    await queryClient.invalidateQueries({ queryKey: attendanceQueryKey, exact: true });
  };

  const submitCheckIn = () => {
    setActionError('');
    checkIn.mutate(undefined, {
      onSuccess: saveAttendanceResult,
      onError: (error) => setActionError(attendanceErrorMessage(error, 'Absensi masuk belum tersimpan. Silakan coba lagi.')),
    });
  };

  const submitCheckOut = () => {
    setActionError('');
    checkOut.mutate(undefined, {
      onSuccess: saveAttendanceResult,
      onError: (error) => setActionError(attendanceErrorMessage(error, 'Absensi pulang belum tersimpan. Silakan coba lagi.')),
    });
  };

  return (
    <div className="employee-attendance" data-testid="employee-attendance">
      <header className="employee-attendance__heading">
        <div>
          <p className="employee-kicker">KEHADIRAN KARYAWAN</p>
          <h1>Absensi <em>hari ini.</em></h1>
          <p>Halo, {employeeName}. Catatan masuk dan pulang tersimpan di akun karyawan ini.</p>
        </div>
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
                    ? 'Tekan absen masuk untuk mencatat waktu kedatangan hari ini.'
                    : currentStatus === 'checked_in'
                      ? 'Pastikan pekerjaan selesai, lalu catat waktu pulang.'
                      : 'Waktu masuk dan pulang Anda sudah tersimpan.'}
                </p>
              </div>
              {currentStatus === 'not_started' ? (
                <button
                  type="button"
                  className="employee-primary-button"
                  onClick={submitCheckIn}
                  disabled={isSubmitting}
                  data-testid="button-employee-check-in"
                >
                  <LogIn size={15} aria-hidden="true" />
                  {checkIn.isPending ? 'Menyimpan…' : 'Absen masuk'}
                  {!checkIn.isPending && <ArrowRight size={15} aria-hidden="true" />}
                </button>
              ) : currentStatus === 'checked_in' ? (
                <button
                  type="button"
                  className="employee-primary-button"
                  onClick={submitCheckOut}
                  disabled={isSubmitting}
                  data-testid="button-employee-check-out"
                >
                  <LogOut size={15} aria-hidden="true" />
                  {checkOut.isPending ? 'Menyimpan…' : 'Absen pulang'}
                  {!checkOut.isPending && <ArrowRight size={15} aria-hidden="true" />}
                </button>
              ) : (
                <span className="employee-attendance__complete"><ShieldCheck size={16} aria-hidden="true" /> Tersimpan</span>
              )}
            </div>
            {actionError && <p className="employee-attendance__action-error" role="alert" data-testid="status-employee-attendance-action-error">{actionError}</p>}
          </section>
          <p className="employee-attendance__note">Satu catatan absensi berlaku untuk setiap karyawan per hari dan menggunakan waktu Jakarta (WIB).</p>
        </>
      )}
    </div>
  );
}
