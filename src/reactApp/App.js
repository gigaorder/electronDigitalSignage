import React from 'react';
import './App.css';
import { getToken } from './helpers/utils';
import { AddFcmToken } from './api/video';
import Slide from './screen/Slide';
import SocketIoClient from 'socket.io-client';
import { base_url, name_base } from './config';
import PlaylistManager from './helpers/playlist';
import ScheduleManager from './helpers/schedule';
import DownloadManager from './helpers/newDownloadFunction';
import { Line } from 'rc-progress';
import { readDir, removeFile } from './helpers/downloadFile';
import path from 'path';

const token = getToken();

class App extends React.Component {

  componentDidMount() {
    this.registerDevice();
  }

  state = {
    listProgress: []
  };
  registerDevice = () => {
    const heightScreen = window.innerHeight;
    const widthScreen = window.innerWidth;
    const resolution = `${heightScreen}x${widthScreen}`;
    const systemVersion = 'web';
    const systemName = 'web';
    const brand = 'web';
    AddFcmToken({
      token: token,
      resolution: resolution,
      osVersion: systemVersion,
      os: systemName,
      model: brand,
      appVersionCode: 'web'
    }).then(result => {
      if (result.status === 200) {
        this.socketHandler(token);
      }
      this.setState({
        status: !result.data.data.isRegistered ? 'connect success, please register device' : 'register success, please select playlist.',
        deviceCode: result.data.data.isRegistered ? '' : result.data.data.deviceCode
      });
    }).catch(err => {
      this.setState({
        status: 'register failed'
      });
    });
  };

  getListFileFromSchedule(schedule) {
    let listFileDownload = [];
    schedule.weekdaySchedule.forEach(wdaySchedule => {
      if (wdaySchedule.playlist) {
        PlaylistManager.addPlaylist(wdaySchedule.playlist);
      }
      wdaySchedule.playlist.content.forEach(item => {
        if (item.media) {
          const isExists = listFileDownload.find(i => i._id === item.media._id);
          if (!isExists) {
            listFileDownload.push(item.media);
          }
        }
      });
    });
    return listFileDownload;
  }

  onSetProgress = (totalProgress, index) => {
    const newListProgress = [...this.state.listProgress];
    newListProgress[index].progress = totalProgress;
    this.setState({
      progress: totalProgress,
      listProgress: newListProgress
    });
    this.socket.emit('APP_LISTENER_FILE_PROGRESS', this.state.job._id, newListProgress);
  };

  async clearData() {
    const deleteFiles = new Promise((resolve, reject) => {
      readDir()
        .then(files => {
          return Promise.all(files.map(item => {
            removeFile(item);
          }));
        })
        .then(resolve).catch(reject);
    });
    return Promise.all([
      deleteFiles,
      PlaylistManager.removeItem(),
      ScheduleManager.removeItem()
    ]);
  };

  socketHandler(token) {
    if (this.socket && typeof this.socket.close === 'function') {
      this.socket.close();
    }
    const socketUri = `${base_url}/${name_base}?token=${token}`;

    this.socket = SocketIoClient(socketUri, {
      jsonp: false,
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionAttempts: 100000,
      transports: ['websocket']
    });

    this.socket.on('connect', function () {
      console.log('connect success');
    });

    this.socket.on('error', err => {
      console.log(err, err.message);
    });

    this.socket.on('disconnect', () => {
      console.log('disconect');
    });

    this.socket.on('APP_ACTION_PUSH_FILES', (callback) => {
      readDir()
        .then(files => {
          callback(null, files);
        })
        .catch(err => {
          callback(err.message);
        });
    });

    this.socket.on('APP_ACTION_DELETE_FILE', (fileName, callback) => {
      removeFile(fileName)
        .then(files => {
          callback(null);
        })
        .catch(err => {
          callback(err.message);
        });
    });

    this.socket.on('APP_ACTION_DELETE_DEVICE_DATA', async (status, callback) => {
      const deleteDevice = new Promise((resolve, reject) => {
        this.clearData().then(resolve);
      });
      deleteDevice.then(value => {
        callback();
      });
    });

    this.socket.on('APP_ACTION_PUSH_DEVICE_STORAGE', async (status, callback) => {
      callback({
        free: 1,
        total: 1
      });
    });

    this.socket.on('APP_ACTION_CHANGE_DEVICE_REGISTERED', (data, callback) => {
      this.registerDevice();
      callback();
    });

    this.socket.on('APP_ACTION_PUSH_PLAYLIST', async (callback) => {
      callback(null, PlaylistManager.getPlaylist());
    });

    this.socket.on('APP_ACTION_DELETE_PLAYLIST', async (_id, callback) => {
      PlaylistManager.removePlaylist(_id);
      callback(null, PlaylistManager.getPlaylist());
    });

    this.socket.on('APP_EVENT_RECEIVE_SCHEDULE', async (schedule, job, callback) => {
      const listFileDownload = this.getListFileFromSchedule(schedule);
      console.log(schedule);
      console.log(listFileDownload);
      this.socket.emit('APP_LISTENER_DOWNLOAD_FILE', job._id, 'running', 'playlist');
      this.setState({
        listProgress: listFileDownload.map(i => {
          return {
            name: i.name + i.ext,
            progress: 0
          };
        }),
        downloading: true,
        job: job
      });

      try {
        for (let i = 0; i < listFileDownload.length; i++) {
          const media = listFileDownload[i];
          const download = new DownloadManager(media);
          let downloadProgress = 0;
          let joinProgress = 0;
          await download.startDownloadFiles(progress => {
            downloadProgress = progress;
            const totalProgress = (downloadProgress * 0.8 + joinProgress * 0.2);
            this.onSetProgress(totalProgress, i);
          }, progress => {
            joinProgress = progress;
            const totalProgress = (downloadProgress * 0.8 + joinProgress * 0.2);
            this.onSetProgress(totalProgress, i);
          });
        }
        this.setState({
          downloading: false
        });
      } catch (e) {
        console.log('err');
        this.socket.emit('APP_LISTENER_DOWNLOAD_FILE', job._id, 'fail', 'playlist');
      }
      this.socket.emit('APP_LISTENER_DOWNLOAD_FILE', job._id, 'finish', 'playlist');
      ScheduleManager.addSchedule(schedule);
    });

    this.socket.on('APP_ACTION_PUSH_SCHEDULE', (schedule, callback) => {
      callback(ScheduleManager.getSchedule());
    });

    this.socket.on('APP_ACTION_DELETE_SCHEDULE', (scheduleId, callback) => {
      callback(ScheduleManager.removeSchedule(scheduleId));
    });

    this.socket.on('APP_EVENT_RECEIVE_PLAYLIST', async (playlist, job) => {
      const {
        content
      } = playlist;
      this.setState({
        listProgress: content.map(i => {
          return {
            name: i.media.name + i.media.ext,
            progress: 0
          };
        }),
        downloading: true,
        job: job
      });

    });
  }

  render() {
    const {
      listProgress,
      downloading,
      status,
      deviceCode
    } = this.state;
    const progress = listProgress.reduce((acc, i) => acc + i.progress, 0) / listProgress.length;

    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
        {deviceCode ? <span style={{ color: '#000', flexShring: 1 }}>-{status}</span> : null}
        {
          (downloading && progress && !isNaN(progress)) ?
            <div style={{ width: 200, height: 60, zIndex: 100 }}>
              <Line percent={progress * 100} strokeWidth="4" strokeColor={'#03a9f4'} style={{ zIndex: 100 }}
              />
            </div> : null
        }
        {!deviceCode ?
          <Slide /> :
          <div style={{ alignItems: 'center', justifyContent: 'center', flex: 1, display: 'flex' }}>
            <p style={styles.deviceCode}>{deviceCode}</p>
          </div>
        }
      </div>
    );
  }

}

const styles = {
  deviceCode: {
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 160
  }
};

export default App;
