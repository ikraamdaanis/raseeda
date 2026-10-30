// The IndexedDB database every invoice, template and image is saved in. It
// lives here, apart from db/index.ts, so the homepage can check storage
// without loading the database module.
export const DATABASE_NAME = "InvoiceDatabase";
