import React from 'react';
import moment from 'moment';
import ScheduleManager from '../helpers/schedule';
import { SUPPORTED_VIDEO, SUPPORTED_IMAGE, getAnimationText } from '../constants/Slide';
import styled, { keyframes } from 'styled-components';
import * as Animations from 'react-animations';
import { getFilePath } from '../helpers/downloadFile';
import { ContentHistory } from '../api/video';
import { getContentHistory, saveLocalContentHistoryError } from '../helpers/contentHistory';
import { getToken } from '../helpers/utils';

const MAX_COUNT = 1000;


const Video = styled.video`
  ${props => props.animation ? `animation: 0.3s ${keyframes`${Animations[props.animation]}`}` : ''};
`;
const Image = styled.img`
  ${props => props.animation ? `animation: 0.3s ${keyframes`${Animations[props.animation]}`}` : ''};
`;

export default class Slide extends React.Component {

  state = {
    resizeMode: 'none',
    rate: 1,
    prev: -1,
    current: 0,
    progress: 0,
    count: 0,
    duration: 0,
    begin: null,
    playlist: {},
    slide: [],
    playNext: false
    // screenHeight: Dimensions.get('screen').height,
    // screenWidth: Dimensions.get('screen').width
  };

  componentDidMount() {
    this.setPlayList();
  }

  componentWillUnmount() {
    clearTimeout(this.setPlaylistTimeout);
  }

  getNewSlideIndex = step => {
    const {
      current,
      slide
    } = this.state;
    return (current + step) % slide.length;
  };

  setNextSlide = () => {
    this.requestContentHistory(this.state.current);
    this.setState(state => {
      return {
        current: this.getNewSlideIndex(1),
        count: (state.count + 1) % MAX_COUNT,
        prev: state.current,
        pausedText: 'Play',
        renderBackground: true,
        renderNext: false,
        begin: new Date()
      };
    }, () => {
      this.play();
      setTimeout(() => {
        this.setState({ renderBackground: false });

      }, 500);
      // this.setPlayList();
      this.checkIfMediaNeedSchedule(this.state.current);
    });
    // this.seekToStart();
  };

  play = () => {
    this.video && typeof this.video.play === 'function' && this.video.play();
  };

  requestContentHistory = (index) => {
    const {
      begin,
      slide
    } = this.state;
    if (!slide[index]) {
      return;
    }
    const isVideo = SUPPORTED_VIDEO.indexOf(slide[index].ext) > -1;
    const serverSettingDuration = slide[index].duration / 1000;
    const contentHistory = {
      begin: begin,
      duration: serverSettingDuration || (isVideo ? this.totalVideoDuration : 3),
      content: slide[index].id
    };
    const localContentHistory = getContentHistory();
    const endPoint = {
      contentHistory: localContentHistory ? [contentHistory, ...localContentHistory] : [contentHistory],
      deviceToken: getToken()
    };
    ContentHistory(
      endPoint
    ).then(result => {
      if (result.status !== 200) {
        saveLocalContentHistoryError(contentHistory);
      }
      localStorage.removeItem('content-history');
    }).catch(err => {
      saveLocalContentHistoryError(contentHistory);
    });
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevState.playlist !== this.state.playlist) {
      clearTimeout(this.timeout);
      this.setState({
        current: 0,
        prev: -1,
        count: 0,
        begin: new Date(),
        slide: this.state.playlist.content.filter(i => i.media).map(i => {
          const { effect, media: { ext, name, _id } } = i;
          const url = getFilePath(name + ext);
          const link = {
            id: _id,
            url: url,
            ext: ext,
            effect: effect,
            duration: i.duration ? i.duration * 1000 : 0
          };
          return link;
        })
      }, () => this.checkIfMediaNeedSchedule(this.state.current));
    }
  }

  setPlayList = () => {
    console.log('check playlist');
    this.setPlaylistTimeout = setTimeout(this.setPlayList, 2000);
    const now = moment();
    const schedule = ScheduleManager.getSchedule();
    let current = null;
    const currentSchedule = schedule.filter(s => {
      return now.isBetween(moment(s.activeFrom), moment(s.activeTo), null, '[)');
    });
    currentSchedule.find(s => {
      const currentPlaylist = s.weekdaySchedule.find(weekday => {
        const dayOfWeek = moment.weekdays(now.isoWeekday());
        if (weekday.in === 'same day') {
          return (weekday.weekdays.includes(dayOfWeek) && now.isBetween(moment(weekday.from, 'HH:mm'), moment(weekday.to, 'HH:mm'), null, '[)'));
        } else {
          if (weekday.weekdays.includes(dayOfWeek)) {
            if (now.isBetween(moment(weekday.from, 'HH:mm'), moment(weekday.to, 'HH:mm').add(1, 'days'), null, '[)')) {
              return true;
            }
          }
          const yesterdayDayOfWeek = moment.weekdays(moment().subtract(1, 'days').isoWeekday());
          if (weekday.weekdays.includes(yesterdayDayOfWeek)) {
            if (now.isBetween(moment(weekday.from, 'HH:mm').subtract(1, 'days'), moment(weekday.to, 'HH:mm'), null, '[)')) {
              return true;
            }
          }
        }
        return false;
      });

      if (currentPlaylist) {

        current = currentPlaylist.playlist;
        return true;// break the find method
      }
      return false;
    });
    if (!current) {
      if (this.state.playlist._id !== 'no playlist') {
        this.setState({
          playlist: {
            _id: 'no playlist',
            content: []
          }
        });
      }
    } else if (this.state.playlist._id !== current._id) {
      this.setState({
        playlist: current
      });
    }
    return true;
  };

  checkIfMediaNeedSchedule = (current) => {
    clearTimeout(this.timeout);
    clearTimeout(this.timeout2);
    const { slide } = this.state;
    console.log(slide, current);
    if (slide[current]) {
      console.log('hello');
      this.scheduleForNextMedia();
    }
  };

  scheduleForNextMedia = () => {
    const {
      current,
      slide
    } = this.state;
    const currentImage = slide[current];
    let timeout;
    if (SUPPORTED_IMAGE.includes(currentImage.ext)) {
      timeout = currentImage.duration || 3000;
    } else {
      if (currentImage.duration) {
        timeout = currentImage.duration;
      }
    }
    if (timeout) {
      this.timeout2 = setTimeout(() => {
        this.setState({ renderNext: true });
      }, timeout - 500);
      this.timeout = setTimeout(() => {
        this.setNextSlide();
      }, timeout);
    }
  };

  getBackgroundCount() {
    if (this.state.count === 0) {
      return MAX_COUNT - 1;
    } else {
      return this.state.count - 1;
    }
  }

  getNextSlideCount() {
    if (this.state.count >= MAX_COUNT) {
      return 0;
    } else {
      return this.state.count + 1;
    }
  }

  renderBackground = (i) => {
    if (i === -1) {
      return null;
    } else {
      const {
        slide
      } = this.state;
      // const current = this.props.slide[i];
      const current = slide.length > 0 ? slide[i] : null;
      if (!current) {
        return null;
      }
      if (SUPPORTED_IMAGE.indexOf(current.ext) !== -1) {
        return (
          <Image
            key={this.getBackgroundCount()}
            animation={'fadeOut'}
            src={current.url}
            style={viewStyle(0)}
          />
        );
      } else if (SUPPORTED_VIDEO.indexOf(current.ext) !== -1) {
        return (
          <Video
            duration={0}
            key={this.getBackgroundCount()}
            animation={'fadeOut'}
            style={viewStyle(0)}
            src={current.url}

          />
        );
      }
    }
  };


  renderSlide = (i) => {
    const {
      slide
    } = this.state;
    // const current = this.props.slide[i];
    const current = slide.length > 0 ? slide[i] : null;
    if (!current) {
      return <img
        alt="Cannot load"
        src={require('../assets/images/default_slide.jpg')}
        style={viewStyle(1)}
      />;
    }
    if (SUPPORTED_IMAGE.indexOf(current.ext) !== -1) {
      return (
        <Image
          alt="Cannot load"
          key={this.state.count + current.url}
          // useNativeDriver={true}
          animation={getAnimationText(current.effect)}
          // duration={300}
          onError={() => console.log('eror whn load img')}
          // easing="linear"
          src={current.url}
          style={viewStyle(1)}
        />
      );
    } else if (SUPPORTED_VIDEO.indexOf(current.ext) !== -1) {
      return (
        <Video
          key={this.state.count}
          autoPlay={true}
          // useNativeDriver={true}
          // useTextureView={false}
          animation={getAnimationText(current.effect)}
          // duration={300}
          style={viewStyle(1)}
          src={current.url}
          innerRef={ref => {
            this.video = ref;
          }}
          onEnded={() => {
            this.setNextSlide();
          }}
          onLoadedMetadata={() => {
            this.totalVideoDuration = this.video.duration;
          }}
          onError={(e) => {
            console.log(e);
            // this.setNextSlide();
          }}
          onProgress={this.onProgress}
          // repeat={false}
          // paused={false}
        />
      );
    } else {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>
            Media is not supported
          </p>
          <p>
            {current.url}
          </p>
        </div>
      );
    }
  };


  prepareRenderNextSlide(i) {
    const {
      slide
    } = this.state;
    // const current = this.props.slide[i];
    const current = slide.length > 0 ? slide[i] : null;
    if (!current) {
      return null;
    }
    if (SUPPORTED_VIDEO.indexOf(current.ext) !== -1) {
      return (
        <Video
          key={this.getNextSlideCount()}
          // useNativeDriver={true}
          // useTextureView={false}
          src={current.url}
          style={[{ opacity: 0, width: 0, height: 0 }]}
          // paused={true}
          // paused={!this.state.playNext}
          // resizeMode={this.state.resizeMode}
        />
      );
    }
  }

  render() {
    console.log(window.innerWidth);
    const {
      prev,
      current
    } = this.state;

    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        {this.state.renderBackground && this.renderBackground(prev)}
        {this.renderSlide(current)}
        {this.state.renderNext && this.prepareRenderNextSlide(this.getNewSlideIndex(1))}
      </div>
    );
  }
}

const viewStyle = (zIndex = 1) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: zIndex,
  width: '100vw',
  height: '100vh',
  objectFit: 'cover'
});
