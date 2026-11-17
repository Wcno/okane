import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from './Screen'

const RECORD_ID = /^[1-9]\d{0,17}$/

interface Back {
  to: string
  label: string
}

/**
 * Frame of the screens that act on one record, named by the `:id` of the route,
 * with the Accounts its text mentions. A foreign, unknown or malformed id gets
 * the same answer: the record is not here.
 */
export function OneRecordScreen<Item>({
  title,
  back,
  load,
  loading,
  notHere,
  children,
}: {
  title: string
  back: Back
  load: (id: number) => Promise<Item>
  loading: string
  notHere: { title: string; text: string }
  children: (record: Item, accounts: Account[]) => ReactNode
}) {
  const { id } = useParams()
  const valid = RECORD_ID.test(id ?? '')
  const recordId = valid ? Number(id) : 0

  const { state, retry } = useLoaded(async () => {
    if (!valid) return null
    const [record, accounts] = await Promise.all([load(recordId), listAccounts()])
    return { record, accounts }
  }, recordId)

  if (!valid || state.status === 'gone' || (state.status === 'ready' && state.value === null)) {
    return <NotHere title={notHere.title} text={notHere.text} back={back} />
  }
  if (state.status !== 'ready' || state.value === null) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <Pending state={state as Exclude<typeof state, { status: 'ready' }>} retry={retry} loading={loading} />
      </>
    )
  }
  return <>{children(state.value.record, state.value.accounts)}</>
}
