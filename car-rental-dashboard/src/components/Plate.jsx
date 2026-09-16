/** A registration number, set like an Indian commercial number plate. */
export default function Plate({ number, size }) {
  if (!number) return <span className="cell-sub">No plate</span>
  return <span className={`plate ${size === 'lg' ? 'lg' : ''}`}>{number}</span>
}
