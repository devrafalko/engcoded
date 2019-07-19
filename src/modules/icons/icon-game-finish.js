const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
  <svg version="1.1" class="icon" stroke-width="32" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
    <g fill="transparent">
    <path fill="white" d="M115 18 L375 18 L375 195 L115 195 L165 105 Z" />
    <rect x="375" y="18" width="60" height="240"/>
    <path d="M375 258 L285 258 L230 315 L18 315 L18 465 L230 465 L260 494 L343 494" />
    <rect x="407" y="258" width="60" height="59"/>
    <rect x="407" y="317" width="92" height="59"/>
    <rect x="375" y="376" width="92" height="59"/>
    <rect x="343" y="435" width="92" height="59"/>
    <path d="M250 375 A75 75 0 0 0 325 300 A75 75 0 0 0 400 375" />
    </g>
  </svg>
  `).template;
}