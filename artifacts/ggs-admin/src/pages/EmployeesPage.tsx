import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetGgsAdminEmployeesQueryKey,
  useCreateGgsAdminEmployee,
  useGetGgsAdminEmployees,
  useUpdateGgsAdminEmployee,
  type CreateGgsAdminEmployeeMutationVariables,
  type GgsEmployeeAccount,
  type GgsEmployeeAccountInput,
  type GgsEmployeeAccountUpdate,
  type UpdateGgsAdminEmployeeMutationVariables,
} from '@workspace/api-client-react';
import { ArrowRight, Check, KeyRound, Pencil, Plus, Search, ShieldAlert, UserRound, UsersRound, X } from 'lucide-react';

type EditorMode = 'create' | 'edit' | 'password';

type EditorState = {
  mode: EditorMode;
  employee?: GgsEmployeeAccount;
} | null;

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return 'Perubahan belum tersimpan. Silakan coba lagi.';
}

function employeeDate(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return date;
  }
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(value);
}

export default function EmployeesPage() {
  const query = useGetGgsAdminEmployees({
    query: {
      queryKey: getGetGgsAdminEmployeesQueryKey(),
      refetchOnMount: 'always',
      staleTime: 20_000,
    },
  });
  const create = useCreateGgsAdminEmployee();
  const update = useUpdateGgsAdminEmployee();
  const client = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(null);
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const saving = create.isPending || update.isPending;
  const employees = (query.data ?? []).filter((employee) =>
    `${employee.employeeId} ${employee.name}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function refreshEmployees() {
    void client.invalidateQueries({ queryKey: getGetGgsAdminEmployeesQueryKey() });
  }

  function submitCreate(input: GgsEmployeeAccountInput) {
    setActionError('');
    const variables: CreateGgsAdminEmployeeMutationVariables = { data: input };
    create.mutate(variables, {
      onSuccess: () => {
        refreshEmployees();
        setEditor(null);
      },
      onError: (error) => setActionError(errorMessage(error)),
    });
  }

  function submitUpdate(employee: GgsEmployeeAccount, input: GgsEmployeeAccountUpdate) {
    setActionError('');
    const variables: UpdateGgsAdminEmployeeMutationVariables = { id: employee.id, data: input };
    update.mutate(variables, {
      onSuccess: () => {
        refreshEmployees();
        setEditor(null);
      },
      onError: (error) => setActionError(errorMessage(error)),
    });
  }

  function toggleActive(employee: GgsEmployeeAccount) {
    const nextActive = !employee.active;
    const confirmation = nextActive
      ? `Aktifkan kembali akun ${employee.name}?`
      : `Nonaktifkan akun ${employee.name}? Karyawan tidak dapat masuk selama akun nonaktif.`;
    if (!window.confirm(confirmation)) {
      return;
    }
    setActionError('');
    const variables: UpdateGgsAdminEmployeeMutationVariables = {
      id: employee.id,
      data: { active: nextActive },
    };
    update.mutate(variables, {
      onSuccess: refreshEmployees,
      onError: (error) => setActionError(errorMessage(error)),
    });
  }

  return (
    <div className="employees-page">
      <div className="employee-page-heading">
        <div>
          <span className="eyebrow">PENGELOLAAN TIM</span>
          <h1 className="font-display">Karyawan</h1>
        </div>
        <button
          className="button button-gold"
          type="button"
          onClick={() => {
            setActionError('');
            setEditor({ mode: 'create' });
          }}
          data-testid="button-add-employee"
        >
          <Plus size={16} />
          Tambah karyawan
        </button>
      </div>

      {actionError && (
        <div className="employee-alert" role="alert" data-testid="error-employee-action">
          <ShieldAlert size={16} />
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Tutup pesan kesalahan" data-testid="button-dismiss-employee-error">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="employee-list-toolbar">
        <div className="employee-count">
          <b data-testid="text-employee-count">{search ? employees.length : query.data?.length ?? '—'}</b>
          <span>{search ? `dari ${query.data?.length ?? 0} karyawan` : 'karyawan'}</span>
        </div>
        <label className="employee-search">
          <span className="sr-only">Cari berdasarkan nama atau ID karyawan</span>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama atau ID"
            data-testid="input-employee-search"
          />
        </label>
      </div>

      {query.isLoading ? (
        <div className="employee-loading" aria-label="Memuat akun karyawan" data-testid="loading-employees">
          <div className="employee-loading-head" />
          {Array.from({ length: 4 }, (_, index) => (
            <div className="employee-loading-row" key={index}>
              <i />
              <span><b /><small /></span>
              <i />
              <i />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="employee-query-error" role="alert" data-testid="error-employees-query">
          <span className="state-icon"><ShieldAlert size={20} /></span>
          <h2 className="font-display">Tidak dapat memuat karyawan</h2>
          <p>{errorMessage(query.error)}</p>
          <button className="button button-outline" type="button" onClick={() => void query.refetch()} data-testid="button-retry-employees">
            Muat ulang <ArrowRight size={14} />
          </button>
        </div>
      ) : employees.length > 0 ? (
        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th scope="col">NAMA</th>
                <th scope="col">ID MASUK</th>
                <th scope="col">STATUS</th>
                <th scope="col">DITAMBAHKAN</th>
                <th scope="col"><span className="sr-only">Tindakan</span></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} data-testid={`row-employee-${employee.id}`}>
                  <td>
                    <div className="employee-person-cell">
                      <span className="employee-avatar"><UserRound size={16} strokeWidth={1.4} /></span>
                      <span><b data-testid={`text-employee-name-${employee.id}`}>{employee.name}</b></span>
                    </div>
                  </td>
                  <td><span className="employee-mobile-label">ID MASUK</span><code className="employee-id">{employee.employeeId}</code></td>
                  <td>
                    <span className="employee-mobile-label">STATUS</span>
                    <span className={`employee-status ${employee.active ? 'is-active' : 'is-inactive'}`} data-testid={`status-employee-${employee.id}`}>
                      <i />
                      {employee.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td><span className="employee-mobile-label">DITAMBAHKAN</span><span className="employee-date">{employeeDate(employee.createdAt)}</span></td>
                  <td>
                    <div className="employee-actions">
                      <button
                        type="button"
                        className="employee-action"
                        onClick={() => {
                          setActionError('');
                          setEditor({ mode: 'edit', employee });
                        }}
                        aria-label={`Ubah data ${employee.name}`}
                        data-testid={`button-edit-employee-${employee.id}`}
                      >
                        <Pencil size={14} />
                        <span>Ubah</span>
                      </button>
                      <button
                        type="button"
                        className="employee-action"
                        onClick={() => {
                          setActionError('');
                          setEditor({ mode: 'password', employee });
                        }}
                        aria-label={`Atur ulang kata sandi ${employee.name}`}
                        data-testid={`button-reset-password-${employee.id}`}
                      >
                        <KeyRound size={14} />
                        <span>Reset sandi</span>
                      </button>
                      <button
                        type="button"
                        className={`employee-action ${employee.active ? 'is-danger' : 'is-positive'}`}
                        onClick={() => toggleActive(employee)}
                        disabled={update.isPending}
                        data-testid={`button-toggle-employee-${employee.id}`}
                      >
                        {employee.active ? <X size={14} /> : <Check size={14} />}
                        <span>{employee.active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="employee-empty" data-testid="empty-employees">
          <span className="employee-empty-mark">{search ? <UsersRound size={20} /> : <UserRound size={20} />}</span>
          <h2 className="font-display">{search ? 'Tidak ada hasil' : 'Belum ada karyawan'}</h2>
          {search ? (
            <button className="button button-outline" type="button" onClick={() => setSearch('')} data-testid="button-clear-employee-search">Hapus pencarian</button>
          ) : (
            <button
              className="button button-gold"
              type="button"
              onClick={() => setEditor({ mode: 'create' })}
              data-testid="button-create-first-employee"
            >
              <Plus size={15} /> Tambah karyawan
            </button>
          )}
        </div>
      )}

      {editor && (
        <EmployeeEditor
          key={`${editor.mode}-${editor.employee?.id ?? 'new'}`}
          editor={editor}
          saving={saving}
          error={actionError}
          onClose={() => {
            if (!saving) {
              setEditor(null);
              setActionError('');
            }
          }}
          onCreate={submitCreate}
          onUpdate={submitUpdate}
        />
      )}
    </div>
  );
}

function EmployeeEditor({
  editor,
  saving,
  error,
  onClose,
  onCreate,
  onUpdate,
}: {
  editor: Exclude<EditorState, null>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onCreate: (input: GgsEmployeeAccountInput) => void;
  onUpdate: (employee: GgsEmployeeAccount, input: GgsEmployeeAccountUpdate) => void;
}) {
  const employee = editor.employee;
  const [employeeId, setEmployeeId] = useState(employee?.employeeId ?? '');
  const [name, setName] = useState(employee?.name ?? '');
  const [password, setPassword] = useState('');
  const creating = editor.mode === 'create';
  const editing = editor.mode === 'edit';
  const heading = creating ? 'Tambah karyawan' : editing ? 'Edit karyawan' : 'Atur ulang sandi';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) {
      onCreate({ employeeId: employeeId.trim(), name: name.trim(), password });
      return;
    }
    if (!employee) {
      return;
    }
    if (editing) {
      onUpdate(employee, { employeeId: employeeId.trim(), name: name.trim() });
      return;
    }
    onUpdate(employee, { password });
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section className="service-dialog employee-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-dialog-title">
        <div className="dialog-head">
          <div>
            <span className="eyebrow">{creating ? 'AKUN KARYAWAN BARU' : editing ? 'DATA KARYAWAN' : 'KEAMANAN AKUN'}</span>
            <h2 className="font-display" id="employee-dialog-title">{heading}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup dialog" disabled={saving} data-testid="button-close-employee-dialog">
            <X size={18} />
          </button>
        </div>
        <form className="dialog-form" onSubmit={submit}>
          {(creating || editing) && (
            <>
              <label className="field" htmlFor="employee-name">
                  <span className="field-head"><b>Nama karyawan</b></span>
                <input
                  id="employee-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  data-testid="input-employee-name"
                />
              </label>
              <label className="field" htmlFor="employee-id">
                <span className="field-head"><b>ID karyawan</b><small>2–32 karakter · huruf, angka, . _ -</small></span>
                <input
                  id="employee-id"
                  required
                  minLength={2}
                  maxLength={32}
                  pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,31}"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  autoComplete="off"
                  data-testid="input-employee-id"
                />
              </label>
            </>
          )}
          {(creating || editor.mode === 'password') && (
            <label className="field" htmlFor="employee-password">
              <span className="field-head">
                <b>{creating ? 'Kata sandi awal' : 'Kata sandi baru'}</b>
                <small>Minimal 8 karakter</small>
              </span>
              <input
                id="employee-password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                data-testid="input-employee-password"
              />
            </label>
          )}
          {error && (
            <div className="employee-form-error" role="alert" data-testid="error-employee-form">
              <ShieldAlert size={15} />
              <span>{error}</span>
            </div>
          )}
          <div className="employee-password-note">
            <KeyRound size={15} />
            <span>Sandi tidak dapat dilihat kembali.</span>
          </div>
          <div className="dialog-actions">
            <button className="button button-outline" type="button" onClick={onClose} disabled={saving} data-testid="button-cancel-employee">Batal</button>
            <button className="button button-gold" type="submit" disabled={saving} data-testid="button-save-employee">
              {saving ? 'Menyimpan…' : creating ? 'Buat akun' : editing ? 'Simpan perubahan' : 'Atur ulang sandi'}
              {!saving && <ArrowRight size={14} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
