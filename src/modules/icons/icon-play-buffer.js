const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon spinner" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="34"/>
    </svg>
  `).template;
}