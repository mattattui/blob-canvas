import { ref } from 'vue'

class AudioSimulator {
  private baseAmplitude = 0.4 // Increased from 0.3
  private maxAmplitude = 1.0 // Increased from 0.8
  private frequency = 0.3 // Increased from 0.2 for more dynamic changes
  private jitter = 0.15 // Increased from 0.1
  private pauseProbability = 0.03 // Reduced from 0.05 for fewer pauses
  private pauseDuration = 200 // Reduced from 300ms
  private lastUpdate = 0
  private isPaused = false
  private pauseEndTime = 0

  // Enhanced speech pattern simulation
  private currentPhrase = 0
  private phraseProgress = 0
  private phraseDuration = 800 // Reduced from 1000ms for punchier phrases
  private emphasisProbability = 0.2 // Chance of emphasized syllables

  constructor(baseAmplitude = 0.4, maxAmplitude = 1.0, frequency = 0.3) {
    this.baseAmplitude = baseAmplitude
    this.maxAmplitude = maxAmplitude
    this.frequency = frequency
  }

  getAmplitude(timestamp: number): number {
    // Handle pauses
    if (this.isPaused) {
      if (timestamp >= this.pauseEndTime) {
        this.isPaused = false
      } else {
        return 0
      }
    } else if (Math.random() < this.pauseProbability) {
      this.isPaused = true
      this.pauseEndTime = timestamp + this.pauseDuration
      return 0
    }

    // Update phrase progress
    this.phraseProgress =
      (timestamp % this.phraseDuration) / this.phraseDuration
    if (this.phraseProgress < this.lastUpdate) {
      this.currentPhrase = Math.random()
    }
    this.lastUpdate = this.phraseProgress

    // Generate more dynamic amplitude using multiple sine waves
    const mainWave = Math.sin(timestamp * this.frequency * 0.001)
    const fastWave = Math.sin(timestamp * this.frequency * 0.008) // Faster variation
    const slowWave = Math.sin(timestamp * this.frequency * 0.0003)

    // Add occasional emphasis peaks
    const emphasis =
      Math.random() < this.emphasisProbability
        ? Math.pow(Math.sin(timestamp * 0.01), 2) * 0.3
        : 0

    // Combine waves with enhanced dynamics
    let amplitude =
      this.baseAmplitude +
      (mainWave * 0.4 + fastWave * 0.2 + slowWave * 0.2) *
        (this.maxAmplitude - this.baseAmplitude)

    // Apply more pronounced phrase envelope
    const phraseEnvelope = Math.pow(Math.sin(this.phraseProgress * Math.PI), 2)
    amplitude *= phraseEnvelope

    // Add emphasis and jitter
    amplitude += emphasis
    amplitude += (Math.random() - 0.5) * this.jitter

    // Clamp between 0 and maxAmplitude
    return Math.max(0, Math.min(this.maxAmplitude, amplitude))
  }
}

// Example usage in a Vue component
export function useSpeakingSimulator() {
  const audioAmplitude = ref(0)
  const simulator = new AudioSimulator()
  let animationFrame: number

  const startSimulation = () => {
    const updateAmplitude = (timestamp: number) => {
      audioAmplitude.value = simulator.getAmplitude(timestamp)
      animationFrame = requestAnimationFrame(updateAmplitude)
    }
    animationFrame = requestAnimationFrame(updateAmplitude)
  }

  const stopSimulation = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
    audioAmplitude.value = 0
  }

  return {
    audioAmplitude,
    startSimulation,
    stopSimulation,
  }
}
