import * as Types from './types'

// Simulate generation delay
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class MockLLMProvider implements Types.LLMProvider {
  async generateStory(
    request: Types.StoryGenerationRequest
  ): Promise<Types.StoryGenerationResponse> {
    await delay(1000)

    const genres = request.advancedOptions?.genre || ['drama', 'thriller']
    const setting = request.advancedOptions?.setting || 'Modern urban city'
    const format = request.advancedOptions?.format || 'series'

    return {
      showTitle: 'Neon Dreams',
      episodeTitle: 'Pilot',
      logline:
        'A mysterious detective uncovers a conspiracy that challenges everything they know.',
      synopsis:
        'Set in a futuristic cityscape, our protagonist navigates a world of secrets and deception.',
      format,
      genre: genres,
      tone: request.advancedOptions?.tone || 'noir',
      setting,
      timePeriod: request.advancedOptions?.timePeriod || '2085',
      visualStyle: request.advancedOptions?.visualStyle || 'cinematic cyberpunk',
      themes: ['identity', 'betrayal', 'power'],
      characters: [
        {
          id: 'char_001',
          name: 'Alex Chen',
          description: 'A cynical detective with a hidden past',
          role: 'protagonist',
        },
        {
          id: 'char_002',
          name: 'Morgan',
          description: 'An AI companion with questionable motives',
          role: 'supporting',
        },
      ],
      locations: [
        {
          id: 'loc_001',
          name: 'The Neon District',
          description: 'A vibrant downtown area filled with holographic signs',
        },
        {
          id: 'loc_002',
          name: 'Police Precinct',
          description: 'A high-tech law enforcement headquarters',
        },
      ],
      scenes: [
        {
          id: 'scene_001',
          number: 1,
          title: 'Introduction',
          description: 'Alex is called to investigate a mysterious crime',
          charactersPresent: ['char_001'],
        },
        {
          id: 'scene_002',
          number: 2,
          title: 'Partnership',
          description: 'Alex meets Morgan for the first time',
          charactersPresent: ['char_001', 'char_002'],
        },
      ],
    }
  }

  async generateStructuredOutput<T>(_prompt: string, _schema: any): Promise<T> {
    await delay(500)
    return {} as T
  }

  async generateText(_prompt: string): Promise<string> {
    await delay(300)
    return 'Generated text content'
  }
}

export class MockImageProvider implements Types.ImageProvider {
  async generateImage(_request: Types.ImageGenerationRequest): Promise<string> {
    await delay(2000)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }

  async generateCharacterReference(
    request: Types.CharacterReferenceRequest
  ): Promise<string[]> {
    await delay(3000)
    // Return mock image URLs
    return [
      `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
    ]
  }

  async generateLocationReference(
    _request: Types.LocationReferenceRequest
  ): Promise<string[]> {
    await delay(3000)
    return [
      `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
    ]
  }
}

export class MockVideoProvider implements Types.VideoProvider {
  async generateVideo(
    request: Types.VideoGenerationRequest
  ): Promise<Types.VideoGenerationResponse> {
    await delay(5000)

    return {
      jobId: `job_${Date.now()}`,
      status: 'complete',
      videoUrl: '/mock-video.mp4',
      estimatedCost: 0.5,
    }
  }

  async getStatus(_jobId: string): Promise<Types.VideoGenerationStatus> {
    await delay(500)
    return {
      jobId: _jobId,
      status: 'complete',
      videoUrl: '/mock-video.mp4',
    }
  }
}

export class MockVoiceProvider implements Types.VoiceProvider {
  async generateSpeech(
    _request: Types.SpeechGenerationRequest
  ): Promise<Types.SpeechGenerationResponse> {
    await delay(1000)
    return {
      audioUrl: '/mock-audio.mp3',
      durationSeconds: 10,
    }
  }

  async listVoices(): Promise<Types.VoiceOption[]> {
    return [
      {
        id: 'voice_001',
        name: 'Alex - Deep Male',
        description: 'A deep, authoritative male voice',
        gender: 'male',
        language: 'en',
      },
      {
        id: 'voice_002',
        name: 'Morgan - Neutral AI',
        description: 'A neutral, robotic AI voice',
        gender: 'neutral',
        language: 'en',
      },
    ]
  }
}

export class MockSoundProvider implements Types.SoundProvider {
  async generateSoundEffect(
    _request: Types.SoundEffectRequest
  ): Promise<string> {
    await delay(1000)
    return '/mock-sound.mp3'
  }

  async generateAmbience(_request: Types.AmbienceRequest): Promise<string> {
    await delay(1000)
    return '/mock-ambience.mp3'
  }
}

export class MockMusicProvider implements Types.MusicProvider {
  async generateMusic(_request: Types.MusicGenerationRequest): Promise<string> {
    await delay(2000)
    return '/mock-music.mp3'
  }
}
