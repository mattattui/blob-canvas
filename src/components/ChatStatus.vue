<template>
  <canvas
    ref="canvasRef"
    :style="{
      width: `${props.size}px`,
      height: `${props.size}px`,
    }"
  />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'

// Types
export type StatusState = 'waiting' | 'listening' | 'speaking'
type ListeningRing = {
  progress: number
  opacity: number
}
type Spark = {
  angle: number
  intensity: number
  speed: number
  life: number
}

// Constants
const RING_WIDTH = 20
const DEFAULT_SIZE = 100
const LISTENING_RING_DURATION = 2000
const RING_SPAWN_THRESHOLD = 0.4
const BLOOM_PADDING = 50 // Extra padding for bloom effect

// Constants for wave generation
const MIN_PEAKS = 2
const MAX_PEAKS = 8
const MAX_WAVE_HEIGHT = RING_WIDTH * 3
const BASE_WAVE_HEIGHT = RING_WIDTH * 0.1 // Minimum waviness when amplitude is 0
const SPARK_OFFSET = RING_WIDTH * 0.8 // Distance of spark line from main ring
const AMPLITUDE_DECAY_RATE = 2.0 // Units per second

// Props with types and defaults combined
const props = withDefaults(
  defineProps<{
    state: StatusState
    audioAmplitude?: number
    size?: number
  }>(),
  {
    audioAmplitude: 0,
    size: DEFAULT_SIZE,
  },
)

// Prop validation
const validateProps = (props: { audioAmplitude: number }) => {
  if (props.audioAmplitude < 0 || props.audioAmplitude > 1) {
    console.warn(
      'audioAmplitude must be between 0 and 1. Clamping to valid range.',
    )
    return Math.max(0, Math.min(1, props.audioAmplitude))
  }
  return props.audioAmplitude
}

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const animationFrame = ref<number>(0)
const devicePixelRatio = window.devicePixelRatio || 1
const innerRings = ref<ListeningRing[]>([])
const sparks = ref<Spark[]>([])
const lastSparkTime = ref(0)

// Create a safe amplitude value
const safeAmplitude = computed(() => validateProps(props))

const initCanvas = () => {
  const canvas = canvasRef.value!
  const context = canvas.getContext('2d', {
    alpha: true,
    willReadFrequently: false,
  })

  if (!context) {
    console.error('Failed to get canvas context')
    return
  }

  // Increase canvas size to accommodate bloom
  const width = (props.size + BLOOM_PADDING * 2) * devicePixelRatio
  const height = (props.size + BLOOM_PADDING * 2) * devicePixelRatio

  canvas.width = width
  canvas.height = height
  canvas.style.width = `${props.size}px`
  canvas.style.height = `${props.size}px`

  context.scale(devicePixelRatio, devicePixelRatio)
  ctx.value = context
}

const clearCanvas = () => {
  if (!ctx.value || !canvasRef.value) return
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
}

// Update waiting state to use new padding
const drawWaitingState = (timestamp: number) => {
  if (!ctx.value) return

  const center = props.size / 2 + BLOOM_PADDING
  const radius = (props.size - RING_WIDTH) / 2
  const rotation = (timestamp / 2000) % (Math.PI * 2)

  ctx.value.save()
  ctx.value.translate(center, center)
  ctx.value.rotate(rotation)

  const gradient = ctx.value.createLinearGradient(-radius, 0, radius, 0)
  gradient.addColorStop(0, '#00B4D8')
  gradient.addColorStop(1, '#0077B6')

  // Enhanced bloom for waiting state
  ctx.value.globalAlpha = 0.2
  ctx.value.filter = 'blur(24px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.value.strokeStyle = gradient
  ctx.value.lineWidth = RING_WIDTH + 20
  ctx.value.stroke()

  ctx.value.globalAlpha = 0.3
  ctx.value.filter = 'blur(16px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.value.strokeStyle = gradient
  ctx.value.lineWidth = RING_WIDTH + 12
  ctx.value.stroke()

  // Main ring
  ctx.value.globalAlpha = 1
  ctx.value.filter = 'none'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.value.strokeStyle = gradient
  ctx.value.lineWidth = RING_WIDTH
  ctx.value.stroke()

  ctx.value.restore()
}

const updateInnerRings = (timestamp: number) => {
  // Add new ring if needed
  if (innerRings.value.length === 0) {
    innerRings.value.push({ progress: 0, opacity: 1 })
  } else if (innerRings.value.length === 1) {
    const ring = innerRings.value[0]
    if (ring.progress > RING_SPAWN_THRESHOLD) {
      innerRings.value.push({ progress: 0, opacity: 1 })
    }
  }

  // Update existing rings
  innerRings.value = innerRings.value
    .map(ring => {
      const newProgress = ring.progress + 16 / LISTENING_RING_DURATION
      const newOpacity = Math.max(0, 1 - newProgress * 1.2) // Fade out slightly faster than shrink
      return { progress: newProgress, opacity: newOpacity }
    })
    .filter(ring => ring.opacity > 0) // Remove completed rings
}

const drawListeningState = (timestamp: number) => {
  if (!ctx.value) return

  const center = props.size / 2 + BLOOM_PADDING // Adjust center point for bloom padding
  const maxRadius = (props.size - RING_WIDTH) / 2

  ctx.value.save()
  ctx.value.translate(center, center)

  // Draw static outer ring with enhanced bloom
  const outerGradient = ctx.value.createLinearGradient(
    -maxRadius,
    0,
    maxRadius,
    0,
  )
  outerGradient.addColorStop(0, '#00C864')
  outerGradient.addColorStop(1, '#009632')

  // Largest bloom layer
  ctx.value.globalAlpha = 0.2
  ctx.value.filter = 'blur(24px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.strokeStyle = outerGradient
  ctx.value.lineWidth = RING_WIDTH + 20
  ctx.value.stroke()

  // Medium bloom layer
  ctx.value.globalAlpha = 0.3
  ctx.value.filter = 'blur(16px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.strokeStyle = outerGradient
  ctx.value.lineWidth = RING_WIDTH + 12
  ctx.value.stroke()

  // Inner bloom layer
  ctx.value.globalAlpha = 0.4
  ctx.value.filter = 'blur(8px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.strokeStyle = outerGradient
  ctx.value.lineWidth = RING_WIDTH + 6
  ctx.value.stroke()

  // Main ring (sharp)
  ctx.value.globalAlpha = 1
  ctx.value.filter = 'none'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.strokeStyle = outerGradient
  ctx.value.lineWidth = RING_WIDTH
  ctx.value.stroke()

  // Update and draw inner rings
  updateInnerRings(timestamp)

  // Draw each inner ring
  innerRings.value.forEach(ring => {
    const radius = maxRadius * (1 - ring.progress * 0.5)

    const gradient = ctx.value!.createLinearGradient(-radius, 0, radius, 0)
    gradient.addColorStop(0, `rgba(0, 200, 100, ${ring.opacity})`)
    gradient.addColorStop(1, `rgba(0, 150, 50, ${ring.opacity})`)

    // Large bloom for inner rings
    ctx.value!.globalAlpha = 0.2 * ring.opacity
    ctx.value!.filter = 'blur(16px)'
    ctx.value!.beginPath()
    ctx.value!.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.value!.strokeStyle = gradient
    ctx.value!.lineWidth = RING_WIDTH + 12
    ctx.value!.stroke()

    // Medium bloom for inner rings
    ctx.value!.globalAlpha = 0.3 * ring.opacity
    ctx.value!.filter = 'blur(8px)'
    ctx.value!.beginPath()
    ctx.value!.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.value!.strokeStyle = gradient
    ctx.value!.lineWidth = RING_WIDTH + 6
    ctx.value!.stroke()

    // Main inner ring
    ctx.value!.globalAlpha = ring.opacity
    ctx.value!.filter = 'none'
    ctx.value!.beginPath()
    ctx.value!.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.value!.strokeStyle = gradient
    ctx.value!.lineWidth = RING_WIDTH
    ctx.value!.stroke()
  })

  ctx.value.restore()
}

// Track the effective amplitude with decay
const effectiveAmplitude = ref(0)
let lastTimestamp = 0

const updateEffectiveAmplitude = (
  timestamp: number,
  targetAmplitude: number,
) => {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp
    effectiveAmplitude.value = targetAmplitude
    return
  }

  const deltaTime = (timestamp - lastTimestamp) / 1000 // Convert to seconds
  lastTimestamp = timestamp

  if (targetAmplitude > effectiveAmplitude.value) {
    // Immediate response to increases
    effectiveAmplitude.value = targetAmplitude
  } else {
    // Gradual decay for decreases
    const decay = AMPLITUDE_DECAY_RATE * deltaTime
    effectiveAmplitude.value = Math.max(
      targetAmplitude,
      effectiveAmplitude.value - decay,
    )
  }
}

const generateWavePoints = (
  radius: number,
  amplitude: number,
  rotation: number,
  numPoints: number = 100,
): [number, number][] => {
  const points: [number, number][] = []

  // Calculate number of peaks based on amplitude
  const numPeaks = Math.floor(MIN_PEAKS + amplitude * (MAX_PEAKS - MIN_PEAKS))

  // Calculate wave height based on amplitude
  const waveHeight =
    BASE_WAVE_HEIGHT + amplitude * (MAX_WAVE_HEIGHT - BASE_WAVE_HEIGHT)

  const baseRadius = radius + SPARK_OFFSET

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 + rotation

    // Create irregular wave pattern
    const radiusOffset = Math.sin(angle * numPeaks) * waveHeight
    // Add secondary wave for more irregularity
    const secondaryOffset =
      Math.sin(angle * (numPeaks + 1) + 0.5) * (waveHeight * 0.3)

    const currentRadius = baseRadius + radiusOffset + secondaryOffset

    points.push([
      Math.cos(angle) * currentRadius,
      Math.sin(angle) * currentRadius,
    ])
  }

  return points
}

const drawSpeakingState = (timestamp: number) => {
  if (!ctx.value) return

  // Update the effective amplitude with decay
  updateEffectiveAmplitude(timestamp, safeAmplitude.value)

  const center = props.size / 2 + BLOOM_PADDING
  const maxRadius = (props.size - RING_WIDTH) / 2

  ctx.value.save()
  ctx.value.translate(center, center)

  const rotation = (timestamp / 3000) % (Math.PI * 2)

  // Draw main ring with gradient
  const ringGradient = ctx.value.createLinearGradient(
    -maxRadius,
    0,
    maxRadius,
    0,
  )
  ringGradient.addColorStop(0, '#00FF7F')
  ringGradient.addColorStop(0.5, '#FFFF00')
  ringGradient.addColorStop(1, '#00CED1')

  // Main ring glow layers
  ctx.value.globalAlpha = 0.2
  ctx.value.filter = 'blur(24px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.strokeStyle = ringGradient
  ctx.value.lineWidth = RING_WIDTH + 20
  ctx.value.stroke()

  ctx.value.globalAlpha = 0.3
  ctx.value.filter = 'blur(16px)'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.lineWidth = RING_WIDTH + 12
  ctx.value.stroke()

  // Main ring sharp layer
  ctx.value.globalAlpha = 1
  ctx.value.filter = 'none'
  ctx.value.beginPath()
  ctx.value.arc(0, 0, maxRadius, 0, Math.PI * 2)
  ctx.value.lineWidth = RING_WIDTH
  ctx.value.stroke()

  // Generate and draw spark wave using effective amplitude
  const wavePoints = generateWavePoints(
    maxRadius,
    effectiveAmplitude.value,
    rotation,
  )

  // Create spark gradient
  const sparkGradient = ctx.value.createLinearGradient(
    -maxRadius,
    0,
    maxRadius,
    0,
  )
  sparkGradient.addColorStop(0, 'rgba(0, 255, 127, 0.8)')
  sparkGradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.8)')
  sparkGradient.addColorStop(1, 'rgba(0, 206, 209, 0.8)')

  // Draw spark glow
  ctx.value.globalAlpha = 0.3
  ctx.value.filter = 'blur(16px)'
  ctx.value.beginPath()
  ctx.value.moveTo(...wavePoints[0])
  wavePoints.forEach(point => ctx.value!.lineTo(...point))
  ctx.value.closePath()
  ctx.value.strokeStyle = sparkGradient
  ctx.value.lineWidth = RING_WIDTH * 0.5
  ctx.value.stroke()

  // Draw sharp spark line
  ctx.value.globalAlpha = 0.8
  ctx.value.filter = 'blur(2px)'
  ctx.value.beginPath()
  ctx.value.moveTo(...wavePoints[0])
  wavePoints.forEach(point => ctx.value!.lineTo(...point))
  ctx.value.closePath()
  ctx.value.lineWidth = RING_WIDTH * 0.3
  ctx.value.stroke()

  ctx.value.restore()
}

const animate = (timestamp: number) => {
  clearCanvas()

  switch (props.state) {
    case 'waiting':
      drawWaitingState(timestamp)
      break
    case 'listening':
      drawListeningState(timestamp)
      break
    case 'speaking':
      drawSpeakingState(timestamp)
      break
  }

  animationFrame.value = requestAnimationFrame(animate)
}

// Lifecycle hooks
onMounted(() => {
  initCanvas()
  animationFrame.value = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})

// Watch for size changes
watch(
  () => props.size,
  () => {
    initCanvas()
  },
)

// Reset rings when state changes
watch(
  () => props.state,
  () => {
    effectiveAmplitude.value = 0
    lastTimestamp = 0
    innerRings.value = []
  },
)
</script>

<style scoped>
canvas {
  display: block;
}
</style>
