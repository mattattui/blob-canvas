<script setup lang="ts">
import ChatStatus from './components/ChatStatus.vue'
import Visualiser from './components/Visualiser.vue'
import type { StatusState } from './components/ChatStatus.vue'
import { ref, watch, onBeforeUnmount } from 'vue'
import { useSpeakingSimulator } from './composables/speakingSimulator'
import { useAudioRecorder } from './composables/audioRecorder'

const state = ref<StatusState>('waiting')

const { amplitude, startRecording, stopRecording } = useAudioRecorder({
  fftSize: 1024,
})
// const { audioAmplitude, startSimulation, stopSimulation } =
useSpeakingSimulator()

// Start simulation when state changes to 'speaking'
watch(
  () => state.value,
  newState => {
    if (newState === 'speaking') {
      startRecording()
    } else {
      stopRecording()
    }
  },
)

// Clean up
onBeforeUnmount(() => {
  stopRecording()
})
</script>

<template>
  <main class="wrapper">
    <ChatStatus :state="state" :size="300" :audio-amplitude="amplitude" />
    <div>
      <div class="buttons">
        <button @click="state = 'waiting'">Waiting</button>
        <button @click="state = 'listening'">Listening</button>
        <button @click="state = 'speaking'">Speaking</button>
      </div>
      <Visualiser :amplitude="amplitude" />
    </div>
  </main>
</template>

<style scoped>
.wrapper {
  min-height: 100dvh;
  display: grid;
  place-items: center;
}
.buttons {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
