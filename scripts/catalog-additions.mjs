import fs from 'node:fs'

/** Correcciones y altas explícitas del usuario, aplicadas después de generar el catálogo. */
export const catalogAdditions = JSON.parse(
  fs.readFileSync(new URL('../src/data/catalogAdditions.json', import.meta.url), 'utf8')
)

export function applyCatalogAdditions(catalog, media, instructions) {
  for (const definition of catalogAdditions) {
    const { exercise } = definition
    const index = catalog.findIndex(item => item.id === exercise.id)
    const previous = index === -1 ? undefined : catalog[index]
    const updated = {
      ...previous,
      ...structuredClone(exercise),
      aliases: [...new Set([...(previous?.aliases ?? []), ...(previous && previous.name !== exercise.name ? [previous.name] : []), ...exercise.aliases])],
    }
    if (index === -1) catalog.push(updated)
    else catalog[index] = updated
    if (media) media[exercise.id] = structuredClone(definition.media)
    if (instructions) instructions[exercise.id] = [...definition.instructions]
  }
  return catalog
}
