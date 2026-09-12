import { PrismaClient } from '@prisma/client'
import { getLLMProvider, StoryGenerationRequest, StoryGenerationResponse } from '@/lib/providers'
import { z } from 'zod'

const prisma = new PrismaClient()

const StorySchema = z.object({
  showTitle: z.string(),
  episodeTitle: z.string(),
  logline: z.string(),
  synopsis: z.string(),
  format: z.enum(['movie', 'series', 'short']),
  genre: z.array(z.string()),
  tone: z.string(),
  setting: z.string(),
  timePeriod: z.string(),
  visualStyle: z.string(),
  themes: z.array(z.string()),
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      role: z.string(),
    })
  ),
  locations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
    })
  ),
  scenes: z.array(
    z.object({
      id: z.string(),
      number: z.number(),
      title: z.string(),
      description: z.string(),
      charactersPresent: z.array(z.string()),
    })
  ),
})

export class ShowRunner {
  async generateStory(request: StoryGenerationRequest): Promise<StoryGenerationResponse> {
    const provider = getLLMProvider()
    const response = await provider.generateStory(request)

    // Validate response structure
    const validated = StorySchema.parse(response)
    return validated
  }

  async createShowFromRequest(
    userId: string,
    request: StoryGenerationRequest
  ): Promise<string> {
    // Step 1: Generate story
    const story = await this.generateStory(request)

    // Step 2: Create show record
    const show = await prisma.show.create({
      data: {
        userId,
        title: story.showTitle,
        description: story.synopsis,
        logline: story.logline,
        format: story.format,
        genre: JSON.stringify(story.genre),
        tone: story.tone,
        setting: story.setting,
        timePeriod: story.timePeriod,
        visualStyle: story.visualStyle,
        themes: JSON.stringify(story.themes),
        status: 'writing',
      },
    })

    // Step 3: Create story bible
    const storyBible = await prisma.storyBible.create({
      data: {
        showId: show.id,
        premise: story.logline,
        worldRules: JSON.stringify([]),
        visualAesthetic: story.visualStyle,
        timeline: story.timePeriod,
        previousEvents: JSON.stringify([]),
        unresolvedPlots: JSON.stringify([]),
        unsolvedMysteries: JSON.stringify([]),
        characterKnowledge: JSON.stringify({}),
      },
    })

    // Update show with story bible
    await prisma.show.update({
      where: { id: show.id },
      data: { storyBibleId: storyBible.id },
    })

    // Step 4: Create characters
    for (const charData of story.characters) {
      const character = await prisma.character.create({
        data: {
          showId: show.id,
          name: charData.name,
          background: charData.description,
          personality: `Role: ${charData.role}`,
        },
      })

      // Mark for asset generation
      await prisma.generationJob.create({
        data: {
          jobType: 'character_assets',
          provider: 'image',
          model: process.env.IMAGE_PROVIDER || 'mock',
          prompt: `Generate character reference images for ${character.name}: ${charData.description}`,
          status: 'queued',
        },
      })
    }

    // Step 5: Create locations
    for (const locData of story.locations) {
      const location = await prisma.location.create({
        data: {
          showId: show.id,
          name: locData.name,
          description: locData.description,
        },
      })

      // Mark for asset generation
      await prisma.generationJob.create({
        data: {
          jobType: 'location_assets',
          provider: 'image',
          model: process.env.IMAGE_PROVIDER || 'mock',
          prompt: `Generate location reference images for ${location.name}: ${locData.description}`,
          status: 'queued',
        },
      })
    }

    // Step 6: Create episode and scenes
    const episode = await prisma.episode.create({
      data: {
        showId: show.id,
        episodeNumber: 1,
        title: story.episodeTitle,
        description: story.synopsis,
        status: 'generating',
      },
    })

    for (const sceneData of story.scenes) {
      const scene = await prisma.scene.create({
        data: {
          episodeId: episode.id,
          sceneNumber: sceneData.number,
          description: sceneData.description,
          scenePurpose: sceneData.title,
          charactersPresent: JSON.stringify(sceneData.charactersPresent),
        },
      })

      // Create initial shot for each scene
      await prisma.shot.create({
        data: {
          sceneId: scene.id,
          shotNumber: 1,
          description: sceneData.description,
          visualPrompt: `${story.visualStyle}. ${sceneData.description}`,
          targetDurationSeconds: 5,
          status: 'pending',
        },
      })
    }

    // Create production job to track overall progress
    await prisma.productionJob.create({
      data: {
        showId: show.id,
        stage: 'validate',
        status: 'queued',
      },
    })

    return show.id
  }

  async getShowWithAllData(showId: string) {
    return prisma.show.findUniqueOrThrow({
      where: { id: showId },
      include: {
        storyBible: true,
        characters: {
          include: {
            characterAssets: true,
          },
        },
        locations: {
          include: {
            locationAssets: true,
          },
        },
        episodes: {
          include: {
            scenes: {
              include: {
                shots: {
                  include: {
                    generationJob: true,
                    mediaAsset: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }
}

export const showRunner = new ShowRunner()
