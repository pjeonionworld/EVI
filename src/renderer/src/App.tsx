import { DeskView } from './desk/DeskView'
import { NpcView } from './npc/NpcView'

export default function App() {
  const isDeskWindow = window.location.hash === '#desk'
  return isDeskWindow ? <DeskView /> : <NpcView />
}
