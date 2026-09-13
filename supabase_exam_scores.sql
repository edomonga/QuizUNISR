-- Correzione dei risultati storici (da eseguire come proprietario nel SQL Editor).
-- Prima lettura: docs/exam-scoring.md.
-- Anteprima per default: ROLLBACK finale annulla TUTTE le modifiche.
-- Dopo aver verificato i risultati, sostituire SOLO l'ultimo ROLLBACK con COMMIT
-- ed eseguire nuovamente l'intero file.
begin;

-- Impedisce che regole o risultati cambino tra controllo, backup e aggiornamento.
lock table public.courses in share mode;
lock table public.exam_results in share row exclusive mode;

create table if not exists public.exam_score_repair_backup (
  exam_result_id uuid primary key,
  old_raw_score numeric not null,
  old_score_in_30 numeric not null,
  new_raw_score numeric not null,
  new_score_in_30 numeric not null,
  rules_at_repair jsonb not null,
  repaired_at timestamptz not null default now()
);
alter table public.exam_score_repair_backup enable row level security;
revoke all on public.exam_score_repair_backup from anon, authenticated;

-- Non si deducono le vecchie regole dal solo nome della materia.
-- Si considerano compatibili solo righe i cui conteggi, punti grezzi e voto
-- coincidono con la vecchia formula applicata alle regole correnti.
-- Questo NON dimostra che le regole siano rimaste invariate: vedere la guida.
create temporary table exam_score_repair_plan on commit drop as
with rules as (
  select id, exam_rules,
    (exam_rules->>'total_questions')::numeric as total,
    (exam_rules->>'correct_score')::numeric as points,
    (exam_rules->>'wrong_penalty')::numeric as penalty
  from public.courses
), checked as (
  select e.*, r.exam_rules,
    round(e.correct * r.points - e.wrong * r.penalty, 10) as expected_raw,
    greatest(0, round(e.raw_score / nullif(r.total, 0) * 30, 1)) as legacy_grade,
    greatest(0, least(30, round(round(
      e.raw_score / nullif(r.total * r.points, 0) * 30, 10), 0))) as new_grade,
    case
      when r.total is null or r.total <= 0 or r.points is null or r.points <= 0
        or r.penalty is null or r.penalty < 0 then 'regole non valide'
      when e.correct < 0 or e.wrong < 0 or e.omitted < 0
        or e.correct + e.wrong + e.omitted <> r.total then 'conteggi incompatibili'
      when abs(e.raw_score - (e.correct * r.points - e.wrong * r.penalty)) > 0.00000001
        then 'punti incompatibili con le regole attuali'
      when exists (select 1 from public.exam_score_repair_backup b where b.exam_result_id = e.id)
        then 'gia aggiornato'
      else null
    end as reason
  from public.exam_results e
  join rules r on r.id = e.course_id
)
select *, coalesce(reason,
  case when abs(score_in_30 - legacy_grade) > 0.00000001 then 'voto diverso dalla vecchia formula'
       when score_in_30 = new_grade and raw_score = expected_raw then 'nessuna modifica'
       else 'da aggiornare' end) as status
from checked;

-- Resoconto e dettagli: nessun dato identificativo degli studenti è necessario.
select course_name, status, count(*) as results
from exam_score_repair_plan group by course_name, status order by course_name, status;
select id, course_name, raw_score, score_in_30 as old_grade, new_grade
from exam_score_repair_plan where status = 'da aggiornare' order by course_name, id;

insert into public.exam_score_repair_backup
  (exam_result_id, old_raw_score, old_score_in_30, new_raw_score, new_score_in_30, rules_at_repair)
select id, raw_score, score_in_30, expected_raw, new_grade, exam_rules
from exam_score_repair_plan where status = 'da aggiornare';

update public.exam_results e
set raw_score = p.expected_raw, score_in_30 = p.new_grade
from exam_score_repair_plan p
where e.id = p.id and p.status = 'da aggiornare';

-- ANTEPRIMA: per applicare davvero sostituire con COMMIT;
rollback;
