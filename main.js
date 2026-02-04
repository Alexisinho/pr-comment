import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * The main function for the action.
 * Fetches PR changes and posts a comment with the summary.
 *
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    // Get inputs
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const prNumber = parseInt(core.getInput('pr_number', { required: true }), 10)
    const token = core.getInput('token', { required: true })

    // Create GitHub client
    const octokit = github.getOctokit(token)

    core.info(`Fetching files for PR #${prNumber} in ${owner}/${repo}...`)

    // Get PR file changes
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    })

    // Build comment body with changes summary
    let body = `## 📋 PR Changes Summary\n\n`
    body += `This PR contains **${files.length}** changed file(s).\n\n`
    body += `| Status | File | Additions | Deletions |\n`
    body += `|--------|------|-----------|------------|\n`

    for (const file of files) {
      const status = getStatusEmoji(file.status)
      body += `| ${status} | \`${file.filename}\` | +${file.additions} | -${file.deletions} |\n`
    }

    // Calculate totals
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0)
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0)
    body += `\n**Total:** +${totalAdditions} additions, -${totalDeletions} deletions`

    core.info('Creating PR comment...')

    // Create comment on the PR
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    })

    core.info('Comment created successfully!')
    core.setOutput('comment_body', body)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

/**
 * Returns an emoji for the file status
 * @param {string} status - The file status from GitHub API
 * @returns {string} Emoji representing the status
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'added':
      return '🟢 Added'
    case 'removed':
      return '🔴 Removed'
    case 'modified':
      return '🟡 Modified'
    case 'renamed':
      return '🔵 Renamed'
    default:
      return '⚪ ' + status
  }
}
