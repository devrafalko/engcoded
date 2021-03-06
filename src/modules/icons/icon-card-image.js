const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" x="0px" y="0px" viewBox="0 0 510 510" style="enable-background:new 0 0 510 510;" xml:space="preserve">
      <path d="M459,0H51C22.95,0,0,22.95,0,51v459l102-102h357c28.05,0,51-22.95,51-51V51C510,22.95,487.05,0,459,0z M76.5,306
        l89.25-114.75l63.75,76.5L318.75,153L433.5,306H76.5z"/>
    </svg>
  `).template;
}