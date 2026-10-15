# TextField

A labelled text input, also used as the search field.

**Provide:** `label` (always, except a search field with `aria-label`), `placeholder` showing an example, optional `hint`, `error`, `icon` (`search` for search), `size` (density), `multiline` for messages, and any native input props.

- Put the label above the field, never only inside it.
- Error messages say what to do: “Marks cannot be more than 50.” — not “Invalid input”.
- Use the right keyboard: `inputMode="numeric"` for marks and phone numbers.
- On phones the font is 16px so the screen does not zoom.
