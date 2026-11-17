/** What happened to a record; the notice says it in Spanish. */
export type RecordChange = 'created' | 'updated' | 'deleted'

/** The verb of the notice, in the past and in the second person. */
export const changeVerbs: Record<RecordChange, string> = {
  created: 'Registraste',
  updated: 'Guardaste',
  deleted: 'Eliminaste',
}
