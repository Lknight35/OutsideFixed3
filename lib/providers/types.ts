// Provider interface types

export interface LLMProvider {
  generateStory(request: StoryGenerationRequest): Promise<StoryGenerationResponse>
  generateStructuredOutput<T>(prompt: string, schema: any): Promise<T>
  generateText(prompt: string): Promise<string>
}

export interface ImageProvider {
  generateImage(request: ImageGenerationRequest): Promise<string>
  generateCharacterReference(request: CharacterReferenceRequest): Promise<string[]>
  generateLocationReference(request: LocationReferenceRequest): Promise<string[]>
}

export interface VideoProvider {
  generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse>
  getStatus(jobId: string): Promise<VideoGenerationStatus>
}

export interface VoiceProvider {
  generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResponse>
  listVoices(): Promise<VoiceOption[]>
}

export interface SoundProvider {
  generateSoundEffect(request: SoundEffectRequest): Promise<string>
  generateAmbience(request: AmbienceRequest): Promise<string>
}

export interface MusicProvider {
  generateMusic(request: MusicGenerationRequest): Promise<string>
}

// Request/Response types
export interface StoryGenerationRequest {
  userDescription: string
  advancedOptions?: {
    format?: 'movie' | 'series' | 'short'
    genre?: string[]
    setting?: string
    timePeriod?: string
    tone?: string
    visualStyle?: string
    runtime?: number
    numCharacters?: number
    violence?: 'none' | 'mild' | 'moderate' | 'graphic'
    comedy?: 'none' | 'light' | 'moderate' | 'heavy'
    romance?: 'none' | 'subplot' | 'central'
    pacing?: 'slow' | 'moderate' | 'fast'
    ending?: 'happy' | 'dark' | 'bittersweet' | 'twist' | 'surprise'
  }
}

export interface StoryGenerationResponse {
  showTitle: string
  episodeTitle: string
  logline: string
  synopsis: string
  format: 'movie' | 'series' | 'short'
  genre: string[]
  tone: string
  setting: string
  timePeriod: string
  visualStyle: string
  themes: string[]
  characters: Array<{
    id: string
    name: string
    description: string
    role: string
  }>
  locations: Array<{
    id: string
    name: string
    description: string
  }>
  scenes: Array<{
    id: string
    number: number
    title: string
    description: string
    charactersPresent: string[]
  }>
}

export interface ImageGenerationRequest {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  numImages?: number
}

export interface CharacterReferenceRequest {
  characterName: string
  characterDescription: string
  physicalAppearance?: string
  wardrobe?: string
}

export interface LocationReferenceRequest {
  locationName: string
  locationDescription: string
  architecture?: string
  atmosphere?: string
  timeOfDay?: string
}

export interface VideoGenerationRequest {
  prompt: string
  negativePrompt?: string
  durationSeconds: number
  width?: number
  height?: number
  fps?: number
  referenceImageUrls?: string[]
  characterReferences?: Record<string, string>
  locationReferences?: Record<string, string>
}

export interface VideoGenerationResponse {
  jobId: string
  status: 'queued' | 'processing' | 'complete'
  videoUrl?: string
  estimatedCost: number
}

export interface VideoGenerationStatus {
  jobId: string
  status: 'queued' | 'processing' | 'complete' | 'failed'
  videoUrl?: string
  error?: string
  progress?: number
}

export interface SpeechGenerationRequest {
  text: string
  voiceId: string
  speed?: number
  pitch?: number
}

export interface SpeechGenerationResponse {
  audioUrl: string
  durationSeconds: number
}

export interface VoiceOption {
  id: string
  name: string
  description: string
  gender?: string
  language?: string
}

export interface SoundEffectRequest {
  description: string
  durationSeconds?: number
  intensity?: 'low' | 'medium' | 'high'
}

export interface AmbienceRequest {
  description: string
  durationSeconds: number
  intensity?: 'low' | 'medium' | 'high'
}

export interface MusicGenerationRequest {
  mood: string
  tempo?: 'slow' | 'moderate' | 'fast'
  intensity?: 'low' | 'medium' | 'high'
  durationSeconds: number
  genre?: string
}
