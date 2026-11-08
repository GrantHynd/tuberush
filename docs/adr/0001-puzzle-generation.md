# ADR 0001: AWS Lambdas are the single daily puzzle generator

- **Status:** Accepted (2026-10-24, Grant Hynd)
- **Linear:** TUB-248 (decision), TUB-249 (retirement)

## Context

Daily puzzles were generated two ways:

1. **AWS Lambdas:** `lambda/generate-connections` and `lambda/generate-crossword`, deployed with SAM (`template.yaml`) and run by EventBridge Scheduler at 02:00 and 02:30 UTC with 2 retries.
2. **Supabase edge function:** `supabase/functions/schedule-daily-games`. Nothing scheduled it; it ran only when invoked by hand or over HTTP.

The two had drifted. The Lambda fills a 9x9 template with a solver and Claude writes only the clues. The edge function still asked Claude for a whole 5x5 grid, the old format. Running both risked conflicting or invalid puzzles.

## Decision

The AWS Lambdas are the only scheduled generator that inserts published `games` rows. They still do that directly. The `schedule-daily-games` edge function is removed from the repo and will be undeployed.

`puzzle_drafts` and publish keys are a second ingestion path. A bot submits a draft, an admin approves it, and the publish service marks it published. That update does not insert into `games`. A publish key cannot write `public.games`.

## Rationale

- **Correctness:** the Lambdas produce the current puzzle format (solver-validated crosswords).
- **Scheduling and retries:** EventBridge Scheduler provides managed schedules and retries. The edge function had no schedule.
- **Runtime limits:** Lambda timeouts are 300s, and 900s for the crossword, which fits Claude skill calls that take several minutes. The edge function's wall-clock limit is about 150s.
- **Testability and observability:** the Lambdas have unit tests that run in CI (TUB-245), and CloudWatch logs and metrics make it easy to alert when the nightly puzzle is missing (TUB-250).
- **Cost:** about the same either way, since nearly all of it is Claude tokens. Cost didn't decide this.

## Consequences

- Secrets live only in AWS Secrets Manager (`tuberush/daily-games`). The edge function's Supabase secrets get removed.
- Manual backfills go through the Lambda (`sam remote invoke` or a future `workflow_dispatch` workflow), not the edge function.
- New daily game types that publish straight into `games` need a new Lambda and schedule in `template.yaml`.
- Draft ingestion is separate: submit with a publish key, review, then mark published. It does not replace the Lambda insert into `games`.
