import type { Card } from '../types';
import { useStore } from '../state/StoreContext';
import { Autosize } from '../components/Autosize';

export function TableCard({ card }: { card: Extract<Card, { type: 'table' }> }) {
  const { dispatch } = useStore();
  const rows = card.data.rows;

  const commit = (next: string[][]) =>
    dispatch({ t: 'card/data', id: card.id, data: { rows: next } });

  const setCell = (r: number, c: number, value: string) =>
    commit(rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)));

  const cols = rows[0]?.length ?? 1;

  return (
    <>
      <div className="table-wrap">
        <table className="grid-table">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>
                    <Autosize
                      className="field"
                      value={cell}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-tools">
        <button onClick={() => commit([...rows, new Array(cols).fill('')])}>+ Row</button>
        <button onClick={() => commit(rows.map((r) => [...r, '']))}>+ Column</button>
        <button
          disabled={rows.length <= 1}
          onClick={() => commit(rows.slice(0, -1))}
        >
          − Row
        </button>
        <button
          disabled={cols <= 1}
          onClick={() => commit(rows.map((r) => r.slice(0, -1)))}
        >
          − Column
        </button>
      </div>
    </>
  );
}
