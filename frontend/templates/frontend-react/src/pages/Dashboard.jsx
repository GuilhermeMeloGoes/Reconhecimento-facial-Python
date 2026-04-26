import { useApi } from '../hooks/useApi'

export default function Dashboard() {
  const { data: presentes = [] } = useApi('/api/presentes', 5000)
  const { data: resumo = {} }    = useApi('/api/resumo',    5000)
  const { data: atividades = [] } = useApi('/api/atividades', 5000)

  return (
    <>
      <div className="grid-3 mb-6">
        <div className="card">
          <div className="card-label" style={styles.cardLabel}>presentes hoje</div>
          <div style={{ ...styles.cardValue, color: 'var(--accent)' }}>
            {resumo.presentes ?? '--'}
          </div>
        </div>
        <div className="card">
          <div className="card-label" style={styles.cardLabel}>ausentes</div>
          <div style={{ ...styles.cardValue, color: 'var(--danger)' }}>
            {resumo.ausentes ?? '--'}
          </div>
        </div>
        <div className="card">
          <div className="card-label" style={styles.cardLabel}>total cadastrado</div>
          <div style={{ ...styles.cardValue, color: 'var(--muted)' }}>
            {resumo.total ?? '--'}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>ATIVIDADE RECENTE</span>
            <span className="badge badge-blue" style={{ fontSize: 10 }}>LIVE</span>
          </div>
          <div style={styles.list}>
            {atividades.length === 0
              ? <p className="text-muted mono" style={{ fontSize: 12, padding: '16px 0' }}>Aguardando registros...</p>
              : atividades.map((a, i) => (
                  <div key={i} className="fade-in" style={styles.item}>
                    <Avatar nome={a.nome} />
                    <div style={styles.info}>
                      <div style={styles.nome}>{a.nome}</div>
                      <div style={styles.meta}>
                        {a.tipo.toUpperCase()} · {a.timestamp.substring(11, 19)}
                      </div>
                    </div>
                    <span className={`tag tag-${a.tipo}`}>{a.tipo}</span>
                  </div>
                ))
            }
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>PRESENTES AGORA</span>
            <a href="/relatorio" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 11 }}>
              ver relatório completo →
            </a>
          </div>
          <div style={styles.list}>
            {presentes.length === 0
              ? <p className="text-muted mono" style={{ fontSize: 12, padding: '16px 0' }}>Nenhum aluno detectado ainda hoje.</p>
              : presentes.map((p, i) => (
                  <div key={i} className="fade-in" style={styles.item}>
                    <Avatar nome={p.nome} />
                    <div style={styles.info}>
                      <div style={styles.nome}>{p.nome}</div>
                      <div style={styles.meta}>
                        {p.matricula} · {p.turma || '—'} · {p.entrada_em.substring(11, 16)}
                      </div>
                    </div>
                    <span className="tag tag-entrada">dentro</span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

function Avatar({ nome }) {
  return (
    <div style={styles.avatar}>
      {nome.charAt(0).toUpperCase()}
    </div>
  )
}

const styles = {
  cardLabel: {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardValue: {
    fontFamily: 'var(--mono)',
    fontSize: 36,
    fontWeight: 700,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 320,
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'var(--bg3)',
    borderRadius: 6,
    border: '1px solid var(--border)',
  },
  avatar: {
    width: 34, height: 34,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
    color: '#000', flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  nome: { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 },
}