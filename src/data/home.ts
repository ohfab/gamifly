import type { Device, FridgeItem, Room, ShopItem } from '../game/types'
import { addDays, dayKey } from '../lib/util'

const ago = (d: number) => Date.now() - d * 86400000

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'living', name: 'Wohnzimmer', kind: 'living', lastCleaned: ago(2),
    items: [
      { id: 'i1', name: 'Fernbedienung', icon: '📺', where: 'Sofa, linke Ritze' },
      { id: 'i2', name: 'Kuscheldecke', icon: '🧶', where: 'Sofa' },
      { id: 'i3', name: 'Ladekabel USB-C', icon: '🔌', where: 'TV-Board, Schublade' },
    ],
    needs: [
      { id: 'n1', text: 'Monstera gießen (alle 7 Tage)', done: false },
      { id: 'n2', text: 'Neue Kerzen kaufen', done: false },
    ],
  },
  {
    id: 'kitchen', name: 'Küche', kind: 'kitchen', lastCleaned: ago(1),
    items: [
      { id: 'i4', name: 'Matcha-Besen', icon: '🍵', where: 'Oberschrank rechts' },
      { id: 'i5', name: 'Brotdose', icon: '🍱', where: 'Unterschrank links' },
    ],
    needs: [{ id: 'n3', text: 'Spülmaschinen-Tabs fast leer', done: false }],
  },
  {
    id: 'bedroom', name: 'Schlafzimmer', kind: 'bedroom', lastCleaned: ago(4),
    items: [
      { id: 'i6', name: 'Schmuckkästchen', icon: '💍', where: 'Schminktisch' },
      { id: 'i7', name: 'Reisepass', icon: '🛂', where: 'Nachttisch, unterste Schublade' },
    ],
    needs: [{ id: 'n4', text: 'Bettwäsche wechseln', done: false }],
  },
  {
    id: 'hall', name: 'Flur', kind: 'hall', lastCleaned: ago(3),
    items: [
      { id: 'i8', name: 'Ersatzschlüssel', icon: '🔑', where: 'Schlüsselbrett, Haken 3' },
      { id: 'i9', name: 'Regenschirm', icon: '☂️', where: 'Schirmständer' },
    ],
    needs: [],
  },
  {
    id: 'bath', name: 'Bad', kind: 'bath', lastCleaned: ago(5),
    items: [
      { id: 'i10', name: 'Haarglätter', icon: '💇‍♀️', where: 'Unter dem Waschbecken' },
      { id: 'i11', name: 'Pflaster', icon: '🩹', where: 'Spiegelschrank' },
    ],
    needs: [
      { id: 'n5', text: 'Klopapier nachkaufen', done: false },
      { id: 'n6', text: 'Duschvorhang waschen', done: false },
    ],
  },
]

export const DEFAULT_DEVICES: Device[] = [
  { id: 'd1', roomId: 'living', name: 'Stehlampe', kind: 'light', on: true, value: 80 },
  { id: 'd2', roomId: 'living', name: 'Smart Speaker', kind: 'speaker', on: false, value: 30 },
  { id: 'd3', roomId: 'kitchen', name: 'Pendelleuchte', kind: 'light', on: false, value: 100 },
  { id: 'd4', roomId: 'bedroom', name: 'Nachttischlampe', kind: 'light', on: true, value: 40 },
  { id: 'd5', roomId: 'bedroom', name: 'Heizung', kind: 'thermostat', on: true, value: 21 },
  { id: 'd6', roomId: 'hall', name: 'Saugroboter', kind: 'vacuum', on: false },
  { id: 'd7', roomId: 'bath', name: 'Spiegellicht', kind: 'light', on: false, value: 100 },
  { id: 'd8', roomId: 'living', name: 'Rollos', kind: 'blinds', on: false, value: 0 },
]

const t = dayKey()
export const DEFAULT_FRIDGE: FridgeItem[] = [
  { id: 'f1', name: 'Hafermilch', icon: '🥛', qty: 1, unit: 'L', expires: addDays(t, 5), zone: 'fridge' },
  { id: 'f2', name: 'Erdbeeren', icon: '🍓', qty: 250, unit: 'g', expires: addDays(t, 1), zone: 'fridge' },
  { id: 'f3', name: 'Joghurt', icon: '🥣', qty: 2, unit: 'Stk', expires: addDays(t, 3), zone: 'fridge' },
  { id: 'f4', name: 'Eier', icon: '🥚', qty: 6, unit: 'Stk', expires: addDays(t, 10), zone: 'fridge' },
  { id: 'f5', name: 'Spinat', icon: '🥬', qty: 1, unit: 'Pkg', expires: addDays(t, -1), zone: 'fridge' },
  { id: 'f6', name: 'Edamame', icon: '🫛', qty: 1, unit: 'Pkg', zone: 'freezer' },
  { id: 'f7', name: 'Pasta', icon: '🍝', qty: 500, unit: 'g', zone: 'pantry' },
]

export const DEFAULT_SHOPPING: ShopItem[] = [
  { id: 's1', name: 'Avocado', done: false },
  { id: 's2', name: 'Matcha', done: false },
]

export const ROOM_ICON: Record<string, string> = {
  living: '🛋️', kitchen: '🍳', bedroom: '🛏️', hall: '🚪', bath: '🛁',
}
