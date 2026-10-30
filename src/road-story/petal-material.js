import * as T from 'three';

export function prepareRoadPetalMaterial(material){
 material.fog=true;
 const fade={value:new T.Vector2(420,800)};
 material.userData.roadPetalFade=fade;
 material.onBeforeCompile=shader=>{
  shader.uniforms.roadPetalFade=fade;
  const fog=T.ShaderChunk.fog_fragment.replace('gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );','fogFactor = max(fogFactor,smoothstep(roadPetalFade.x,roadPetalFade.y,vFogDepth));\n gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );');
  shader.fragmentShader='uniform vec2 roadPetalFade;\n'+shader.fragmentShader.replace('#include <fog_fragment>',fog);
 };
 material.customProgramCacheKey=()=> 'road-petal-air-v1';
 return material;
}
