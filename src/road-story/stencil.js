import {ReplaceStencilOp} from 'three';

export const LIGHT_TRAIL_STENCIL = 1;
export const ROAD_SURFACE_STENCIL = 2;

export function writeBackgroundOcclusion(bit) {
 return {
  stencilWrite: true,
  stencilRef: bit,
  stencilWriteMask: bit,
  stencilZPass: ReplaceStencilOp
 };
}
