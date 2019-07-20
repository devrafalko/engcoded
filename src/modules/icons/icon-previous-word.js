const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" viewBox="-79 0 511 511.99889">
      <path class="top" transform="scale(-1, 1) translate(-446, 0)" d="m.5 479.414062v-446.832031c0-27.542969 32.097656-42.613281 53.28125-25.023437l299.308594 248.449218-299.308594 248.429688c-21.183594 17.59375-53.28125 2.519531-53.28125-25.023438zm0 0" fill="#fdd835"/>
      <path class="bottom" transform="scale(-1, 1) translate(-446, 0)" d="m.5 479.414062v-223.40625h352.605469l-299.324219 248.429688c-21.183594 17.59375-53.28125 2.519531-53.28125-25.023438zm0 0" fill="#fbc02d"/>
    </svg>
  `).template;
}