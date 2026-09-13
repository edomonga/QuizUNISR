// Test di integrazione PostgreSQL isolato; richiede @electric-sql/pglite.
// PGLITE_MODULE può indicare un'installazione temporanea esterna al repository.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = await readFile(new URL('../supabase_exam_scores.sql', import.meta.url), 'utf8');
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
try {
  await db.exec(`
    create role anon; create role authenticated;
    create table public.courses (id uuid primary key, exam_rules jsonb not null);
    create table public.exam_results (
      id uuid primary key, course_id uuid references public.courses,
      course_name text, raw_score numeric, score_in_30 numeric,
      correct integer, wrong integer, omitted integer
    );
  `);
  for (const [n, total, points, penalty] of [
    [1, 45, 0.7, 0], [2, 30, 1, 0.51], [3, 30, 1, 0.5], [4, 45, 0.7, 0.25],
  ]) {
    await db.query('insert into courses values ($1, $2)', [id(n), JSON.stringify({
      total_questions: total, correct_score: points, wrong_penalty: penalty,
    })]);
  }
  // 1: screenshot; 2: tutte corrette; 3: punti incompatibili; 4: conteggi incompatibili;
  // 5: già nuovo voto; 6: vecchio arrotondamento a 17.5 NON deve diventare 18;
  // 7: vera soglia 17.5; 8: penalità; 9: voto sconosciuto; 10: tutte omesse.
  for (const [n, course, raw, grade, correct, wrong, omitted] of [
    [1, 1, 27.299999999999997, 18.2, 39, 6, 0],
    [2, 1, 31.5, 21, 45, 0, 0],
    [3, 1, 39, 26, 39, 6, 0],
    [4, 1, 27.3, 18.2, 39, 5, 0],
    [5, 1, 27.3, 26, 39, 6, 0],
    [6, 2, 17.49, 17.5, 18, 1, 11],
    [7, 3, 17.5, 17.5, 18, 1, 11],
    [8, 4, 25.8, 17.2, 39, 6, 0],
    [9, 1, 27.3, 12, 39, 6, 0],
    [10, 1, 0, 0, 0, 0, 45],
  ]) {
    await db.query('insert into exam_results values ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id(n), id(course), 'Materia di test', raw, grade, correct, wrong, omitted]);
  }
  const readScores = async () => (await db.query('select * from exam_results order by id')).rows;
  const before = await readScores();
  await db.exec(migration);
  assert.deepEqual(await readScores(), before, 'anteprima senza modifiche');
  assert.equal((await db.query("select to_regclass('public.exam_score_repair_backup') as name")).rows[0].name, null);

  const apply = migration.replace(/rollback;\s*$/, 'commit;');
  assert.notEqual(apply, migration);
  await db.exec(apply);
  const after = await readScores();
  assert.deepEqual(after.map(r => Number(r.score_in_30)), [26, 30, 26, 18.2, 26, 17, 18, 25, 12, 0]);
  assert.equal(Number(after[0].raw_score), 27.3);
  const backup = (await db.query('select * from exam_score_repair_backup order by exam_result_id')).rows;
  assert.equal(backup.length, 5);
  assert.equal(Number(backup[0].old_score_in_30), 18.2);
  assert.equal(Number(backup[0].new_score_in_30), 26);
  assert.equal((await db.query("select has_table_privilege('authenticated', 'exam_score_repair_backup', 'SELECT') as allowed")).rows[0].allowed, false);
  await db.exec(apply);
  assert.deepEqual(await readScores(), after, 'seconda esecuzione idempotente');
  assert.deepEqual((await db.query('select * from exam_score_repair_backup order by exam_result_id')).rows, backup);
  console.log('OK: anteprima, normalizzazione, arrotondamento, esclusioni, backup protetto e idempotenza.');
} finally {
  await db.close();
}
