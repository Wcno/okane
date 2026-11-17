import { beforeEach } from 'vitest'
import { setCatalog } from '../categories/catalog'
import { initialCatalog } from './initialCatalog'

// Screens read Category names from the catalog the app shell loads; tests start with the initial one.
beforeEach(() => setCatalog(initialCatalog))
