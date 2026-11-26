const cloudinaryUploadUrl = /^(https?:\/\/[^/]+\/image\/upload\/)(.+)$/;

const secondScreenWidthPx = 1920;
const secondScreenHeightPx = 1080;

const upscaleToSecondScreen =
  `if_w_lt_${secondScreenWidthPx}_and_h_lt_${secondScreenHeightPx}/e_upscale/if_end/` +
  `c_fit,w_${secondScreenWidthPx},h_${secondScreenHeightPx}`;

export function upscaleCloudinaryImageUrl(url: string): string {
  const match = cloudinaryUploadUrl.exec(url);
  if (match === null) {
    return url;
  }
  const uploadBase = match[1];
  const transformationsAndAsset = match[2];
  return `${uploadBase}${upscaleToSecondScreen}/${transformationsAndAsset}`;
}
