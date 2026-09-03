import { useEffect, useRef } from 'react'

export default function Chart({
  type = 'bar',
  data,
  labels,
  colors = ['#7E1023', '#485470', '#F1D9D0', '#EDFFEC'],
  height = 200,
  showLegend = true,
  showTooltip = true,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const barWidth = width / data.length - 20

    // Clear canvas
    ctx.clearRect(0, 0, width, canvas.height)

    if (type === 'bar') {
      const maxValue = Math.max(...data)
      data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 40)
        const x = index * (barWidth + 20) + 10
        const y = height - barHeight

        ctx.fillStyle = colors[index % colors.length]
        ctx.fillRect(x, y, barWidth, barHeight)

        // Label
        ctx.fillStyle = '#1D201F'
        ctx.font = '12px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(labels?.[index] || '', x + barWidth / 2, height - 5)

        // Value
        ctx.fillText(value.toString(), x + barWidth / 2, y - 5)
      })
    } else if (type === 'line') {
      const maxValue = Math.max(...data)
      ctx.beginPath()
      ctx.strokeStyle = colors[0]
      ctx.lineWidth = 2

      data.forEach((value, index) => {
        const x = index * (width / data.length) + 20
        const y = height - (value / maxValue) * (height - 40) - 20

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        // Point
        ctx.fillStyle = colors[0]
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()

        // Label
        ctx.fillStyle = '#1D201F'
        ctx.font = '12px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(labels?.[index] || '', x, height - 5)
      })

      ctx.stroke()
    } else if (type === 'pie') {
      const total = data.reduce((a, b) => a + b, 0)
      let startAngle = 0

      data.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI
        ctx.beginPath()
        ctx.moveTo(width / 2, height / 2)
        ctx.arc(width / 2, height / 2, 80, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fillStyle = colors[index % colors.length]
        ctx.fill()

        startAngle += sliceAngle
      })
    }
  }, [data, labels, type, colors, height])

  return (
    <div className="chart">
      <canvas ref={canvasRef} width={400} height={height} />
      {showLegend && labels && (
        <div className="chart-legend">
          {labels.map((label, index) => (
            <div key={index} className="chart-legend-item">
              <span
                className="chart-legend-color"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}