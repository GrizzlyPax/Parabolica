// The look's five typefaces, stored with the app (#705): Vite bundles the
// woff2 files, so nothing loads from Google Fonts (the sandbox can't reach
// it and the app shouldn't depend on it). Latin subsets only; a glyph outside
// them falls back to the system stack in the token's font list.
//   Alfa Slab One   display (titles, the big slab)
//   Playball        script (the sash, title ribbons)
//   Oswald          condensed (labels, buttons, program lines)
//   Old Standard TT body (the Pulp Almanac serif every screen already wears)
//   Special Elite   data (numbers, stamps, the typewriter)
import '@fontsource/alfa-slab-one/latin-400.css';
import '@fontsource/playball/latin-400.css';
import '@fontsource/oswald/latin-400.css';
import '@fontsource/oswald/latin-600.css';
import '@fontsource/old-standard-tt/latin-400.css';
import '@fontsource/old-standard-tt/latin-400-italic.css';
import '@fontsource/old-standard-tt/latin-700.css';
import '@fontsource/old-standard-tt/latin-ext-400.css';
import '@fontsource/old-standard-tt/latin-ext-400-italic.css';
import '@fontsource/old-standard-tt/latin-ext-700.css';
import '@fontsource/special-elite/latin-400.css';
