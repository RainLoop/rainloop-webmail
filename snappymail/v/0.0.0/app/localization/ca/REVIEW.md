# Catalan linguistic review — 2026-10-16

Reviewed the full user, administration, static and relative-time resources
against their English originals: 567 user entries, 140 administration entries
and 7 static entries. This pass changes 210 entries (161 user,
46 administration, 3 static), including typography.

## Editorial criteria

- Use the Softcatalà distinction between short imperative commands in buttons
  (for example, *Desa*, *Xifra*) and the *vós* form when addressing users in
  explanations, questions or instructions (*Introduïu*, *Seleccioneu*, *Voleu*).
- Prefer consistent terms such as *desar*, *xifrar/desxifrar*, *conversa*,
  *text sense format* and *emmagatzematge*. Preserve proper names such as Sieve.
- Correct semantic errors, not only spelling: `STOP_LABEL` must stop further
  processing, `LABEL_UNREAD` marks messages as unread, and the domain allow-list
  describes permitted **users**, not domains.
- Distinguish read/display receipts from delivery receipts. Preserve all message
  variables, including `%READ-RECEIPT%`.
- Remove inherited RainLoop product references from SnappyMail interface text.
- Preserve JSON keys, technical flags, placeholders and required HTML structure.
  Use consistent apostrophes and quotation marks in displayed Catalan text.

## Representative corrections

| Before | After | Reason |
| --- | --- | --- |
| No aturis el processament de les regles | Atura el processament de les regles següents | The previous wording reversed the action. |
| No llegeixis els missatges seleccionats | Marca els missatges seleccionats com a no llegits | Describes changing the unread flag. |
| Net | Text sense format | Correct meaning of the plain-text editor option. |
| scripts de sedàs | scripts Sieve | Sieve is a protocol name. |
| Emmagatzeatge | Emmagatzematge | Spelling correction. |
| Llista de dominis… | Llista d’usuaris del domini… | The allow-list contains users. |
| El RainLoop està actualitzat. | SnappyMail està actualitzat. | Correct product name. |

## References

- [Softcatalà linguistic style](https://www.softcatala.org/guia-estil-de-softcatala/aspectes-linguistics/)
- [TERMCAT criteria for software localization](https://arxiu.termcat.cat/criteris/localitzacio-productes-informatics.pdf)

This is a linguistic review of this contribution, not an endorsement by either
organization. Further review and corrections from Catalan-speaking maintainers
remain welcome.
