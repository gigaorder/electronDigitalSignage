import React from 'react';
import moment from 'moment';
import PlaylistManager from '../helpers/playlist';
import ScheduleManager from '../helpers/schedule';
import { SUPPORTED_VIDEO, SUPPORTED_IMAGE, getAnimationText } from '../constants/Slide';
import { base_url } from '../config';
import styled from 'styled-components';
import * as Animations from 'react-animations';

const MAX_COUNT = 1000;


const Video = styled.video`
  animation: 1s ${props => props.animation ? Animations[props.animation] : ''};
`;
const Image = styled.img`
  animation: 1s ${props => props.animation ? Animations[props.animation] : ''};
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
    flag: false,
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
    // this.requestContentHistory(this.state.current);
    this.setState(state => {
      return {
        current: this.getNewSlideIndex(1),
        count: (state.count + 1) % MAX_COUNT,
        prev: state.current,
        pausedText: 'Play',
        flag: false,
        renderBackground: true,
        renderNext: false,
        begin: new Date()
      };
    }, () => {
      this.video && this.video.play();
      setTimeout(() => {
        this.setState({ renderBackground: false });

      }, 500);
      // this.setPlayList();
      this.checkIfMediaNeedSchedule(this.state.current);
    });
    // this.seekToStart();
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
          const { effect, media: { ext, name, _id, path } } = i;
          const url = `${base_url}/video/${path}`;
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
    if (this.state.flag === true) {
      return;
    }
    const now = moment();
    const schedule = ScheduleManager.getSchedule();
    let current = null;
    const currentSchedule = schedule.filter(s => {
      return now.isBetween(moment(s.activeFrom), moment(s.activeTo), null, []);
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
    this.setState({
      flag: true
    });
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
        defause,
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
            style={{
              display: 'flex',
              flex: 1
            }}
          />
        );
      } else if (SUPPORTED_VIDEO.indexOf(current.ext) !== -1) {
        return (
          <Video
            duration={0}
            key={this.getBackgroundCount()}
            animation={'fadeOut'}
            // useNativeDriver={true}
            // useTextureView={false}
            style={{
              display: 'flex',
              flex: 1
            }}
            src={current.url}
            // repeat={false}
            // paused={true}
            // resizeMode={this.state.resizeMode}

          />
        );
      }
    }
  };


  renderSlide = (i) => {
    const {
      resizeMode,
      slide,
      defause
    } = this.state;
    // const current = this.props.slide[i];
    const current = slide.length > 0 ? slide[i] : null;
    if (!current) {
      return <img
        src={require('../assets/images/default_slide.jpg')}
        style={{
          display: 'flex',
          flex: 1
        }}
      />;
    }
    if (SUPPORTED_IMAGE.indexOf(current.ext) !== -1) {
      return (
        <Image
          key={this.state.count + current.url}
          // useNativeDriver={true}
          animation={getAnimationText(current.effect)}
          // duration={300}
          ref={ref => {
            this.handleImage = ref;
          }}
          onError={() => console.log('eror whn load img')}
          // easing="linear"
          src={current.url}
          style={{
            display: 'flex',
            flex: 1
          }}
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
          style={{
            display: 'flex',
            flex: 1
          }}
          src={current.url}
          ref={ref => {
            this.video = ref;
          }}
          onEnded={() => {
            this.setNextSlide();
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
      resizeMode,
      slide,
      defause
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
          style={{
            display: 'flex',
            flex: 1
          }}
          // paused={true}
          // paused={!this.state.playNext}
          // resizeMode={this.state.resizeMode}
        />
      );
    }
  }

  render() {
    const {
      prev,
      current
    } = this.state;

    return (
      <div style={{ display: 'flex', flex: 1 }}>
        {this.state.renderBackground && this.renderBackground(prev)}
        {this.renderSlide(current)}
        {this.state.renderNext && this.prepareRenderNextSlide(this.getNewSlideIndex(1))}
      </div>
    );
  }
}
