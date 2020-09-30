import * as os from 'os'
import tablemark from 'tablemark'
import {CrawlingTarget} from '../interfaces'
import * as rptLib from '../project-reports-lib'
import {IssueList, ProjectIssue, ProjectStageIssues} from '../project-reports-lib'

const reportType = 'project'
export {reportType}

/*
 * Gives visibility into whether the team has untriaged debt, an approval bottleneck and
 * how focused the team is (e.g. how many efforts are going on)
 * A wip is a work in progress unit of resourcing.  e.g. it may be one developer or it might mean 4 developers.
 */
export function getDefaultConfiguration(): any {
  return <any>{
    // Epic for now.  Supports others.
    // Will appear on report in this casing but matches labels with lowercase version.
    'report-on-labels': ['Feature'],
    'proposed-limit': 0,
    'accepted-limit': 0,
    'in-progress-limit': 4,
    'done-limit': -1
  }
}

export interface StageCountData {
  name: string
  data: {[key: string]: StageData}
}

//export type WipStage = { [key: string]: WipStageData }
export interface StageData {
  flag: boolean
  limit: number
  // items that matched so possible to do drill in later
  items: ProjectIssue[]
}

function getDrillName(cardType: string, stage: string): string {
  return `limits-${cardType}-${stage}`.split(' ').join('-')
}

export function process(
  config: any,
  issueList: IssueList,
  drillIn: (identifier: string, title: string, cards: ProjectIssue[]) => void
): any {
  const stageCountData = <StageCountData>{}
  stageCountData.data = {}

  let prefix = ''
  let issues = issueList.getItems()
  console.log(`total issue cards on board: ${issues.length}`)
  for (const label of config['report-on-labels']) {
    prefix += `${label} `
    issues = rptLib.filterByLabel(issues, label.toLowerCase())
    console.log(`issue after filtering by ${label}: ${issues.length}`)
  }
  prefix = prefix.trim()
  stageCountData.name = prefix

  const projData: ProjectStageIssues = rptLib.getProjectStageIssues(issues)

  // proposed, in-progress, etc...
  for (const stage in projData) {
    const stageData = <StageData>{}

    const cards = projData[stage]
    stageData.items = cards

    // drillIn(getDrillName(prefix, stage), `Issues for ${stage}: ${prefix}`, cards)

    const limitKey = `${stage.toLocaleLowerCase()}-limit`
    stageData.limit = config[limitKey] || 0
    stageData.flag = stageData.limit > -1 && cards.length > stageData.limit

    stageCountData.data[stage] = stageData
  }

  return stageCountData
}

interface StageRow {
  stage: string
  limit: string
  count: string
}

export function renderMarkdown(targets: CrawlingTarget[], processedData: any): string {
  console.log(`Rendering for ${targets.length} targets`)

  const stageCountData = processedData as StageCountData
  const lines: string[] = []

  // create a report for each type.  e.g. "Epic"
  const typeLabel = stageCountData.name === '*' ? '' : stageCountData.name
  lines.push(`## :beetle: ${typeLabel} Stage Counts`)

  const rows: StageRow[] = []
  for (const stageName in stageCountData.data) {
    const stage = stageCountData.data[stageName]
    const stageRow = <StageRow>{}
    stageRow.stage = stageName
    // data folder is part of the contract here.  make a lib function to create this path
    // stageRow.count = `[${stage.items.length}](./${getDrillName(stageCountData.name, stageName)}.md)`
    stageRow.count = `${stage.items.length}`
    if (stage.flag) {
      stageRow.count += '  :triangular_flag_on_post:'
    }
    stageRow.limit = stage.limit >= 0 ? stage.limit.toString() : ''
    rows.push(stageRow)
  }

  const table: string = tablemark(rows)
  lines.push(table)

  return lines.join(os.EOL)
}

export function renderHtml(): string {
  // Not supported yet
  return ''
}
