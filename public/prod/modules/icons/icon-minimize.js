const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
      <path d="M416.667,0H95.333C42.766,0,0,42.767,0,95.334v321.333C0,469.233,42.766,512,95.333,512h321.334
        C469.234,512,512,469.233,512,416.667V95.334C512,42.767,469.234,0,416.667,0z M482,416.667C482,452.691,452.692,482,416.667,482
        H95.333C59.308,482,30,452.691,30,416.667V95.334C30,59.309,59.308,30,95.333,30h321.334C452.692,30,482,59.309,482,95.334
        V416.667z"/>
      <path d="M400.601,241H111.399c-8.284,0-15,6.716-15,15s6.716,15,15,15H400.6c8.284,0,15-6.716,15-15
        C415.601,247.716,408.885,241,400.601,241z"/>
    </svg>
  `).template;
}