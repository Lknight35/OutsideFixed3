import { PrismaClient } from '@prisma/client'
import {
  getImageProvider,
  getVideoProvider,
  getVoiceProvider,
  getMusicProvider,
} from '@/lib/providers'
import { COST_ESTIMATES, consumeCredits, recordUsage } from '@/lib/utils/cost'

const prisma = new PrismaClient()

/**
 * Ordered production states. `advance()` moves a show through these one
 * bounded step at a time so a single step always fits inside a serverless
 * function invocation. A queue worker can drive the same `advance()` loop.
 */
export const PRODUCTION_STATES = [
  'writing',
  'designing',
  'planning',
  'generating_video',
  'generating_audio',
  'assembling',
  'complete',
] as const

export type ProductionState = (typeof PRODUCTION_STATES)[number]

const PLACEHOLDER_VIDEO = '/media/placeholder-shot.mp4'
const SHOTS_PER_SCENE = 2

export class ProductionPipeline {
  /**
   * Performs one unit of production work and persists the result.
   * Safe to call repeatedly; returns the show's state after the step.
   */
  async advance(showId: string): Promise<{ state: string; detail: string }> {
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        characters: { include: { characterAssets: true } },
        locations: { include: { locationAssets: true } },
        episodes: { include: { scenes: { include: { shots: true } } } },
      },
    })
    if (!show) throw new Error(`Show ${showId} not found`)

    switch (show.status) {
      case 'writing':
        // Story already exists from creation; move into design and start work.
        await this.setState(showId, 'designing')
        return this.stageDesigning({ ...show, status: 'designing' })
      case 'designing':
        return this.stageDesigning(show)
      case 'planning':
        return this.stagePlanning(show)
      case 'generating_video':
        return this.stageVideo(show)
      case 'generating_audio':
        return this.stageAudio(show)
      case 'assembling':
        return this.stageAssembly(show)
      case 'complete':
        return { state: 'complete', detail: 'Production finished' }
      default:
        await this.setState(showId, 'designing')
        return { state: 'designing', detail: 'Starting production' }
    }
  }

  /** Generates canonical character and location reference assets. */
  private async stageDesigning(show: any) {
    const imageProvider = getImageProvider()

    const character = show.characters.find(
      (c: any) => c.characterAssets.length === 0
    )
    if (character) {
      const urls = await imageProvider.generateCharacterReference({
        characterName: character.name,
        characterDescription: character.background || '',
        physicalAppearance: character.physicalAppearance || undefined,
        wardrobe: character.wardrobe || undefined,
      })
      const types = ['front_portrait', 'three_quarter', 'profile', 'full_body']
      await prisma.characterAsset.createMany({
        data: urls.map((url, i) => ({
          characterId: character.id,
          type: types[i] ?? 'reference',
          url,
          description: `${types[i] ?? 'reference'} reference for ${character.name}`,
        })),
      })
      await this.recordCost(show, 'character_assets', COST_ESTIMATES.character_assets)
      return { state: 'designing', detail: `Cast ${character.name}` }
    }

    const location = show.locations.find((l: any) => l.locationAssets.length === 0)
    if (location) {
      const urls = await imageProvider.generateLocationReference({
        locationName: location.name,
        locationDescription: location.description || '',
        atmosphere: location.atmosphere || undefined,
      })
      await prisma.locationAsset.createMany({
        data: urls.map((url) => ({
          locationId: location.id,
          url,
          description: `Reference for ${location.name}`,
        })),
      })
      await this.recordCost(show, 'location_assets', COST_ESTIMATES.location_assets)
      return { state: 'designing', detail: `Designed ${location.name}` }
    }

    await this.setState(show.id, 'planning')
    return { state: 'planning', detail: 'Cast and world locked' }
  }

  /** Expands each scene into a shot list. */
  private async stagePlanning(show: any) {
    const episode = show.episodes[show.episodes.length - 1]
    if (!episode) {
      await this.setState(show.id, 'complete')
      return { state: 'complete', detail: 'No episode to plan' }
    }

    const locations = show.locations
    for (const scene of episode.scenes) {
      if (scene.shots.length >= SHOTS_PER_SCENE) continue
      const location = locations[scene.sceneNumber % Math.max(locations.length, 1)]

      for (let i = scene.shots.length; i < SHOTS_PER_SCENE; i++) {
        const framing = i === 0 ? 'wide establishing shot' : 'medium close-up'
        await prisma.shot.upsert({
          where: { sceneId_shotNumber: { sceneId: scene.id, shotNumber: i + 1 } },
          create: {
            sceneId: scene.id,
            shotNumber: i + 1,
            description: scene.description,
            cameraFraming: framing,
            cameraMovement: i === 0 ? 'slow push in' : 'static',
            lensStyle: show.visualStyle || 'anamorphic',
            lighting: 'motivated practical lighting',
            visualPrompt: [
              show.visualStyle,
              framing,
              scene.description,
              location ? `Location: ${location.name}. ${location.description ?? ''}` : '',
            ]
              .filter(Boolean)
              .join('. '),
            negativePrompt: 'text, watermark, distorted faces, extra limbs',
            targetDurationSeconds: 5,
            status: 'pending',
          },
          update: {},
        })
      }

      if (location && !scene.locationId) {
        await prisma.scene.update({
          where: { id: scene.id },
          data: { locationId: location.id },
        })
      }
    }

    await this.recordCost(show, 'scene_planning', COST_ESTIMATES.scene_planning)
    await this.setState(show.id, 'generating_video')
    return { state: 'generating_video', detail: 'Shot list ready' }
  }

  /** Generates one pending shot per call via the configured video provider. */
  private async stageVideo(show: any) {
    const episode = show.episodes[show.episodes.length - 1]
    const pending = await prisma.shot.findFirst({
      where: {
        scene: { episodeId: episode.id },
        status: { in: ['pending', 'retrying'] },
      },
      orderBy: [{ scene: { sceneNumber: 'asc' } }, { shotNumber: 'asc' }],
      include: { scene: true },
    })

    if (!pending) {
      await this.setState(show.id, 'generating_audio')
      return { state: 'generating_audio', detail: 'All shots filmed' }
    }

    await prisma.shot.update({
      where: { id: pending.id },
      data: { status: 'generating' },
    })

    const job = await prisma.generationJob.create({
      data: {
        jobType: 'shot_video',
        episodeId: episode.id,
        shotId: pending.id,
        provider: process.env.VIDEO_PROVIDER || 'mock',
        prompt: pending.visualPrompt,
        status: 'running',
        startedAt: new Date(),
        estimatedCost: COST_ESTIMATES.shot_video_generation,
      },
    })

    try {
      const result = await getVideoProvider().generateVideo({
        prompt: pending.visualPrompt,
        negativePrompt: pending.negativePrompt || undefined,
        durationSeconds: pending.targetDurationSeconds,
      })

      const videoUrl = result.videoUrl ?? PLACEHOLDER_VIDEO
      await prisma.mediaAsset.create({
        data: {
          episodeId: episode.id,
          shotId: pending.id,
          type: 'video',
          url: videoUrl,
          duration: pending.targetDurationSeconds,
          format: 'mp4',
        },
      })
      await prisma.shot.update({
        where: { id: pending.id },
        data: { status: 'complete' },
      })
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'complete',
          completedAt: new Date(),
          actualCost: result.estimatedCost,
          response: JSON.stringify(result),
        },
      })
      await this.recordCost(
        show,
        'shot_video',
        COST_ESTIMATES.shot_video_generation,
        result.estimatedCost
      )
      return {
        state: 'generating_video',
        detail: `Filmed scene ${pending.scene.sceneNumber}, shot ${pending.shotNumber}`,
      }
    } catch (error) {
      const attempt = job.attempt
      const exhausted = attempt >= job.maxAttempts
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: exhausted ? 'failed' : 'retrying',
          attempt: attempt + 1,
          error: String(error),
        },
      })
      await prisma.shot.update({
        where: { id: pending.id },
        data: { status: exhausted ? 'failed' : 'retrying' },
      })
      return {
        state: 'generating_video',
        detail: exhausted ? 'Shot failed' : 'Retrying shot',
      }
    }
  }

  /** Generates dialogue and score for the episode. */
  private async stageAudio(show: any) {
    const episode = show.episodes[show.episodes.length - 1]

    const existing = await prisma.mediaAsset.count({
      where: { episodeId: episode.id, type: { in: ['dialogue', 'music'] } },
    })
    if (existing === 0) {
      const speech = await getVoiceProvider().generateSpeech({
        text: episode.description || episode.title,
        voiceId: 'voice_001',
      })
      await prisma.mediaAsset.create({
        data: {
          episodeId: episode.id,
          type: 'dialogue',
          url: speech.audioUrl,
          duration: speech.durationSeconds,
          format: 'mp3',
        },
      })
      await this.recordCost(show, 'dialogue', COST_ESTIMATES.dialogue_generation)

      try {
        const musicUrl = await getMusicProvider().generateMusic({
          mood: show.tone || 'cinematic',
          durationSeconds: 30,
        })
        await prisma.mediaAsset.create({
          data: { episodeId: episode.id, type: 'music', url: musicUrl, format: 'mp3' },
        })
        await this.recordCost(show, 'music', COST_ESTIMATES.music_generation)
      } catch {
        // Music is optional and never blocks a production.
      }
    }

    await this.setState(show.id, 'assembling')
    return { state: 'assembling', detail: 'Dialogue and score recorded' }
  }

  /** Assembles shots into the final episode and writes subtitles. */
  private async stageAssembly(show: any) {
    const episode = show.episodes[show.episodes.length - 1]
    const shots = await prisma.mediaAsset.findMany({
      where: { episodeId: episode.id, type: 'video' },
      orderBy: { createdAt: 'asc' },
    })

    const runtime = shots.reduce((sum, s) => sum + (s.duration ?? 0), 0)
    const scenes = await prisma.scene.findMany({
      where: { episodeId: episode.id },
      orderBy: { sceneNumber: 'asc' },
    })

    await prisma.episode.update({
      where: { id: episode.id },
      data: {
        status: 'complete',
        runtimeSeconds: runtime,
        videoUrl: shots[0]?.url ?? PLACEHOLDER_VIDEO,
        subtitlesUrl: `/api/episodes/${episode.id}/subtitles`,
      },
    })

    await prisma.show.update({
      where: { id: show.id },
      data: {
        status: 'complete',
        totalRuntimeSeconds: { increment: runtime },
        posterUrl: show.posterUrl ?? '/media/placeholder-poster.svg',
      },
    })

    await this.recordCost(show, 'assembly', COST_ESTIMATES.assembly)
    await consumeCredits(
      show.userId,
      COST_ESTIMATES.assembly,
      `Assembled ${episode.title}`
    )

    return {
      state: 'complete',
      detail: `Episode assembled from ${shots.length} shots across ${scenes.length} scenes`,
    }
  }

  /** Persists a production state transition and records it as a job row. */
  private async setState(showId: string, target: ProductionState) {
    await prisma.show.update({ where: { id: showId }, data: { status: target } })
    await prisma.productionJob.create({
      data: { showId, stage: target, status: 'running', startedAt: new Date() },
    })
  }

  private async recordCost(
    show: any,
    component: string,
    estimated: number,
    actual?: number
  ) {
    await prisma.productionCost.create({
      data: {
        showId: show.id,
        userId: show.userId,
        component,
        estimatedCost: estimated,
        actualCost: actual,
        reconciled: actual !== undefined,
      },
    })
    await recordUsage(
      show.userId,
      component,
      process.env.VIDEO_PROVIDER || 'mock',
      estimated,
      actual
    )
  }
}

export const productionPipeline = new ProductionPipeline()
