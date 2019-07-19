const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" x="0px" y="0px" viewBox="0 0 426.667 426.667" style="enable-background:new 0 0 426.667 426.667;" xml:space="preserve">
      <path d="M384,0H42.667C19.093,0,0.213,19.093,0.213,42.667L0,426.667l85.333-85.333H384c23.573,0,42.667-19.093,42.667-42.667
        v-256C426.667,19.093,407.573,0,384,0z M341.333,256h-256v-42.667h256V256z M341.333,192h-256v-42.667h256V192z M341.333,128h-256
        V85.333h256V128z"/>
    </svg>
  `).template;
}