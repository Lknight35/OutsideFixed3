import * as Types from './types'
import {
  MockLLMProvider,
  MockImageProvider,
  MockVideoProvider,
  MockVoiceProvider,
  MockSoundProvider,
  MockMusicProvider,
} from './mock'

// Provider instances (singleton pattern)
let llmProvider: Types.LLMProvider | null = null
let imageProvider: Types.ImageProvider | null = null
let videoProvider: Types.VideoProvider | null = null
let voiceProvider: Types.VoiceProvider | null = null
let soundProvider: Types.SoundProvider | null = null
let musicProvider: Types.MusicProvider | null = null

function getProviderName(envVar: string, fallback: string = 'mock'): string {
  return (process.env[envVar] || fallback).toLowerCase()
}

export function getLLMProvider(): Types.LLMProvider {
  if (!llmProvider) {
    const providerName = getProviderName('LLM_PROVIDER')
    llmProvider = createLLMProvider(providerName)
  }
  return llmProvider
}

export function getImageProvider(): Types.ImageProvider {
  if (!imageProvider) {
    const providerName = getProviderName('IMAGE_PROVIDER')
    imageProvider = createImageProvider(providerName)
  }
  return imageProvider
}

export function getVideoProvider(): Types.VideoProvider {
  if (!videoProvider) {
    const providerName = getProviderName('VIDEO_PROVIDER')
    videoProvider = createVideoProvider(providerName)
  }
  return videoProvider
}

export function getVoiceProvider(): Types.VoiceProvider {
  if (!voiceProvider) {
    const providerName = getProviderName('VOICE_PROVIDER')
    voiceProvider = createVoiceProvider(providerName)
  }
  return voiceProvider
}

export function getSoundProvider(): Types.SoundProvider {
  if (!soundProvider) {
    const providerName = getProviderName('SOUND_PROVIDER')
    soundProvider = createSoundProvider(providerName)
  }
  return soundProvider
}

export function getMusicProvider(): Types.MusicProvider {
  if (!musicProvider) {
    const providerName = getProviderName('MUSIC_PROVIDER')
    musicProvider = createMusicProvider(providerName)
  }
  return musicProvider
}

function createLLMProvider(providerName: string): Types.LLMProvider {
  switch (providerName) {
    case 'claude':
      return new MockLLMProvider() // TODO: implement real Claude provider
    case 'openai':
      return new MockLLMProvider() // TODO: implement OpenAI provider
    case 'gemini':
      return new MockLLMProvider() // TODO: implement Gemini provider
    default:
      return new MockLLMProvider()
  }
}

function createImageProvider(providerName: string): Types.ImageProvider {
  switch (providerName) {
    case 'google':
      return new MockImageProvider() // TODO: implement Google image provider
    case 'openai':
      return new MockImageProvider() // TODO: implement OpenAI image provider
    default:
      return new MockImageProvider()
  }
}

function createVideoProvider(providerName: string): Types.VideoProvider {
  switch (providerName) {
    case 'google':
      return new MockVideoProvider() // TODO: implement Google Veo provider
    case 'runway':
      return new MockVideoProvider() // TODO: implement Runway provider
    case 'luma':
      return new MockVideoProvider() // TODO: implement Luma provider
    default:
      return new MockVideoProvider()
  }
}

function createVoiceProvider(providerName: string): Types.VoiceProvider {
  switch (providerName) {
    case 'elevenlabs':
      return new MockVoiceProvider() // TODO: implement ElevenLabs provider
    default:
      return new MockVoiceProvider()
  }
}

function createSoundProvider(providerName: string): Types.SoundProvider {
  switch (providerName) {
    case 'elevenlabs':
      return new MockSoundProvider() // TODO: implement ElevenLabs sound provider
    default:
      return new MockSoundProvider()
  }
}

function createMusicProvider(providerName: string): Types.MusicProvider {
  switch (providerName) {
    case 'runway':
      return new MockMusicProvider() // TODO: implement Runway music provider
    default:
      return new MockMusicProvider()
  }
}

// Export types
export type * from './types'
