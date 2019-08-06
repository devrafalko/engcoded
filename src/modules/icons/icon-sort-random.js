const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" viewBox="-21 0 426 426.66667">
      <path d="m155.019531 320h-48v-298.667969c0-11.796875-9.539062-21.332031-21.335937-21.332031s-21.332032 
        9.535156-21.332032 21.332031v298.667969h-48c-6.359374 0-12.117187 3.777344-14.675781 9.601562-2.5625 
        5.824219-1.386719 12.628907 2.941407 17.300782l69.335937 74.664062c3.050781 3.246094 7.273437 5.101563 
        11.730469 5.101563 4.460937 0 8.683594-1.855469 11.734375-5.101563l69.332031-74.664062c4.332031-4.671875 
        5.484375-11.457032 2.945312-17.300782-2.539062-5.847656-8.320312-9.601562-14.675781-9.601562zm0 0"/>
      <g transform="translate(134 16) scale(0.8 0.8)">
        <path d="M237.543,301.499h-73.091c-4.95,0-9.233,1.811-12.851,5.425c-3.615,3.617-5.424,7.897-5.424,12.847v63.953
          c0,4.948,1.809,9.232,5.424,12.854c3.621,3.61,7.9,5.421,12.851,5.421h73.097c4.942,0,9.227-1.811,12.848-5.421
          c3.61-3.621,5.42-7.905,5.42-12.854v-63.953c0-4.949-1.813-9.229-5.427-12.847C246.773,303.307,242.488,301.499,237.543,301.499z"/>
        <path d="M259.383,5.424C255.862,1.812,251.628,0,246.676,0h-91.359c-4.948,0-9.18,1.812-12.703,5.424
          c-3.521,3.617-5.186,7.902-4.996,12.85l7.992,219.265c0.19,4.948,2.139,9.236,5.852,12.847c3.711,3.621,8.041,5.431,12.991,5.431
          h73.097c4.942,0,9.271-1.81,12.991-5.431c3.71-3.61,5.653-7.898,5.852-12.847l7.987-219.265
          C264.578,13.326,262.905,9.045,259.383,5.424z"/>
      </g>
    </svg>
  `).template;
}