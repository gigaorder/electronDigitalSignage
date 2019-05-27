export function makeSSID(length = 16) {
  let possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  return new Array(length).fill(0).reduce((acc) => {
    return acc + possible.charAt(Math.floor(Math.random() * possible.length));
  });
}


export function getToken() {
  const token = localStorage.getItem('__deviceId');
  if (token) {
    return token;
  } else {
    const newToken = makeSSID();
    localStorage.setItem('__deviceId', newToken);
    return newToken;
  }
}
