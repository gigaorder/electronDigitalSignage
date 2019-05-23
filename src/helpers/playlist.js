class Playlist {

  static KEY_STORAGE = '__playlist';

  playlist = [];

  constructor() {
    const res = localStorage.getItem(Playlist.KEY_STORAGE);
    this.playlist = res ? JSON.parse(res) || [] : [];

  }

  addPlaylist(item) {
    console.log('index', item);
    const index = this.playlist.findIndex(i => i.name === item.name || i.id === item.id);
    if (index > -1) {
      this.playlist[index] = item;
      console.log(this.playlist);
    } else {
      this.playlist.push(item);
      console.log('playlist local', this.playlist);
    }
    this.setAsyncStorage();
  }

  removePlaylist(id) {
    this.playlist = this.playlist.filter(i => i.id !== id);
    this.setAsyncStorage();
  }

  getPlaylist() {
    return this.playlist;
  }

  removeItem() {
    this.playlist = [];
    this.setAsyncStorage();
  }

  setAsyncStorage() {
    localStorage.setItem(Playlist.KEY_STORAGE, JSON.stringify(this.playlist));
  }

}

const PlaylistManager = new Playlist();

export default PlaylistManager;
