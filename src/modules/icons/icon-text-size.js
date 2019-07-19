const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" x="0px" y="0px" viewBox="0 0 405.333 405.333" style="enable-background:new 0 0 405.333 405.333;" xml:space="preserve">
      <polygon points="0,213.333 64,213.333 64,362.667 128,362.667 128,213.333 192,213.333 192,149.333 0,149.333"/>
      <polygon points="128,42.667 128,106.667 234.667,106.667 234.667,362.667 298.667,362.667 298.667,106.667 405.333,106.667 
        405.333,42.667"/>
    </svg>
  `).template;
}