export function saveLocalContentHistoryError(contentHistory) {
  let history = localStorage.getItem('content-history');
  if (!history) {
    localStorage.setItem('content-history', JSON.stringify([contentHistory]));
  } else {
    let parserHistory = JSON.parse(history);
    parserHistory.push(contentHistory);
    localStorage.setItem('content-history', JSON.stringify(parserHistory));
  }
}

export function getContentHistory() {
  const history = localStorage.getItem('content-history');
  if (!history) {
    return null;
  }
  return JSON.parse(history);
}
