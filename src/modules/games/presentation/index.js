import './navigation.scss';

const { $templater } = $utils;
const { $iconMinimize, $iconOccurrence, $iconShuffle, $iconSelect, $iconChevronRight, 
  $iconChevronDoubleRight, $iconChevronLeft, $iconChevronDoubleLeft, $iconSpy, $iconSortAZ, 
  $iconSortZA, $iconSort19, $iconSort91, $iconSortRandom, $iconChevronUp, $iconAlignLeft, 
  $iconAlignRight, $iconAlignCenter } = $icons;

class Presentation {
  constructor() {
    this._on = {
      _open: null,
      _close: null,
      get open() {
        return this._open;
      },
      set open(fn) {
        this._open = fn;
      },
      get close() {
        return this._close;
      },
      set close(fn) {
        this._close = fn;
      },
    };

    this.buildView();
    this.addListeners();
  }

  get view() {
    return this.dom.get('container');
  }

  get on() {
    return this._on;
  }

  buildView() {
    const { references, classes } = $templater(({ ref, child, classes }) =>/*html*/`
      <div ${ref('container')} ${classes('container')} class="presentation">
        <nav ${ref('panel')} class="navigation-panel">
          <div class="controls game">
            <ul>
              <li class="search">
                <div>
                  <input class="search-box"/>
                  <span class="icon-box">${child($iconOccurrence())}</span>
                </div>
              </li>
              <li class="select">
                <div>
                  <div class="select-box">
                    <div class="header">
                      <span class="text-box">Word type</span>
                      <span class="icon-box">${child($iconSelect())}</span>
                    </div>
                    <div class="list-box">
                      <ul class="list">
                        <li>
                          <span class="text-box">Noun</span>
                          <button class="switch-button on"><span></span></button>
                        </li>
                        <li>
                          <span class="text-box">Verb</span>
                          <button class="switch-button on"><span></span></button>
                        </li>
                        <li>
                          <span class="text-box">Phrasal Verb</span>
                          <button class="switch-button on"><span></span></button>
                        </li>
                        <li>
                          <span class="text-box">Adjective</span>
                          <button class="switch-button on"><span></span></button>
                        </li>
                        <li>
                          <span class="text-box">Conjunction</span>
                          <button class="switch-button on"><span></span></button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div class="controls navigation">
            <ul>
              <li ${ref('button.close')} class="close">${child($iconMinimize())}</li>
            </ul>
          </div>
        </nav>
        <div class="scrollable">
          <nav class="navigation-table">
            <ul class="controls pages">
              <li>
                <ul class="page-buttons">
                  <li><button class="setting-button navig"><span>${child($iconChevronDoubleLeft())}</span></button></li>
                  <li><button class="setting-button navig"><span>${child($iconChevronLeft())}</span></button></li>
                  <li><button class="setting-button value"><span>1</span></button></li>
                  <li><button class="setting-button value"><span>2</span></button></li>
                  <li><button class="setting-button value"><span>3</span></button></li>
                  <li><button class="setting-button value"><span>4</span></button></li>
                  <li><button class="setting-button value"><span>5</span></button></li>
                  <li><button class="setting-button navig"><span>${child($iconChevronRight())}</span></button></li>
                  <li><button class="setting-button navig"><span>${child($iconChevronDoubleRight())}</span></button></li>
                </ul>
              </li>
              <li class="go-page">
                <div class="go-page-box">
                  <input type="text" placeholder="1 - 55"/>
                  <button class="setting-button value"><span>Go</span></button>
                </div>
              </li>
            </ul>
            <ul class="controls rows">
              <li><button class="setting-button value"><span>10</span></button></li>
              <li><button class="setting-button value"><span>25</span></button></li>
              <li><button class="setting-button value"><span>50</span></button></li>
              <li><button class="setting-button value"><span>100</span></button></li>
              <li><button class="setting-button value"><span>All</span></button></li>
            </ul>
          </nav>
          <div class="table-box">
            <table>
              <thead>
                <tr>
                  <th class="head word">
                    <h1 class="header">Word</h1>
                    <div class="button-set">
                      <button class="setting-button navig right">
                        <ul>
                          <li data-side="left">${child($iconAlignLeft())}</li>
                          <li data-side="center">${child($iconAlignCenter())}</li>
                          <li data-side="right">${child($iconAlignRight())}</li>
                        </ul>
                      </button>
                      <button class="setting-button navig"><span>${child($iconSpy())}</span></button>
                      <button class="setting-button navig"><span>${child($iconShuffle())}</span></button>
                      <button class="setting-button navig az">
                        <ul>
                          <li data-sort="az">${child($iconSortAZ())}</li>
                          <li data-sort="za">${child($iconSortZA())}</li>
                          <li data-sort="asc">${child($iconSort19())}</li>
                          <li data-sort="desc">${child($iconSort91())}</li>
                          <li data-sort="random">${child($iconSortRandom())}</li>
                        </ul>
                      </button>
                    </div>
                  </th>
                  <th class="head translation">
                    <h1 class="header">Translation</h1>
                    <div class="button-set">
                      <button class="setting-button navig"><span>${child($iconSpy())}</span></button>
                    </div>
                  </th>
                  <th class="head word-type">
                    <h1 class="header">Type</h1>
                    <div class="button-set">
                      <button class="setting-button navig random">
                        <ul>
                          <li data-sort="az">${child($iconSortAZ())}</li>
                          <li data-sort="za">${child($iconSortZA())}</li>
                          <li data-sort="random">${child($iconSortRandom())}</li>
                        </ul>
                      </button>
                    </div>
                  </th>
                  <th class="head repetitions">
                    <h1 class="header">Rep.</h1>
                    <div class="button-set">
                      <button class="setting-button navig random">
                        <ul>
                          <li data-sort="asc">${child($iconSort19())}</li>
                          <li data-sort="desc">${child($iconSort91())}</li>
                          <li data-sort="random">${child($iconSortRandom())}</li>
                        </ul>
                      </button>
                    </div>
                  </th>
                  <th class="head find">
                    <h1 class="header">Find</h1>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="word">
                    <p>have <span data-pronoun>sb</span> to thank <span data-pronoun>for sth</span> <span data-explanation>(ironic)</span></p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>być <span data-pronoun>komuś</span> wdzięcznym <span data-pronoun>za coś</span></li>
                      <li>podziękowania należą się <span data-pronoun>dla kogoś</span> <span data-pronoun>za coś</span></li>
                      <li>dziękować <span data-pronoun>komuś</span> <span data-pronoun>za coś</span> <span data-explanation>(ironicznie)</span></li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>phrase</p>
                  </td>
                  <td class="repetition">
                    <p>3</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>click <span data-explanation>(onomatopoeic)</span></p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>stuk</li>
                      <li>trzask</li>
                      <li>pstryknięcie</li>
                      <li>mlaśnięcie</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>noun</p>
                  </td>
                  <td class="repetition">
                    <p>12</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>learn</p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>poznać</li>
                      <li>odkryć</li>
                      <li>dowiedzieć się</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>verb</p>
                  </td>
                  <td class="repetition">
                    <p>5</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>experience</p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>doświadczyć</li>
                      <li>doznać</li>
                      <li>poczuć</li>
                      <li>przeżyć</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>verb</p>
                  </td>
                  <td class="repetition">
                    <p>0</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>story</p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>opowieść</li>
                      <li>historia</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>noun</p>
                  </td>
                  <td class="repetition">
                    <p>0</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>not only <span data-pronoun>[...]</span> but also <span data-pronoun>[...]</span></p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>nie tylko... ale też...</li>
                      <li>nie tylko... lecz także...</li>
                      <li>nie dość... to jeszcze</li>
                      <li>mało tego, że... to jeszcze...</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>phrase</p>
                  </td>
                  <td class="repetition">
                    <p>0</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>brain</p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>mózg</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>noun</p>
                  </td>
                  <td class="repetition">
                    <p>13</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
                <tr>
                  <td class="word">
                    <p>expand</p>
                  </td>
                  <td class="translation">
                    <ul class="meaning-list">
                      <li>powiększać się</li>
                      <li>zwiększać się</li>
                      <li>rozrastać się</li>
                    </ul>
                  </td>
                  <td class="type">
                    <p>verb</p>
                  </td>
                  <td class="repetition">
                    <p>11</p>
                  </td>
                  <td class="find">
                    <span>${child($iconOccurrence())}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="page-top">
          <div>${child($iconChevronUp())}</div>
        </div>        
      </div>
    `);
    this.dom = references;
    this.classes = classes;
  }

  addListeners() {
    this.dom.get('button').get('close').addEventListener('click', () => this.close());
  }

  open() {
    if (this.on.open) this.on.open();
  }

  close() {
    if (this.on.close) this.on.close();
  }

}

export default Presentation;