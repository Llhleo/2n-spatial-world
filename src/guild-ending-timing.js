import {nextSmooth} from './guild-next-route.js';
// Only the standalone GPU experiment uses this score. Legacy full-site timing
// remains unchanged. Entry is exactly the end of the original 158c2fb stream.
export const fluidRouteTime=t=>.18+(t-.18)*(.40/(8.5/18-.18));
export const fluidDensityCell=t=>12-6*nextSmooth((t-.25)/.24);
export const fluidGlyphProgress=(t,seed=0)=>nextSmooth((t-13.2/18-seed*.035)/(3.3/18-.035));
export const FLUID_TIMING_GLSL=`
float fluidGlyphProgress(float t,float seed){return ease((t-13.2/18.-seed*.035)/(3.3/18.-.035));}
`;
