const { $templater } = $utils;

export default function () {
  return $templater(() =>/*html*/`
    <svg class="icon" viewBox="-75 -32 384 446">
      <path transform="scale(-1, 1) translate(-229, 0)" d="m90.667969 384h-53.335938c-20.585937 0-37.332031-16.746094-37.332031-37.332031 0-7.746094 
      2.390625-15.277344 6.71875-21.183594l92.226562-133.484375-92.480468-133.84375c-4.074219-5.546875-6.464844-13.078125-6.464844-20.824219 
      0-20.585937 16.746094-37.332031 37.332031-37.332031h53.335938c12.4375 0 24.019531 6.25 31.015625 16.726562l106.519531 
      154.472657c4.074219 5.527343 6.464844 13.058593 6.464844 20.800781s-2.390625 15.273438-6.722657 21.183594l-106.410156 
      154.28125c-6.847656 10.285156-18.429687 16.535156-30.867187 16.535156zm-53.335938-352c-2.898437 0-5.332031 2.433594-5.332031 5.332031 0 1.152344.363281 
      2.050781.535156 2.261719l99.027344 143.296875c3.777344 5.460937 3.777344 12.714844 0 18.199219l-98.773438 142.929687c-.425781.597657-.789062 
      1.496094-.789062 2.648438 0 2.898437 2.433594 5.332031 5.332031 5.332031h53.335938c2.386719 0 3.773437-1.558594 
      4.394531-2.496094l106.816406-154.859375c.425782-.597656.789063-1.492187.789063-2.644531s-.363281-2.046875-.535157-2.261719l-106.921874-155.050781c-.769532-1.128906-2.15625-2.6875-4.542969-2.6875zm0 0"/>
    </svg>
  `).template;
}