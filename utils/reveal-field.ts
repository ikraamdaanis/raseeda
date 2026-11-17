// Opens the `<details>` a field sits in, if it's closed, so the field can take
// focus: on a phone, a part's Labels row in the form.
export function revealField(field: HTMLElement) {
  const disclosure = field.closest("details");

  if (disclosure && !disclosure.open) disclosure.open = true;
}
