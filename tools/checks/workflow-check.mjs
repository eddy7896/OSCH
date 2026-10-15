// Validates GitHub Actions workflow files WITHOUT running them. A workflow that GitHub rejects runs no jobs at all, so every
// check silently never executes (this happened to the first two Phase 0 pushes: an unquoted colon in a step name).
// Pure function so it can be unit-tested (evals/workflow-check.test.mjs).
import YAML from "yaml";

/**
 * @param {string} text            workflow file contents
 * @param {{ rootScripts: Record<string,string>, turboTasks: string[], exists: (path: string) => boolean }} ctx
 * @returns {string[]}             problems (empty = valid)
 */
export function checkWorkflow(text, ctx) {
  const problems = [];
  let doc;
  try {
    doc = YAML.parse(text, { prettyErrors: true });
  } catch (e) {
    return [`YAML does not parse: ${String(e.message).split("\n")[0]}`];
  }
  if (!doc || typeof doc !== "object") return ["workflow is empty or not a mapping"];
  if (!doc.on && !doc[true]) problems.push("no `on:` trigger (YAML 1.1 can turn `on` into true; both accepted)");
  const jobs = doc.jobs;
  if (!jobs || typeof jobs !== "object" || Object.keys(jobs).length === 0) return [...problems, "no jobs defined"];

  for (const [jobId, job] of Object.entries(jobs)) {
    if (!job["runs-on"] && !job.uses) problems.push(`job ${jobId}: missing runs-on`);
    if (!Array.isArray(job.steps) || job.steps.length === 0) {
      if (!job.uses) problems.push(`job ${jobId}: no steps`);
      continue;
    }
    job.steps.forEach((step, i) => {
      const where = `job ${jobId}, step ${i + 1}${step.name ? ` (${step.name})` : ""}`;
      if (!step.uses && !step.run) problems.push(`${where}: needs \`uses\` or \`run\``);
      if (step.uses && !/^[\w.-]+\/[\w./-]+@[\w.-]+$/.test(step.uses) && !step.uses.startsWith("./")) problems.push(`${where}: \`uses: ${step.uses}\` must be owner/repo@version`);
      if (step.uses && /@(main|master)$/.test(step.uses)) problems.push(`${where}: \`uses: ${step.uses}\` is not pinned to a version`);
      for (const line of String(step.run ?? "").split("\n")) {
        const cmd = line.trim();
        // npm run <script> at the repo root (workspace runs use -w and are checked by their own package)
        const npm = cmd.match(/^npm run ([\w:.-]+)(?!.*(?:-w|--workspace))/);
        if (npm && !cmd.includes(" -w ") && !cmd.includes("--workspace") && !(npm[1] in ctx.rootScripts)) problems.push(`${where}: \`npm run ${npm[1]}\` is not a root package.json script`);
        const turbo = cmd.match(/^npx turbo run ([\w: -]+?)(?: --|$)/);
        if (turbo) for (const t of turbo[1].trim().split(/\s+/)) if (!ctx.turboTasks.includes(t)) problems.push(`${where}: turbo task "${t}" is not defined in turbo.json`);
        const nodeFile = cmd.match(/^node ((?!--)[\w./-]+)/);
        if (nodeFile && !ctx.exists(nodeFile[1])) problems.push(`${where}: \`${nodeFile[1]}\` does not exist`);
        const nodeTest = cmd.match(/^node --test ([\w./-]+)/);
        if (nodeTest && !ctx.exists(nodeTest[1])) problems.push(`${where}: \`${nodeTest[1]}\` does not exist`);
        const bash = cmd.match(/^bash ([\w./-]+)/);
        if (bash && !ctx.exists(bash[1])) problems.push(`${where}: \`${bash[1]}\` does not exist`);
      }
    });
  }
  return problems;
}
