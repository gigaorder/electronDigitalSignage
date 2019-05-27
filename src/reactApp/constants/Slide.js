export const mapValueToAnimation = {
  'fadeIn': 'fadeIn',
  'slideInUp': 'fadeInUpBig',
  'slideInDown': 'fadeInDownBig',
  'slideInLeft': 'fadeInLeftBig',
  'slideInRight': 'fadeInRightBig',
  'bounceIn': 'bounceIn',
  'bounceInUp': 'bounceInUp',
  'bounceInDown': 'bounceInDown',
  'bounceInLeft': 'bounceInLeft',
  'bounceInRight': 'bounceInRight',
  'zoomIn': 'zoomIn',
  'zoomInDown': 'zoomInDown',
  'zoomInUp': 'zoomInUp',
  'zoomInLeft': 'zoomInLeft',
  'zoomInRight': 'zoomInRight',
};

export const mapValueToExitAnimation = {
  'fadeIn': 'fadeOutUpBig',
  'slideInUp': 'fadeOutUpBig',
  'slideInDown': 'fadeOutDownBig',
  'slideInLeft': 'fadeOutLeftBig',
  'slideInRight': 'fadeOutRightBig',
  'bounceIn': 'fadeOutUpBig',
  'bounceInUp': 'fadeOutUpBig',
  'bounceInDown': 'fadeOutDownBig',
  'bounceInLeft': 'fadeOutLeftBig',
  'bounceInRight': 'fadeOutRightBig',
  'zoomIn': 'fadeOutUpBig',
  'zoomInDown': 'fadeOutDownBig',
  'zoomInUp': 'fadeOutUpBig',
  'zoomInLeft': 'fadeOutLeftBig',
  'zoomInRight': 'fadeOutRightBig',
};

export const SUPPORTED_ANIMATION = Object.keys(mapValueToAnimation);

export function getRandomAnimation() {
  return SUPPORTED_ANIMATION[Math.floor(Math.random() * SUPPORTED_ANIMATION.length)];
}

export const SUPPORTED_VIDEO = ['.mp4', '.mkv', '.mov', 'webm'];
export const SUPPORTED_IMAGE = ['.jpg', '.jpeg', '.png', '.bmp'];

export function getAnimationText(animation) {
  if (!SUPPORTED_ANIMATION.includes(animation)) {
    return null;
  } else {
    return mapValueToAnimation[animation];
  }
}

export function getExitAnimation(animation) {
  return mapValueToExitAnimation[animation] || 'fadeOutUpBig';
}
