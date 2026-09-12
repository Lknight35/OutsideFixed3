import * as Types from './types'

/**
 * Simulated provider latency. Scaled by MOCK_SPEED so demo deployments stay
 * responsive while still exercising the real async code paths.
 */
const SPEED = Number(process.env.MOCK_SPEED ?? '0.15')
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms * SPEED))

const PLACEHOLDER_IMAGE = '/media/placeholder-reference.svg'
const PLACEHOLDER_VIDEO = '/media/placeholder-shot.mp4'
const PLACEHOLDER_AUDIO = '/media/placeholder-audio.mp3'

/** Deterministic pseudo-random pick so the same prompt yields the same show. */
function seeded<T>(seed: string, options: T[], salt = 0): T {
  let h = salt
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return options[h % options.length]
}

const STOPWORDS = new Set([
  'make','give','create','me','a','an','the','about','with','that','this','want',
  'watch','show','movie','series','set','in','of','and','or','to','for','on','is',
  'it','i','my','please','something','where','who','their','they','his','her',
])

// Descriptive modifiers steer tone/genre but read badly inside a title.
const MODIFIERS = new Set([
  'gritty','dark','serious','realistic','cinematic','unexpected','funny','light',
  'late','early','modern','classic','powerful','mysterious','strange','weird',
  'beautiful','isolated','secret','secretly','incompetent','sarcastic','retired',
  'psychological','animated','futuristic','tone','style','ending','dialogue',
  'photography','pacing','runtime','minute','episode','season','surprise',
])

/**
 * Pulls the most distinctive nouns out of the request to seed names and titles.
 * Longer words first — they carry more of the request's identity.
 */
function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !MODIFIERS.has(w))
    .sort((a, b) => b.length - a.length)
}

const TITLE_SHAPES = [
  (k: string[]) => `The ${cap(k[0] ?? 'Signal')} ${cap(k[1] ?? 'Protocol')}`,
  (k: string[]) => `${cap(k[0] ?? 'Long')} ${cap(k[1] ?? 'Shadow')}`,
  (k: string[]) => `No ${cap(k[0] ?? 'Country')} for ${cap(k[1] ?? 'Us')}`,
  (k: string[]) => `${cap(k[0] ?? 'Static')}`,
]

const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w)

const GENRE_HINTS: Array<[RegExp, string[]]> = [
  [/horror|haunt|scary|terror/i, ['horror', 'thriller']],
  [/comed|funny|sitcom|hilarious/i, ['comedy']],
  [/crime|detective|heist|noir|murder/i, ['crime', 'drama']],
  [/sci-?fi|space|future|robot|alien|cyber/i, ['sci-fi']],
  [/fantasy|magic|dragon|wizard/i, ['fantasy', 'adventure']],
  [/romance|love|romantic/i, ['romance', 'drama']],
  [/documentar/i, ['documentary']],
  [/animat|cartoon/i, ['animation', 'comedy']],
]

function inferGenre(prompt: string): string[] {
  for (const [pattern, genres] of GENRE_HINTS) {
    if (pattern.test(prompt)) return genres
  }
  return ['drama']
}

function inferTone(prompt: string): string {
  if (/funny|comed|light|silly/i.test(prompt)) return 'wry and warm'
  if (/gritty|dark|brutal|bleak/i.test(prompt)) return 'gritty and restrained'
  if (/horror|dread|scary/i.test(prompt)) return 'slow-building dread'
  return 'grounded and character-first'
}

export class MockLLMProvider implements Types.LLMProvider {
  async generateStory(
    request: Types.StoryGenerationRequest
  ): Promise<Types.StoryGenerationResponse> {
    await delay(1000)

    const prompt = request.userDescription
    const opts = request.advancedOptions ?? {}
    const k = keywords(prompt)
    const subject = k[0] ?? 'signal'
    const place = opts.setting || cap(k[1] ?? 'the city')

    const showTitle = seeded(prompt, TITLE_SHAPES)(k)
    const protagonist = seeded(
      prompt,
      ['Rey Alvarez', 'Dana Ito', 'Marcus Vale', 'Nadia Okoro', 'Sam Reyes'],
      7
    )
    const second = seeded(
      prompt,
      ['Iris', 'Cormac', 'Tess', 'Odell', 'Junie'],
      13
    )

    return {
      showTitle,
      episodeTitle: seeded(
        prompt,
        ['Cold Open', 'First Light', 'The Long Way Down', 'Pilot'],
        3
      ),
      logline: `${protagonist} is pulled into a story about ${subject} — and cannot walk away clean.`,
      synopsis: `Built from your request: "${prompt.slice(0, 180)}${
        prompt.length > 180 ? '…' : ''
      }" ${protagonist} navigates ${place}, where ${second} knows more than they admit.`,
      format: opts.format || 'series',
      genre: opts.genre?.length ? opts.genre : inferGenre(prompt),
      tone: opts.tone || inferTone(prompt),
      setting: place,
      timePeriod: opts.timePeriod || 'present day',
      visualStyle: opts.visualStyle || 'anamorphic, high contrast, natural light',
      themes: [subject, 'loyalty', 'consequence'],
      characters: [
        {
          id: 'char_001',
          name: protagonist,
          description: `Central figure of the story; defined by the ${subject} they cannot let go of`,
          role: 'protagonist',
        },
        {
          id: 'char_002',
          name: second,
          description: `Counterweight to ${protagonist}; holds the information that turns the story`,
          role: 'supporting',
        },
      ],
      locations: [
        {
          id: 'loc_001',
          name: `${place}`,
          description: `The primary world of the story, rendered in ${
            opts.visualStyle || 'grounded, cinematic'
          } style`,
        },
        {
          id: 'loc_002',
          name: 'The Interior',
          description: 'A closed, private space where the truth gets said out loud',
        },
      ],
      scenes: [
        {
          id: 'scene_001',
          number: 1,
          title: 'Cold Open',
          description: `${protagonist} arrives in ${place} and finds the situation already in motion`,
          charactersPresent: ['char_001'],
        },
        {
          id: 'scene_002',
          number: 2,
          title: 'The Meeting',
          description: `${protagonist} confronts ${second}, and the shape of the problem changes`,
          charactersPresent: ['char_001', 'char_002'],
        },
        {
          id: 'scene_003',
          number: 3,
          title: 'Turn',
          description: `The ${subject} forces a decision neither of them wanted to make`,
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
    return PLACEHOLDER_IMAGE
  }

  async generateCharacterReference(
    request: Types.CharacterReferenceRequest
  ): Promise<string[]> {
    await delay(3000)
    // Return mock image URLs
    return [
      PLACEHOLDER_IMAGE,
      PLACEHOLDER_IMAGE,
      PLACEHOLDER_IMAGE,
      PLACEHOLDER_IMAGE,
    ]
  }

  async generateLocationReference(
    _request: Types.LocationReferenceRequest
  ): Promise<string[]> {
    await delay(3000)
    return [
      PLACEHOLDER_IMAGE,
      PLACEHOLDER_IMAGE,
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
      videoUrl: PLACEHOLDER_VIDEO,
      estimatedCost: 0.5,
    }
  }

  async getStatus(_jobId: string): Promise<Types.VideoGenerationStatus> {
    await delay(500)
    return {
      jobId: _jobId,
      status: 'complete',
      videoUrl: PLACEHOLDER_VIDEO,
    }
  }
}

export class MockVoiceProvider implements Types.VoiceProvider {
  async generateSpeech(
    _request: Types.SpeechGenerationRequest
  ): Promise<Types.SpeechGenerationResponse> {
    await delay(1000)
    return {
      audioUrl: PLACEHOLDER_AUDIO,
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
    return PLACEHOLDER_AUDIO
  }

  async generateAmbience(_request: Types.AmbienceRequest): Promise<string> {
    await delay(1000)
    return PLACEHOLDER_AUDIO
  }
}

export class MockMusicProvider implements Types.MusicProvider {
  async generateMusic(_request: Types.MusicGenerationRequest): Promise<string> {
    await delay(2000)
    return PLACEHOLDER_AUDIO
  }
}
