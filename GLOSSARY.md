# raseeda

A free invoice editor that runs entirely in the browser and keeps every document on the user's device.

## Language

**Document**:
One invoice, quote, proforma invoice, receipt or credit note, made in the editor and saved as a PDF.
_Avoid_: Record, file

**Document type**:
Which of the five kinds a document is; it sets the title, number series and closing rows.

**Library**:
Every document and template saved on this device, as one place to find, reopen, duplicate, rename and delete them.
_Avoid_: Open dialog, invoice list

**Template**:
A saved starting point for new documents, carrying the user's own details.
_Avoid_: Profile, preset

**Editor tab**:
The one browser tab that has the editor open and saves the open document; any other tab on `/create` waits until it's handed over.
_Avoid_: Read-only tab, editing tab
