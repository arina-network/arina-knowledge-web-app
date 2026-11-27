export function parseStructureFirstLine(firstLine: string) {
    const title = /^\uFEFF?#[ \t]+(.*)$/.exec(firstLine)?.[1]
        .replace(/[ \t]+#+[ \t]*$/, '').trim() ?? '';
    const words = title ? title.split(/\s+/) : [];
    const nameIndex = words.findIndex(word => /^\p{Lu}/u.test(word));
    const typeWords = nameIndex < 0 ? words : words.slice(0, nameIndex);
    const structureType = typeWords.length && typeWords.every(word =>
        /^\p{Ll}[\p{Ll}\p{M}\p{N}'’-]*$/u.test(word)
    ) ? typeWords.join(' ') : undefined;
    const structureName = nameIndex < 0 ? undefined : words.slice(nameIndex).join(' ');
    return { structureType, structureName };
}
