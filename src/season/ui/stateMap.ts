// The start's map (#697): the 52 places as a tile grid, one square each,
// laid out roughly where they sit (Alaska and Hawaii to the west, Puerto
// Rico to the east). x = column, y = row, from the top left.
export const TILE_COLS = 12;
export const TILE_ROWS = 8;

const ROWS: string[][] = [
  ['ak@0', 'me@11'],
  ['wi@6', 'vt@10', 'nh@11'],
  ['wa@1', 'id@2', 'mt@3', 'nd@4', 'mn@5', 'il@6', 'mi@7', 'ny@9', 'ma@10'],
  ['or@1', 'nv@2', 'wy@3', 'sd@4', 'ia@5', 'in@6', 'oh@7', 'pa@8', 'nj@9', 'ct@10', 'ri@11'],
  ['ca@1', 'ut@2', 'co@3', 'ne@4', 'mo@5', 'ky@6', 'wv@7', 'va@8', 'md@9', 'de@10'],
  ['az@2', 'nm@3', 'ks@4', 'ar@5', 'tn@6', 'nc@7', 'sc@8', 'dc@9'],
  ['ok@4', 'la@5', 'ms@6', 'al@7', 'ga@8'],
  ['hi@0', 'tx@4', 'fl@9', 'pr@11'],
];

export const STATE_TILES: readonly { id: string; x: number; y: number }[] = ROWS.flatMap((row, y) => row.map(cell => {
  const [id, x] = cell.split('@');
  return { id, x: Number(x), y };
}));
