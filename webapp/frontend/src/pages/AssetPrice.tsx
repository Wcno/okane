import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSignedInUser } from '../auth/context'
import { RecordEditor } from '../components/record/RecordEditor'
import { NotHere, Pending, ScreenHeader } from '../components/screen/Screen'
import { TextField } from '../components/TextField'
import { describeAsset, formatPrice, positionsBack, priceOrigin } from '../investments/presentation'
import { getAssetPrice, saveAssetPrice, type AssetPrice as AssetPriceRecord, type PriceField } from '../investments/price'
import { validatePrice } from '../investments/priceForm'
import { formatDay, todayInPanama } from '../lib/dates'
import type { ScreenNotice } from '../lib/notice'
import { useFieldErrors } from '../lib/useFieldErrors'
import { useLoaded } from '../lib/useLoaded'
import { useSubmission } from '../lib/useSubmission'

function PriceEditor({ record }: { record: AssetPriceRecord }) {
  const { csrfToken } = useSignedInUser()
  const navigate = useNavigate()
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState({ value: '', date: todayInPanama() })
  const { errors, setErrors, clearErrors } = useFieldErrors<PriceField>()
  const [attention, setAttention] = useState(0)
  const { asset, price } = record

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const change = (patch: Partial<typeof draft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...(Object.keys(patch) as PriceField[]))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validatePrice(draft)
    if (!checked.ok) {
      setErrors(checked.errors)
      setAttention((count) => count + 1)
      return
    }
    setErrors({})
    const outcome = await write(
      () => saveAssetPrice(asset.id, checked.price, csrfToken),
      () => {
        const notice: ScreenNotice = {
          notice: `Precio de ${asset.symbol} guardado: ${formatPrice(checked.price.value)}, ${formatDay(checked.price.date)}.`,
        }
        navigate(positionsBack.to, { state: notice })
      },
    )
    if (outcome && !outcome.ok) {
      setErrors(outcome.errors)
      setAttention((count) => count + 1)
    }
  }

  return (
    <>
      <p className="mb-5 max-w-[60ch] rounded-2xl bg-surface-2 p-3.5 text-[0.95rem] text-ink-2">
        {price === null ? 'Aún no hay un precio para este Activo.' : priceOrigin(price)}
      </p>
      <RecordEditor
        formRef={form}
        onSubmit={submit}
        isSubmitting={isSubmitting}
        formError={errors.form}
        submitLabel="Guardar precio"
        submittingLabel="Guardando…"
        cancelTo={positionsBack.to}
        fields={
          <>
            <TextField
              id="price-value"
              label="Precio por unidad"
              inputMode="decimal"
              autoComplete="off"
              placeholder="187.35"
              hint="Solo cambia tus valoraciones, no las de otra persona."
              value={draft.value}
              onChange={(event) => change({ value: event.target.value })}
              errors={errors.value}
            />
            <TextField
              id="price-date"
              label="Fecha del precio"
              type="date"
              max={todayInPanama()}
              value={draft.date}
              onChange={(event) => change({ date: event.target.value })}
              errors={errors.date}
            />
          </>
        }
      />
    </>
  )
}

/** Corrects the Reference Price of an Asset by hand; it is saved with its date and belongs to the User. */
export function AssetPrice() {
  const id = Number(useParams().id)
  const { state, retry } = useLoaded(() => getAssetPrice(id), id)

  if (state.status === 'gone') {
    return <NotHere title="Corregir precio" text={state.message} back={positionsBack} />
  }
  return (
    <>
      <ScreenHeader
        title="Corregir precio"
        back={positionsBack}
        intro={
          state.status === 'ready'
            ? `${describeAsset(state.value.asset)}. Fija el precio que usarás para valorar este Activo.`
            : 'Fija el precio que usarás para valorar este Activo.'
        }
      />
      {state.status === 'ready' ? (
        <PriceEditor record={state.value} />
      ) : (
        <Pending state={state} retry={retry} loading="Cargando el precio…" />
      )}
    </>
  )
}
