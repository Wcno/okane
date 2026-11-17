import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'
import { toAsset, type Asset, type AssetBody, type ReferencePrice } from './api'

/** An Asset with the price the User's valuations use for it; null when nothing gives it one. */
export interface AssetPrice {
  asset: Asset
  price: ReferencePrice | null
}

export interface PriceInput {
  value: string
  date: string
}

export type PriceField = 'value' | 'date'
export type PriceErrors = FieldErrors<PriceField>

interface AssetPriceBody {
  asset: AssetBody
  price: ReferencePrice | null
}

const PRICE_FAILED = 'Okane no pudo consultar el precio. Espera un momento e inténtalo de nuevo.'
const ASSET_GONE = 'Este Activo ya no existe. Vuelve a tus Posiciones para ver la lista al día.'

const toAssetPrice = (body: AssetPriceBody): AssetPrice => ({ asset: toAsset(body.asset), price: body.price })

export async function getAssetPrice(assetId: number): Promise<AssetPrice> {
  return toAssetPrice(
    await readJson<AssetPriceBody>(`/api/investments/assets/${assetId}/price`, {
      failed: PRICE_FAILED,
      gone: ASSET_GONE,
    }),
  )
}

export function saveAssetPrice(
  assetId: number,
  input: PriceInput,
  csrfToken: string,
): Promise<Outcome<AssetPrice, PriceField>> {
  return write({
    method: 'PUT',
    path: `/api/investments/assets/${assetId}/price`,
    csrfToken,
    body: { value: input.value, date: input.date },
    fields: { value: 'value', date: 'date' },
    gone: ASSET_GONE,
    read: async (response) => toAssetPrice(await response.json()),
  })
}
