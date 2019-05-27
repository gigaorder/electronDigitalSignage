const request = window.require('request');
const fs = window.require('fs');
const path = window.require('path');
const crypto = window.require('crypto');
const os = window.require('os');

export const prefixDir = path.join(os.homedir(), 'file');

export function downloadFile({ url, onProgress, destination }) {
  return new Promise((resolve, reject) => {
    let received_bytes = 0;
    let total_bytes = 0;

    let req = request({
      method: 'GET',
      uri: url
    });

    const targetPath = prefixDir;
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath);
    }
    const name = path.basename(url);
    let out = fs.createWriteStream(path.join(targetPath, name));
    req.pipe(out);

    req.on('response', function (data) {
      // Change the total bytes value to get progress later.
      total_bytes = parseInt(data.headers['content-length']);
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (onProgress) {
      req.on('data', function (chunk) {
        // Update the received bytes
        received_bytes += chunk.length;

        onProgress(received_bytes, total_bytes);
      });
    }

    req.on('end', function () {
      resolve(destination);
    });
  });
}

export function readFile(path, callback) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

export function fileHash(filename, algorithm = 'md5') {
  return new Promise((resolve, reject) => {
    // Algorithm depends on availability of OpenSSL on platform
    // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
    let shasum = crypto.createHash(algorithm);
    try {
      let s = fs.createReadStream(filename);
      s.on('data', function (data) {
        shasum.update(data);
      });
      // making digest
      s.on('end', function () {
        const hash = shasum.digest('hex');
        return resolve(hash);
      });
    } catch (error) {
      return reject('calc fail');
    }
  });
}

export function getFilePath(fileName) {
  return `file://${path.join(prefixDir, 'playlist', fileName)}`;
}

export function readDir() {
  return new Promise((resolve, reject) => {
    fs.readdir(path.join(prefixDir, 'playlist'), (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}


export function removeFile(name) {
  return new Promise((resolve, reject) => {
    fs.unlink(path.join(prefixDir, 'playlist', name), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
