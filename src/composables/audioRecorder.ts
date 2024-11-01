export interface AudioRecorderOptions {
  fftSize?: number
}

export interface AudioRecorderReturn {
  amplitude: Ref<number>
  isRecording: Ref<boolean>
  startRecording: () => Promise<void>
  stopRecording: () => void
}

type WorkerMessage = {
  type: 'analyze'
  buffer: Float32Array
}

type WorkerResponse = {
  type: 'amplitude'
  value: number
}

// declare const self: Worker

import { ref, onUnmounted, type Ref } from 'vue'

export function useAudioRecorder(
  options: AudioRecorderOptions = { fftSize: 1024 },
): AudioRecorderReturn {
  const amplitude = ref<number>(0)
  const isRecording = ref<boolean>(false)

  let mediaRecorder: MediaRecorder | null = null
  let audioContext: AudioContext | null = null
  let analyzerNode: AnalyserNode | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let animationFrame: number | null = null
  let worker: Worker | null = null
  let stream: MediaStream | null = null

  // Initialize Web Worker
  const initWorker = (): void => {
    const workerBlob = new Blob(
      [
        `self.onmessage = function(e) {
        if (e.data.type === 'analyze') {
          const buffer = e.data.buffer;
          // Calculate RMS (Root Mean Square) amplitude
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
          }
          const rms = Math.sqrt(sum / buffer.length);
          // Normalize to 0-1 range (assuming typical audio values)
          const normalizedAmplitude = Math.min(1, rms / 0.5);
          self.postMessage({
            type: 'amplitude',
            value: normalizedAmplitude
          });
        }
      };`,
      ],
      { type: 'application/javascript' },
    )
    worker = new Worker(URL.createObjectURL(workerBlob))
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'amplitude') {
        amplitude.value = e.data.value
      }
    }
  }

  // Initialize audio context and analyzer with the stream
  const initAudio = (stream: MediaStream): void => {
    audioContext = new AudioContext()
    analyzerNode = audioContext.createAnalyser()
    analyzerNode.fftSize = options.fftSize ?? 1024
    sourceNode = audioContext.createMediaStreamSource(stream)
    sourceNode.connect(analyzerNode)
  }

  // Function to analyze audio
  const analyzeAudio = (): void => {
    if (!analyzerNode || !isRecording.value) return

    const dataArray = new Float32Array(analyzerNode.fftSize)
    analyzerNode.getFloatTimeDomainData(dataArray)

    worker?.postMessage({
      type: 'analyze',
      buffer: dataArray,
    } as WorkerMessage)

    // Limit to 60fps
    animationFrame = requestAnimationFrame(analyzeAudio)
  }

  // Start recording
  const startRecording = async (): Promise<void> => {
    try {
      if (!worker) initWorker()

      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Initialize audio context after getting the stream
      initAudio(stream)

      if (!audioContext || !analyzerNode) {
        throw new Error('Audio context not initialized')
      }

      mediaRecorder = new MediaRecorder(stream)
      mediaRecorder.start()

      isRecording.value = true
      analyzeAudio()
    } catch (error) {
      console.error('Error starting recording:', error)
      throw error
    }
  }

  // Stop recording
  const stopRecording = (): void => {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop()
      sourceNode?.disconnect()
      if (animationFrame) cancelAnimationFrame(animationFrame)
      stream?.getTracks().forEach(track => track.stop())
      isRecording.value = false
      amplitude.value = 0
    }
  }

  // Cleanup
  onUnmounted(() => {
    stopRecording()
    worker?.terminate()
    audioContext?.close()
  })

  return {
    amplitude,
    isRecording,
    startRecording,
    stopRecording,
  }
}
