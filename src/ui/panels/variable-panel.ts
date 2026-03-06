export interface VariableEntry {
  name: string
  type: string
  value: string
}

export class VariablePanel {
  private container: HTMLElement
  private tableBody: HTMLElement
  private variables: VariableEntry[] = []

  constructor(container: HTMLElement) {
    this.container = container
    this.container.classList.add('variable-panel')

    const header = document.createElement('div')
    header.className = 'panel-header'
    header.innerHTML = '<span class="panel-title">Variables</span>'
    this.container.appendChild(header)

    const table = document.createElement('table')
    table.className = 'variable-table'
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Value</th>
        </tr>
      </thead>
    `
    this.tableBody = document.createElement('tbody')
    table.appendChild(this.tableBody)
    this.container.appendChild(table)
  }

  update(variables: VariableEntry[]): void {
    this.variables = variables
    this.render()
  }

  clear(): void {
    this.variables = []
    this.render()
  }

  private render(): void {
    this.tableBody.innerHTML = ''
    for (const v of this.variables) {
      const row = document.createElement('tr')
      row.innerHTML = `
        <td class="var-name">${v.name}</td>
        <td class="var-type">${v.type}</td>
        <td class="var-value">${v.value}</td>
      `
      this.tableBody.appendChild(row)
    }
    if (this.variables.length === 0) {
      const row = document.createElement('tr')
      row.innerHTML = '<td colspan="3" class="var-empty">No variables</td>'
      this.tableBody.appendChild(row)
    }
  }

  getVariables(): VariableEntry[] {
    return [...this.variables]
  }

  getElement(): HTMLElement {
    return this.container
  }
}
