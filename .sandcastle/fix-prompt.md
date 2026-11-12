# TASK

Pull request {{PR}} merges branch `{{BRANCH}}` into `{{BASE_BRANCH}}`, and it can't merge yet: {{PROBLEM}}. Fix that on this branch, and change nothing else.

# CONTEXT

## Commits on this branch

!`git log origin/{{BASE_BRANCH}}..{{BRANCH}} --oneline`

## Failing CI log (empty when the problem is a conflict)

```
{{CI_LOG}}
```

# PROCESS

1. **If the branch conflicts with `{{BASE_BRANCH}}`**: run `{{UPDATE_COMMAND}}` (the base is already fetched; don't fetch or push). Resolve each conflict so both sides' intent survives: what `{{BASE_BRANCH}}` changed stays, and this branch's change is reapplied on top of it. Continue non-interactively (`GIT_EDITOR=true git rebase --continue`, or commit the merge).
2. **If CI failed**: read the log above, reproduce the failure locally with the same command, and fix the cause. Fix the code, not the test, unless the test itself is wrong about the behaviour the issue asks for. Never skip, delete or loosen a test to get it passing.
3. Run `bun run check-types`, `bun run lint`, `bun run test` (never plain `bun test`), `bun run build` and the e2e specs for the area you touched (`bun run test:e2e e2e/<spec>.spec.ts`). Do **NOT** run watch-mode commands (`ts-lint`, `dev`, `serve`, `test:e2e:ui`, or anything with `--watch`).
4. Commit any fix with one short imperative line under about 50 characters and no body.

Follow the coding standards in @.sandcastle/CODING_STANDARDS.md. Never kill processes by name or pattern (no `pkill`, `killall`); only `kill <pid>` for a process you started, after checking it with `ps -p <pid> -o pid,command`.

If the failure has nothing to do with this branch (a flaky test that passes when rerun, a CI outage), make no commit and say so.

Once complete, output <promise>COMPLETE</promise>.
