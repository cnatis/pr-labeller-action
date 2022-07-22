const core = require('@actions/core');
const github = require('@actions/github');
const semver = require('semver');

(async () => {
  try {
    const result = {}; // Hash map of PR link to labels added 
    const { repo, owner } = github.context.repo;
    const token = core.getInput('repo-token', { required: true });
    const dryRun = core.getBooleanInput('dry-run', { required: false }) ?? false;
    const client = github.getOctokit(token);
  
    // Get all the closed PRs
    const pageSize = 100;
    let hasMoreData = true;
    let prData = [];
    let page = 1;
    while (hasMoreData) {
      const response = await client.rest.pulls.list({
        owner,
        repo,
        sort: 'updated',
        direction: 'desc',
        state: 'closed',
        page: page,
        per_page: pageSize
      });
      prData = prData.concat(response.data);
      hasMoreData = response.data.length > 0;
      page += 1;
    }
    
    // For each PR, find the tags it's commits are included in, add that tag as a label
    for (const pr of prData) {
      if (pr.merge_commit_sha == null) {
        // PR is not merged
        continue;
      }

      const tagsPRIsIncludedIn = await client.rest.git.listMatchingRefs({
        owner,
        repo,
        ref: pr.merge_commit_sha
      });

      // Filter tags so that we are only applying the lowest semver tag
      // ie. commit is in tags 1.0.0 and 1.1.0, we should only tag 1.0.0
      let earliestSemver;
      const tagToAdd = tagsPRIsIncludedIn.data.reduce((result, current) => {
        try {
          const versionInfo = semver.parse(current.ref);
          if (earliestSemver == null || semver.lt(versionInfo, earliestSemver)) {
            earliestSemver = versionInfo;
            return current;
          } else {
            return result;
          }
        } catch (err) {
          // Ignore semver parse errors
          return result;
        }
      }, null);

      // If we found a valid semver tag then add it to the PR
      if (tagToAdd != null) {
        result[pr.url] = [tagToAdd.ref];
        if (!dryRun) {
          const prAlreadyHasLabel = pr.labels.find(l => l.name === tagToAdd.ref);
          if (!prAlreadyHasLabel) {
            await client.rest.issues.addLabels({
              owner,
              repo,
              issue_number: pr.id,
              labels: [tagToAdd.ref]
            });
          }

          // TODO update linked issues
        }
      }
    }

    core.setOutput('modified-prs', JSON.stringify(result));
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }  
})();