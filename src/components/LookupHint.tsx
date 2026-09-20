export default function LookupHint() {
  return (
    <div className="mt-4 border border-gray-300 border-l-4 border-l-hv-blue bg-white">
      <div className="px-4 py-2 bg-hv-light">
        <h2 className="font-bold text-hv-dark">Look up a single material</h2>
      </div>
      <div className="px-4 py-3 text-sm text-hv-text space-y-2">
        <p>To see where one material falls in the diagram:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <strong>Material A:</strong> pick the material from the list, or choose{' '}
            <em>Custom alloy…</em> and enter its composition.
          </li>
          <li>
            <strong>Base metal balance:</strong> move the slider all the way to the left (100 % A).
          </li>
          <li>
            <strong>Filler C</strong> (or <strong>Cladding filler C2</strong>): choose{' '}
            <em>None — autogenous weld</em>.
          </li>
        </ol>
        <p>Material B is then hidden, and the result applies to Material A alone.</p>
      </div>
    </div>
  )
}
