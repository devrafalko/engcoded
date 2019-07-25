const { $words } = $data;

class Words {
  constructor(words) {
    this.map = {
      alphabet: new Map(),
      all: new Map(),
      types: new Map()
    };
    this._buildMapAlphabet();
    this._buildMapAll(words);
  }


  get size() {
    //it returns the total number of words to use, eg. in the crossword
  }

  get wordTypes() {
    //it returns the [Array] list of all types of all words
    //it will be used in the Presentation table
  }

  _buildMapAlphabet(){
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '];
    for (let letterX of letters) {
      this.map.alphabet.set(letterX, { expression: new RegExp(letterX), data: [] });
      for (let letterY of letters) this.map.alphabet.set(letterX + letterY, { expression: new RegExp(`${letterX}.*${letterY}`), data: [] });
    }
  }

  _buildMapAll(words){
    words.forEach(({ id }) => {
      if (!$words.has(id) || this.map.all.has(id)) return;
      let record = $words.get(id);
      this.map.all.set(id, {...record, id});
    });
  }


  
  filter({ clue = null, type = null }) { //if null - it includes all occurences

  }

  repetitions(){
    //it returns the map with [key:[Number] repetitions, value: word id]
    //it returns the map of total repetitions and the repetitions in the particular games
  }

  repeated(id, game){
    //it increase the number of repetitions for the words
    //it distinguish the total repetitions and repetitions in the particular game
  }

}

export default Words;