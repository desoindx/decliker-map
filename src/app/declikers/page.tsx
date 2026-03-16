import Map from '@/components/map/Map'
import { getDeclikers } from '@/utils/getDeclikers'
import { getProfessions } from '@/utils/getProfessions'

export const revalidate = 86400

export default async function Home() {
  const declikers = await getDeclikers(true)
  const professions = await getProfessions()

  return <Map withName declikers={declikers} professions={professions} />
}
