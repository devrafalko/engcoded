const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" x="0px" y="0px" viewBox="0 0 525.153 525.153" style="enable-background:new 0 0 525.153 525.153;" xml:space="preserve">
      <path d="M472.637,0H52.515C23.632,0,0.263,23.632,0.263,52.471L0,525.153L105.052,420.1h367.585
        c28.883,0,52.515-23.632,52.515-52.471V52.471C525.153,23.632,501.521,0,472.637,0z M183.803,236.341h-52.515V183.76h52.515
        V236.341z M288.812,236.341h-52.471V183.76h52.471V236.341z M393.864,236.341h-52.515V183.76h52.515V236.341z"/>
    </svg>
  `).template;
}