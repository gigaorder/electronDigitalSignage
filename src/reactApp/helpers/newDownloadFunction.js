import { base_url } from '../config';
import path from 'path';
import _ from 'lodash';
import { downloadFile, fileHash, readFile } from './downloadFile';

const fs = window.require('fs');
const os = window.require('os');

const noop = () => null;

function sumArray(array) {
  return array.reduce((acc, i) => acc + i, 0);
}

class DownloadManager {

  static TEMP_PATH = path.join(os.homedir(), 'file');
  static SAVE_PATH = path.join(os.homedir(), 'file', 'playlist');

  constructor(media) {
    this.media = media;
    console.log(JSON.stringify(media));
  }

  downloadTempFile(url, onProgress = noop) {
    const name = path.basename(url);
    let _total = 1;

    return new Promise((resolve, reject) => {
      downloadFile({ url, destination: DownloadManager.TEMP_PATH + '/' + name, onProgress })
        .then((res) => {
          onProgress(_total, _total);
          console.log('he.ll', res);
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  downloadFileAndMd5(url, onProgress = noop, count = 0, err = null) {
    if (count < 10) {
      return new Promise((resolve, reject) => {
        Promise.all([
          this.downloadTempFile(url, onProgress),
          this.downloadTempFile(url + '.md5')
        ])
          .then(([pathFile, pathFileMd5]) => {
            return this.compareMd5(pathFile, pathFileMd5);
          })
          .then((res) => {
            resolve(res);
          })
          .catch((e) => {
            console.log('retry', e);
            return this.downloadFileAndMd5(url, onProgress, count + 1, 'md5 not equal')
              .then(resolve).catch(reject);
          });
      });
    } else {
      return Promise.reject(`error when download ${url}: ${err}`);
    }
  }

  compareMd5(pathFile, pathFileMd5) {
    // const md5 = await RNFetchBlob.fs.readFile(pathFileMd5, 'utf-8');
    // const md5File = await RNFetchBlob.fs.hash(pathFile, 'md5');
    // if (md5File === md5) {
    //   return pathFile;
    // } else {
    //   throw 'md5 not equal';
    // }
    return new Promise((resolve, reject) => {
      Promise.all([
        readFile(pathFileMd5, 'utf8'),
        fileHash(pathFile, 'md5')
        // RNFetchBlob.fs.stat(pathFile)
      ]).then(([md5, md5File, stat]) => {
        // console.log(md5, md5File, stat);
        if (md5 === md5File) {
          resolve(pathFile);
        } else {
          console.log(pathFile, 'md5 not equal');
          reject('md5 not equal');
        }
      }).catch(err => {
        reject(err);
      });
    });
  }

  async joinFile(paths, name, onProgress = noop) {
    const sortParts = paths.sort(function (a, b) {
      const indexA = a.split('-').pop();
      const indexB = b.split('-').pop();
      return indexA - indexB;
    });
    console.log(paths, name);
    const pathToWrite = `${DownloadManager.SAVE_PATH}/${name}`;
    if (!fs.existsSync(DownloadManager.SAVE_PATH)) {
      fs.mkdirSync(DownloadManager.SAVE_PATH);
    }
    const isExists = fs.existsSync(pathToWrite);
    if (isExists) {
      fs.unlinkSync(pathToWrite);
    }
    const writeStream = fs.createWriteStream(pathToWrite, {
      encoding: null
    });
    for (let i = 0; i < sortParts.length; i++) {
      const pathToRead = sortParts[i];
      console.log(pathToRead);
      // await RNFetchBlob.fs.appendFile(pathToWrite, pathToRead, 'uri');
      // onProgress((i + 1) / (sortParts.length));
      await new Promise((resolve, reject) => {
        console.log(pathToRead);
        const readStream = fs.createReadStream(pathToRead, { encoding: null });
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', e => {
          resolve(e);
          console.log(e);
        });
        readStream.on('error', (err) => {
          reject(err);
          console.log(err);
        });
      });
      onProgress((i + 1) / (sortParts.length));

    }
    console.log('closed');
    writeStream.close();
    return pathToWrite;
  }

  async startDownloadFiles(onDownloadProgress, onJoinFile) {
    const urls = this.media.parts.map(item => {
      let folderName = this.media.path.replace(this.media.ext, '').replace('/', '_');
      return base_url + '/video/.parts/' + folderName + '/' + item;
    });
    const regex = /.*.md5$/;
    const downloadUrls = urls.filter(a => !regex.test(a));
    const totalFile = downloadUrls.length;
    let progress = new Array(totalFile);
    const debounceOnProgress = _.throttle(onDownloadProgress, 1000);
    const debounceOnJoinFile = _.throttle(onJoinFile, 1000);
    console.log('downloadUrls', downloadUrls);
    const parts = await Promise.all(downloadUrls.map((item, index) => this.downloadFileAndMd5(item, (received, total) => {
      progress[index] = received / total;
      debounceOnProgress(sumArray(progress) / totalFile);
    })));
    onDownloadProgress(1); // download complete
    const res = await this.joinFile(parts, this.media.name + this.media.ext, joinProgress => {
      debounceOnJoinFile(joinProgress);
    });
    await Promise.all(parts.map(item => {
      return Promise.all([fs.unlinkSync(item), fs.unlinkSync(`${item}.md5`)]);
    }));
    onJoinFile(1); // join file complete
    return res;
  }
}

// a.downloadFileAndMd5('http://digitalsignage.gigaorder.de/video/.parts/video_media_ezgif-com-crop/media_ezgif-com-crop.mp4.split-0', (a, b) => console.log(a / b));
// a.joinFile([
//   '/storage/emulated/0/Download/media_ezgif-com-crop.mp4.split-0',
//   '/storage/emulated/0/Download/media_ezgif-com-crop.mp4.split-1',
//   '/storage/emulated/0/Download/media_ezgif-com-crop.mp4.split-2',
//   '/storage/emulated/0/Download/media_ezgif-com-crop.mp4.split-3',
//   '/storage/emulated/0/Download/media_ezgif-com-crop.mp4.split-4',
//   '/storage/emulated/0/Download/media_ezgif-com-crop.mp4.split-5',
// ], 'media_ezgif-com-crop.mp4');

// const a = new DownloadManager({
//   'parts': ['Square_media_amusement-park---full-screen.split-0000', 'Square_media_amusement-park---full-screen.split-0000.md5', 'Square_media_amusement-park---full-screen.split-0001', 'Square_media_amusement-park---full-screen.split-0001.md5', 'Square_media_amusement-park---full-screen.split-0002', 'Square_media_amusement-park---full-screen.split-0002.md5', 'Square_media_amusement-park---full-screen.split-0003', 'Square_media_amusement-park---full-screen.split-0003.md5', 'Square_media_amusement-park---full-screen.split-0004', 'Square_media_amusement-park---full-screen.split-0004.md5', 'Square_media_amusement-park---full-screen.split-0005', 'Square_media_amusement-park---full-screen.split-0005.md5', 'Square_media_amusement-park---full-screen.split-0006', 'Square_media_amusement-park---full-screen.split-0006.md5', 'Square_media_amusement-park---full-screen.split-0007', 'Square_media_amusement-park---full-screen.split-0007.md5', 'Square_media_amusement-park---full-screen.split-0008', 'Square_media_amusement-park---full-screen.split-0008.md5', 'Square_media_amusement-park---full-screen.split-0009', 'Square_media_amusement-park---full-screen.split-0009.md5', 'Square_media_amusement-park---full-screen.split-0010', 'Square_media_amusement-park---full-screen.split-0010.md5', 'Square_media_amusement-park---full-screen.split-0011', 'Square_media_amusement-park---full-screen.split-0011.md5', 'Square_media_amusement-park---full-screen.split-0012', 'Square_media_amusement-park---full-screen.split-0012.md5', 'Square_media_amusement-park---full-screen.split-0013', 'Square_media_amusement-park---full-screen.split-0013.md5', 'Square_media_amusement-park---full-screen.split-0014', 'Square_media_amusement-park---full-screen.split-0014.md5', 'Square_media_amusement-park---full-screen.split-0015', 'Square_media_amusement-park---full-screen.split-0015.md5', 'Square_media_amusement-park---full-screen.split-0016', 'Square_media_amusement-park---full-screen.split-0016.md5', 'Square_media_amusement-park---full-screen.split-0017', 'Square_media_amusement-park---full-screen.split-0017.md5', 'Square_media_amusement-park---full-screen.split-0018', 'Square_media_amusement-park---full-screen.split-0018.md5', 'Square_media_amusement-park---full-screen.split-0019', 'Square_media_amusement-park---full-screen.split-0019.md5', 'Square_media_amusement-park---full-screen.split-0020', 'Square_media_amusement-park---full-screen.split-0020.md5', 'Square_media_amusement-park---full-screen.split-0021', 'Square_media_amusement-park---full-screen.split-0021.md5', 'Square_media_amusement-park---full-screen.split-0022', 'Square_media_amusement-park---full-screen.split-0022.md5', 'Square_media_amusement-park---full-screen.split-0023', 'Square_media_amusement-park---full-screen.split-0023.md5', 'Square_media_amusement-park---full-screen.split-0024', 'Square_media_amusement-park---full-screen.split-0024.md5', 'Square_media_amusement-park---full-screen.split-0025', 'Square_media_amusement-park---full-screen.split-0025.md5'], 'tag': [], '_id': '5cc05806f70453963a3bae63', 'path': 'Square/media_amusement-park---full-screen.mp4', '__v': 0, 'duration': 11, 'ext': '.mp4', 'name': 'media_amusement-park---full-screen', 'resolution': '1920x1920', 'type': 'video/mp4', 'thumbnail': 'data:image/jpeg;base64,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', 'id': '5cc05806f70453963a3bae63'
// });
// a.startDownloadFiles(a => console.log(a), b => console.log(b));
export default DownloadManager;
