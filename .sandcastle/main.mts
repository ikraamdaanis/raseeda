// Sequential Reviewer: implement → review → PR loop
//
// Per iteration:
//   1. Sweep: merge any open PR that is auto-eligible (MERGEABLE, linked
//      issue lacks `gate-review`, CI passed if it targets main). Self-heals races
//      where the inline merge step missed a PR (e.g. an issue's Parent ref was
//      added after the implementer ran, or a PR was retargeted by hand).
//   2. Pick the next eligible AFK issue from GitHub (not blocked by an open issue).
//   3. Classify it: standalone, or a child of a PRD parent issue.
//      - Standalone        → branch off main, PR into main.
//      - PRD child         → branch off feature/prd-<n> (created if missing,
//                             rebased on main if it exists), PR into that branch.
//   4. Run the implementer agent on a dedicated child branch.
//   5. Run the reviewer agent on the same branch (cleanup pass).
//   6. Push and open a PR. PRs targeting a feature branch are merged at once;
//      PRs into `main` are merged once CI passes (left open if it fails).
//      `gate-review` on the issue makes either wait for a human instead.
//   7. If this was the last open child of its PRD, open a feature → main PR
//      for the parent, merged once CI passes like any PR into main.
//
// GitHub conventions assumed:
//   - Label `ready-for-agent`: sandcastle-eligible (the explicit opt-in).
//     This is what the project's /to-issues skill applies.
//   - Label `hitl`: never picked (informational; eligible issues just
//     don't have it).
//   - Label `gate-review`: the resulting PR awaits human review instead of
//     being merged by the loop.
//   - `Parent: #N` or a `## Parent` section declares the PRD parent.
//   - `Blocked by: #N, #M` or a `## Blocked by` section declares dependencies
//     (open ones gate the issue from being picked).
//     References may be `#N`, `owner/repo#N`, or a full issue URL.
//
// Usage:
//   npx tsx .sandcastle/main.ts

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_ITERATIONS = 50;

// Each issue is implemented and reviewed inside a docker container, isolated
// from the host, on its own git worktree/branch. This follows sandcastle's
// recommended pattern (the shipped sequential-reviewer template): one sandbox
// per issue via createSandbox(), shared by both phases, torn down by close().
//
// `bun install` runs inside the container on sandbox start. The host bun cache
// is bind-mounted so install resolves from already-downloaded tarballs instead
// of re-fetching 1100+ packages, which would blow the hook timeout. We do NOT
// copyToWorktree node_modules: at ~1.1GB the host-side copy is slow on macOS
// and risks the copy timeout, and the cache-backed in-container install is both
// correct (Linux-native binaries) and fast.
//
// The operator's global ~/.claude/CLAUDE.md is mounted read-only so the
// in-container agent applies personal preferences on top of the project's
// CLAUDE.md. Mounting the single file (not ~/.claude/) avoids exposing session
// state, settings.json (API keys / MCP credentials), and other unrelated state.
const globalClaudeMd = `${homedir()}/.claude/CLAUDE.md`;
const sandboxMounts = [
  { hostPath: "~/.bun/install/cache", sandboxPath: "~/.bun/install/cache" },
  ...(existsSync(globalClaudeMd)
    ? [
        {
          hostPath: "~/.claude/CLAUDE.md",
          sandboxPath: "~/.claude/CLAUDE.md",
          readonly: true
        }
      ]
    : [])
];

const agent = sandcastle.claudeCode("claude-opus-5-5");

// The image already holds Playwright's browsers for the version it was built
// with, so the install after `bun install` is a no-op unless the project's
// Playwright has moved on since.
const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: "bun install", timeoutMs: 300_000 },
      { command: "bunx playwright install chromium webkit", timeoutMs: 600_000 }
    ]
  }
};

const copyToWorktree: string[] = [];

const HOST_BRANCH = sh("git rev-parse --abbrev-ref HEAD").trim();

if (HOST_BRANCH !== "main") {
  throw new Error(`Run sandcastle from main, not ${HOST_BRANCH}`);
}

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

type Issue = {
  number: number;
  title: string;
  body: string;
  labels: string[];
  blockedBy: number[];
  parent: number | null;
};

// Issues this run just closed. GitHub's search index lags `gh issue close` by
// a few seconds, so the next iteration's `gh issue list --state open` can
// still echo back a freshly-closed number. Without this guard, downstream
// issues that listed the just-closed one in `## Blocked by` look blocked and
// the loop stops with "No eligible AFK issues" even though the chain should
// continue. The complementary lag (a just-closed issue being re-picked) is
// handled by `pickHighestPriority`'s in-memory attempted set elsewhere; this
// set handles the dependency-graph side.
const recentlyClosed = new Set<number>();

function listEligibleIssues(): Issue[] {
  const raw = sh(
    `gh issue list --state open --label ready-for-agent --assignee @me ` +
      `--json number,title,body,labels --limit 200`
  );

  const all: Issue[] = JSON.parse(raw)
    .filter((issue: { number: number }) => !recentlyClosed.has(issue.number))
    .map(
      (issue: {
        number: number;
        title: string;
        body: string;
        labels: { name: string }[];
      }) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? "",
        labels: issue.labels.map((label: { name: string }) => label.name),
        blockedBy: parseBlockedBy(issue.body ?? ""),
        parent: parseParent(issue.body ?? "")
      })
    );

  const openNumbers = new Set(all.map(issue => issue.number));
  const handledByPr = issuesHandledByPr();

  return all.filter(
    issue =>
      !issue.blockedBy.some(blockedNumber => openNumbers.has(blockedNumber)) &&
      !handledByPr.has(issue.number)
  );
}

// Issues already spoken for by a PR, either one in flight (open) or one that
// has already merged. The script writes `Closes #N` into every PR body, so
// parsing those bodies for closing keywords tells us which issues are taken.
//
// Merged PRs must be counted, not just open ones: a `gate-review` child is
// merged by a human into the feature branch, which does NOT auto-close its
// issue (GitHub only auto-closes on default-branch merges) and the gated path
// never closes it itself. Counting only open PRs leaves such an issue
// open-but-done, so the next iteration re-picks it into a duplicate PR. We
// deliberately ignore closed-but-unmerged PRs: that work was abandoned, so the
// issue is fair game again.
function issuesHandledByPr(): Set<number> {
  const raw = sh(`gh pr list --state all --json body,state --limit 200`);
  const prs: { body: string; state: string }[] = JSON.parse(raw);
  const numbers = new Set<number>();
  const closeRe = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

  for (const pr of prs) {
    if (pr.state !== "OPEN" && pr.state !== "MERGED") continue;

    for (const match of (pr.body ?? "").matchAll(closeRe)) {
      numbers.add(Number(match[1]));
    }
  }

  return numbers;
}

// Slice out a labelled section's body. The label may be a markdown heading
// (`## Parent`) or an inline `Parent:` line; we take everything from there up
// to the next heading (or end of body). This is what lets a reference sit on
// the line *after* the label, the way GitHub's issue editor lays it out.
function sectionBody(body: string, label: string): string {
  const start = new RegExp(`^(?:#{1,6}\\s*${label}|${label}\\s*:)`, "im").exec(
    body
  );

  if (!start) return "";

  const rest = body.slice(start.index + start[0].length);
  const next = rest.search(/\n#{1,6}\s/);

  return next === -1 ? rest : rest.slice(0, next);
}

// Fetch an issue's raw markdown body.
function issueBody(n: number): string {
  const raw = sh(`gh issue view ${n} --json body`);

  return (JSON.parse(raw) as { body: string }).body ?? "";
}

// Plain-English explanation pulled from an issue's authored prose. Every PR
// must carry a human-readable description, not just `Closes #N`; we reuse the
// issue/PRD markdown (already written in plain English) rather than restating
// the diff. Returns the named sections joined, or "" when none are present.
function plainEnglishFromIssue(n: number, sections: string[]): string {
  const body = issueBody(n);

  return sections
    .map(section => sectionBody(body, section).trim())
    .filter(Boolean)
    .join("\n\n");
}

// Issue numbers referenced in a chunk of text. Accepts the bare `#123`, the
// cross-repo `owner/repo#123` form, and full `…/issues/123` URLs. GitHub
// renders all three identically, so issue authors use them interchangeably.
function issueRefs(text: string): number[] {
  const nums = new Set<number>();

  for (const match of text.matchAll(/#(\d+)/g)) nums.add(Number(match[1]));

  for (const match of text.matchAll(/\/issues\/(\d+)/g))
    nums.add(Number(match[1]));

  return [...nums];
}

function parseBlockedBy(body: string): number[] {
  return issueRefs(sectionBody(body, "blocked[- ]by"));
}

function parseParent(body: string): number | null {
  return issueRefs(sectionBody(body, "parent"))[0] ?? null;
}

function siblingsOf(
  parent: number
): { number: number; title: string; state: string }[] {
  const raw = sh(
    `gh issue list --state all --search "Parent: #${parent} in:body" ` +
      `--json number,title,state --limit 200`
  );

  return JSON.parse(raw);
}

function issueTitle(n: number): string {
  return JSON.parse(sh(`gh issue view ${n} --json title`)).title as string;
}

// The PRD feature branch carries the parent issue's slugified title for
// readability, e.g. feature/prd-1782-add-usage-details-to-credit-report.
// Derived from the title so every iteration resolves the same branch for a
// given parent. Note that renaming the parent issue would point subsequent
// runs at a fresh branch.
function featureBranchFor(parent: number): string {
  const slug = slugify(issueTitle(parent));

  return slug ? `feature/prd-${parent}-${slug}` : `feature/prd-${parent}`;
}

// Pick by priority label (high > medium > low > unprioritised), breaking ties
// toward bugs, then the lowest issue number. Ordered by the repo's priority and
// type labels.
function pickHighestPriority(issues: Issue[]): Issue {
  const priorityRank = (issue: Issue) => {
    const labels = issue.labels.map(label => label.toLowerCase());

    if (labels.includes("high")) return 0;

    if (labels.includes("medium")) return 1;

    if (labels.includes("low")) return 2;

    return 3;
  };

  const bugRank = (issue: Issue) =>
    issue.labels.map(label => label.toLowerCase()).includes("bug") ? 0 : 1;

  return [...issues].sort(
    (a, b) =>
      priorityRank(a) - priorityRank(b) ||
      bugRank(a) - bugRank(b) ||
      a.number - b.number
  )[0] as Issue;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

// auto: merge at once (into a feature branch). afterChecks: merge once CI
// passes (into main). gated: wait for a human.
type MergeMode = "auto" | "afterChecks" | "gated";

type Plan = {
  kind: "standalone" | "prd-child";
  base: string;
  mergeMode: MergeMode;
  parent: number | null;
};

function planFor(issue: Issue): Plan {
  // A PR into main merges once CI passes; one into a feature branch merges at
  // once. `gate-review` makes either wait for a human instead.
  const isGated = issue.labels.includes("gate-review");

  if (issue.parent === null) {
    return {
      kind: "standalone",
      base: "main",
      mergeMode: isGated ? "gated" : "afterChecks",
      parent: null
    };
  }

  const featureBranch = featureBranchFor(issue.parent);

  ensureFeatureBranch(featureBranch);

  const mergeMode = isGated ? "gated" : "auto";

  return {
    kind: "prd-child",
    base: featureBranch,
    mergeMode,
    parent: issue.parent
  };
}

function ensureFeatureBranch(branch: string) {
  const localExists = sh(`git branch --list ${branch}`).trim() !== "";
  const remoteExists =
    sh(`git ls-remote --heads origin ${branch}`).trim() !== "";

  if (!localExists && !remoteExists) {
    sh(`git fetch origin main`);
    sh(`git branch ${branch} origin/main`);
    sh(`git push -u origin ${branch}`);

    return;
  }

  // Fetch both refs so we can sync local to remote before merging main in.
  // The remote feature branch advances on its own when child PRs auto-merge,
  // so the local copy is routinely stale by the next iteration.
  sh(`git fetch origin main ${branch}`);

  if (!localExists) {
    sh(`git branch ${branch} origin/${branch}`);
  }

  // Keep the feature branch fresh against main. We merge (not rebase) so this
  // works under branch protection; feature/** is protected with required CI
  // checks but no required approvals, which means force-push is blocked.
  // Merge commits accumulate inside the feature branch but get squashed away
  // when the final feature → main PR lands.
  sh(`git checkout ${branch}`);

  // Fast-forward to remote first to pick up any auto-merged child PRs.
  // --ff-only fails loudly if local has diverged, since the only writer to
  // the remote feature branch should be the auto-merger.
  sh(`git merge --ff-only origin/${branch}`);
  sh(`git merge --no-edit origin/main`);
  sh(`git push origin ${branch}`);
  sh(`git checkout ${HOST_BRANCH}`);
}

// ---------------------------------------------------------------------------
// PR helpers
// ---------------------------------------------------------------------------

// Where a PR's CI stands: passed once every check passed (or was skipped),
// failed once any failed or was cancelled, pending otherwise, including
// before GitHub has registered any.
function checksState(url: string): "passed" | "failed" | "pending" {
  let raw: string;

  try {
    raw = sh(`gh pr checks ${url} --json bucket`);
  } catch (error) {
    // gh exits non-zero while checks fail or are pending, and before any are
    // registered; its JSON still says which.
    raw = (error as { stdout?: string }).stdout ?? "";
  }

  let buckets: string[];

  try {
    buckets = (JSON.parse(raw) as { bucket: string }[]).map(
      check => check.bucket
    );
  } catch {
    return "pending";
  }

  if (buckets.some(bucket => bucket === "fail" || bucket === "cancel")) {
    return "failed";
  }

  if (buckets.length === 0 || buckets.includes("pending")) return "pending";

  return "passed";
}

// Waits up to 30 minutes for a PR's CI. Resolves whether it passed.
function waitForChecks(url: string): boolean {
  const deadline = Date.now() + 30 * 60_000;

  while (Date.now() < deadline) {
    const state = checksState(url);

    if (state !== "pending") return state === "passed";

    sh("sleep 20");
  }

  return false;
}

function findOpenPr(head: string, base: string): string | null {
  const raw = sh(
    `gh pr list --state open --base ${base} --head ${head} --json url --limit 1`
  );
  const prs: { url: string }[] = JSON.parse(raw);

  return prs[0]?.url ?? null;
}

function openPr(args: {
  base: string;
  head: string;
  title: string;
  body: string;
  mergeMode: MergeMode;
  closesIssue?: number;
  labels?: string[];
}): string {
  const url = sh(
    `gh pr create --base ${args.base} --head ${args.head} ` +
      `--title ${shellQuote(args.title)} --body ${shellQuote(args.body)}`
  ).trim();

  // Apply labels best-effort. The PR and its pushed branch already exist by
  // this point, so a label that is missing from the repo must never abort the
  // run (that would strand the branch and the agent's work). Skip any that fail.
  for (const label of args.labels ?? []) {
    try {
      sh(`gh pr edit ${url} --add-label ${shellQuote(label)}`);
    } catch {
      console.warn(`  skipped label '${label}' (not found in repo) on ${url}`);
    }
  }

  if (args.mergeMode === "afterChecks" && !waitForChecks(url)) {
    console.warn(`  CI didn't pass on ${url}; leaving it open.`);

    return url;
  }

  if (args.mergeMode !== "gated") {
    mergePrAndCloseIssue({
      url,
      head: args.head,
      closesIssue: args.closesIssue
    });
  }

  return url;
}

// Labels the loop carries over from an issue to its PR. `ready-for-agent` and
// `hitl` are loop-eligibility markers (they live on issues to gate the queue)
// and don't describe the PR, so drop them. Everything else (priority labels
// like `bug`/`tracer`/`polish`/`refactor`, category labels like
// `enhancement`, plus `sandcastle` as a provenance marker) flows through.
function prLabelsFromIssue(labels: string[]): string[] {
  return withSandcastleMarker(labels, ["ready-for-agent", "hitl"]);
}

// Labels the loop carries over from a PRD parent issue to its wrap-up PR.
// Same filter as `prLabelsFromIssue`, with the addition of `documentation`:
// PRDs carry that label so the loop never picks them as implementation
// work, but the wrap-up PR is the actual feature landing on main and
// shouldn't read as docs.
function prLabelsFromPrd(labels: string[]): string[] {
  return withSandcastleMarker(labels, [
    "ready-for-agent",
    "hitl",
    "documentation"
  ]);
}

// Filter out the given labels (case-insensitive) and ensure `sandcastle` is
// in the result so every loop-created PR carries the provenance marker,
// even when the source issue had nothing else worth propagating.
function withSandcastleMarker(labels: string[], drop: string[]): string[] {
  const lowered = new Set(drop.map(label => label.toLowerCase()));
  const filtered = labels.filter(label => !lowered.has(label.toLowerCase()));

  return [...new Set([...filtered, "sandcastle"])];
}

function issueLabels(n: number): string[] {
  const raw = sh(`gh issue view ${n} --json labels`);
  const issue = JSON.parse(raw) as { labels: { name: string }[] };

  return issue.labels.map(label => label.name);
}

// Merge an auto-eligible PR via gh, clean up the local worktree first so
// `--delete-branch` can succeed, and close the linked issue. GitHub's
// `Closes #N` keyword only auto-closes when merging into the default branch,
// and PRs into a feature branch don't, so we close the issue ourselves
// otherwise it stays open and gets re-picked next iteration.
function mergePrAndCloseIssue(args: {
  url: string;
  head: string;
  closesIssue?: number;
}) {
  // `gh pr merge --delete-branch` also tries to delete the local branch,
  // which fails while the branch is still checked out in a worktree. Tear the
  // worktree down first so the local cleanup succeeds.
  tearDownWorktree(args.head);

  sh(`gh pr merge ${args.url} --rebase --delete-branch`);

  if (args.closesIssue !== undefined) {
    // Tolerate already-closed: a human may have closed the issue between
    // the merge call and now, in which case `gh issue close` exits non-zero
    // and would kill the whole iteration otherwise.
    try {
      sh(`gh issue close ${args.closesIssue}`);
    } catch {
      // already closed; nothing to do
    }

    // Whether we closed it or it was already closed, record the number so
    // the next iteration's `listEligibleIssues` ignores it even if GitHub's
    // search index hasn't caught up. See `recentlyClosed` for context.
    recentlyClosed.add(args.closesIssue);
  }
}

// If `parent`'s last open child just closed, open the feature → main wrap-up
// PR. Idempotent: bails if a wrap-up PR is already open for this feature
// branch. Used both by the inline post-PR step and the sweep.
function maybeOpenPrdWrapUp(parent: number) {
  const siblings = siblingsOf(parent);
  const stillOpen = siblings.filter(sibling => sibling.state === "OPEN").length;

  if (stillOpen !== 0) return;

  const featureBranch = featureBranchFor(parent);
  const existing = findOpenPr(featureBranch, "main");

  if (existing) {
    console.log(`  PRD wrap-up PR already open: ${existing}`);

    return;
  }

  const wrapUrl = openPr({
    base: "main",
    head: featureBranch,
    title: `${issueTitle(parent)} (#${parent})`,
    body: wrapUpBody(parent, siblings),
    mergeMode: issueLabels(parent).includes("gate-review")
      ? "gated"
      : "afterChecks",
    closesIssue: parent,
    labels: prLabelsFromPrd(issueLabels(parent))
  });

  console.log(`  PRD wrap-up PR: ${wrapUrl}`);
}

// Self-healing sweep run at the top of every iteration. Catches PRs that
// became auto-eligible after the iteration that opened them (races: the
// issue's Parent ref was added mid-iteration, a stale PR was retargeted
// from main to a feature branch by hand, gate-review was removed, CI on a
// PR into main went green after the inline wait gave up, etc).
// Without this the loop would skip those issues forever because they have
// open PRs but the merge step only fires inline with `openPr`.
function sweepAutoMergeablePrs() {
  const raw = sh(
    `gh pr list --state open ` +
      `--json number,url,baseRefName,headRefName,mergeable,body --limit 200`
  );
  const prs = JSON.parse(raw) as {
    number: number;
    url: string;
    baseRefName: string;
    headRefName: string;
    mergeable: string;
    body: string;
  }[];

  const closeRe = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const sweptParents = new Set<number>();
  let mergedCount = 0;

  for (const pr of prs) {
    // Skip CONFLICTING and UNKNOWN. UNKNOWN is usually a transient state
    // (GitHub still computing the merge); next iteration will retry.
    if (pr.mergeable !== "MERGEABLE") continue;

    // A PR into main merges only once CI has passed on it.
    if (pr.baseRefName === "main" && checksState(pr.url) !== "passed") {
      continue;
    }

    const closeMatch = [...(pr.body ?? "").matchAll(closeRe)][0];
    const issueNum = closeMatch ? Number(closeMatch[1]) : null;

    let parent: number | null = null;

    if (issueNum !== null) {
      const issueRaw = sh(`gh issue view ${issueNum} --json labels,body`);
      const issue = JSON.parse(issueRaw) as {
        labels: { name: string }[];
        body: string;
      };
      const labels = issue.labels.map(label => label.name);

      if (labels.includes("gate-review")) continue;

      parent = parseParent(issue.body ?? "");
    }

    console.log(
      `Sweeping #${pr.number} (${pr.headRefName} → ${pr.baseRefName})`
    );

    try {
      mergePrAndCloseIssue({
        url: pr.url,
        head: pr.headRefName,
        closesIssue: issueNum ?? undefined
      });

      mergedCount++;

      if (parent !== null) sweptParents.add(parent);
    } catch (error) {
      // Most likely cause: branch protection check failed, or another agent
      // raced us. Log and move on; the next iteration will reconsider.
      console.warn(
        `  merge failed for ${pr.url}: ${(error as Error).message.split("\n")[0]}`
      );
    }
  }

  // Open wrap-up PRs after all sweeps land so the sibling count is final.
  for (const parent of sweptParents) {
    maybeOpenPrdWrapUp(parent);
  }

  if (mergedCount === 0) {
    console.log("Sweep: no auto-mergeable open PRs.");
  } else {
    console.log(
      `Sweep: merged ${mergedCount} PR${mergedCount === 1 ? "" : "s"}.`
    );
  }
}

// Body for the PRD wrap-up PR: a `Closes` line that auto-closes the parent on
// merge, plus a concise rundown of the child slices that make up the feature.
// Each child slice is a self-contained chunk of the change, so listing them
// describes the full set of code changes without re-deriving it from the diff.
function wrapUpBody(
  parent: number,
  sibs: { number: number; title: string }[]
): string {
  const slices = [...sibs]
    .sort((a, b) => a.number - b.number)
    .map(slice => `- ${slice.title} #${slice.number}`)
    .join("\n");

  const explanation = plainEnglishFromIssue(parent, [
    "Problem Statement",
    "Solution"
  ]);
  const overview = explanation
    ? `## What this delivers\n\n${explanation}\n\n`
    : "";

  return (
    `Closes #${parent}\n\n` +
    overview +
    `## Slices\n\n` +
    `Brings together the merged child slices for this PRD:\n\n` +
    `${slices}\n`
  );
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
for (let i = 1; i <= MAX_ITERATIONS; i++) {
  console.log(`\n=== Iteration ${i}/${MAX_ITERATIONS} ===\n`);

  sweepAutoMergeablePrs();

  const eligible = listEligibleIssues();

  if (eligible.length === 0) {
    console.log("No eligible AFK issues. Stopping.");
    break;
  }

  const issue = pickHighestPriority(eligible);
  const plan = planFor(issue);

  console.log(`Issue #${issue.number}: ${issue.title}`);
  console.log(
    `  Plan: ${plan.kind} → base=${plan.base}, merge=${plan.mergeMode}`
  );

  const childBranch = `sandcastle/issue-${issue.number}-${stamp()}`;

  // One docker sandbox per issue, shared by the implement and review phases and
  // torn down in `finally`. createSandbox owns a dedicated git worktree on
  // childBranch, forked from plan.base (the PRD feature branch for children,
  // main for standalone issues). This mirrors the shipped sequential-reviewer
  // template; letting sandcastle own the worktree lifecycle (rather than
  // pre-creating the branch and removing the worktree by hand) is what keeps
  // the worktree's git metadata consistent across the docker mount boundary.
  const sandbox = await sandcastle.createSandbox({
    branch: childBranch,
    baseBranch: plan.base,
    sandbox: docker({ mounts: sandboxMounts }),
    hooks,
    copyToWorktree
  });

  let implementedCommits: number;

  try {
    // Phase 1: implement
    const implement = await sandbox.run({
      name: `implementer-${issue.number}`,
      maxIterations: 100,
      idleTimeoutSeconds: 1200,
      agent,
      promptFile: "./.sandcastle/implement-prompt.md",
      promptArgs: { ISSUE: String(issue.number) }
    });

    implementedCommits = implement.commits.length;

    // Phase 2: review (cleanup pass on the same branch), only if there is work
    if (implementedCommits > 0) {
      await sandbox.run({
        name: `reviewer-${issue.number}`,
        maxIterations: 1,
        idleTimeoutSeconds: 1200,
        agent,
        promptFile: "./.sandcastle/review-prompt.md",
        promptArgs: { BRANCH: childBranch, BASE_BRANCH: plan.base }
      });
    }
  } finally {
    await sandbox.close();
  }

  // Repair any host-repo corruption the docker run left in the shared .git
  // before running further host git commands (both the skip and commit paths).
  healHostRepo();

  if (implementedCommits === 0) {
    console.log(`Implementer made no commits for #${issue.number}. Skipping.`);
    tearDownWorktree(childBranch);
    sh(`git branch -D ${childBranch}`);

    continue;
  }

  // Phase 3: enforce formatting on the agent's diff, then push and open PR.
  // Nothing the agents run (lint = eslint only) checks Prettier, so the
  // implementer's output routinely drifts from prettier.config.mjs (stray
  // trailing commas, over-wrapping, unsorted Tailwind classes). Format here on
  // the host, which has Prettier and its plugins installed, rather than relying
  // on the in-sandbox agent. Limit it to the files this branch touched so we
  // never sweep in the repo's pre-existing, unrelated drift. The branch must be
  // freed from its sandcastle worktree first so the host's main worktree can
  // check it out.
  tearDownWorktree(childBranch);

  sh(`git checkout ${childBranch}`);

  const changedFiles = sh(
    `git diff --name-only --diff-filter=ACMR ${plan.base}...${childBranch}`
  )
    .split("\n")
    .map(file => file.trim())
    .filter(Boolean);

  if (changedFiles.length) {
    const fileArgs = changedFiles.map(shellQuote).join(" ");

    sh(`bunx prettier --write --ignore-unknown ${fileArgs}`);

    if (sh(`git status --porcelain`).trim()) {
      sh(`git add -A`);
      sh(`git commit -m "Apply Prettier formatting"`);
    }
  }

  sh(`git checkout ${HOST_BRANCH}`);
  sh(`git push -u origin ${childBranch}`);

  const childExplanation = plainEnglishFromIssue(issue.number, [
    "What to build"
  ]);
  const childPrBody = childExplanation
    ? `Closes #${issue.number}\n\n## What this does\n\n${childExplanation}\n`
    : `Closes #${issue.number}`;

  const url = openPr({
    base: plan.base,
    head: childBranch,
    title: `${issue.title} (#${issue.number})`,
    body: childPrBody,
    mergeMode: plan.mergeMode,
    closesIssue: issue.number,
    labels: prLabelsFromIssue(issue.labels)
  });

  console.log(
    plan.mergeMode === "gated"
      ? `PR opened (gated, awaiting review): ${url}`
      : `PR handled: ${url}`
  );

  // Phase 4: PRD wrap-up. If this was the last open child, open feature → main.
  // Auto-merged children: the issue is already closed by openPr, so stillOpen
  // reflects only other siblings. Gated children: the issue is still open until
  // a human merges, so stillOpen will be at least 1 here, and the wrap-up fires
  // on a later iteration (via the sweep) when that PR lands.
  if (plan.kind === "prd-child" && plan.parent !== null) {
    maybeOpenPrdWrapUp(plan.parent);
  }

  sh(`git checkout ${HOST_BRANCH}`);
}

console.log("\nAll done.");

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8" });
}

// Repair host-repo corruption that a docker run can leave in the SHARED .git on
// macOS: the in-container git writes `core.worktree = /home/agent/workspace` into
// .git/config and points .git/HEAD at the child branch. Both make every
// subsequent host git command fail ("Invalid path .../home/agent"), and git
// itself can't fix it because it chokes on the bad core.worktree. So patch the
// files directly, then reset the index back to the host branch. No-op when the
// run left things clean. Committed objects and refs are never touched.
function healHostRepo(): void {
  const configPath = join(".git", "config");
  const config = readFileSync(configPath, "utf8");
  const cleaned = config
    .split("\n")
    .filter(line => !/^\s*worktree\s*=/.test(line))
    .join("\n");

  if (cleaned !== config) {
    writeFileSync(configPath, cleaned);
  }

  writeFileSync(join(".git", "HEAD"), `ref: refs/heads/${HOST_BRANCH}\n`);

  try {
    sh(`git reset --mixed`);
  } catch {
    // index already consistent; nothing to do
  }
}

// Tear down the git worktree for `branch`, tolerant of the macOS docker quirk
// where the in-container run rewrites the worktree's gitdir back-pointer to the
// container path (/home/agent/workspace). That makes `git worktree remove
// <hostPath>` fail with "is not a working tree", so instead we prune the stale
// registration and delete any leftover host worktree directory. The branch ref
// and its commits live in the shared .git and survive untouched, so the host
// can check the branch out afterwards. Idempotent: the bracketing prunes clear
// both a dangling container-path registration and a now-orphaned host dir.
function tearDownWorktree(branch: string): void {
  sh(`git worktree prune`);

  const dir = join(".sandcastle", "worktrees", branch.replace(/\//g, "-"));

  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }

  sh(`git worktree prune`);
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// Lowercase, hyphen-separated slug, trimmed to whole words within `max` chars
// so a long title never produces a mid-word branch name.
function slugify(s: string, max = 64): string {
  const base = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= max) return base;

  const cut = base.slice(0, max);
  const lastDash = cut.lastIndexOf("-");

  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

function stamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}
