<template>
  <div class="amplitude-visualizer">
    <canvas
      ref="canvasRef"
      :width="width"
      :height="height"
      :style="{ width: `${width}px`, height: `${height}px` }"
    />
    <div class="stats">
      <div class="current-value">
        Current: {{ (currentAmplitude * 100).toFixed(1) }}%
      </div>
      <div class="peak-value">
        Peak: {{ (peakAmplitude * 100).toFixed(1) }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    amplitude: number
    width?: number
    height?: number
    historySeconds?: number
    refreshRate?: number
  }>(),
  {
    width: 300,
    height: 150,
    historySeconds: 5,
    refreshRate: 60,
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const animationFrame = ref<number>(0)
const history = ref<{ timestamp: number; value: number }[]>([])
const currentAmplitude = ref(0)
const peakAmplitude = ref(0)

const initCanvas = () => {
  const canvas = canvasRef.value!
  const context = canvas.getContext('2d')
  if (!context) return

  // Set up for crisp lines on high DPI displays
  const dpr = window.devicePixelRatio || 1
  canvas.width = props.width * dpr
  canvas.height = props.height * dpr
  context.scale(dpr, dpr)

  ctx.value = context
}

const drawVisualization = (timestamp: number) => {
  if (!ctx.value) return

  // Update history
  history.value.push({ timestamp, value: props.amplitude })
  const cutoffTime = timestamp - props.historySeconds * 1000
  history.value = history.value.filter(point => point.timestamp >= cutoffTime)

  // Update stats
  currentAmplitude.value = props.amplitude
  peakAmplitude.value = Math.max(peakAmplitude.value, props.amplitude)

  // Clear canvas
  ctx.value.clearRect(0, 0, props.width, props.height)

  // Draw background
  ctx.value.fillStyle = '#1a1a1a'
  ctx.value.fillRect(0, 0, props.width, props.height)

  // Draw grid
  ctx.value.strokeStyle = '#333'
  ctx.value.lineWidth = 1

  // Vertical grid lines (time)
  for (let i = 0; i <= props.historySeconds; i++) {
    const x = props.width - (i / props.historySeconds) * props.width
    ctx.value.beginPath()
    ctx.value.moveTo(x, 0)
    ctx.value.lineTo(x, props.height)
    ctx.value.stroke()
  }

  // Horizontal grid lines (amplitude)
  for (let i = 0; i <= 4; i++) {
    const y = props.height - (i / 4) * props.height
    ctx.value.beginPath()
    ctx.value.moveTo(0, y)
    ctx.value.lineTo(props.width, y)
    ctx.value.stroke()
  }

  // Draw history line
  if (history.value.length > 1) {
    ctx.value.beginPath()
    ctx.value.strokeStyle = '#4ade80'
    ctx.value.lineWidth = 2

    history.value.forEach((point, index) => {
      const x =
        props.width -
        ((timestamp - point.timestamp) / (props.historySeconds * 1000)) *
          props.width
      const y = props.height - point.value * props.height

      if (index === 0) {
        ctx.value!.moveTo(x, y)
      } else {
        ctx.value!.lineTo(x, y)
      }
    })

    ctx.value.stroke()

    // Add glow effect
    ctx.value.save()
    ctx.value.filter = 'blur(4px)'
    ctx.value.strokeStyle = '#4ade8080'
    ctx.value.lineWidth = 4
    ctx.value.stroke()
    ctx.value.restore()
  }

  animationFrame.value = requestAnimationFrame(drawVisualization)
}

// Lifecycle hooks
onMounted(() => {
  initCanvas()
  animationFrame.value = requestAnimationFrame(drawVisualization)
})

onBeforeUnmount(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})

// Reset peak when amplitude drops to zero
watch(
  () => props.amplitude,
  newValue => {
    if (newValue === 0) {
      peakAmplitude.value = 0
    }
  },
)
</script>

<style scoped>
.amplitude-visualizer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #0f0f0f;
  border-radius: 8px;
  font-family: monospace;
}

.stats {
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 14px;
}

canvas {
  border-radius: 4px;
}
</style>
