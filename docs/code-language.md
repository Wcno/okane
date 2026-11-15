# Code and product language

Okane serves a Spanish-speaking public. Product copy, accessibility text,
validation messages and presentation labels remain in Spanish. Source code,
identifiers, source filenames, comments and test descriptions use English.
Developer tooling and new commit messages also use English. Existing Git
history is preserved.

The Spanish [domain glossary](../GLOSSARY.md) defines product meaning. The
following names express the same concepts in code; they are not replacement
labels for the public interface.

| Spanish domain term | English code term |
|---|---|
| Usuario | User |
| Cuenta | Account |
| Cuenta de gastos | SpendingAccount / account type `spending` |
| Cuenta de ahorro | SavingsAccount / account type `savings` |
| Cuenta de inversión | InvestmentAccount / account type `investment` |
| Cuenta archivada | ArchivedAccount |
| Saldo | Balance |
| Saldo inicial | OpeningBalance |
| Movimiento | Entry |
| Ingreso | Income |
| Gasto | Expense |
| Transferencia | Transfer |
| Estado de cuenta | AccountStatement |
| Proyección | Projection |
| Vista de Movimientos | MovementFeed |
| Ocurrencia de pago | RecurringPaymentOccurrence |
| Categoría | Category |
| Presupuesto | Budget |
| Pago recurrente | RecurringPayment |
| Comprometido | CommittedAmount |
| Restante | RemainingBudget |
| Disponible | AvailableFunds |
| Activo | Asset |
| Transacción de inversión | InvestmentTransaction |
| Dividendo | Dividend |
| Posición | Position |
| Precio de referencia | ReferencePrice |
| Aporte / Aporte neto | Contribution / NetContribution |
| Rendimiento | InvestmentReturn |
| Patrimonio | NetWorth |
| Panel | Dashboard |
| Ahorro neto | NetSavings |

Use TypeScript camelCase for values and PascalCase for types and components;
future Python code follows snake_case. API field names use English. Preserve
the routes and endpoints in `matrices.md`; those already use English.

Spanish strings in the existing demo data are localized labels, not internal
identifiers. For example, the internal type `spending` is displayed as `Gastos`.
Changing a code name must preserve its rendered Spanish text and calculations.
