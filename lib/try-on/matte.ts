/** Remove the intentionally cyan backdrop from garment artwork in the browser.
 * This is image compositing, not an inferred pet or garment segmentation model.
 */
export function removeCyanMatte(rgba:Uint8ClampedArray):void {
 for(let i=0;i<rgba.length;i+=4){
  const cyan=Math.min(rgba[i+1],rgba[i+2])-rgba[i];
  if(rgba[i+1]>110&&rgba[i+2]>110&&cyan>60)rgba[i+3]=Math.round(rgba[i+3]*Math.max(0,1-(cyan-60)/55));
 }
}
