/**
 * End-to-end verification of the production pipeline against a real database.
 * Drives a show from creation to a playable episode, then continues the series.
 *
 * Run: DATABASE_URL=... npx tsx scripts/verify-production.ts
 */
import { PrismaClient } from '@prisma/client'
import { showRunner } from '../lib/services/showrunner'
import { productionPipeline } from '../lib/services/pipeline'

const prisma = new PrismaClient()

let failures = 0
function check(label: string, condition: boolean, extra = '') {
  const mark = condition ? 'PASS' : 'FAIL'
  if (!condition) failures++
  console.log(`  [${mark}] ${label}${extra ? ` — ${extra}` : ''}`)
}

async function drive(showId: string, maxSteps = 60) {
  const seen: string[] = []
  for (let i = 0; i < maxSteps; i++) {
    const { state, detail } = await productionPipeline.advance(showId)
    if (seen[seen.length - 1] !== state) seen.push(state)
    console.log(`    step ${String(i + 1).padStart(2)}: ${state.padEnd(18)} ${detail}`)
    if (state === 'complete') return seen
  }
  throw new Error(`Production did not complete within ${maxSteps} steps`)
}

async function main() {
  console.log('\n=== ShowForge pipeline verification ===\n')

  const email = `verify-${Date.now()}@showforge.local`
  const user = await prisma.user.create({ data: { email, name: 'Verify' } })

  const prompt =
    'A gritty late-90s crime thriller about an undercover detective infiltrating a powerful Miami crime family'

  console.log('1. Creating show from a natural-language prompt')
  const showId = await showRunner.createShowFromRequest(user.id, {
    userDescription: prompt,
  })
  const created = await prisma.show.findUniqueOrThrow({ where: { id: showId } })
  check('show created', !!created)
  check(
    'title derived from prompt (not hardcoded)',
    created.title !== 'Neon Dreams',
    created.title
  )
  check('genre inferred', JSON.parse(created.genre).includes('crime'), created.genre)

  console.log('\n2. Driving the production pipeline')
  const states = await drive(showId)
  check(
    'passed through every stage',
    ['designing', 'planning', 'generating_video', 'generating_audio', 'assembling', 'complete'].every(
      (s) => states.includes(s)
    ),
    states.join(' -> ')
  )

  console.log('\n3. Verifying the finished episode')
  const show = await prisma.show.findUniqueOrThrow({
    where: { id: showId },
    include: {
      characters: { include: { characterAssets: true } },
      locations: { include: { locationAssets: true } },
      episodes: {
        include: { scenes: { include: { shots: true } }, mediaAssets: true },
      },
    },
  })
  const ep1 = show.episodes[0]
  const allShots = ep1.scenes.flatMap((s) => s.shots)

  check('show marked complete', show.status === 'complete', show.status)
  check('episode has a playable video url', !!ep1.videoUrl, ep1.videoUrl ?? 'none')
  check('episode has subtitles url', !!ep1.subtitlesUrl)
  check('episode runtime > 0', ep1.runtimeSeconds > 0, `${ep1.runtimeSeconds}s`)
  check('poster set', !!show.posterUrl)
  check('shots were generated', allShots.length > 0, `${allShots.length} shots`)
  check(
    'every shot completed',
    allShots.every((s) => s.status === 'complete'),
    allShots.map((s) => s.status).join(',')
  )
  check(
    'every character has canonical references',
    show.characters.every((c) => c.characterAssets.length >= 4),
    show.characters.map((c) => `${c.name}:${c.characterAssets.length}`).join(' ')
  )
  check(
    'every location has references',
    show.locations.every((l) => l.locationAssets.length > 0)
  )
  check(
    'video media assets stored per shot',
    ep1.mediaAssets.filter((m) => m.type === 'video').length === allShots.length
  )
  check(
    'dialogue audio generated',
    ep1.mediaAssets.some((m) => m.type === 'dialogue')
  )

  console.log('\n4. Verifying cost accounting')
  const costs = await prisma.productionCost.findMany({ where: { showId } })
  const usage = await prisma.usageRecord.findMany({ where: { userId: user.id } })
  const totalEstimated = costs.reduce((s, c) => s + c.estimatedCost, 0)
  check('production costs recorded', costs.length > 0, `${costs.length} rows`)
  check('usage records written', usage.length > 0, `${usage.length} rows`)
  check('total estimated cost > 0', totalEstimated > 0, `$${totalEstimated.toFixed(2)}`)
  check(
    'per-shot video cost reconciled with actuals',
    costs.some((c) => c.component === 'shot_video' && c.actualCost !== null)
  )

  console.log('\n5. Generating episode 2 with continuity')
  const ep2Id = await showRunner.createNextEpisode(showId)
  const ep2 = await prisma.episode.findUniqueOrThrow({
    where: { id: ep2Id },
    include: { scenes: true },
  })
  const bible = await prisma.storyBible.findFirstOrThrow({ where: { showId } })
  const previousEvents = JSON.parse(bible.previousEvents)

  check('episode 2 created', ep2.episodeNumber === 2)
  check('episode 2 has scenes', ep2.scenes.length > 0, `${ep2.scenes.length}`)
  check(
    'story bible recorded episode 1',
    previousEvents.length > 0 && previousEvents[0].includes(ep1.title),
    previousEvents[0] ?? 'empty'
  )
  check('story bible version incremented', bible.version === 2, `v${bible.version}`)

  const charsBefore = show.characters.length
  await drive(showId)
  const after = await prisma.show.findUniqueOrThrow({
    where: { id: showId },
    include: { characters: true, episodes: { include: { scenes: { include: { shots: true } } } } },
  })
  check(
    'characters persisted (universe not reset)',
    after.characters.length === charsBefore,
    `${charsBefore} -> ${after.characters.length}`
  )
  const ep2After = after.episodes.find((e) => e.episodeNumber === 2)!
  check('episode 2 rendered', !!ep2After.videoUrl)
  check(
    'episode 2 shots completed',
    ep2After.scenes.flatMap((s) => s.shots).every((s) => s.status === 'complete')
  )

  console.log(`\n=== ${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} ===\n`)
  await prisma.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error('\nVERIFICATION ERROR:', e)
  await prisma.$disconnect()
  process.exit(1)
})
