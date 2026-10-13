import * as THREE from 'three'
import { FLAT_NORMAL, WHITE } from './assets'

/**
 * Shared uniforms for the fitting-room shaders. Every avatar material gets:
 *  - reveal: a horizontal "system scan" plane, everything above it is cut away, with a glowing seam
 *  - sway:   cloth secondary motion (twist + offset weighted by the aSway vertex attribute)
 *  - inflate: per-layer push along the normal so stacked garments never z-fight
 *  - hide:   body texels under worn garments are discarded (aHide attribute)
 */
export interface AvatarUniforms {
  uReveal: { value: number }
  uRevealOn: { value: number }
  uRevealColor: { value: THREE.Color }
  uInflate: { value: number }
  uSwayOffset: { value: THREE.Vector3 }
  uSwayTwist: { value: number }
  uSwayCenter: { value: THREE.Vector3 }
}

export const swayState = {
  uSwayOffset: { value: new THREE.Vector3() },
  uSwayTwist: { value: 0 },
  uSwayCenter: { value: new THREE.Vector3(0, 0.9, 0) },
}

export function makeUniforms(inflate = 0): AvatarUniforms {
  return {
    uReveal: { value: 10 },
    uRevealOn: { value: 0 },
    uRevealColor: { value: new THREE.Color('#4cc9ff').multiplyScalar(3) },
    uInflate: { value: inflate },
    ...swayState,
  }
}

interface PatchOpts {
  hide?: boolean
  fabric?: { d: THREE.Texture; n: THREE.Texture; gain: number; mix: number; nScale: number }
  tintMap?: boolean // hair / brows: grey map tinted by the material colour
}

export function patch(mat: THREE.MeshPhysicalMaterial, u: AvatarUniforms, o: PatchOpts = {}) {
  const fab = o.fabric
  const fabU = fab ? {
    uFabricD: { value: fab.d }, uFabricN: { value: fab.n }, uFabricGain: { value: fab.gain },
    uFabricMix: { value: fab.mix }, uFabricNScale: { value: fab.nScale },
  } : {}
  mat.userData.uniforms = { ...u, ...fabU }
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, fabU)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uInflate;
uniform vec3 uSwayOffset;
uniform float uSwayTwist;
uniform vec3 uSwayCenter;
attribute float aSway;
varying float vRevealY;
${o.hide ? 'attribute float aHide;\nvarying float vHide;' : ''}`)
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
transformed += normalize(objectNormal) * uInflate;
if (aSway > 0.0) {
  float a = uSwayTwist * aSway;
  vec2 c = transformed.xz - uSwayCenter.xz;
  transformed.xz = uSwayCenter.xz + vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a));
  transformed += uSwayOffset * aSway;
}
${o.hide ? 'vHide = aHide;' : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vRevealY = (modelMatrix * vec4(transformed, 1.0)).y;`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uReveal;
uniform float uRevealOn;
uniform vec3 uRevealColor;
varying float vRevealY;
${o.hide ? 'varying float vHide;' : ''}
${fab ? 'uniform sampler2D uFabricD;\nuniform sampler2D uFabricN;\nuniform float uFabricGain;\nuniform float uFabricMix;\nuniform float uFabricNScale;' : ''}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vRevealY > uReveal) discard;
${o.hide ? 'if (vHide > 0.5) discard;' : ''}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
${fab ? 'diffuseColor.rgb *= mix(1.0, texture2D(uFabricD, vRoughnessMapUv).r * uFabricGain, uFabricMix);' : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float d = uReveal - vRevealY;
  float seam = (1.0 - smoothstep(0.0, 0.045, d)) * uRevealOn;
  float scan = step(0.5, fract(vRevealY * 140.0)) * (1.0 - smoothstep(0.0, 0.35, d)) * 0.25 * uRevealOn;
  totalEmissiveRadiance += uRevealColor * (seam + scan);
}`)
    if (fab) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `
#ifdef USE_NORMALMAP_TANGENTSPACE
  vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
  mapN.xy *= normalScale;
  vec3 fabN = texture2D( uFabricN, vRoughnessMapUv ).xyz * 2.0 - 1.0;
  mapN = normalize( vec3( mapN.xy + fabN.xy * uFabricNScale, mapN.z ) );
  normal = normalize( tbn * mapN );
#else
  #include <normal_fragment_maps>
#endif`)
    }
  }
  mat.customProgramCacheKey = () => `av|${o.hide ? 1 : 0}|${fab ? 1 : 0}|${o.tintMap ? 1 : 0}`
  return mat
}

/* ---------------------------------------------------------------- material factories */

export function skinMaterial(map: THREE.Texture, u: AvatarUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    map, roughness: 0.52, metalness: 0, specularIntensity: 0.55, specularColor: new THREE.Color('#ffe9e0'),
    sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ff8a73'),
  })
  return patch(m, u, { hide: true })
}

export function eyeMaterial(map: THREE.Texture, u: AvatarUniforms) {
  const m = new THREE.MeshPhysicalMaterial({ map, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.8 })
  return patch(m, u)
}

/** Wet cornea: black diffuse added on top, so only the reflections show. */
export function corneaMaterial(u: AvatarUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#000000', roughness: 0.03, metalness: 0, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
  return patch(m, u)
}

export function hairMaterial(map: THREE.Texture, color: THREE.Color, gain: number, u: AvatarUniforms) {
  const c = color.clone().multiplyScalar(gain)
  const m = new THREE.MeshPhysicalMaterial({
    map, color: c, roughness: 0.48, metalness: 0, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide,
    sheen: 0.6, sheenRoughness: 0.35, sheenColor: color.clone().lerp(new THREE.Color('#ffffff'), 0.35),
    specularIntensity: 0.65,
  })
  return patch(m, u, { tintMap: true })
}

export function decalMaterial(map: THREE.Texture, color: THREE.Color, gain: number, u: AvatarUniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    map, color: color.clone().multiplyScalar(gain), roughness: 0.6, transparent: true, depthWrite: false,
    alphaTest: 0.02, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
  })
  return patch(m, u, { tintMap: true })
}

export interface FabricLook { roughness: number; sheen: number; clearcoat: number; gain: number }

export function garmentMaterial(o: {
  color: THREE.Color; look: FabricLook; fabD: THREE.Texture; fabN: THREE.Texture; fabR: THREE.Texture; repeat: number
  detail?: THREE.Texture; detailGain?: number; ao?: THREE.Texture; normal?: THREE.Texture; u: AvatarUniforms
}) {
  const rough = o.fabR.clone()
  rough.repeat.set(o.repeat, o.repeat)
  rough.needsUpdate = true
  const c = o.color.clone().multiplyScalar(o.detail ? (o.detailGain ?? 1) : 1)
  const sheenColor = o.color.clone().lerp(new THREE.Color('#ffffff'), 0.4)
  const m = new THREE.MeshPhysicalMaterial({
    color: c, map: o.detail ?? WHITE, roughness: o.look.roughness, roughnessMap: rough, metalness: 0,
    normalMap: o.normal ?? FLAT_NORMAL, normalScale: new THREE.Vector2(1, 1),
    aoMap: o.ao ?? null, aoMapIntensity: 1,
    sheen: o.look.sheen, sheenRoughness: 0.5, sheenColor,
    clearcoat: o.look.clearcoat, clearcoatRoughness: 0.35,
    side: THREE.DoubleSide, specularIntensity: 0.5,
  })
  return patch(m, o.u, { fabric: { d: o.fabD, n: o.fabN, gain: o.look.gain, mix: o.detail ? 0.55 : 1, nScale: 0.8 } })
}
