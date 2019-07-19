const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" x="0px" y="0px" viewBox="0 0 357 357" style="enable-background:new 0 0 357 357;" xml:space="preserve">
      <path d="M25.5,357h102V0h-102V357z M229.5,0v357h102V0H229.5z"/>
    </svg>
  `).template;
}