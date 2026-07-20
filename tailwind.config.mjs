/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      // Mirrors the .type-* scale in globals.css so RichText/prose headings
      // (hero headlines, post bodies) match hardcoded JSX headings. Uniform 600
      // weight = hierarchy by size only. Keep both in sync.
      typography: {
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--text)',
              '--tw-prose-headings': 'var(--text)',
              h1: {
                fontWeight: 600,
                marginBottom: '0.25em',
              },
              h2: { fontWeight: 600 },
              h3: { fontWeight: 600 },
              h4: { fontWeight: 600 },
              h5: { fontWeight: 600 },
              blockquote: { fontWeight: 300 },
            },
          ],
        },
        base: {
          css: [
            {
              h1: { fontSize: '2.5rem' },
              h2: { fontSize: '1.875rem' },
              h3: { fontSize: '1.5rem' },
              h4: { fontSize: '1.25rem' },
              h5: { fontSize: '1.125rem' },
            },
          ],
        },
        md: {
          css: [
            {
              h1: { fontSize: '3.5rem' },
              h2: { fontSize: '2.25rem' },
              h3: { fontSize: '1.875rem' },
            },
          ],
        },
      },
    },
  },
}

export default config
