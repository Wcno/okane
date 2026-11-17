import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const RECORD_ID = /^[1-9]\d{0,17}$/

/** What a screen that acts on one record says around it. */
export interface OneRecordWording {
  back: { to: string; label: string }
  loading: string
  notHere: { title: string; text: string }
}

function LoadedRecord<Entry>({
  recordId,
  title,
  load,
  wording,
  children,
}: {
  recordId: number
  title: string
  load: (id: number) => Promise<Entry>
  wording: OneRecordWording
  children: (record: Entry, accounts: Account[]) => ReactNode
}) {
  const { state, retry } = useLoaded(async () => {
    const [record, accounts] = await Promise.all([load(recordId), listAccounts()])
    return { record, accounts }
  }, recordId)

  if (state.status === 'gone') return <NotHere {...wording.notHere} back={wording.back} />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={wording.back} />
        <Pending state={state} retry={retry} loading={wording.loading} />
      </>
    )
  }
  return <>{children(state.value.record, state.value.accounts)}</>
}

/**
 * Frame of the screens that act on one record, named by the `:id` of the
 * route. A foreign, unknown or malformed id gets the same answer: the record is not here.
 */
export function OneRecordScreen<Entry>({
  title,
  load,
  wording,
  children,
}: {
  title: string
  load: (id: number) => Promise<Entry>
  wording: OneRecordWording
  children: (record: Entry, accounts: Account[]) => ReactNode
}) {
  const { id } = useParams()
  if (!RECORD_ID.test(id ?? '')) return <NotHere {...wording.notHere} back={wording.back} />
  return (
    <LoadedRecord recordId={Number(id)} title={title} load={load} wording={wording}>
      {children}
    </LoadedRecord>
  )
}
