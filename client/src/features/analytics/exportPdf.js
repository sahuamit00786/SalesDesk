/** Lightweight PDF export via browser print dialog */
export function exportReportPdf({ title = 'Report', elementId = 'report-export-root' }) {
  const el = document.getElementById(elementId)
  if (!el) {
    window.print()
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #6366f1; color: white; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
          .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #6b7280; }
          .kpi-value { font-size: 22px; font-weight: bold; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${el.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}
