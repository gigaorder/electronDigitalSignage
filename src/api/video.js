import axios from 'axios'
import { base_url } from '../config';

export function AddFcmToken(data) {
  return axios({
    method: 'post',
    url: base_url + "/digital/devices/register",
    headers: {
      'Accept': 'application/json',
    },
    data: {
      ...data
    }
  })
}

// digital/content-history/
export function ContentHistory(data) {
  return axios({
    method: 'post',
    url: base_url + "/digital/content-history",
    headers: {
      'Accept': 'application/json',
    },
    data: {
      ...data
    }
  })
}
