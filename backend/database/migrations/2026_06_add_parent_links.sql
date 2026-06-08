-- Migration: adiciona tabela parent_links para mapear usuários pais a alunos
CREATE TABLE IF NOT EXISTS parent_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    aluno_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY ux_parent_aluno (usuario_id, aluno_id),
    CONSTRAINT fk_parent_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE
);

-- Nota: Este arquivo deve ser aplicado em staging/produção somente após backup.
