import React from 'react';
import './App.css';
import { getToken } from './helpers/utils';
import { AddFcmToken } from './api/video';
import Slide from './screen/Slide';
import path from 'path';
import SocketIoClient from 'socket.io-client';
import { base_url, name_base } from './config';
import PlaylistManager from './helpers/playlist';
import ScheduleManager from './helpers/schedule';

const token = getToken();

class App extends React.Component {

  componentDidMount() {
    this.registerDevice();
  }

  state = {};
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
      callback(null, ['Web']);
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
      ScheduleManager.addSchedule(schedule);
      this.socket.emit('APP_LISTENER_DOWNLOAD_FILE', job._id, 'finish', 'playlist');
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

    return (
      <div style={{ flex: 1, display: 'flex' }}>
        <Slide />
        {/*{JSON.stringify(ScheduleManager.getSchedule())}*/}
      </div>
    );
  }

}

export default App;
