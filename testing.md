Skill : Test-Driven Development 

This is a non-stop execution task. Continue until the real system is materially covered and verified.

You are inside my local project. This is an execution task, not a planning-only task.

Primary objective:
Deliver production-grade, end-to-end test coverage for the real system using strict Test-Driven Development. Read the project instructions first, understand the entire codebase, then implement and verify a full testing workflow across unit, integration, seeds/fixtures, manual validation, and Playwright CLI.

Mandatory first actions:
1. Read `CLAUDE.md` fully and follow it.
2. Read `.code-review-graph` fully and use it to understand the complete codebase graph.
3. Read all relevant config and workflow files:
   - package manager files
   - package.json scripts
   - test configs
   - Playwright config
   - TypeScript / JS config
   - lint config
   - database config
   - migration files
   - seed files
   - CI config
   - Docker/devcontainer files if present
   - environment example files
   - existing test utilities
4. Inspect the full source tree and current tests before changing code.

Non-stop execution rule:
- Do not stop at analysis.
- Do not stop after writing a few tests.
- Do not stop after unit tests.
- Do not stop after finding missing context.
- Do not ask for permission to continue.
- Do not ask clarifying questions unless execution is impossible without a secret or missing external credential.
- If something is ambiguous, inspect more files and make the most grounded decision possible.
- If something is broken, fix it.
- If something is untestable, refactor it safely for testability.
- Continue until the critical workflows are covered and verified as far as the local environment allows.

Work mode:
- Operate in strict RED -> GREEN -> REFACTOR cycles.
- For each behavior:
  1. identify expected behavior
  2. write failing test
  3. implement minimal production change
  4. rerun tests
  5. refactor safely
- Prefer behavior-based tests over implementation-detail tests.
- Mock only external boundaries.
- Keep internal logic real.
- Keep tests deterministic, isolated, CI-safe, and minimal-flake.

Discovery requirements:
From the actual repo, identify and document:
- application purpose
- runtime entry points
- architecture layers
- key modules and dependencies
- database schema and persistence flow
- external services and boundaries
- background jobs, workers, queues, cron tasks if any
- auth/session flow if any
- user-facing workflows
- current test architecture
- missing coverage
- brittle areas and testability blockers

Then produce a risk-ranked testing map:
- highest-risk workflows first
- what must be unit-tested
- what must be integration-tested
- what must be end-to-end tested
- what needs seeds/fixtures/factories
- what must be manually verified
- what cannot be fully automated and why

Execution scope:
Implement a complete production-grade testing setup for the real system, including whatever layers actually exist in this repo:

1. Unit tests
Cover:
- domain logic
- services
- validators
- parsers
- transforms
- permissions
- feature flags
- retries/fallbacks
- error mapping
- edge cases
- regression cases discovered during inspection

2. Integration tests
Cover:
- database interactions
- repository/model behavior
- API handlers
- service composition
- file system behavior
- CLI workflows
- command execution
- auth/session boundaries
- queue/job behavior
- cache behavior
- transaction and rollback behavior
- idempotency and duplicate handling where relevant

3. System / end-to-end tests
Cover the highest-value real workflows from start to finish:
- startup/bootstrap flow
- main user journey(s)
- failure and recovery paths
- persistence side effects
- visible outputs
- CLI or browser-visible workflows
- end-to-end state transitions

4. Playwright CLI
Use Playwright CLI where it adds real value:
- browser-based workflows
- local app flows
- docs/demo/sandbox flows if they represent real user interaction
- auth, form, navigation, persistence confirmation, and validation errors
Keep Playwright scenarios high-value and stable.

5. Seeds / fixtures / factories
Create or improve deterministic test data:
- minimal smoke seed
- integration seed
- rich e2e seed
- reusable factories/fixtures if needed
- clean setup/teardown/reset strategy
- CI-compatible isolated state

Refactor requirement:
If production code is hard to test, refactor carefully:
- extract pure logic from side effects
- isolate infrastructure
- remove hidden global state
- reduce timing sensitivity
- improve dependency boundaries
- preserve behavior unless tests expose a defect
- keep changes minimal but sufficient

Script and tooling requirement:
Add or improve runnable commands, matching repo conventions where possible:
- test
- test:unit
- test:integration
- test:system or test:e2e
- test:coverage
- seed:test
- playwright commands
- any setup/reset helpers needed
Ensure a fresh local environment can run them.

Verification requirement:
Do not declare success without execution.
You must:
1. run targeted tests while building
2. run the full relevant test suite before finishing
3. run coverage if supported
4. verify seeds from a clean state
5. run Playwright CLI where applicable
6. perform manual validation for critical workflows
7. report exact commands run
8. report exact failures found
9. report fixes made
10. report remaining limitations honestly

Manual validation requirement:
After automated coverage is in place:
1. seed the system
2. boot the app / CLI / service locally
3. execute the critical workflows manually
4. confirm results match the automated tests
5. run Playwright CLI against the real running system where relevant

Documentation requirement:
Add concise docs only where needed:
- how to run tests
- how to seed/reset test data
- how to run Playwright
- environment assumptions
- CI notes
- known limitations

Output format while working:
Do not pause for confirmation. Move phase by phase and keep executing.

Phase 1: Discovery
Output:
- files read
- architecture summary
- runtime entry points
- workflow map
- current testing setup
- coverage gaps
- top risks

Phase 2: Test strategy
Output:
- risk-ranked test plan
- chosen layers for each workflow
- seed/fixture plan
- Playwright plan
- refactor plan if needed

Phase 3: RED
Output:
- failing tests added
- why each test exists
- exact failure observed

Phase 4: GREEN
Output:
- production/test utility changes made
- why those changes were needed
- targeted tests now passing

Phase 5: REFACTOR
Output:
- cleanup/improvements made
- confirmation all touched tests still pass

Phase 6: Full verification
Output:
- exact commands executed
- suite results
- coverage results if available
- seed verification results
- Playwright CLI results
- manual validation results

Phase 7: Final report
Output:
- changed files
- new tests added by type
- workflows now covered
- bugs found and fixed
- remaining risks/gaps
- commands for local run
- commands for CI

Hard quality bar:
- production-grade, not demo-grade
- deterministic
- repeatable
- low-flake
- meaningful assertions
- real workflow confidence
- honest reporting
- no fake completeness
- no stopping early

Stop condition:
Only stop after you have taken the codebase from current state to a materially stronger, verified testing state across the real critical workflows, with seeds in place, tests runnable, Playwright used where valuable, and manual validation completed as far as the environment allows.
