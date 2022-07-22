# PR Labeller javascript action

This action labels PRs based on the tags that contain its commits.

ie. PR 1 is merged into main, main is tagged 1.0.0, PR gets tagged 1.0.0

## Inputs

## `repo-token`

**Required** The GITHUB_TOKEN secret.

## `dry-run`

If true no modificaitons will be made.

## Outputs

## `modified-prs`

Hash map where the key is the URL to the PR and the value is a list of labels that were added

## Example usage

uses: cnatis/pr-labeller-action@v1.0.0
with:
  repo-token: '....'
  dry-run: false