import { useNavigate, useParams } from 'react-router-dom'
import { useSignedInUser } from '../auth/context'
import { RecordEditor } from '../components/record/RecordEditor'
import { NotHere, Pending, ScreenHeader } from '../components/screen/Screen'
import { TextField } from '../components/TextField'
import { describeAsset, positionsBack, priceOrigin } from '../investments/presentation'
import { getAssetPrice, saveAssetPrice, type AssetPrice as AssetPriceRecord } from '../investments/price'
import { validatePrice } from '../investments/priceForm'
import { todayInPanama } from '../lib/dates'
import type { ScreenNotice } from '../lib/notice'
import { useLoaded } from '../lib/useLoaded'
import { useRecordForm } from '../lib/useRecordForm'

function PriceEditor({ record }: { record: AssetPriceRecord }) {
  const { csrfToken } = useSignedInUser()
  const navigate = useNavigate()
  const { asset, price } = record
  const { form, draft, change, errors, isSubmitting, submit } = useRecordForm({
    initial: { value: '', date: todayInPanama() },
    validate: (current) => {
      const checked = validatePrice(current)
      return checked.ok ? { ok: true, value: checked.price } : checked
    },
    dateDependsOn: [],
    save: (input) => saveAssetPrice(asset.id, input, csrfToken),
    onSaved: () => {
      const notice: ScreenNotice = { notice: `Precio de ${asset.symbol} guardado.` }
      navigate(positionsBack.to, { state: notice })
    },
  })

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
