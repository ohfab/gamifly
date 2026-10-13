import { Art, ART_KEYS } from './Art'

/** Visual QA page: open the app with ?artsheet to see every illustration. */
export default function ArtSheet() {
  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10, background: '#f5f3ea', minHeight: '100vh' }}>
      {ART_KEYS.map((k) => (
        <div key={k} style={{ background: '#fff', borderRadius: 14, padding: 8, textAlign: 'center', fontSize: 10, fontFamily: 'monospace', color: '#555' }}>
          <Art name={k} size={64} style={{ margin: '0 auto' }} />
          <div style={{ marginTop: 4, wordBreak: 'break-all' }}>{k}</div>
        </div>
      ))}
    </div>
  )
}
