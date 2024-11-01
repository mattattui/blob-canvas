# Blob Canvas Project

## Purpose

This project is a Vue 3 application that provides a dynamic audio visualization and simulation interface. It includes components and composables for simulating speech patterns, recording audio, and visualizing amplitude data in real-time.

## Composables

### `useSpeakingSimulator`

This composable simulates speech patterns by generating dynamic amplitude values over time. It can be used to create realistic audio visualizations without actual audio input.

#### Usage

```typescript
import { useSpeakingSimulator } from './composables/speakingSimulator'

const { audioAmplitude, startSimulation, stopSimulation } =
  useSpeakingSimulator()

// Start the simulation
startSimulation()

// Stop the simulation
stopSimulation()
```

### `useAudioRecorder`

This composable records audio from the user's microphone and analyzes the amplitude in real-time using a Web Worker for efficient processing.

#### Usage

```typescript
import { useAudioRecorder } from './composables/audioRecorder'

const { amplitude, isRecording, startRecording, stopRecording } =
  useAudioRecorder({
    fftSize: 1024,
  })

// Start recording
await startRecording()

// Stop recording
stopRecording()
```

## Components

### `ChatStatus`

The `ChatStatus` component visualizes different states (`waiting`, `listening`, `speaking`) with dynamic animations. It uses the `audioAmplitude` prop to adjust the visualization based on the current audio amplitude.

#### Props

- `state`: The current state of the chat (`waiting`, `listening`, `speaking`).
- `audioAmplitude`: The current audio amplitude (between 0 and 1).
- `size`: The size of the canvas (default: 100).

#### Usage

```vue
<ChatStatus :state="state" :audio-amplitude="audioAmplitude" :size="300" />
```

### `Visualiser`

The `Visualiser` component displays a real-time graph of the audio amplitude over time. It provides a visual history of the amplitude changes.

#### Props

- `amplitude`: The current audio amplitude (between 0 and 1).
- `width`: The width of the canvas (default: 300).
- `height`: The height of the canvas (default: 150).
- `historySeconds`: The number of seconds to display in the history (default: 5).
- `refreshRate`: The refresh rate of the visualization (default: 60).

#### Usage

```vue
<Visualiser :amplitude="amplitude" :width="300" :height="150" />
```

## Main Testing Interface

The main testing interface is located in `App.vue`. It allows you to switch between different states (`waiting`, `listening`, `speaking`) and visualize the corresponding animations and audio amplitude.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
yarn
```

### Compile and Hot-Reload for Development

```sh
yarn dev
```

### Type-Check, Compile and Minify for Production

```sh
yarn build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
yarn test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
yarn lint
```
