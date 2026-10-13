import type { Device, FridgeItem, Room, RoomKind, RoomRect, ShopItem } from '../game/types'
import { addDays, dayKey } from '../lib/util'

const ago = (d: number) => Date.now() - d * 86400000

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'living', name: 'Wohnzimmer', kind: 'living', lastCleaned: ago(2),
    items: [
      { id: 'i1', name: 'Fernbedienung', icon: 'gamepad', where: 'Sofa, linke Ritze' },
      { id: 'i2', name: 'Kuscheldecke', icon: 'hoodie', where: 'Sofa' },
      { id: 'i3', name: 'Ladekabel USB-C', icon: 'plug', where: 'TV-Board, Schublade' },
    ],
    needs: [
      { id: 'n1', text: 'Monstera gießen (alle 7 Tage)', done: false },
      { id: 'n2', text: 'Neue Kerzen kaufen', done: false },
    ],
  },
  {
    id: 'kitchen', name: 'Küche', kind: 'kitchen', lastCleaned: ago(1),
    items: [
      { id: 'i4', name: 'Matcha-Besen', icon: 'tea', where: 'Oberschrank rechts' },
      { id: 'i5', name: 'Brotdose', icon: 'bowl', where: 'Unterschrank links' },
    ],
    needs: [{ id: 'n3', text: 'Spülmaschinen-Tabs fast leer', done: false }],
  },
  {
    id: 'bedroom', name: 'Schlafzimmer', kind: 'bedroom', lastCleaned: ago(4),
    items: [
      { id: 'i6', name: 'Schmuckkästchen', icon: 'ring', where: 'Schminktisch' },
      { id: 'i7', name: 'Reisepass', icon: 'letter', where: 'Nachttisch, unterste Schublade' },
    ],
    needs: [{ id: 'n4', text: 'Bettwäsche wechseln', done: false }],
  },
  {
    id: 'hall', name: 'Flur', kind: 'hall', lastCleaned: ago(3),
    items: [
      { id: 'i8', name: 'Ersatzschlüssel', icon: 'key', where: 'Schlüsselbrett, Haken 3' },
      { id: 'i9', name: 'Regenschirm', icon: 'rain', where: 'Schirmständer' },
    ],
    needs: [],
  },
  {
    id: 'bath', name: 'Bad', kind: 'bath', lastCleaned: ago(5),
    items: [
      { id: 'i10', name: 'Haarglätter', icon: 'scrunchie', where: 'Unter dem Waschbecken' },
      { id: 'i11', name: 'Pflaster', icon: 'heart', where: 'Spiegelschrank' },
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
  { id: 'f1', name: 'Hafermilch', icon: 'milk', qty: 1, unit: 'L', expires: addDays(t, 5), zone: 'fridge' },
  { id: 'f2', name: 'Erdbeeren', icon: 'strawberry', qty: 250, unit: 'g', expires: addDays(t, 1), zone: 'fridge' },
  { id: 'f3', name: 'Joghurt', icon: 'yogurt', qty: 2, unit: 'Stk', expires: addDays(t, 3), zone: 'fridge' },
  { id: 'f4', name: 'Eier', icon: 'egg', qty: 6, unit: 'Stk', expires: addDays(t, 10), zone: 'fridge' },
  { id: 'f5', name: 'Spinat', icon: 'greens', qty: 1, unit: 'Pkg', expires: addDays(t, -1), zone: 'fridge' },
  { id: 'f6', name: 'Edamame', icon: 'peas', qty: 1, unit: 'Pkg', zone: 'freezer' },
  { id: 'f7', name: 'Pasta', icon: 'pasta', qty: 500, unit: 'g', zone: 'pantry' },
]

export const DEFAULT_SHOPPING: ShopItem[] = [
  { id: 's1', name: 'Avocado', done: false },
  { id: 's2', name: 'Matcha', done: false },
]

export const ROOM_ICON: Record<string, string> = {
  living: 'sofa', kitchen: 'pan', bedroom: 'bed', hall: 'door', bath: 'tub', office: 'desk', other: 'box',
}
export const ROOM_KINDS: { v: RoomKind; label: string }[] = [
  { v: 'living', label: 'Wohnen' }, { v: 'kitchen', label: 'Küche' }, { v: 'bedroom', label: 'Schlafen' }, { v: 'bath', label: 'Bad' },
  { v: 'hall', label: 'Flur' }, { v: 'office', label: 'Arbeiten' }, { v: 'other', label: 'Sonstiges' },
]
/** Footprints of the sample apartment (metres). */
export const DEFAULT_RECTS: Record<string, RoomRect> = {
  living: { x: 0, z: 0, w: 6, d: 4 }, kitchen: { x: 6, z: 0, w: 6, d: 4 }, bedroom: { x: 0, z: 4, w: 4.5, d: 4 },
  hall: { x: 4.5, z: 4, w: 3, d: 4 }, bath: { x: 7.5, z: 4, w: 4.5, d: 4 },
}
export const KIND_NEEDS: Record<RoomKind, string[]> = {
  living: ['Staub wischen'], kitchen: ['Kühlschrank checken'], bedroom: ['Bettwäsche wechseln'], bath: ['Handtücher waschen'],
  hall: ['Schuhe sortieren'], office: ['Schreibtisch aufräumen'], other: [],
}
