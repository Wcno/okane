import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'
import type { RecordPage } from '../lib/recordPage'

/** A Transfer as api-service describes it. The amount stays a decimal string. */
export interface Transfer {
  id: number
  amount: string
  sourceAccountId: number
  destinationAccountId: number
  date: string
  description: string
}

/** What registering or correcting a Transfer sends: every field, the date included. */
export type TransferInput = Omit<Transfer, 'id'>

export type TransferField = 'amount' | 'sourceAccountId' | 'destinationAccountId' | 'date' | 'description'
export type TransferErrors = FieldErrors<TransferField>

const LIST_FAILED = 'Okane no pudo consultar tus transferencias. Espera un momento e inténtalo de nuevo.'
const TRANSFER_GONE = 'Esta transferencia ya no existe. Vuelve a tus transferencias para ver la lista al día.'
const ACCOUNT_OR_TRANSFER_GONE =
  'No encontramos esta transferencia o una de las Cuentas elegidas. Vuelve a tus transferencias para ver la lista al día.'

const TRANSFERS_PAGE_SIZE = 50

interface TransferBody {
  id: number
  amount: string
  source_account_id: number
  destination_account_id: number
  date: string
  description: string
}

const toTransfer = (body: TransferBody): Transfer => ({
  id: body.id,
  amount: body.amount,
  sourceAccountId: body.source_account_id,
  destinationAccountId: body.destination_account_id,
  date: body.date,
  description: body.description,
})

const toBody = (transfer: TransferInput) => ({
  amount: transfer.amount,
  source_account_id: transfer.sourceAccountId,
  destination_account_id: transfer.destinationAccountId,
  date: transfer.date,
  description: transfer.description,
})

const FORM_FIELDS: Record<string, TransferField> = {
  amount: 'amount',
  source_account_id: 'sourceAccountId',
  destination_account_id: 'destinationAccountId',
  date: 'date',
  description: 'description',
}

export async function listTransfers(page: number): Promise<RecordPage<Transfer>> {
  const body = await readJson<{ results: TransferBody[]; total: number; next_page: number | null }>(
    `/api/transfers?page_size=${TRANSFERS_PAGE_SIZE}&page=${page}`,
    { failed: LIST_FAILED },
  )
  return { records: body.results.map(toTransfer), total: body.total, nextPage: body.next_page }
}

/** One Transfer; throws NotFoundError when it is not the User's or no longer exists. */
export async function getTransfer(id: number): Promise<Transfer> {
  return toTransfer(await readJson<TransferBody>(`/api/transfers/${id}`, { failed: LIST_FAILED, gone: TRANSFER_GONE }))
}

const readTransfer = async (response: Response) => toTransfer(await response.json())

export function createTransfer(transfer: TransferInput, csrfToken: string): Promise<Outcome<Transfer, TransferField>> {
  return write({
    method: 'POST',
    path: '/api/transfers',
    csrfToken,
    body: toBody(transfer),
    fields: FORM_FIELDS,
    gone: 'Una de las Cuentas ya no existe. Elige otra para registrar la transferencia.',
    read: readTransfer,
  })
}

export function updateTransfer(
  id: number,
  transfer: TransferInput,
  csrfToken: string,
): Promise<Outcome<Transfer, TransferField>> {
  return write({
    method: 'PUT',
    path: `/api/transfers/${id}`,
    csrfToken,
    body: toBody(transfer),
    fields: FORM_FIELDS,
    gone: ACCOUNT_OR_TRANSFER_GONE,
    read: readTransfer,
  })
}

export function deleteTransfer(id: number, csrfToken: string): Promise<Outcome<void, TransferField>> {
  return write({
    method: 'DELETE',
    path: `/api/transfers/${id}`,
    csrfToken,
    gone: TRANSFER_GONE,
    read: async () => undefined,
  })
}
