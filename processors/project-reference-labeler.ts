import moment = require('moment')
import * as url from 'url'
import {GitHubClient} from '../github'
import {CrawlingTarget} from '../interfaces'
import {IssueList, ProjectIssue} from '../project-reports-lib'

const now = moment()

const reportType = 'project'
export {reportType}

/*
 * Gives visibility into whether the team has untriaged debt, an approval bottleneck and
 * how focused the team is (e.g. how many efforts are going on)
 * A wip is a work in progress unit of resourcing.  e.g. it may be one developer or it might mean 4 developers.
 */
export function getDefaultConfiguration(): any {
  return <any>{
    'process-with-label': 'feature',
    'column-label-prefix': '> ',
    'linked-label-prefix': '>> '
  }
}

// const noiseWords = ['the', 'in', 'and', 'of']

function cleanLabelName(prefix: string, title: string) {
  title = title.replace(/\([^()]*\)/g, '').replace(/ *\[[^\]]*]/, '')

  const words = title.match(/[a-zA-Z0-9&]+/g)
  //  words = words.map(item => item.toLowerCase())

  //words = words.filter(word => noiseWords.indexOf(word) < 0)
  return `${prefix.trim()} ${words.join(' ')}`
}

// ensures that only a label with this prefix exists
async function ensureOnlyLabel(issue: ProjectIssue, prefix: string, labelName: string) {
  const initLabels = issue.labels.filter(label => label.name === labelName)
  if (initLabels.length == 0) {
    // add, but first ...
    // remove any other labels with that prefix
    for (const label of issue.labels) {
      if (label.name.trim().startsWith(prefix)) {
        console.log(`Removing label: ${label.name}`)
      }
    }

    console.log(`Adding label: ${labelName}`)
  } else {
    console.log(`Label already exists: ${labelName}`)
  }
}

// get alphanumeric clean version of string (strip special chars). spaces to chars.  remove common filler words (a, the, &, and)
export async function process(
  target: CrawlingTarget,
  config: any,
  data: IssueList,
  github: GitHubClient
): Promise<void> {
  for (const issue of data.getItems()) {
    console.log()
    console.log(`initiative : ${issue.project_column}`)
    console.log(`epic       : ${issue.title}`)

    console.log('creates    :')
    let initLabel
    if (issue.project_column) {
      initLabel = cleanLabelName(config['column-label-prefix'], issue.project_column)
      console.log(`  initiative label : '${initLabel}'`)
    }

    const epicLabel = cleanLabelName(config['linked-label-prefix'], issue.title)
    console.log(`  epic label       : '${epicLabel}'`)

    console.log(issue.body)
    console.log()

    const urls = issue.body?.match(/(?<=-\s*\[.*?\].*?)(https?:\/{2}(?:[/-\w.]|(?:%[\da-fA-F]{2}))+)/g)
    //let urls = issue.body?.match(/(?<=-\s*\[.*?\].*?)([a-z]+[:.].*?(?=\s))/g)

    for (const match of urls || []) {
      try {
        console.log(`match: ${match}`)
        const u = new url.URL(match)
        const issue = await github.getIssue(match)
        ensureOnlyLabel(issue, config['column-label-prefix'], initLabel)
        ensureOnlyLabel(issue, config['linked-label-prefix'], epicLabel)
      } catch (err) {
        console.log(`Ignoring invalid issue url: ${match}`)
        console.log(`(${err.message})`)
      }
      console.log()
    }
  }
}
