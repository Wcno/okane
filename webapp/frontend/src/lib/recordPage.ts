/** One page of a list of records, newest first. */
export interface RecordPage<Entry> {
  records: Entry[]
  total: number
  nextPage: number | null
}
