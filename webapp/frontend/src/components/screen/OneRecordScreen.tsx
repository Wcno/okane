import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from './Screen'

const RECORD_ID = /^[1-9]\d{0,17}$/

/**
 * Frame of the screens that act on one record, named by the `:id` of the route.
 * A foreign, unknown or malformed id gets the same answer: the record is not here.
 */
export function OneRecordScreen<Value>({
  title,
  back,
  notHere,
  loading,
  load,
  children,
}: {
  title: string
  back: { to: string; label: string }
  notHere: { title: string; text: string }
  loading: string
  /** Reads the record and what the screen needs with it; a missing record throws NotFoundError. */
  load: (id: number) => Promise<Value>
  children: (value: Value) => ReactNode
}) {
  const { id } = useParams()
  if (!RECORD_ID.test(id ?? '')) return <NotHere title={notHere.title} text={notHere.text} back={back} />
  return (
    <LoadedRecord recordId={Number(id)} title={title} back={back} notHere={notHere} loading={loading} load={load}>
      {children}
    </LoadedRecord>
  )
}

function LoadedRecord<Value>({
  recordId,
  title,
  back,
  notHere,
  loading,
  load,
  children,
}: {
  recordId: number
  title: string
  back: { to: string; label: string }
  notHere: { title: string; text: string }
  loading: string
  load: (id: number) => Promise<Value>
  children: (value: Value) => ReactNode
}) {
  const { state, retry } = useLoaded(() => load(recordId), recordId)

  if (state.status === 'gone') return <NotHere title={notHere.title} text={notHere.text} back={back} />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <Pending state={state} retry={retry} loading={loading} />
      </>
    )
  }
  return <>{children(state.value)}</>
}
